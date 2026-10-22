import axios from "axios";

export const getBaseUrl = () => {
  if (typeof window === "undefined") {
    return (
      process.env.INTERNAL_API_URL ||
      (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : null) ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:5008/api"
    );
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5008/api";
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Untuk menyertakan cookie HttpOnly refresh_token
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Sisipkan Access Token JWT dari localStorage
apiClient.interceptors.request.use(
  (config) => {
    // Normalisasi url jika diawali dengan "/api" agar tidak terjadi double prefix /api/api
    if (config.url && config.url.startsWith("/api/")) {
      config.url = config.url.substring(4);
    } else if (config.url === "/api") {
      config.url = "";
    }

    // Jika data adalah FormData, hapus Content-Type agar Axios/Browser menyetel boundary secara otomatis
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
      if (typeof (config.headers as any).delete === "function") {
        (config.headers as any).delete("Content-Type");
        (config.headers as any).delete("content-type");
      }
    }

    if (typeof window === "undefined") {
      config.baseURL = getBaseUrl();
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Tangani 401 Unauthorized via Silent Refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jangan coba refresh jika request yang gagal adalah request login atau refresh-token itu sendiri
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh-token")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newToken = refreshResponse.data.data?.accessToken;
        if (newToken) {
          localStorage.setItem("access_token", newToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error("No token returned");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_profile");
          // Redirect to login only if not already on login page
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login?reason=session_expired";
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
