import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { prisma } from '../config/db.js';

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      const key = part.slice(0, eqIdx).trim();
      const val = decodeURIComponent(part.slice(eqIdx + 1).trim());
      result[key] = val;
    }
  }
  return result;
}

export class SocketService {
  private static io: SocketIOServer | null = null;

  static init(httpServer: http.Server): SocketIOServer {
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: [
          process.env.CLIENT_URL || 'http://localhost:5173',
          'http://localhost:5173',
          'http://127.0.0.1:5173',
        ],
        credentials: true,
      },
    });

    // Authenticate Socket.IO connections using the existing httpOnly token cookie
    io.use(async (socket: Socket, next) => {
      try {
        const cookies = parseCookieHeader(socket.handshake.headers.cookie);
        let token = cookies.token;

        if (!token && typeof socket.handshake.auth?.token === 'string') {
          token = socket.handshake.auth.token;
        }

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = verifyToken(token);
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, username: true, role: true, status: true, isDemo: true },
        });

        if (!user || user.status === 'SUSPENDED') {
          return next(new Error('Unauthorized or suspended account'));
        }

        socket.data.userId = user.id;
        socket.data.username = user.username;
        socket.data.role = user.role;
        next();
      } catch {
        return next(new Error('Invalid or expired session'));
      }
    });

    io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId as string;
      if (!userId) {
        socket.disconnect(true);
        return;
      }

      // One room per user
      socket.join(`user:${userId}`);

      // Verify participant on every socket event
      socket.on('conversation:join', async (payload: { conversationId?: string }, ack?: (res: any) => void) => {
        try {
          const conversationId = String(payload?.conversationId || '');
          if (!conversationId) {
            if (ack) ack({ success: false, message: 'conversationId is required' });
            return;
          }

          const participant = await prisma.conversationParticipant.findUnique({
            where: {
              conversationId_userId: {
                conversationId,
                userId,
              },
            },
          });

          if (!participant) {
            if (ack) ack({ success: false, message: 'Access denied: not a conversation participant' });
            return;
          }

          socket.join(`conversation:${conversationId}`);
          if (ack) ack({ success: true });
        } catch {
          if (ack) ack({ success: false, message: 'Failed to join conversation room' });
        }
      });

      socket.on('conversation:typing', async (payload: { conversationId?: string; isTyping?: boolean }) => {
        try {
          const conversationId = String(payload?.conversationId || '');
          if (!conversationId) return;

          // Verify participant on every socket event
          const conv = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { recruiterId: true, developerId: true, status: true },
          });

          if (!conv || conv.status !== 'ACTIVE') return;
          if (userId !== conv.recruiterId && userId !== conv.developerId) return;

          const otherUserId = userId === conv.recruiterId ? conv.developerId : conv.recruiterId;
          io.to(`user:${otherUserId}`).emit('conversation:typing', {
            conversationId,
            userId,
            isTyping: Boolean(payload?.isTyping),
          });
        } catch {
          // ignore
        }
      });
    });

    this.io = io;
    return io;
  }

  static emitToUser(userId: string, event: 'message:new' | 'conversation:updated' | 'notification:new', data: any) {
    if (!this.io || !userId) return;
    this.io.to(`user:${userId}`).emit(event, data);
  }
}

