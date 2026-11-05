import axios from 'axios';

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const API_BASE = rawApiUrl.startsWith('http') && !rawApiUrl.endsWith('/api') ? `${rawApiUrl}/api` : rawApiUrl;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('apex_portal_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function uploadFileToServer(file, folder = 'documents') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const token = localStorage.getItem('apex_portal_token');
  const response = await axios.post(`${API_BASE}/admin/upload`, formData, {
    withCredentials: true,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  return response.data.file;
}

export function getDownloadUrl(pathWithQuery) {
  const token = localStorage.getItem('apex_portal_token');
  const separator = pathWithQuery.includes('?') ? '&' : '?';
  return `${API_BASE}${pathWithQuery}${token ? `${separator}token=${encodeURIComponent(token)}` : ''}`;
}

export default api;
