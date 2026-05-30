import { create } from "zustand";

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("gnosis_token") || null,
  authStatus: localStorage.getItem("gnosis_token") ? "checking" : "unauthenticated",

  login: (user, token) => {
    localStorage.setItem("gnosis_token", token);
    set({ user, token, authStatus: "authenticated" });
  },

  logout: () => {
    localStorage.removeItem("gnosis_token");
    set({ user: null, token: null, authStatus: "unauthenticated" });
  },

  setUser: (user) =>
    set({
      user,
      authStatus: user ? "authenticated" : "unauthenticated",
    }),

  setAuthStatus: (authStatus) => set({ authStatus }),
}));

export const useAppStore = create((set) => ({
  imageMap: {},

  setImageMap: (map) => set({ imageMap: map }),
}));

export const useSocketStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,

  setSocket: (socket) => set({ socket }),

  setNotifications: (notifs) =>
    set({
      notifications: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((state) => {
      const newNotifications = [
        notification,
        ...state.notifications,
      ].slice(0, 6);

      return {
        notifications: newNotifications,
        unreadCount: newNotifications.filter(
          (n) => !n.read
        ).length,
      };
    }),

  removeNotification: (id) =>
    set((state) => {
      const removed = state.notifications.find(
        (n) => n.id === id
      );

      return {
        notifications: state.notifications.filter(
          (n) => n.id !== id
        ),

        unreadCount:
          removed && !removed.read
            ? Math.max(
                0,
                state.unreadCount - 1
              )
            : state.unreadCount,
      };
    }),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id
          ? { ...n, read: true }
          : n
      ),

      unreadCount: Math.max(
        0,
        state.unreadCount - 1
      ),
    })),
}));