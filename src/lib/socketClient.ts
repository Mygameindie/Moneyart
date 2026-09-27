"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/** Returns a singleton, lazily-connected socket.io client (auth via cookie). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}
