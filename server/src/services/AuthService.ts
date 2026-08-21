import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { Organization } from '../models/Organization';
import { User, IUser } from '../models/User';
import { RefreshToken, hashToken } from '../models/RefreshToken';
import { Role } from '../types/enums';
import { generateAccessToken, generateRefreshToken, JWTPayload } from '../utils/jwt';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Signup: creates an Organization + first User (OWNER role) in one transaction
   */
  static async signup(params: {
    orgName: string;
    orgSlug: string;
    userName: string;
    email: string;
    password: string;
  }) {
    const { orgName, orgSlug, userName, email, password } = params;

    // Check if org slug already exists
    const existingOrg = await Organization.findOne({ slug: orgSlug });
    if (existingOrg) {
      throw new Error('Organization slug already taken');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const session = await Organization.startSession();
    session.startTransaction();

    try {
      // Create organization
      const [org] = await Organization.create(
        [{ name: orgName, slug: orgSlug }],
        { session }
      );

      // Create first user (OWNER)
      const [user] = await User.create(
        [
          {
            orgId: org._id,
            name: userName,
            email,
            passwordHash,
            role: Role.OWNER,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      const tokens = await this.generateTokenPair(user);

      return {
        user: {
          id: user._id,
          orgId: user.orgId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        ...tokens,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Login: email + password, returns JWT access + refresh tokens
   */
  static async login(email: string, password: string, orgId: Types.ObjectId) {
    const user = await User.findOne({ orgId, email, isActive: true }).select('+passwordHash');

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const tokens = await this.generateTokenPair(user);

    return {
      user: {
        id: user._id,
        orgId: user.orgId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Refresh: rotates refresh token, returns new access + refresh tokens
   */
  static async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const storedToken = await RefreshToken.findOne({ tokenHash });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await User.findById(storedToken.userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Rotate: delete old token and issue new pair
    await RefreshToken.deleteOne({ _id: storedToken._id });

    return this.generateTokenPair(user);
  }

  /**
   * Logout: invalidates the refresh token
   */
  static async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.deleteOne({ tokenHash });
  }

  /**
   * Generate access + refresh token pair
   */
  private static async generateTokenPair(user: IUser) {
    const payload: JWTPayload = {
      userId: user._id.toString(),
      orgId: user.orgId.toString(),
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store hashed refresh token
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }
}
