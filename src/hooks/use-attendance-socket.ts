"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseAttendanceSocketReturn {
  isConnected: boolean;
  onDutySAs: Set<string>;
  connect: () => void;
  disconnect: () => void;
}

export function useAttendanceSocket(): UseAttendanceSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onDutySAs, setOnDutySAs] = useState<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // Request current on-duty status
      socket.emit("get_status");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("status_update", (data: { onDutySAs: string[] }) => {
      setOnDutySAs(new Set(data.onDutySAs));
    });

    socket.on("clock_in", (data: { userId: string }) => {
      setOnDutySAs((prev) => {
        const next = new Set(prev);
        next.add(data.userId);
        return next;
      });
    });

    socket.on("clock_out", (data: { userId: string }) => {
      setOnDutySAs((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    socket.on("connect_error", (err) => {
      console.error("Attendance socket connection error:", err.message);
      setIsConnected(false);
    });
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setOnDutySAs(new Set());
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    onDutySAs,
    connect,
    disconnect,
  };
}
