import { io } from "socket.io-client";
import { useSocketStore } from "./store";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim() || undefined;

export function createSocket(user) {
  const token = localStorage.getItem("gnosis_token");
  const socket = io(SOCKET_URL, {
    transports: ["polling", "websocket"],
    auth: { token }
  });

  socket.on("connect", () => {
    if (user?.id) {
      socket.emit("user:identify", {
        userId: user.id,
        username: user.username,
      });

      // Heartbeat every 20 seconds to keep online status active
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit("user:heartbeat", { userId: user.id });
        }
      }, 20000);

      socket.heartbeatInterval = heartbeatInterval;
    }
  });

  socket.on("disconnect", () => {
    if (socket.heartbeatInterval) {
      clearInterval(socket.heartbeatInterval);
    }
  });

  socket.on('notification:new', (notification) => {
      useSocketStore.getState().addNotification(notification);
  });

  return socket;
}
