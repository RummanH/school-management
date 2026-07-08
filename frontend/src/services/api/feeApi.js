import { apiRequest, buildQueryString } from './client.js';

export const listFeeCategories = () => apiRequest('/fees/categories');
export const createFeeCategory = (data) => apiRequest('/fees/categories', { method: 'POST', body: data });
export const updateFeeCategory = (id, data) => apiRequest(`/fees/categories/${id}`, { method: 'PUT', body: data });
export const deleteFeeCategory = (id) => apiRequest(`/fees/categories/${id}`, { method: 'DELETE' });

export const listFeeAssignments = (studentUserId) => apiRequest(`/fees/assignments${buildQueryString({ studentUserId })}`);
export const createFeeAssignment = (data) => apiRequest('/fees/assignments', { method: 'POST', body: data });
export const updateFeeAssignment = (id, data) => apiRequest(`/fees/assignments/${id}`, { method: 'PUT', body: data });
export const deleteFeeAssignment = (id) => apiRequest(`/fees/assignments/${id}`, { method: 'DELETE' });

export const listFeeInvoices = (filters = {}) => apiRequest(`/fees/invoices${buildQueryString(filters)}`);
export const getFeeInvoice = (id) => apiRequest(`/fees/invoices/${id}`);
export const generateFeeInvoices = (data) => apiRequest('/fees/invoices/generate', { method: 'POST', body: data });
export const recordFeePayment = (invoiceId, data) => apiRequest(`/fees/invoices/${invoiceId}/payments`, { method: 'POST', body: data });
export const listFeePayments = (filters = {}) => apiRequest(`/fees/payments${buildQueryString(filters)}`);

export const listExpenses = () => apiRequest('/fees/expenses');
export const createExpense = (data) => apiRequest('/fees/expenses', { method: 'POST', body: data });
export const deleteExpense = (id) => apiRequest(`/fees/expenses/${id}`, { method: 'DELETE' });
export const getFeeReport = (period) => apiRequest(`/fees/report${buildQueryString({ period })}`);

export const getMyFees = () => apiRequest('/fees/me');
export const getWardFees = (studentUserId) => apiRequest(`/guardian/wards/${studentUserId}/fees`);
