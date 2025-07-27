import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Notification from '../Notification/Notification.tsx';
import './HomePage.css';
import api from "../../api/axiosConfig.ts";
import LeftSidebar from "../LeftSidebar/LeftSidebar.tsx";
import RightSidebar from "../RightSidebar/RightSidebar.tsx";
import Modal from '../Modal/Modal.tsx';
import axios from "axios";

const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isNewUserRegistration = location.state?.isNewUser;

    const [notification, setNotification] = useState({ message: '', type: '' as 'success' | 'error' });
    const [rooms, setRooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Keep for content loading
    const [isCheckingAuth, setIsCheckingAuth] = useState(true); // New state for auth check
    const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
    const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);

    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [inviteCode, setInviteCode] = useState('');
    const [newRoom, setNewRoom] = useState({ name: '', description: '' });

    const fetchRooms = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/rooms/all');
            const fetchedRooms = response.data.payload.data;
            setRooms(fetchedRooms);
            if (fetchedRooms.length > 0 && (!selectedRoom || !fetchedRooms.find(r => r.id === selectedRoom.id))) {
                setSelectedRoom(fetchedRooms[0]);
            } else if (fetchedRooms.length === 0) {
                setSelectedRoom(null);
                // Логика для isNewUser перенесена в useEffect
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                navigate('/login'); // Убираем state, чтобы не было мигающего уведомления
                return; // Stop further execution
            }
            console.error("Failed to fetch rooms:", error);
            setNotification({ message: 'Не удалось загрузить список комнат.', type: 'error' });
        } finally {
            setIsLoading(false);
            setIsCheckingAuth(false); // Auth check is complete
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        if (location.state?.message) {
            setNotification({ message: location.state.message, type: 'success' });
            window.history.replaceState({}, document.title);
        }
        // Исправленная логика для приветствия нового пользователя
        if (isNewUserRegistration && !sessionStorage.getItem('isNotNewUserAnymore')) {
            setIsNewUser(true);
            sessionStorage.setItem('isNotNewUserAnymore', 'true');
        }
        // Убираем isNewUser из location.state, чтобы он не срабатывал при перезагрузке
        if (location.state?.isNewUser) {
            const { state, ...rest } = location;
            const { isNewUser, ...newState } = state;
            window.history.replaceState({ ...rest, state: newState }, document.title);
        }
    }, [location, isNewUserRegistration]);

    const handleLogout = () => {
        // В будущем здесь будет API-запрос на выход
        navigate('/login');
    };

    const handleOpenJoinModal = () => {
        setIsJoinModalOpen(true);
    };

    const handleOpenCreateModal = () => {
        setIsCreateModalOpen(true);
    };

    const handleInvite = async () => {
        if (!selectedRoom) return;
        try {
            const response = await api.post(`/rooms/${selectedRoom.id}/invite_code/create`);
            const inviteCode = response.data.payload.data.invite_code;
            setNotification({ message: `Код приглашения: ${inviteCode}`, type: 'success' });
        } catch (error) {
            console.error("Failed to create invite code:", error);
            setNotification({ message: 'Не удалось создать код приглашения.', type: 'error' });
        }
    };

    const handleLeaveGroup = () => {
        if (!selectedRoom) return;
        alert(`Вы уверены, что хотите покинуть группу "${selectedRoom.name}"? (Функционал в разработке)`);
    };

    const handleJoinRoom = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await api.post('/rooms/invite_code/activate', { invite_code: inviteCode });
            setNotification({ message: 'Вы успешно присоединились к комнате!', type: 'success' });
            setIsJoinModalOpen(false);
            setInviteCode('');
            fetchRooms();
        } catch (error) {
            console.error("Failed to join room:", error);
            setNotification({ message: 'Не удалось присоединиться к комнате.', type: 'error' });
        }
    };

    const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await api.post('/rooms/create', newRoom);
            setNotification({ message: 'Комната успешно создана!', type: 'success' });
            setIsCreateModalOpen(false);
            setNewRoom({ name: '', description: '' });
            fetchRooms();
        } catch (error) {
            console.error("Failed to create room:", error);
            setNotification({ message: 'Не удалось создать комнату.', type: 'error' });
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="auth-check-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <>
            <Notification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: 'success' })}
            />
            <div className="homepage-layout">
                <LeftSidebar
                    rooms={rooms}
                    selectedRoom={selectedRoom}
                    onSelectRoom={setSelectedRoom}
                    isCollapsed={isLeftSidebarCollapsed}
                    onToggle={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
                    onJoinNewRoom={handleOpenJoinModal}
                    onCreateNewRoom={handleOpenCreateModal}
                />

                <main className="main-content">
                    {isLoading ? (
                        <div className="spinner"></div>
                    ) : selectedRoom ? (
                        <>
                            <h1>Календарь для "{selectedRoom.name}"</h1>
                            <p>Здесь будет календарь с мероприятиями группы.</p>
                        </>
                    ) : isNewUser ? (
                        <div className="no-rooms-container">
                            <h1>Добро пожаловать!</h1>
                            <p>У вас пока нет комнат. Создайте новую или присоединитесь к существующей, чтобы начать.</p>
                            <div className="no-rooms-actions">
                                <button className="action-button primary" onClick={handleOpenCreateModal}>Создать комнату</button>
                                <button className="action-button secondary" onClick={handleOpenJoinModal}>Присоединиться</button>
                            </div>
                        </div>
                    ) : (
                        <div className="no-rooms-container">
                            <h1>У вас нет активных комнат</h1>
                            <p>Создайте новую комнату или присоединитесь к существующей.</p>
                            <div className="no-rooms-actions">
                                <button className="action-button primary" onClick={handleOpenCreateModal}>Создать комнату</button>
                                <button className="action-button secondary" onClick={handleOpenJoinModal}>Присоединиться</button>
                            </div>
                        </div>
                    )}
                </main>

                <RightSidebar
                    selectedRoom={selectedRoom}
                    onInvite={handleInvite}
                    onLeave={handleLeaveGroup}
                    onLogout={handleLogout}
                />
            </div>

            <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Присоединиться к комнате">
                <form onSubmit={handleJoinRoom}>
                    <div className="form-group">
                        <label htmlFor="invite_code">Код приглашения</label>
                        <input
                            id="invite_code"
                            type="text"
                            placeholder="Введите код приглашения"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            required
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="modal-button primary">Присоединиться</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Создать новую комнату">
                <form onSubmit={handleCreateRoom}>
                    <div className="form-group">
                        <label htmlFor="room_name">Название комнаты</label>
                        <input
                            id="room_name"
                            type="text"
                            placeholder="Введите название комнаты"
                            value={newRoom.name}
                            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="room_description">Описание (необязательно)</label>
                        <textarea id="room_description" placeholder="Для чего эта комната?" value={newRoom.description} onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })} />
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="modal-button primary">Создать</button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default HomePage;
