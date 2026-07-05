import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import api from '../../api/axiosConfig.ts';
import axios from 'axios';
import Modal from '../Modal/Modal.tsx';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import './HomePage.css';
import './Home2.css';
import logo from '../../assets/logo.png';
import Notification from "../Notification/Notification.tsx";

interface User {
    id: number;
    login: string;
    first_name: string;
    last_name: string;
}

interface Activity {
    id: number;
    name: string;
    room_id: number;
    status: 'planned' | 'in_progress' | 'finished' | 'cancelled';
    type: 'board_games' | 'video_games' | 'movies';
    scheduled_at: string | null;
    winner_user_id?: number | null;
}

const eventPlaceholders = [
    "Покоряем вершины в CS2",
    "Строим замки в Minecraft",
    "Вечер настолок: Монополия",
    "Киномарафон Marvel",
    "Совместный рейд в WoW",
    "Чемпионат по Mortal Kombat",
    "Играем в Jackbox",
    "Стратегические баталии в Civilization",
    "Кооперативное выживание в Valheim",
    "Смотрим новый сезон сериала",
];

const typeIcons: Record<string, string> = {
    video_games: '🎮',
    board_games: '🎲',
    movies: '🎬',
};

const typeColors: Record<string, string> = {
    video_games: '#a371f7',
    board_games: '#f0883e',
    movies: '#ec6a5e',
};

const initials = (u: { first_name?: string; last_name?: string; login?: string }) => {
    const f = (u.first_name || u.login || '?').trim();
    const l = (u.last_name || '').trim();
    return ((f[0] || '?') + (l[0] || '')).toUpperCase();
};

const avatarColor = (id: number) => ['#4c9ffe', '#a371f7', '#f0883e', '#3fb950', '#ec6a5e', '#e0a53a'][id % 6];

const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isNewUserRegistration = location.state?.isNewUser;

    const [notification, setNotification] = useState({ message: '', type: '' as 'success' | 'error' });
    const [rooms, setRooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
    const [isNewUser, setIsNewUser] = useState(false);
    const [currentUser, setCurrentUser] = useState<any | null>(null);
    const [showCoach, setShowCoach] = useState(true);

    const [roomUsers, setRoomUsers] = useState<User[]>([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const [inviteCode, setInviteCode] = useState('');
    const [newRoom, setNewRoom] = useState({ name: '', description: '' });
    const [newEvent, setNewEvent] = useState({ name: '', type: 'video_games', time: '19:00' });
    const [eventPlaceholder, setEventPlaceholder] = useState('');

    const fetchRooms = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/rooms/all');
            const fetchedRooms = response?.data?.payload?.data || [];
            setRooms(fetchedRooms);

            if (fetchedRooms.length > 0 && (!selectedRoom || !fetchedRooms.find((r: any) => r.id === selectedRoom.id))) {
                await handleSelectRoom(fetchedRooms[0]);
            } else if (fetchedRooms.length === 0) {
                setSelectedRoom(null);
                if (isNewUserRegistration) {
                    setIsNewUser(true);
                }
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                console.error("Unauthorized, redirecting to login.");
            } else {
                setNotification({ message: 'Не удалось загрузить список комнат.', type: 'error' });
            }
        } finally {
            setIsLoading(false);
            setIsCheckingAuth(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        api.get('/users/me').then(r => setCurrentUser(r?.data?.payload?.data || r?.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!selectedRoom) return;
        const interval = setInterval(async () => {
            fetchActivities(selectedRoom.id);
            try {
                const usersResponse = await api.get(`/rooms/${selectedRoom.id}/users`);
                setRoomUsers(usersResponse?.data?.payload?.data || []);
            } catch (e) {
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [selectedRoom]);

    const fetchActivities = async (roomId: number) => {
        try {
            const activitiesResponse = await api.get(`/activities/${roomId}/all`);
            const activities: Activity[] = activitiesResponse?.data?.payload?.data || [];

            const calendarEvents = activities
                .filter(activity => activity.scheduled_at && (activity.status === 'planned' || activity.status === 'finished'))
                .map(activity => {
                    const startDate = new Date(activity.scheduled_at as string);
                    return {
                        id: activity.id,
                        title: activity.name,
                        start: startDate,
                        type: activity.type,
                        status: activity.status,
                        icon: typeIcons[activity.type] || '🎯',
                    };
                });
            setEvents(calendarEvents);
        } catch (error) {
            console.error(`Failed to fetch activities for room ${roomId}:`, error);
            setNotification({ message: 'Не удалось загрузить события комнаты.', type: 'error' });
        }
    };

    const handleSelectRoom = async (room: any) => {
        if (selectedRoom?.id === room.id) {
            return;
        }
        setSelectedRoom(room);
        setIsUsersLoading(true);
        setRoomUsers([]);
        setEvents([]);
        try {
            const usersResponse = await api.get(`/rooms/${room.id}/users`);
            setRoomUsers(usersResponse?.data?.payload?.data || []);
            await fetchActivities(room.id);
        } catch (error) {
            console.error(`Failed to fetch data for room ${room.id}:`, error);
            setNotification({ message: 'Не удалось загрузить данные комнаты.', type: 'error' });
        } finally {
            setIsUsersLoading(false);
        }
    };

    const openDay = (date: Date) => {
        setSelectedDate(date);
        setIsDayModalOpen(true);
    };

    const handleCreateEvent = (date: Date) => {
        setSelectedDate(date);
        setEventPlaceholder(eventPlaceholders[Math.floor(Math.random() * eventPlaceholders.length)]);
        setIsDayModalOpen(false);
        setIsCreateEventModalOpen(true);
    };

    const handleCreateEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedDate || !selectedRoom) return;

        const [hours, minutes] = newEvent.time.split(':').map(Number);
        const scheduledAtDate = new Date(selectedDate);
        scheduledAtDate.setHours(hours, minutes, 0, 0);
        const timezoneOffset = scheduledAtDate.getTimezoneOffset() * 60000;
        const localISOTime = new Date(scheduledAtDate.getTime() - timezoneOffset).toISOString().slice(0, 19);
        const formattedDateTime = localISOTime.replace('Z', '');

        const payload = {
            name: newEvent.name,
            type: newEvent.type,
            status: 'planned',
            scheduled_at: formattedDateTime,
        };

        try {
            await api.post(`/activities/${selectedRoom.id}/create`, payload);
            setNotification({ message: 'Встреча успешно запланирована!', type: 'success' });
            setIsCreateEventModalOpen(false);
            setNewEvent({ name: '', type: 'video_games', time: '19:00' });
            await fetchActivities(selectedRoom.id);
        } catch (error) {
            console.error("Failed to create event:", error);
            setNotification({ message: 'Не удалось запланировать встречу.', type: 'error' });
        }
    };

    const handleNavigateToActivity = (activityId: number) => {
        navigate(`/activity/${activityId}`);
    };

    const handleLogout = () => {
        navigate('/login');
    };

    const handleInvite = async () => {
        if (!selectedRoom) return;
        try {
            const response = await api.post(`/rooms/${selectedRoom.id}/invite_code/create`);
            const code = response.data.payload.data.invite_code;
            setNotification({ message: `Код приглашения: ${code}`, type: 'success' });
        } catch (error) {
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
            await api.post('/rooms/join', { invite_code: inviteCode });
            setNotification({ message: 'Вы успешно присоединились к комнате!', type: 'success' });
            setIsJoinModalOpen(false);
            setInviteCode('');
            await fetchRooms();
        } catch (error) {
            setNotification({ message: 'Не удалось присоединиться. Проверьте код.', type: 'error' });
        }
    };

    const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await api.post('/rooms/create', newRoom);
            setNotification({ message: 'Комната успешно создана!', type: 'success' });
            setIsCreateModalOpen(false);
            setNewRoom({ name: '', description: '' });
            await fetchRooms();
        } catch (error) {
            setNotification({ message: 'Не удалось создать комнату.', type: 'error' });
        }
    };

    const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        if (action === 'PREV') setCurrentDate(subMonths(currentDate, 1));
        else if (action === 'NEXT') setCurrentDate(addMonths(currentDate, 1));
        else setCurrentDate(new Date());
    };

    const gridDays = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    });
    const eventsForDay = (day: Date) => events.filter(e => isSameDay(e.start, day));
    const dayModalEvents = selectedDate ? eventsForDay(selectedDate) : [];

    if (isCheckingAuth) {
        return (
            <div className="auth-check-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <>
            {notification.message && <Notification message={notification.message} type={notification.type as 'success' | 'error'} onClose={() => setNotification({ message: '', type: '' })} />}

            <div className="home2">
                <aside className="home2-rail">
                    <div className="home2-brand">
                        <img src={logo} alt="" className="home2-logo" />
                        <div>
                            <div className="home2-brand-name">Spend Time Together</div>
                            <div className="home2-brand-sub">{rooms.length} {rooms.length === 1 ? 'комната' : (rooms.length < 5 ? 'комнаты' : 'комнат')}</div>
                        </div>
                    </div>

                    <div className="home2-rail-scroll">
                        <div className="home2-rail-label">Мои комнаты</div>
                        {rooms.map(room => (
                            <div
                                key={room.id}
                                className={`home2-room ${selectedRoom?.id === room.id ? 'active' : ''}`}
                                onClick={() => handleSelectRoom(room)}
                            >
                                <div className="home2-room-name">{room.name}</div>
                                {room.description ? <div className="home2-room-desc">{room.description}</div> : null}
                            </div>
                        ))}
                        <div className="home2-rail-actions">
                            <button className="home2-btn ghost" onClick={() => setIsCreateModalOpen(true)}>＋ Новая комната</button>
                            <button className="home2-btn ghost" onClick={() => setIsJoinModalOpen(true)}>Войти по коду</button>
                        </div>
                    </div>

                    {currentUser && (
                        <div className="home2-rail-foot">
                            <span className="home2-ava" style={{ background: avatarColor(currentUser.id || 0) }}>{initials(currentUser)}</span>
                            <div className="home2-mbody">
                                <div className="home2-mname">{currentUser.first_name || currentUser.login}</div>
                            </div>
                        </div>
                    )}
                </aside>

                <main className="home2-main">
                    {isLoading ? (
                        <div className="spinner"></div>
                    ) : selectedRoom ? (
                        <>
                            <div className="home2-cal-head">
                                <div className="home2-cal-title">
                                    <span className="home2-cal-month">{format(currentDate, 'LLLL', { locale: ru })}</span>
                                    <span className="home2-cal-year">{format(currentDate, 'yyyy')}</span>
                                </div>
                                <div className="home2-cal-nav">
                                    <button className="home2-nav-btn" onClick={() => handleNavigate('PREV')}>‹</button>
                                    <button className="home2-today" onClick={() => handleNavigate('TODAY')}>Сегодня</button>
                                    <button className="home2-nav-btn" onClick={() => handleNavigate('NEXT')}>›</button>
                                </div>
                            </div>

                            {showCoach && (
                                <div className="home2-coach">
                                    💡 <span>Нажмите на <b>любой день</b>, чтобы запланировать встречу.</span>
                                    <button className="home2-coach-x" onClick={() => setShowCoach(false)}>×</button>
                                </div>
                            )}

                            <div className="home2-cal">
                                <div className="home2-dow">
                                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d} className="home2-dow-c">{d}</div>)}
                                </div>
                                <div className="home2-grid">
                                    {gridDays.map(day => {
                                        const dayEvents = eventsForDay(day);
                                        const out = !isSameMonth(day, currentDate);
                                        const shown = dayEvents.slice(0, 2);
                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={`home2-day ${out ? 'out' : ''} ${isToday(day) ? 'today' : ''}`}
                                                onClick={() => openDay(day)}
                                            >
                                                <div className="home2-day-head"><span className="home2-dnum">{format(day, 'd')}</span></div>
                                                <div className="home2-devents">
                                                    {shown.map(ev => (
                                                        <div key={ev.id} className="home2-ev" onClick={(e) => { e.stopPropagation(); handleNavigateToActivity(ev.id); }}>
                                                            <span className="home2-ev-thumb" style={{ background: `linear-gradient(140deg, ${typeColors[ev.type] || '#4c9ffe'}, ${typeColors[ev.type] || '#4c9ffe'}66)` }}>
                                                                {ev.status === 'finished' ? '✅' : (typeIcons[ev.type] || '🎯')}
                                                            </span>
                                                            <span className="home2-ev-name">{ev.title}</span>
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 2 && <div className="home2-ev-more">+{dayEvents.length - 2} ещё</div>}
                                                </div>
                                                {!out && <div className="home2-day-add">＋ Запланировать</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : isNewUser ? (
                        <div className="home2-empty">
                            <h1>Добро пожаловать!</h1>
                            <p>Похоже, у вас ещё нет комнат. Создайте свою первую или присоединитесь к существующей.</p>
                            <div className="home2-empty-actions">
                                <button className="home2-btn primary" onClick={() => setIsCreateModalOpen(true)}>Создать комнату</button>
                                <button className="home2-btn" onClick={() => setIsJoinModalOpen(true)}>Присоединиться</button>
                            </div>
                        </div>
                    ) : (
                        <div className="home2-empty">
                            <h1>Комнат не найдено</h1>
                            <p>Создайте свою первую комнату или присоединитесь к существующей.</p>
                            <div className="home2-empty-actions">
                                <button className="home2-btn primary" onClick={() => setIsCreateModalOpen(true)}>Создать комнату</button>
                                <button className="home2-btn" onClick={() => setIsJoinModalOpen(true)}>Присоединиться</button>
                            </div>
                        </div>
                    )}
                </main>

                <aside className="home2-panel">
                    {selectedRoom ? (
                        <>
                            <div className="home2-panel-head">
                                <div className="home2-panel-title">{selectedRoom.name}</div>
                                <div className="home2-panel-desc">{selectedRoom.description || 'Нет описания'}</div>
                            </div>
                            <div className="home2-panel-scroll">
                                <button className="home2-btn primary block" onClick={handleInvite}>👥 Пригласить друзей</button>

                                <div className="home2-section-label">Участники{roomUsers.length ? ` · ${roomUsers.length}` : ''}</div>
                                {isUsersLoading ? (
                                    <div className="home2-muted">Загрузка…</div>
                                ) : roomUsers.map(u => (
                                    <div key={u.id} className="home2-member">
                                        <span className="home2-ava sm" style={{ background: avatarColor(u.id) }}>{initials(u)}</span>
                                        <span className="home2-mname">{u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.login}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="home2-panel-foot">
                                <button className="home2-btn danger-soft block" onClick={handleLeaveGroup}>Покинуть группу</button>
                                <button className="home2-btn ghost block" onClick={handleLogout}>Выйти из аккаунта</button>
                            </div>
                        </>
                    ) : (
                        <div className="home2-panel-foot" style={{ marginTop: 'auto' }}>
                            <button className="home2-btn ghost block" onClick={handleLogout}>Выйти из аккаунта</button>
                        </div>
                    )}
                </aside>
            </div>

            <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Присоединиться к комнате">
                <form onSubmit={handleJoinRoom}>
                    <div className="form-group">
                        <label htmlFor="invite_code">Код приглашения</label>
                        <input id="invite_code" type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
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
                        <input id="room_name" type="text" value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="room_description">Описание</label>
                        <textarea id="room_description" value={newRoom.description} onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })} />
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="modal-button primary">Создать</button>
                    </div>
                </form>
            </Modal>

            {selectedDate && (
                <Modal isOpen={isDayModalOpen} onClose={() => setIsDayModalOpen(false)} title={`Встречи на ${format(selectedDate, 'd MMMM yyyy', { locale: ru })}`}>
                    <div className="day-details-modal-content">
                        <div className="events-list">
                            {dayModalEvents.length > 0 ? (
                                dayModalEvents.map(event => (
                                    <div key={event.id} className={`event-item event-item--type-${event.type} ${event.status === 'finished' ? 'event-item--finished' : ''}`} onClick={() => handleNavigateToActivity(event.id)}>
                                        <span className="event-icon">{event.status === 'finished' ? '✅' : (typeIcons[event.type] || '🎯')}</span>
                                        <div className="event-details">
                                            <span className="event-time">{format(event.start, 'HH:mm')}</span>
                                            <span className="event-title">{event.title}</span>
                                            {event.status === 'finished' && <span className="event-status-badge">Завершено</span>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="no-events">На этот день встреч нет.</p>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => handleCreateEvent(selectedDate)} className="modal-button primary">
                                Запланировать встречу
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {selectedDate && (
                <Modal isOpen={isCreateEventModalOpen} onClose={() => setIsCreateEventModalOpen(false)} title="Как планируем провести время?">
                    <form onSubmit={handleCreateEventSubmit} className="create-event-form">
                        <div className="form-group">
                            <label htmlFor="event_name">Название</label>
                            <input id="event_name" type="text" placeholder={eventPlaceholder} value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="event_time">Время (на {format(selectedDate, 'd MMMM', { locale: ru })})</label>
                            <input id="event_time" type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="event_type">Тип встречи</label>
                            <select id="event_type" value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })} required>
                                <option value="video_games">Видеоигры</option>
                                <option value="board_games" disabled>Настольные игры (в разработке)</option>
                                <option value="movies" disabled>Кино (в разработке)</option>
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button type="submit" className="modal-button primary">Запланировать</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
};

export default HomePage;
