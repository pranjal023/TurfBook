import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';


let accessToken = null;
let onAuthFailure = () => {};

export const setAccessToken = (token) => { accessToken = token; };
export const setAuthFailureHandler = (fn) => { onAuthFailure = fn; };

export const api = axios.create({ baseURL, withCredentials: true }); 
const bare = axios.create({ baseURL, withCredentials: true });       

let refreshPromise = null;
export function refreshSession() {
  refreshPromise ??= bare
    .post('/auth/refresh')
    .then((res) => {
      accessToken = res.data.data.accessToken;
      return res.data.data; 
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}


api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});


api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const code = error.response?.data?.error?.code;

    
    if (error.response?.status === 401 && code === 'UNAUTHENTICATED' && accessToken) {
      accessToken = null;
      onAuthFailure();
      return Promise.reject(error);
    }

    
    if (error.response?.status === 401 && code === 'TOKEN_INVALID' && original && !original._retried) {
      original._retried = true;
      try {
        await refreshSession();
        return api(original); 
      } catch {
        accessToken = null;
        onAuthFailure(); 
      }
    }
    return Promise.reject(error);
  }
);

export function errorMessage(err) {
  const details = err.response?.data?.error?.details;
  if (Array.isArray(details) && details.length) return details.map((d) => d.message).join(', ');
  return err.response?.data?.error?.message ?? err.message ?? 'Something went wrong';
}