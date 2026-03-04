"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getSocket, destroySocket } from "@/lib/socket";
import type { AppSocket } from "@/lib/socket";

interface SocketContextValue {
  socket: AppSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: React.ReactNode;
}

/**
 * Provides a singleton Socket.IO connection to all child components.
 * Automatically authenticates the wallet address when the wallet connects.
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const { publicKey } = useWallet();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<AppSocket | null>(null);

  // Initialize socket
  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    // Set initial state
    if (s.connected) setConnected(true);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      // Don't destroy on unmount — keep the connection alive
    };
  }, []);

  // Authenticate wallet whenever it changes
  useEffect(() => {
    if (!publicKey || !socketRef.current?.connected) return;
    socketRef.current.emit("auth:wallet", publicKey.toBase58());
  }, [publicKey, connected]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
}
