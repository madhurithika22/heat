import axios from 'axios';

const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' || 
         window.location.hostname.startsWith('192.168.'))) {
        return 'http://127.0.0.1:8000/api/v1';
    }
    return 'https://madhurithika22-heat-treatment.hf.space/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export const documentApi = {
    uploadDocument: async (file, mock = false) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_BASE_URL}/documents/process?mock=${mock}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    checkStatus: async (taskId) => {
        const response = await axios.get(`${API_BASE_URL}/documents/status/${taskId}`);
        return response.data;
    },

    getAllDocuments: async () => {
        const response = await axios.get(`${API_BASE_URL}/documents`);
        return response.data;
    },

    exportDocuments: async () => {
        const response = await axios.get(`${API_BASE_URL}/documents/export`, {
            responseType: 'blob'
        });
        return response.data;
    }
};
