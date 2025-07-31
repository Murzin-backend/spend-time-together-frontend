import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Notification from '../Notification/Notification.tsx';
import api from "../../api/axiosConfig.ts";
import './RegistrationPage.css';
import logo from '../../assets/logo.png';

const AVATAR_MAX_SIZE_MB = 5;
const ALLOWED_AVATAR_CONTENT_TYPES = ['image/png', 'image/jpeg'];

const RegistrationPage = () => {
    const [formData, setFormData] = useState({
        login: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        confirmPassword: '',
        telegram_link: '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' as 'success' | 'error' });
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (!ALLOWED_AVATAR_CONTENT_TYPES.includes(file.type)) {
                setNotification({ message: `Неверный формат файла. Разрешены: ${ALLOWED_AVATAR_CONTENT_TYPES.join(', ')}`, type: 'error' });
                e.target.value = '';
                setAvatarFile(null);
                setAvatarPreview(null);
                return;
            }

            if (file.size > AVATAR_MAX_SIZE_MB * 1024 * 1024) {
                setNotification({ message: `Размер файла не должен превышать ${AVATAR_MAX_SIZE_MB} МБ.`, type: 'error' });
                e.target.value = '';
                setAvatarFile(null);
                setAvatarPreview(null);
                return;
            }

            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        } else {
            setAvatarFile(null);
            setAvatarPreview(null);
        }
    };

    const handleRemoveAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview(null);
        const avatarInput = document.getElementById('avatar') as HTMLInputElement;
        if (avatarInput) {
            avatarInput.value = '';
        }
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
            await api.post('/auth/registration', dataToSend);
            await api.post('/auth/login', { login: dataToSend.login, password: dataToSend.password });

            if (avatarFile) {
                const avatarFormData = new FormData();
                avatarFormData.append('file', avatarFile);
                try {
                    await api.post('/users/me/avatar', avatarFormData);
                } catch (avatarError) {
                    if (axios.isAxiosError(avatarError) && avatarError.response?.status === 400) {
                        let errorMessage = 'Не удалось загрузить аватар.';
                        const detail = avatarError.response?.data?.detail || '';
                        if (detail.includes("formats are allowed")) {
                            errorMessage = "Неверный формат файла. Пожалуйста, выберите PNG или JPEG.";
                        } else if (detail.includes("exceed")) {
                            errorMessage = `Размер файла слишком большой. Максимальный размер: ${AVATAR_MAX_SIZE_MB}МБ.`;
                        }
                        setNotification({ message: errorMessage, type: 'error' });
                        setIsLoading(false);
                        return;
                    }
                    console.error("Avatar upload failed:", avatarError);
                    navigate('/home', { state: { message: 'Регистрация успешна, но не удалось загрузить аватар.', isNewUser: true } });
                    return;
                }
            }

            navigate('/home', { state: { message: 'Регистрация прошла успешно! Добро пожаловать!', isNewUser: true } });
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
        <div className="auth-container">
            <Notification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: 'success' })}
            />
            <div className="registration-page-container">
                <div className="auth-header">
                    <img src={logo} alt="Логотип" className="auth-logo" />
                    <h2>Создание аккаунта</h2>
                </div>
                <p className="subtitle">Присоединяйтесь к нам, чтобы начать!</p>
                <form onSubmit={handleSubmit}>
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
                        <label htmlFor="telegram_link">Ссылка на Telegram (необязательно)</label>
                        <input id="telegram_link" type="text" placeholder="https://t.me/username" value={formData.telegram_link} onChange={handleChange} />
                    </div>
                    <div className="form-group avatar-upload-group">
                        <label>Аватар (необязательно)</label>
                        <div className="avatar-upload-container">
                            <input id="avatar" type="file" accept="image/png, image/jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
                            <div className="avatar-preview-container">
                                <label htmlFor="avatar" className="avatar-upload-label">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Превью аватара" className="avatar-preview" />
                                    ) : (
                                        <span></span>
                                    )}
                                </label>
                                {avatarPreview && (
                                    <button type="button" className="remove-avatar-btn" onClick={handleRemoveAvatar}>×</button>
                                )}
                            </div>
                            <div className="avatar-upload-text">
                                {avatarFile ? `Выбран файл: ${avatarFile.name}` : 'Нажмите, чтобы загрузить'}
                            </div>
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
        </div>
    );
};

export default RegistrationPage;