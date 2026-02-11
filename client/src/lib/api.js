const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('safeyou_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  updatePlan: (planId) => request('/auth/plan', { method: 'PUT', body: JSON.stringify({ planId }) }),

  // Repos
  getRepos: () => request('/repos'),
  addRepo: (body) => request('/repos', { method: 'POST', body: JSON.stringify(body) }),
  uploadBinary: (body) => request('/repos/upload', { method: 'POST', body: JSON.stringify(body) }),
  getRepo: (id) => request(`/repos/${id}`),
  deleteRepo: (id) => request(`/repos/${id}`, { method: 'DELETE' }),

  // Scans
  startScan: (repoId) => request('/scans', { method: 'POST', body: JSON.stringify({ repoId }) }),
  getScans: () => request('/scans'),
  getScan: (id) => request(`/scans/${id}`),

  // Reports
  getReport: (scanId) => request(`/reports/${scanId}`),
  downloadReport: async (scanId, format = 'json') => {
    const token = localStorage.getItem('safeyou_token');
    const response = await fetch(`${API_BASE}/reports/${scanId}/download?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = await response.json();
      const error = new Error(data.error || 'Download failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return response;
  },

  // Plans
  getPlans: () => request('/plans'),

  // Public
  publicScan: (body) => request('/public/scan', { method: 'POST', body: JSON.stringify(body) }),
};
