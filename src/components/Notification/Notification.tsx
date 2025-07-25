import React, { useEffect } from 'react';
import './Notification.css';

interface NotificationProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [onClose]);

    if (!message) {
        return null;
    }

    return (
        <div className={`notification ${type}`}>
            <p>{message}</p>
            <button className="close-btn" onClick={onClose}>×</button>
        </div>
    );
};

export default Notification;

