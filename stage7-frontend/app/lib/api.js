import axios from 'axios';

const API_BASE = 'http://4.224.186.213/evaluation-service';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Accept': 'application/json' },
});

/**
 * Fetch notifications with optional query params.
 * @param {Object} params - { page, limit, notification_type }
 */
export async function fetchNotifications(params = {}) {
  try {
    const response = await api.get('/notifications', { params });
    return response.data;
  } catch (error) {
    console.error('[API] Failed to fetch notifications:', error.message);
    throw error;
  }
}
