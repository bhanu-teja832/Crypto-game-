"use client";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "./constants";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../../shared/src/types";

// Typed Socket.IO client — single instance shared across the app
export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** Get (or lazily create) the singleton Socket.IO connection. */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    }) as AppSocket;
  }
  return socket;
}

/** Disconnect and destroy the singleton (used during hot-reload in dev). */
export function destroySocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
