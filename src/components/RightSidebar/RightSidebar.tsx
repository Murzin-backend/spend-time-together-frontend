import React from 'react';
import './RightSidebar.css';

interface RightSidebarProps {
    selectedRoom: any | null;
    onInvite: () => void;
    onLeave: () => void;
    onLogout: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ selectedRoom, onInvite, onLeave, onLogout }) => {
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
                        <button onClick={onLeave} className="danger">Покинуть группу</button>
                    </div>
                </>
            ) : (
                <div className="no-room-selected">
                    <p>Выберите группу слева, чтобы увидеть детали</p>
                </div>
            )}
            <div className="logout-section">
                <button onClick={onLogout} className="danger logout">Выйти из аккаунта</button>
            </div>
        </div>
    );
};

export default RightSidebar;

