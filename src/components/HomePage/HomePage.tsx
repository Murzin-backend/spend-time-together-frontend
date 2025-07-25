import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Notification from '../Notification/Notification.tsx';
import './HomePage.css';

const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [notification, setNotification] = useState({ message: '', type: '' as 'success' | 'error' });

    useEffect(() => {
        if (location.state?.message) {
            setNotification({ message: location.state.message, type: 'success' });
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <>
            <Notification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: 'success' })}
            />
            <div className="homepage-container">
                <h1>Добро пожаловать!</h1>
                <p>Вы успешно вошли в систему.</p>
                <button onClick={handleLogout} className="logout-button">Выйти</button>
            </div>
        </>
    );
};

export default HomePage;
