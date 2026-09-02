import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl =
      ((import.meta as any).env?.VITE_API_URL as string | undefined)?.replace('/api', '') ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('⚡ Socket.IO real-time channel connected');
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('⚡ Socket.IO channel disconnected');
    });

    socketInstance.on('stock:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balance'] });
      queryClient.invalidateQueries({ queryKey: ['stock-history'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    });

    socketInstance.on('order:updated', (data: { type: string; orderNumber?: string; status: string }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      if (data.orderNumber) {
        toast(`${data.type} ${data.orderNumber} is now ${data.status.replace(/_/g, ' ')}`, {
          icon: '🔄',
        });
      }
    });

    socketInstance.on('alert:new', (alert: any) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['alerts-count'] });

      const severityIcons: Record<string, string> = {
        critical: '🚨',
        high: '⚠️',
        medium: '🔔',
        low: 'ℹ️',
      };

      toast(alert.message || 'New system alert generated', {
        icon: severityIcons[alert.severity] || '🔔',
        duration: 5000,
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
