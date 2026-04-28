import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = '3002';

const resolveHostFromExpo = () => {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.manifest?.debuggerHost,
    Constants.expoGoConfig?.debuggerHost,
  ].filter(Boolean);

  for (const raw of candidates) {
    const host = String(raw).split(':')[0]?.trim();
    if (host) return host;
  }

  return null;
};

const resolveApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const detectedHost = resolveHostFromExpo();
  if (detectedHost) return `http://${detectedHost}:${API_PORT}/api`;

  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}/api`;
  return `http://localhost:${API_PORT}/api`;
};

let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);

export const setAuthToken = (token) => {
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization;
    return;
  }
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
};

export const getApiBaseUrl = () => apiClient.defaults.baseURL;

export default apiClient;
