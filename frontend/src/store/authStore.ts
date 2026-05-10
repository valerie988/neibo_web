import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "../services/api";

interface User {
  id: string; full_name: string; email: string;
  phone?: string; role: "farmer" | "customer";
  location?: string; avatar_url?: string; is_verified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login:  (email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  loadMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: async (email, password, role) => {
        const { data } = await authApi.login(email, password, role);
        localStorage.setItem("access_token",  data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        set({ accessToken: data.access_token, refreshToken: data.refresh_token });
        await get().loadMe();
      },

      logout: () => {
        localStorage.clear();
        set({ user: null, accessToken: null, refreshToken: null });
      },

      loadMe: async () => {
        try {
          const { data } = await authApi.me();
          set({ user: data });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: "agrimarket-auth",
      partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
);
