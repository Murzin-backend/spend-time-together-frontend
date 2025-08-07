import React, { useEffect, useState } from 'react';
import './Notification.css';

export interface NotificationProps {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onClose?: () => void;
    autoClose?: boolean;
    duration?: number;
}

const Notification: React.FC<NotificationProps> = ({
    message,
    type,
    onClose,
    autoClose = true,
    duration = 5000
}) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (autoClose) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                if (onClose) setTimeout(onClose, 300); // Даем время для анимации
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [autoClose, duration, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        if (onClose) setTimeout(onClose, 300);
    };

    return (
        <div className={`notification ${type} ${isVisible ? 'visible' : 'hidden'}`}>
            <div className="notification-content">
                <div className="notification-message">{message}</div>
                <button className="notification-close" onClick={handleClose}>×</button>
            </div>
        </div>
    );
};

export default Notification;
