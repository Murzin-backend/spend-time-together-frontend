import React, { useState } from 'react';
import './RightSidebar.css';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig.ts';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal.tsx';

interface RightSidebarProps {
    selectedRoom: any | null;
    onInvite: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ selectedRoom, onInvite }) => {
    const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
    const navigate = useNavigate();

    const handleLeaveRoom = () => {
        if (!selectedRoom) return;
        setIsLeaveConfirmOpen(true);
    };

    const confirmLeaveRoom = async () => {
        if (!selectedRoom) return;
        try {
            await api.post(`/rooms/${selectedRoom.id}/exit`);
            window.location.reload();
        } catch (error) {
            console.error('Failed to leave room:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('auth/logout');
            navigate('/login', { state: { message: 'Вы успешно вышли из системы.' } });
        } catch (error) {
            console.error('Logout failed:', error);
            navigate('/login');
        }
    };

    return (
        <div className="right-sidebar">
            {selectedRoom ? (
                <>
                    <h4>Управление комнатой</h4>
                    <div className="room-details">
                        <strong>{selectedRoom.name}</strong>
                        <p>{selectedRoom.description || 'Нет описания'}</p>
                    </div>
                    <div className="action-buttons">
                        <button onClick={onInvite}>Пригласить друзей</button>
                        <button className="placeholder">Быстрая игра</button>
                        <button onClick={handleLeaveRoom} className="danger">Покинуть группу</button>
                    </div>
                </>
            ) : (
                <div className="no-room-selected">
                    <p>Выберите группу слева, чтобы увидеть детали</p>
                </div>
            )}
            <div className="logout-section">
                <button onClick={handleLogout} className="logout">Выйти из аккаунта</button>
            </div>

            <ConfirmationModal
                isOpen={isLeaveConfirmOpen}
                onClose={() => setIsLeaveConfirmOpen(false)}
                onConfirm={confirmLeaveRoom}
                title="Подтверждение"
                body={<p>Вы уверены, что хотите покинуть комнату <strong>"{selectedRoom?.name}"</strong>?</p>}
            />
        </div>
    );
};

export default RightSidebar;
