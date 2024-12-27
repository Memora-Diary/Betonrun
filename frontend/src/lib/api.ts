import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true
});

export const auth = {
  getStravaLoginUrl: async (contestId?: number | null) => {
    const response = await api.get('/auth/strava/login', {
      params: { contest_id: contestId }
    });
    return response.data.authorize_url;
  }
};

export const contests = {
  create: async (data: { title: string; stake_amount: number; schedule: any }) => {
    const response = await api.post('/contests/create', data);
    return response.data;
  },

  join: async (contestId: number) => {
    const response = await api.post(`/contests/join/${contestId}`);
    return response.data;
  },

  list: async () => {
    const response = await api.get('/contests/list');
    return response.data;
  },

  verifyRun: async (contestId: number) => {
    const response = await api.post(`/contests/verify-run/${contestId}`);
    return response.data;
  }
}; 