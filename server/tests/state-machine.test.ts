import {
  Role,
  PurchaseOrderStatus,
  PO_TRANSITIONS,
  SalesOrderStatus,
  SO_TRANSITIONS,
} from '../src/types/enums';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/utils/jwt';

describe('State Machines & Core Logic', () => {
  describe('Purchase Order State Transitions', () => {
    it('should allow DRAFT to transition to PENDING_APPROVAL and CANCELLED', () => {
      expect(PO_TRANSITIONS[PurchaseOrderStatus.DRAFT]).toContain(PurchaseOrderStatus.PENDING_APPROVAL);
      expect(PO_TRANSITIONS[PurchaseOrderStatus.DRAFT]).toContain(PurchaseOrderStatus.CANCELLED);
      expect(PO_TRANSITIONS[PurchaseOrderStatus.DRAFT]).not.toContain(PurchaseOrderStatus.APPROVED);
      expect(PO_TRANSITIONS[PurchaseOrderStatus.DRAFT]).not.toContain(PurchaseOrderStatus.RECEIVED);
    });

    it('should disallow transitions from terminal states', () => {
      expect(PO_TRANSITIONS[PurchaseOrderStatus.CLOSED]).toEqual([]);
      expect(PO_TRANSITIONS[PurchaseOrderStatus.CANCELLED]).toEqual([]);
    });

    it('should allow REJECTED to return to DRAFT', () => {
      expect(PO_TRANSITIONS[PurchaseOrderStatus.REJECTED]).toContain(PurchaseOrderStatus.DRAFT);
    });
  });

  describe('Sales Order State Transitions', () => {
    it('should allow valid fulfillment lifecycle progression', () => {
      expect(SO_TRANSITIONS[SalesOrderStatus.DRAFT]).toContain(SalesOrderStatus.CONFIRMED);
      expect(SO_TRANSITIONS[SalesOrderStatus.CONFIRMED]).toContain(SalesOrderStatus.PICKING);
      expect(SO_TRANSITIONS[SalesOrderStatus.PICKING]).toContain(SalesOrderStatus.PACKED);
      expect(SO_TRANSITIONS[SalesOrderStatus.PACKED]).toContain(SalesOrderStatus.SHIPPED);
      expect(SO_TRANSITIONS[SalesOrderStatus.SHIPPED]).toContain(SalesOrderStatus.DELIVERED);
    });

    it('should disallow transitions from terminal states', () => {
      expect(SO_TRANSITIONS[SalesOrderStatus.DELIVERED]).toEqual([]);
      expect(SO_TRANSITIONS[SalesOrderStatus.CANCELLED]).toEqual([]);
    });

    it('should not allow skipping directly from DRAFT to SHIPPED', () => {
      expect(SO_TRANSITIONS[SalesOrderStatus.DRAFT]).not.toContain(SalesOrderStatus.SHIPPED);
    });
  });

  describe('JWT Utilities', () => {
    const payload = {
      userId: '507f1f77bcf86cd799439011',
      orgId: '507f1f77bcf86cd799439012',
      role: Role.ADMIN,
    };

    it('should correctly sign and verify access tokens', () => {
      const token = generateAccessToken(payload);
      expect(typeof token).toBe('string');

      const verified = verifyAccessToken(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.orgId).toBe(payload.orgId);
      expect(verified.role).toBe(payload.role);
    });

    it('should correctly sign and verify refresh tokens', () => {
      const token = generateRefreshToken(payload);
      expect(typeof token).toBe('string');

      const verified = verifyRefreshToken(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.orgId).toBe(payload.orgId);
      expect(verified.role).toBe(payload.role);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });
  });
});
