import { apiRequest } from './client.js';

export async function submitContact({ name, phone, message }) {
  return apiRequest('/contact', {
    method: 'POST',
    body: { name, phone, message },
  });
}
