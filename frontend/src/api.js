import { log } from './logger'

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const start = performance.now();
  const token = localStorage.getItem('docmind_token');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  log.debug('api', `${method} ${path}`);

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('docmind_token');
    log.warn('api', `${method} ${path} -> 401 session expired, redirecting to /login`);
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    const duration = Math.round(performance.now() - start);
    log.error('api', `${method} ${path} -> ${res.status} ${err.detail || ''} (${duration}ms)`);
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  const duration = Math.round(performance.now() - start);
  log.info('api', `${method} ${path} -> ${res.status} (${duration}ms)`);
  return res.json();
}

export const api = {
  health: () => request('/health'),
  stats: () => request('/stats'),

  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/auth/me'),

  listUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  listDocuments: (page = 1, size = 20, tag = null, contentType = null) => {
    const params = new URLSearchParams({ page, size });
    if (tag) params.set('tag', tag);
    if (contentType) params.set('content_type', contentType);
    return request(`/documents?${params}`);
  },
  getDocument: (id) => request(`/documents/${id}`),
  createDocument: (doc) => request('/documents', { method: 'POST', body: JSON.stringify(doc) }),
  updateDocument: (id, doc) => request(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(doc) }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  uploadFile: async (file, embed = true) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('docmind_token');
    const start = performance.now();
    log.debug('upload', `POST /documents/upload file=${file.name} size=${file.size} embed=${embed}`);
    const res = await fetch(`${BASE}/documents/upload?embed=${embed}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const duration = Math.round(performance.now() - start);
      log.error('upload', `upload failed ${file.name} -> ${res.status} (${duration}ms)`);
      throw new Error('Upload failed');
    }
    const duration = Math.round(performance.now() - start);
    log.info('upload', `upload OK ${file.name} (${duration}ms)`);
    return res.json();
  },

  searchDocuments: (query, size = 20, tags = null) =>
    request('/search', { method: 'POST', body: JSON.stringify({ query, size, tags }) }),

  vectorSearch: (query, nResults = 10, searchType = 'all', docIds = []) =>
    request('/search/vector', { method: 'POST', body: JSON.stringify({ query, n_results: nResults, search_type: searchType, doc_ids: docIds }) }),

  embedDocument: (docId) => request(`/embed/${docId}`, { method: 'POST' }),
  batchEmbed: (docIds = [], reembed = false) =>
    request('/embed/batch', { method: 'POST', body: JSON.stringify({ doc_ids: docIds, reembed }) }),

  listTags: () => request('/tags'),
  summarize: (data) => request('/ai/summarize', { method: 'POST', body: JSON.stringify(data) }),
  askQuestion: (data) => request('/ai/ask', { method: 'POST', body: JSON.stringify(data) }),
  translate: (data) => request('/ai/translate', { method: 'POST', body: JSON.stringify(data) }),
  chat: (data) => request('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),

  autoTags: (data) => request('/ai/auto-tags', { method: 'POST', body: JSON.stringify(data) }),
  docInsights: (data) => request('/ai/insights', { method: 'POST', body: JSON.stringify(data) }),
  docInsightsQuick: (docId) => request(`/doc-insights/${docId}`),
  searchSuggestions: (query) => request('/ai/suggest', { method: 'POST', body: JSON.stringify({ query, size: 5 }) }),

  extractEntities: (data) => request('/ai/extract-entities', { method: 'POST', body: JSON.stringify(data) }),
  getDocEntities: (docId) => request(`/documents/${docId}/entities`),
  getDocImages: (docId) => request(`/documents/${docId}/images`),
  fullExtract: (data) => request('/ai/full-extract', { method: 'POST', body: JSON.stringify(data) }),
  extractFromUpload: async (docId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('docmind_token');
    log.debug('upload', `POST /documents/${docId}/extract-from-upload file=${file.name}`);
    const res = await fetch(`${BASE}/documents/${docId}/extract-from-upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Image extraction failed');
    return res.json();
  },

  detectFaces: (docId) => request(`/images/${docId}/detect-faces`, { method: 'POST' }),
  faceSearch: (imageId, faceIndex = 0, threshold = 0.6, nResults = 20) =>
    request('/search/faces', { method: 'POST', body: JSON.stringify({ image_id: imageId, face_index: faceIndex, threshold, n_results: nResults }) }),
  faceGallery: () => request('/faces/gallery'),
  faceStats: () => request('/faces/stats'),
  intelGraph: () => request('/intel/graph'),
};
