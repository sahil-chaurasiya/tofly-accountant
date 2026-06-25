import axios from 'axios';

const api = axios.create({ baseURL: (import.meta.env.VITE_API_URL || '') + '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

// Clients
export const clientsApi = {
  getAll: (params?: any) => api.get('/clients', { params }),
  getOne: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Payments
export const paymentsApi = {
  getAll: (params?: any) => api.get('/payments', { params }),
  create: (data: any) => api.post('/payments', data),
  update: (id: string, data: any) => api.put(`/payments/${id}`, data),
  delete: (id: string) => api.delete(`/payments/${id}`),
};

// Employees
export const employeesApi = {
  getAll: () => api.get('/employees'),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

// Salaries
export const salariesApi = {
  getAll: (params?: any) => api.get('/salaries', { params }),
  getMonthlySummary: (month: number, year: number) => api.get(`/salaries/summary/${month}/${year}`),
  create: (data: any) => api.post('/salaries', data),
  update: (id: string, data: any) => api.put(`/salaries/${id}`, data),
};

// Expenses
export const expensesApi = {
  getAll: (params?: any) => api.get('/expenses', { params }),
  getMonthlySummary: (month: number, year: number) => api.get(`/expenses/summary/${month}/${year}`),
  create: (data: any) => api.post('/expenses', data),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

// EMI
export const emiApi = {
  getLoans: () => api.get('/emis'),
  getLoan: (id: string) => api.get(`/emis/${id}`),
  createLoan: (data: any) => api.post('/emis', data),
  updateLoan: (id: string, data: any) => api.put(`/emis/${id}`, data),
  recordPayment: (data: any) => api.post('/emis/payment', data),
  deletePayment: (id: string) => api.delete(`/emis/payment/${id}`),
};

// Accounting
export const accountingApi = {
  getAll: () => api.get('/accounting'),
  getMonth: (month: number, year: number) => api.get(`/accounting/${month}/${year}`),
  upsert: (data: any) => api.post('/accounting', data),
};

// Dashboard
export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

// Reports
export const reportsApi = {
  get: (params: any) => api.get('/reports', { params }),
};

export default api;
