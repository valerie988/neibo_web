import axios from "axios";

// TypeScript might still complain here until you do Step 2 below
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${baseURL}/api/auth/refresh`, {
            refresh_token: refresh,
          });
          localStorage.setItem("access_token", data.access_token);
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${data.access_token}`;
            return api(error.config);
          }
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (email: string, password: string, role: string) =>
    api.post("/api/auth/login", { email, password, role }),
  signup: (data: any) => api.post("/api/auth/signup", data),
  me: () => api.get("/api/users/me"),
};

export const productsApi = {
  list: (params?: any) => api.get("/api/products", { params }),
  get: (id: string) => api.get(`/api/products/${id}`),
  my: () => api.get("/api/products/my"),
  create: (data: any) => api.post("/api/products", data),
  update: (id: string, data: any) => api.patch(`/api/products/${id}`, data),
  delete: (id: string) => api.delete(`/api/products/${id}`),
};

export const ordersApi = {
  list: () => api.get("/api/orders"),
  create: (data: any) => api.post("/api/orders", data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/api/orders/${id}/status`, { status }),
};

export const chatApi = {
  conversations: () => api.get("/api/chat/conversations"),
  messages: (id: string) => api.get(`/api/chat/conversations/${id}/messages`),
};

export const recommendApi = {
  feed: (params?: any) => api.get("/api/recommendations/me", { params }),
  trackView: (product_id: string) =>
    api.post("/api/recommendations/view", { product_id }),
};

export default api;
