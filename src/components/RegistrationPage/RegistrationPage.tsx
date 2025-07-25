import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Notification from '../Notification/Notification.tsx';

const RegistrationPage = () => {
    const [formData, setFormData] = useState({
        login: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' as 'success' | 'error' });
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setNotification({ message: 'Пароли не совпадают!', type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            const { confirmPassword, ...dataToSend } = formData;
            await axios.post('http://0.0.0.0:8000/api/auth/registration', dataToSend, {
                withCredentials: true
            });
            navigate('/login', { state: { message: 'Регистрация прошла успешно! Теперь вы можете войти.' } });
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                setNotification({ message: 'Пользователь с таким логином или email уже существует.', type: 'error' });
            } else {
                setNotification({ message: 'Неизвестная ошибка.', type: 'error' });
                console.error(error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Notification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: 'success' })}
            />
            <div className="registration-page-container">
                <form onSubmit={handleSubmit}>
                    <h2>Создание аккаунта</h2>
                    <p className="subtitle">Присоединяйтесь к нам, чтобы начать!</p>
                    <div className="form-group">
                        <label htmlFor="login">Логин</label>
                        <input id="login" type="text" placeholder="Придумайте логин" value={formData.login} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" placeholder="user@example.com" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="name-fields-group">
                        <div className="form-group">
                            <label htmlFor="first_name">Имя</label>
                            <input id="first_name" type="text" placeholder="Ваше имя" value={formData.first_name} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="last_name">Фамилия (необязательно)</label>
                            <input id="last_name" type="text" placeholder="Ваша фамилия" value={formData.last_name} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Пароль</label>
                        <input id="password" type="password" placeholder="Придумайте пароль" value={formData.password} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Подтвердите пароль</label>
                        <input id="confirmPassword" type="password" placeholder="Повторите пароль" value={formData.confirmPassword} onChange={handleChange} required />
                    </div>
                    <button type="submit" className="register-button" disabled={isLoading}>
                        {isLoading ? <div className="spinner"></div> : 'Создать аккаунт'}
                    </button>
                </form>
                <div className="signin-link">
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </div>
            </div>
        </>
    );
};

export default RegistrationPage;
