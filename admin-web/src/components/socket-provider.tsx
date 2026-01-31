"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

// 生产环境使用环境变量，开发环境使用 localhost
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Admin Socket] Connecting to:', WS_URL);
    const socketInstance = io(WS_URL, {
      query: { userId: 'super-admin' },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Admin WebSocket Connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Admin WebSocket Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('systemBroadcast', (data) => {
      console.log('📢 Admin Received Broadcast:', data);
      
      // 1. 如果是任务更新，刷新任务统计
      if (data.type === 'QUEST_UPDATE') {
        queryClient.invalidateQueries({ queryKey: ["adminQuestStats"] });
        queryClient.invalidateQueries({ queryKey: ["adminQuests"] });
      }

      // 2. 如果是用户资料更新，刷新审计数据
      if (data.type === 'USER_PROFILE_UPDATE') {
        queryClient.invalidateQueries({ queryKey: ["adminUserAudit"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      }

      // 3. 如果是功能开关更新，刷新状态
      if (data.type === 'FEATURE_FLAG_UPDATE') {
        queryClient.invalidateQueries({ queryKey: ["adminFeatureFlags"] });
      }
    });

    // 4. 监听新下注，刷新仪表盘
    socketInstance.on('newBet', (data) => {
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminLogs"] });
    });

    // 5. 监听新交易 (充值提现)
    socketInstance.on('admin:newTransaction', (data) => {
      queryClient.invalidateQueries({ queryKey: ["adminVaultHistory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
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
}
