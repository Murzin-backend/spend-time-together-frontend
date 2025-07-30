import React, {useState, useEffect} from 'react';
import {Link, useNavigate, useLocation} from 'react-router-dom';
import './LoginPage.css';
import api from "../../api/axiosConfig.ts";
import Notification from "../Notification/Notification.tsx";
import axios from "axios";
import logo from '../../assets/logo.png';

const LoginPage = () => {
    const [formData, setFormData] = useState({
        login: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' as 'success' | 'error' });
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.message) {
            setNotification({ message: location.state.message, type: 'success' });
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/auth/login', formData);
            navigate('/home', { state: { message: 'Вы успешно вошли!', isNewUser: false } });
        } catch (error) {
            if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 404)) {
                setNotification({ message: 'Неправильный логин или пароль.', type: 'error' });
            } else {
                setNotification({ message: 'Произошла ошибка. Попробуйте снова.', type: 'error' });
                console.error(error);
            }
        } finally {
            setIsLoading(false);
        }
    };

  return (
      <div className="auth-container">
          <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification({ message: '', type: 'success' })}
          />
          <div className="login-page-container">
              <div className="auth-header">
                  <img src={logo} alt="Логотип" className="auth-logo" />
                  <h2>Spend Time Together</h2>
              </div>
              <form onSubmit={handleSubmit}>
                  <div className="form-group">
                      <label htmlFor="login">Логин</label>
                      <input id="login" type="text" placeholder="Введите ваш логин" value={formData.login} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                      <label htmlFor="password">Пароль</label>
                      <input id="password" type="password" placeholder="Введите ваш пароль" value={formData.password} onChange={handleChange} required />
                  </div>
                  <button type="submit" className="login-button" disabled={isLoading}>
                      {isLoading ? <div className="spinner"></div> : 'Войти'}
                  </button>
              </form>
              <div className="signup-link">
                  Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
              </div>
          </div>
      </div>
  );
};

export default LoginPage;