import api from './client';

export const listTickets = (params) => api.get('/tickets', { params }).then((r) => r.data);
export const getTicket = (id) => api.get(`/tickets/${id}`).then((r) => r.data);
export const createTicket = (body) => api.post('/tickets', body).then((r) => r.data);
export const updateTicket = (id, body) => api.patch(`/tickets/${id}`, body).then((r) => r.data);
export const reassignTicket = (id, newAssigneeId) =>
  api.patch(`/tickets/${id}/reassign`, { newAssigneeId }).then((r) => r.data);
export const archiveTicket = (id) => api.post(`/tickets/${id}/archive`).then((r) => r.data);
export const listUsers = () => api.get('/users').then((r) => r.data);
export const listMyTickets = () => api.get('/tickets/mine').then((r) => r.data);
export const addReply = (id, body, isInternal, authorType) =>
  api.post(`/tickets/${id}/replies`, { body, isInternal, authorType }).then((r) => r.data);
export const changeStatus = (id, newStatus) =>
  api.patch(`/tickets/${id}/status`, { newStatus }).then((r) => r.data);
export const setCollaborators = (id, collaboratorIds) =>
  api.patch(`/tickets/${id}/collaborators`, { collaboratorIds }).then((r) => r.data);
export const restoreTicket = (id) => api.post(`/tickets/${id}/restore`).then((r) => r.data);
export const claimTicket = (id) => api.post(`/tickets/${id}/claim`).then((r) => r.data);
export const bulkReassign = (ticketIds, newAssigneeId) =>
  api.post('/tickets/bulk/reassign', { ticketIds, newAssigneeId }).then((r) => r.data);
export const bulkClose = (ticketIds) =>
  api.post('/tickets/bulk/close', { ticketIds }).then((r) => r.data);
export const getExportUrl = (filters) => {
  const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
  return `${import.meta.env.API_URL}/tickets/export?${params}`;
};
// client/src/api/tickets.js — replace getExportUrl with:
export const downloadExport = async (filters) => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const response = await api.get('/tickets/export', { params, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tickets-export.csv';
  link.click();
  window.URL.revokeObjectURL(url);
};
