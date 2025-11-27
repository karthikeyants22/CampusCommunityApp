import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Config from "react-native-config";

export const API_BASE_URL = Config.API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("Missing API_BASE_URL environment variable");
}

export const API_TIMEOUT_MS = Number(Config.API_TIMEOUT_MS) || 15000;
export const ACCESS_TOKEN_KEY = Config.ACCESS_TOKEN_KEY || "accessToken";
export const REFRESH_TOKEN_KEY = Config.REFRESH_TOKEN_KEY || "refreshToken";

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch (error) {
    return "";
  }
})();

const resolveRequestOrigin = (config = {}) => {
  const target = config.url;
  if (!target) {
    return "";
  }
  try {
    if (/^https?:\/\//i.test(target)) {
      return new URL(target).origin;
    }
    const base = config.baseURL || API_BASE_URL;
    if (!base) {
      return "";
    }
    return new URL(target, base).origin;
  } catch (error) {
    return "";
  }
};

const shouldAttachAuth = config => {
  if (config?.skipAuth) {
    return false;
  }
  if (!API_ORIGIN) {
    return true;
  }
  const requestOrigin = resolveRequestOrigin(config);
  if (!requestOrigin) {
    return true;
  }
  return requestOrigin === API_ORIGIN;
};

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: API_TIMEOUT_MS,
  validateStatus: () => true,
});

// Request: attach token for protected endpoints only; never block public calls
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      config.headers = config.headers || {};
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);

      // Attach Authorization only when a token exists; otherwise leave headers untouched
      const allowAuthHeader = shouldAttachAuth(config);

      if (token && allowAuthHeader) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (!allowAuthHeader && config.headers.Authorization) {
        delete config.headers.Authorization;
      }
    } catch (e) {
      console.log("Error reading token:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response: clear tokens on 401; normalize network errors so callers always get a response-like object
axiosClient.interceptors.response.use(
  async (response) => {
    if (response.status === 401) {
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
    }
    return response;
  },
  (error) => {
    const message = error?.message || "Network Error";
    const data = error?.response?.data || { error: message };
    const status = error?.response?.status ?? 0; // 0 => transport/timeout failure
    console.log("AXIOS ERROR:", message);
    return Promise.resolve({
      status,
      data,
      headers: error?.response?.headers || {},
      config: error?.config,
      request: error?.request,
    });
  }
);

export default axiosClient;

