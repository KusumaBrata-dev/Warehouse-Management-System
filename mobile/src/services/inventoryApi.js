import apiClient from './apiClient';

export const login = async (username, password) => {
  const { data } = await apiClient.post('/auth/login', { username, password });
  return data;
};

export const fetchStock = async (params) => {
  const { data } = await apiClient.get('/stock', { params });
  return data;
};

export const fetchProduct = async (productId) => {
  const { data } = await apiClient.get(`/products/${productId}`);
  return data;
};

export const fetchTransactions = async (params) => {
  const { data } = await apiClient.get('/transactions', { params });
  return data;
};

export const createTransaction = async (payload) => {
  const { data } = await apiClient.post('/transactions', payload);
  return data;
};
