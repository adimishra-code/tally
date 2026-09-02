import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, JWTPayload } from './jwt';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: CLIENT_ORIGIN,
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const payload: JWTPayload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JWTPayload;
    const orgRoom = `org:${user.orgId}`;

    // Join the organization's private tenant room
    socket.join(orgRoom);
    console.log(`🔌 Socket connected: user=${user.userId}, org=${user.orgId}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: user=${user.userId}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

/**
 * Broadcast stock balance change to all users in the organization
 */
export const broadcastStockUpdate = (
  orgId: string,
  data: { productId: string; warehouseId: string; newBalance?: number }
) => {
  if (!io) return;
  io.to(`org:${orgId}`).emit('stock:updated', data);
};

/**
 * Broadcast purchase or sales order status change
 */
export const broadcastOrderUpdate = (
  orgId: string,
  data: { type: 'PO' | 'SO'; orderId: string; status: string; orderNumber?: string }
) => {
  if (!io) return;
  io.to(`org:${orgId}`).emit('order:updated', data);
};

/**
 * Broadcast newly created or updated alert
 */
export const broadcastAlert = (orgId: string, alert: any) => {
  if (!io) return;
  io.to(`org:${orgId}`).emit('alert:new', alert);
};
