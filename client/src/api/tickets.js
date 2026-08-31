import api from './client';

export const listTickets = (params) => api.get('/tickets', { params }).then((r) => r.data);
export const getTicket = (id) => api.get(`/tickets/${id}`).then((r) => r.data);
export const createTicket = (body) => api.post('/tickets', body).then((r) => r.data);
export const updateTicket = (id, body) => api.patch(`/tickets/${id}`, body).then((r) => r.data);
export const reassignTicket = (id, newAssigneeId) =>
  api.patch(`/tickets/${id}/reassign`, { newAssigneeId }).then((r) => r.data);
export const archiveTicket = (id) => api.post(`/tickets/${id}/archive`).then((r) => r.data);
export const listUsers = () => api.get('/users').then((r) => r.data);