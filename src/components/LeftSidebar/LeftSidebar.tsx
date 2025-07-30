import React from 'react';
import './LeftSidebar.css';
import logo from '../../assets/logo.png';

interface User {
    id: number;
    login: string;
    first_name: string;
    last_name: string;
}

interface Room {
    id: number;
    name: string;
}

interface LeftSidebarProps {
    rooms: Room[];
    selectedRoom: Room | null;
    onSelectRoom: (room: Room) => void;
    isCollapsed: boolean;
    roomUsers: User[];
    isUsersLoading: boolean;
    handleOpenCreateModal: () => void;
    handleOpenJoinModal: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
    rooms,
    selectedRoom,
    onSelectRoom,
    isCollapsed,
    roomUsers,
    isUsersLoading,
    handleOpenCreateModal,
    handleOpenJoinModal,
}) => {
    return (
        <aside className={`left-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="logo-container">
                    <img src={logo} alt="Иконка" className="sidebar-icon" />
                    <h3>Комнаты</h3>
                </div>
            </div>
            <div className="sidebar-content">
                <div className="rooms-list-sidebar">
                    {(rooms || []).map(room => {
                        const isSelected = selectedRoom?.id === room.id;
                        return (
                            <div key={room.id} className={`room-item ${isSelected ? 'selected' : ''}`}>
                                <div className="room-name" onClick={() => onSelectRoom(room)}>
                                    <span className="room-name-text">{room.name}</span>
                                    <span className={`arrow ${isSelected ? 'expanded' : ''}`}>▼</span>
                                </div>
                                <div className={`users-list-container ${isSelected ? 'expanded' : ''}`}>
                                    {isSelected && isUsersLoading ? (
                                        <div className="user-list-spinner-container">
                                            <div className="spinner small"></div>
                                        </div>
                                    ) : (
                                        <ul className="users-list">
                                            {isSelected && (roomUsers || []).length > 0 ? (
                                                (roomUsers || []).map(user => (
                                                    <li key={user.id} className="user-item">
                                                        <div className="user-avatar"></div>
                                                        <span className="user-name">{user.first_name} {user.last_name}</span>
                                                    </li>
                                                ))
                                            ) : isSelected ? (
                                                <li className="user-item-empty">В комнате пусто</li>
                                            ) : null}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="sidebar-footer">
                <button className="sidebar-action-btn create" onClick={handleOpenCreateModal}>Создать</button>
                <button className="sidebar-action-btn join" onClick={handleOpenJoinModal}>Войти</button>
            </div>
        </aside>
    );
};

export default LeftSidebar;
