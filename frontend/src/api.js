import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({ baseURL: BASE_URL });

// api settings

// Auth
export const sendOTP = (email) => api.post('/api/auth/send-otp', { email });
export const verifyOTP = (email, otp) => api.post('/api/auth/verify-otp', { email, otp });

// Dashboard
export const getDashboard = () => api.get('/api/dashboard');
export const getLocations = () => api.get('/api/locations');

// Properties
export const getProperties = (params) => api.get('/api/properties', { params });
export const getProperty = (id) => api.get(`/api/properties/${id}`);
export const createProperty = (data) => api.post('/api/properties', data);
export const updateProperty = (id, data) => api.put(`/api/properties/${id}`, data);
export const deleteProperty = (id) => api.delete(`/api/properties/${id}`);

// Files
export const uploadFile = (fileData, fileName, fileType) =>
  api.post('/api/upload', { file_data: fileData, file_name: fileName, file_type: fileType });
export const deleteFile = (publicId) => api.delete(`/api/upload/${publicId}`);

export default api;
