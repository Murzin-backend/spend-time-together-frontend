import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const skip = (error.config as any)?.skipAuthRedirect;
        const alreadyOnLogin = window.location.pathname === '/login';
        if (error.response && error.response.status === 401 && !skip && !alreadyOnLogin) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
