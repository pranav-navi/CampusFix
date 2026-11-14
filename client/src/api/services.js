import api from './client';

const data = (p) => p.then((r) => r.data);

// Strips empty filter values so they don't reach the API as ?status=
const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));

/** Builds multipart form data from plain fields + antd Upload fileList */
const toFormData = (fields, fileList = []) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  fileList.forEach((f) => fd.append('images', f.originFileObj || f));
  return fd;
};

export const authApi = {
  login: (body) => data(api.post('/auth/login', body)),
  register: (body) => data(api.post('/auth/register', body)),
  me: () => data(api.get('/auth/me')),
  updateMe: (body) => data(api.patch('/auth/me', body)),
  changePassword: (body) => data(api.patch('/auth/me/password', body)),
};

export const metaApi = {
  get: () => data(api.get('/meta')),
};

export const complaintApi = {
  list: (params) => data(api.get('/complaints', { params: clean(params) })),
  get: (id) => data(api.get(`/complaints/${id}`)),
  create: (fields, files) => data(api.post('/complaints', toFormData(fields, files))),
  update: (id, body) => data(api.patch(`/complaints/${id}`, body)),
  remove: (id) => data(api.delete(`/complaints/${id}`)),
  setStatus: (id, body) => data(api.patch(`/complaints/${id}/status`, body)),
  setPriority: (id, priority) => data(api.patch(`/complaints/${id}/priority`, { priority })),
  assign: (id, body) => data(api.patch(`/complaints/${id}/assign`, body)),
  addRemark: (id, text) => data(api.post(`/complaints/${id}/remarks`, { text })),
  addUpdate: (id, fields, files) => data(api.post(`/complaints/${id}/updates`, toFormData(fields, files))),
  reopen: (id, reason) => data(api.post(`/complaints/${id}/reopen`, { reason })),
  feedback: (id, body) => data(api.post(`/complaints/${id}/feedback`, body)),
};

export const departmentApi = {
  list: (params) => data(api.get('/departments', { params: clean(params) })),
  get: (id) => data(api.get(`/departments/${id}`)),
  create: (body) => data(api.post('/departments', body)),
  update: (id, body) => data(api.patch(`/departments/${id}`, body)),
  remove: (id) => data(api.delete(`/departments/${id}`)),
};

export const userApi = {
  list: (params) => data(api.get('/users', { params: clean(params) })),
  staff: (department) => data(api.get('/users/staff', { params: clean({ department }) })),
  get: (id) => data(api.get(`/users/${id}`)),
  create: (body) => data(api.post('/users', body)),
  update: (id, body) => data(api.patch(`/users/${id}`, body)),
  remove: (id) => data(api.delete(`/users/${id}`)),
};

export const feedbackApi = {
  list: (params) => data(api.get('/feedback', { params: clean(params) })),
};

export const notificationApi = {
  list: (params) => data(api.get('/notifications', { params: clean(params) })),
  markRead: (id) => data(api.patch(`/notifications/${id}/read`)),
  markAllRead: () => data(api.patch('/notifications/read-all')),
};

export const dashboardApi = {
  stats: () => data(api.get('/dashboard/stats')),
  analytics: (months) => data(api.get('/dashboard/analytics', { params: clean({ months }) })),
};
