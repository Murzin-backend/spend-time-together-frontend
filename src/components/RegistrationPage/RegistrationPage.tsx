import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from "../../api/axiosConfig.ts";
import './RegistrationPage.css';
import AuthLayout from '../AuthLayout/AuthLayout.tsx';

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
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (!ALLOWED_AVATAR_CONTENT_TYPES.includes(file.type)) {
                toast.error(`Неверный формат файла. Разрешены: ${ALLOWED_AVATAR_CONTENT_TYPES.join(', ')}`);
                e.target.value = '';
                setAvatarFile(null);
                setAvatarPreview(null);
                return;
            }

            if (file.size > AVATAR_MAX_SIZE_MB * 1024 * 1024) {
                toast.error(`Размер файла не должен превышать ${AVATAR_MAX_SIZE_MB} МБ.`);
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

    const validateForm = () => {
        const newErrors: string[] = [];
        if (!formData.login) newErrors.push('Логин обязателен для заполнения.');
        if (!formData.email) {
            newErrors.push('Email обязателен для заполнения.');
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.push('Некорректный формат email.');
        }
        if (!formData.first_name) newErrors.push('Имя обязательно для заполнения.');
        if (!formData.password) {
            newErrors.push('Пароль обязателен для заполнения.');
        } else if (formData.password.length < 8) {
            newErrors.push('Пароль должен содержать не менее 8 символов.');
        } else if (!/[a-zA-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
            newErrors.push('Пароль должен содержать хотя бы одну букву и одну цифру.');
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.push('Пароли не совпадают.');
        }
        if (formData.telegram_link && !/^https?:\/\/t\.me\/\w+$/.test(formData.telegram_link)) {
            newErrors.push('Некорректная ссылка на Telegram.');
        }

        if (newErrors.length > 0) {
            newErrors.forEach(error => toast.error(error));
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) {
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
                        toast.error(errorMessage);
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
                toast.error('Пользователь с таким логином или email уже существует.');
            } else {
                toast.error('Неизвестная ошибка при регистрации.');
                console.error(error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout active="register">
            <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="dark" />
            <form onSubmit={handleSubmit}>
                <div className="auth2-row">
                    <div className="auth2-field">
                        <label className="auth2-label" htmlFor="first_name">Имя</label>
                        <input className="auth2-inp" id="first_name" type="text" placeholder="Максим" value={formData.first_name} onChange={handleChange} required />
                    </div>
                    <div className="auth2-field">
                        <label className="auth2-label" htmlFor="last_name">Фамилия</label>
                        <input className="auth2-inp" id="last_name" type="text" placeholder="Мурзин" value={formData.last_name} onChange={handleChange} />
                    </div>
                </div>
                <div className="auth2-field">
                    <label className="auth2-label" htmlFor="login">Логин</label>
                    <input className="auth2-inp" id="login" type="text" placeholder="Придумайте логин" value={formData.login} onChange={handleChange} required />
                </div>
                <div className="auth2-field">
                    <label className="auth2-label" htmlFor="email">Email</label>
                    <input className="auth2-inp" id="email" type="email" placeholder="you@mail.ru" value={formData.email} onChange={handleChange} required />
                </div>
                <div className="auth2-field">
                    <label className="auth2-label" htmlFor="telegram_link">Telegram <span style={{ textTransform: 'none', color: '#59626f' }}>(необязательно)</span></label>
                    <input className="auth2-inp" id="telegram_link" type="text" placeholder="https://t.me/username" value={formData.telegram_link} onChange={handleChange} />
                </div>
                <div className="auth2-field">
                    <label className="auth2-label">Аватар <span style={{ textTransform: 'none', color: '#59626f' }}>(необязательно)</span></label>
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
                <div className="auth2-field">
                    <label className="auth2-label" htmlFor="password">Пароль</label>
                    <input className="auth2-inp" id="password" type="password" placeholder="Минимум 8 символов" value={formData.password} onChange={handleChange} required />
                </div>
                <div className="auth2-field">
                    <label className="auth2-label" htmlFor="confirmPassword">Подтвердите пароль</label>
                    <input className="auth2-inp" id="confirmPassword" type="password" placeholder="Повторите пароль" value={formData.confirmPassword} onChange={handleChange} required />
                </div>
                <button type="submit" className="auth2-submit" disabled={isLoading}>
                    {isLoading ? <div className="spinner"></div> : 'Создать аккаунт'}
                </button>
            </form>
        </AuthLayout>
    );
};

export default RegistrationPage;
