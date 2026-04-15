import React, {useEffect, useState, useCallback} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import api from '../../api/axiosConfig.ts';
import axios from 'axios';
import LeftSidebar from '../LeftSidebar/LeftSidebar.tsx';
import RightSidebar from '../RightSidebar/RightSidebar.tsx';
import Modal from '../Modal/Modal.tsx';
import {Calendar, dateFnsLocalizer} from 'react-big-calendar';
import { addMonths, format, parse, subMonths, startOfWeek, getDay } from 'date-fns';
import { ru } from 'date-fns/locale/ru';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './HomePage.css';
import './Calendar.css';
import '../RightSidebar/RightSidebar.css';
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

const locales = {
    'ru': ru,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

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

const CustomEvent = ({ event }: { event: any }) => {
    const icon = typeIcons[event.type] || '🎯';
    const isFinished = event.status === 'finished';
    return (
        <div className={`custom-event ${isFinished ? 'custom-event--finished' : ''}`}>
            <span role="img" aria-label="icon" className="event-icon-calendar">{isFinished ? '✅' : icon}</span>
            {event.title}
        </div>
    );
};

const HomePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isNewUserRegistration = location.state?.isNewUser;

    const [notification, setNotification] = useState({ message: '', type: '' as 'success' | 'error' });
    const [rooms, setRooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
    const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(true);
    const [isNewUser, setIsNewUser] = useState(false);

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

            if (fetchedRooms.length > 0 && (!selectedRoom || !fetchedRooms.find(r => r.id === selectedRoom.id))) {
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
    }, []);

    // Auto-refresh calendar and room users every 30 seconds
    useEffect(() => {
        if (!selectedRoom) return;
        const interval = setInterval(async () => {
            fetchActivities(selectedRoom.id);
            try {
                const usersResponse = await api.get(`/rooms/${selectedRoom.id}/users`);
                setRoomUsers(usersResponse?.data?.payload?.data || []);
            } catch (e) {
                // silently fail on background refresh
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
                    const potentialEndDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
                    const endOfDay = new Date(startDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    const endDate = potentialEndDate > endOfDay ? endOfDay : potentialEndDate;

                    return {
                        id: activity.id,
                        title: activity.name,
                        start: startDate,
                        end: endDate,
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

    const handleSelectSlot = (slotInfo: { start: Date }) => {
        setSelectedDate(slotInfo.start);
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

    const handleEventClick = (event: any) => {
        setSelectedDate(event.start);
        setIsDayModalOpen(true);
    };

    const handleNavigateToActivity = (activityId: number) => {
        navigate(`/activity/${activityId}`);
    };

    const handleLogout = () => {
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
        if (action === 'PREV') {
            setCurrentDate(subMonths(currentDate, 1));
        } else if (action === 'NEXT') {
            setCurrentDate(addMonths(currentDate, 1));
        } else {
            setCurrentDate(new Date());
        }
    };

    const eventPropGetter = (event: any) => {
        const classes = [`rbc-event--type-${event.type || 'default'}`];
        if (event.status === 'finished') {
            classes.push('rbc-event--finished');
        }
        return {
            className: classes.join(' '),
        };
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
            {notification.message && <Notification message={notification.message} type={notification.type as 'success' | 'error'} onClose={() => setNotification({ message: '', type: '' })} />}
            <div className={`app-container ${isLeftSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <LeftSidebar
                    rooms={rooms}
                    selectedRoom={selectedRoom}
                    onSelectRoom={handleSelectRoom}
                    isCollapsed={isLeftSidebarCollapsed}
                    roomUsers={roomUsers}
                    isUsersLoading={isUsersLoading}
                    handleOpenCreateModal={handleOpenCreateModal}
                    handleOpenJoinModal={handleOpenJoinModal}
                />
                <div className="content-area">
                    <button onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)} className="sidebar-toggle-button">
                        <span className="bar"></span>
                        <span className="bar"></span>
                        <span className="bar"></span>
                    </button>
                    <main className="main-content">
                        {isLoading ? (
                            <div className="spinner"></div>
                        ) : selectedRoom ? (
                            <div className="calendar-container">
                                <div className="calendar-header">
                                    <h2 className="calendar-title">
                                        {format(currentDate, 'LLLL yyyy', { locale: ru })}
                                    </h2>
                                    <div className="calendar-nav">
                                        <button onClick={() => handleNavigate('PREV')}>&lt;</button>
                                        <button className="today-btn" onClick={() => handleNavigate('TODAY')}>Сегодня</button>
                                        <button onClick={() => handleNavigate('NEXT')}>&gt;</button>
                                    </div>
                                </div>
                                <div className="calendar-wrapper">
                                    <Calendar
                                        localizer={localizer}
                                        events={events}
                                        startAccessor="start"
                                        endAccessor="end"
                                        style={{ height: '100%' }}
                                        culture="ru"
                                        views={['month']}
                                        defaultView="month"
                                        toolbar={false}
                                        date={currentDate}
                                        onNavigate={() => {}}
                                        onSelectSlot={handleSelectSlot}
                                        selectable={true}
                                        onSelectEvent={handleEventClick}
                                        eventPropGetter={eventPropGetter}
                                        components={{
                                            month: { event: CustomEvent }
                                        }}
                                        messages={{
                                            noEventsInRange: "Нет встреч в этом диапазоне.",
                                            showMore: total => `+${total} еще`,
                                        }}
                                    />
                                </div>
                            </div>
                        ) : isNewUser ? (
                            <div className="no-rooms-container">
                                <h1>Добро пожаловать!</h1>
                                <p>Похоже, у вас еще нет комнат. Создайте свою первую или присоединитесь к существующей.</p>
                                <div className="no-rooms-actions">
                                    <button onClick={handleOpenCreateModal}>Создать комнату</button>
                                    <button onClick={handleOpenJoinModal}>Присоединиться</button>
                                </div>
                            </div>
                        ) : (
                         <div className="no-rooms-container">
                            <h1>Комнат не найдено</h1>
                            <p>Создайте свою первую комнату или присоединитесь к существующей.</p>
                             <div className="no-rooms-actions">
                                 <button onClick={handleOpenCreateModal}>Создать комнату</button>
                                 <button onClick={handleOpenJoinModal}>Присоединиться</button>
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
            </div>

            <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Присоединиться к комнате">
                <form onSubmit={handleJoinRoom}>
                    <div className="form-group">
                        <label htmlFor="invite_code">Код приглашения</label>
                        <input
                            id="invite_code"
                            type="text"
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
                            value={newRoom.name}
                            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="room_description">Описание</label>
                        <textarea
                            id="room_description"
                            value={newRoom.description}
                            onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                        />
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
                            {events.filter(e => format(e.start, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')).length > 0 ? (
                                events
                                    .filter(e => format(e.start, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
                                    .map(event => (
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
                            <input
                                id="event_name"
                                type="text"
                                placeholder={eventPlaceholder}
                                value={newEvent.name}
                                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="event_time">Время (на {format(selectedDate, 'd MMMM', { locale: ru })})</label>
                            <input
                                id="event_time"
                                type="time"
                                value={newEvent.time}
                                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="event_type">Тип встречи</label>
                            <select
                                id="event_type"
                                value={newEvent.type}
                                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                                required
                            >
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
