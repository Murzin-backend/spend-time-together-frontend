import React from 'react';
import { useParams, Link } from 'react-router-dom';
import GameSearchInput, { GameVariant } from '../GameSearchInput/GameSearchInput.tsx';
import './ActivityPage.css';

interface User {
    id: number;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
}

interface UserVariant {
    userId: number;
    variant: GameVariant | string | null;
    isEliminated: boolean;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
}

interface Winner {
    userId: number;
    variant: string;
}

const ActivityPage: React.FC = () => {
    const { activityId } = useParams<{ activityId: string }>();
    const ws = React.useRef<WebSocket | null>(null);

    const backendUrl = 'http://localhost:8000';

    const [isConnected, setIsConnected] = React.useState(false);
    const [activityStatus, setActivityStatus] = React.useState<'PENDING' | 'IN_PROGRESS' | 'FINISHED'>('PENDING');
    const [participants, setParticipants] = React.useState<UserVariant[]>([]);
    const [timer, setTimer] = React.useState<number | null>(null);
    const [winner, setWinner] = React.useState<Winner | null>(null);
    const [myVariant, setMyVariant] = React.useState<GameVariant | null>(null);
    const [hasSubmitted, setHasSubmitted] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [activityName, setActivityName] = React.useState('Загрузка...');
    const [eliminatingUserId, setEliminatingUserId] = React.useState<number | null>(null);
    const [isCreator, setIsCreator] = React.useState(false);
    const [currentUserId, setCurrentUserId] = React.useState<number | null>(null);

    const pingServer = () => {
        ws.current?.send(JSON.stringify({ action: "ping" }));
    };

    const getUsersList = () => {
        ws.current?.send(JSON.stringify({ action: "get_users" }));
    };

    const startGame = () => {
        ws.current?.send(JSON.stringify({ action: "start_game" }));
    };

    const submitVariant = (variant: GameVariant) => {
        ws.current?.send(JSON.stringify({
            action: "submit_variant",
            payload: {
                variant: JSON.stringify(variant)
            }
        }));
        setHasSubmitted(true);
    };

    React.useEffect(() => {
        console.log('Activity ID:', activityId);
        if (!activityId) {
            setError("Ошибка: Не удалось получить ID активности.");
            return;
        }

        const wsUrl = `ws://localhost:8000/api/ws/activity/${activityId}`;

        console.log(`Connecting to WebSocket at: ${wsUrl}`);

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connection established');
            setIsConnected(true);
            getUsersList();
            const pingInterval = setInterval(() => {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    pingServer();
                }
            }, 30000);

            return () => clearInterval(pingInterval);
        };

        ws.current.onclose = (event) => {
            console.log('WebSocket disconnected', event);
            setIsConnected(false);
            if (!event.wasClean) {
                console.error('Connection died');
                setError('Соединение с сервером было потеряно. Пожалуйста, обновите страницу.');
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('Произошла ошибка соединения с WebSocket.');
        };

        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            setError(null);

            switch (message.event) {
                case 'activity_state':
                    setActivityStatus(message.status);
                    setActivityName('Рулетка Активности');
                    if (message.creator_id && currentUserId) {
                        setIsCreator(message.creator_id === currentUserId);
                    }
                    break;

                case 'users_in_activity':
                    if (message.users) {
                        const userVariants = message.users.map((user: User) => ({
                            userId: user.id,
                            variant: null,
                            isEliminated: false,
                            firstName: user.first_name,
                            lastName: user.last_name,
                            avatarUrl: user.avatar_url
                        }));
                        setParticipants(userVariants);
                    }
                    break;

                case 'connected':
                    if (message.user_id) {
                        setCurrentUserId(message.user_id);
                    }
                    break;

                case 'user_joined':
                    if (message.user) {
                        setParticipants(prev => {
                            if (prev.find(p => p.userId === message.user.id)) return prev;
                            return [...prev, {
                                userId: message.user.id,
                                variant: null,
                                isEliminated: false,
                                firstName: message.user.first_name,
                                lastName: message.user.last_name,
                                avatarUrl: message.user.avatar_url
                            }];
                        });
                    }
                    break;

                case 'user_left':
                    if (message.user_id) {
                        setParticipants(prev => prev.filter(p => p.userId !== message.user_id));
                    }
                    break;

                case 'timer_started':
                    if (message.duration) {
                        setTimer(message.duration);
                    }
                    break;

                case 'timer_finished':
                    setTimer(0);
                    break;

                case 'roulette_started':
                    console.log('Roulette started!');
                    break;

                case 'variant_submitted':
                    if (message.user_id) {
                        setParticipants(prev => prev.map(p =>
                            p.userId === message.user_id ? { ...p, variant: message.variant } : p
                        ));
                    }
                    break;

                case 'variant_eliminated':
                    if (message.user_id) {
                        setEliminatingUserId(message.user_id);
                        setTimeout(() => {
                            setParticipants(prev => prev.map(p =>
                                p.userId === message.user_id ? { ...p, isEliminated: true } : p
                            ));
                            setEliminatingUserId(null);
                        }, 1500);
                    }
                    break;

                case 'winner_declared':
                    if (message.user_id && message.variant) {
                        setWinner({ userId: message.user_id, variant: message.variant });
                        setActivityStatus('FINISHED');
                    }
                    break;

                case 'error':
                    setError(message.message || 'Произошла неизвестная ошибка');
                    break;

                default:
                    console.log('Unhandled event type:', message.event);
                    break;
            }
        };

        return () => {
            ws.current?.close();
        };
    }, [activityId, currentUserId]);

    React.useEffect(() => {
        if (timer === null || timer <= 0) return;
        const interval = setInterval(() => {
            setTimer(t => (t ? t - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const handleSubmitVariant = (e: React.FormEvent) => {
        e.preventDefault();
        if (myVariant && !hasSubmitted) {
            submitVariant(myVariant);
        }
    };

    const getUserDisplayName = (participant: UserVariant) => {
        if (participant.firstName && participant.lastName) {
            return `${participant.firstName} ${participant.lastName}`;
        }
        return participant.firstName || `Пользователь ${participant.userId}`;
    };

    const parseVariant = (variant: any): GameVariant | string | null => {
        if (!variant) return null;

        if (typeof variant === 'string') {
            try {
                return JSON.parse(variant);
            } catch (e) {
                return variant;
            }
        }

        return variant;
    };

    return (
        <div className="activity-container">
            <header className="activity-header">
                <Link to="/home" className="back-to-home">
                    &larr; Вернуться
                </Link>
                <div className="activity-title-status">
                    <h1>{activityName}</h1>
                    <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
                        {isConnected ? 'Подключено' : 'Нет соединения'}
                    </div>
                </div>
                <div className="activity-status-badge">{activityStatus}</div>
            </header>

            {error && <div className="error-banner">{error}</div>}

            <main className="activity-main">
                <div className="participants-panel">
                    <h2>Участники ({participants.length})</h2>
                    <ul>
                        {participants.map(p => (
                            <li key={p.userId} className={`${p.isEliminated ? 'eliminated' : ''} ${p.variant ? 'submitted' : ''}`}>
                                <div className="participant-info">
                                    {p.avatarUrl ? (
                                        <img src={backendUrl + p.avatarUrl} alt={p.firstName} className="participant-avatar" />
                                    ) : (
                                        <div className="participant-avatar">👤</div>
                                    )}
                                    <span className="participant-name">{getUserDisplayName(p)}</span>
                                </div>
                                {p.variant && <span className="variant-badge">✓</span>}
                            </li>
                        ))}
                    </ul>

                    {isCreator && activityStatus === 'PENDING' && (
                        <button
                            onClick={startGame}
                            style={{
                                marginTop: '1rem',
                                padding: '0.8rem 1.5rem',
                                backgroundColor: '#238636',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                width: '100%'
                            }}
                        >
                            Начать игру
                        </button>
                    )}
                </div>

                <div className="game-panel">
                    {activityStatus !== 'FINISHED' && (
                        <div className="game-controls">
                            {timer !== null && <div className="timer">Осталось времени: {timer}с</div>}
                            <form onSubmit={handleSubmitVariant} className="variant-form">
                                <GameSearchInput
                                    onGameSelect={setMyVariant}
                                    disabled={hasSubmitted || timer === 0 || activityStatus !== 'IN_PROGRESS'}
                                />
                                <button type="submit" disabled={!myVariant || hasSubmitted || timer === 0 || activityStatus !== 'IN_PROGRESS'}>
                                    {hasSubmitted ? 'Вариант принят' : 'Предложить вариант'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="roulette-container">
                        <h2>Варианты в игре:</h2>
                        <div className="variants-grid">
                            {participants.filter(p => p.variant && !p.isEliminated).length > 0 ?
                                participants.filter(p => p.variant && !p.isEliminated).map(p => {
                                    const parsedVariant = parseVariant(p.variant);
                                    const isObjectVariant = typeof parsedVariant === 'object' && parsedVariant !== null;
                                    const variantCardClass = `variant-card ${eliminatingUserId === p.userId ? 'eliminating' : ''}`;

                                    if (isObjectVariant) {
                                        const game = parsedVariant as GameVariant;
                                        return (
                                            <a key={p.userId} href={game.storeUrl || '#'} target="_blank" rel="noopener noreferrer" className={variantCardClass} style={{ backgroundImage: `url(${game.image})` }}>
                                                <div className="variant-overlay">
                                                    <span>{game.name}</span>
                                                </div>
                                            </a>
                                        )
                                    }
                                    return (
                                        <div key={p.userId} className={variantCardClass}>
                                            {parsedVariant as string}
                                        </div>
                                    )
                                }) : <div className="no-variants-placeholder">Ожидание вариантов от участников...</div>
                            }
                        </div>
                    </div>

                    {winner && (
                        <div className="winner-announcement">
                            <h2>Победитель!</h2>
                            <p>Пользователь <strong>{
                                participants.find(p => p.userId === winner.userId)
                                    ? getUserDisplayName(participants.find(p => p.userId === winner.userId)!)
                                    : winner.userId
                            }</strong> победил с вариантом:</p>
                            <div className="winner-variant">{winner.variant}</div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ActivityPage;
