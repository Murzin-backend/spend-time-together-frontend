import React from 'react';
import { useParams, Link } from 'react-router-dom';
import GameSearchInput, { GameVariant } from '../GameSearchInput/GameSearchInput.tsx';
import api from '../../api/axiosConfig.ts';
import './ActivityPage.css';
import logo from '../../assets/logo.png'; 
import Notification, { NotificationProps } from '../Notification/Notification.tsx';
import GameModal from '../GameModal/GameModal.tsx';
import {getGameDetails, getGameStoreUrl, searchGames} from "../../api/rawgApi.ts";

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
    username?: string;
    gameImage?: string;
    metacritic?: number;
    api_game_id?: number; 
    background_image?: string;
    description?: string;
    release_date?: string;
    rating?: string | number;
    stores?: Array<{store_id: number, store_name: string, store_url: string}>;
}

interface Winner {
    userId: number;
    variant: string;
}

interface ActivityInfo {
    id: number;
    name: string;
    room_id: number;
    status: string;  
    type: string;
    creator_user_id: number;
    scheduled_at: string | null;
    winner_user_id: number | null;
}


const mapApiStatusToClientStatus = (apiStatus: string): 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' => {
    
    const status = apiStatus.toUpperCase();

    if (status === 'PLANNED' || status === 'IN_PROGRESS' ||
        status === 'FINISHED' || status === 'CANCELLED') {
        return status as 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
    }

    
    const statusMap: Record<string, 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'> = {
        'planned': 'PLANNED',
        'in_progress': 'IN_PROGRESS',
        'finished': 'FINISHED',
        'cancelled': 'CANCELLED'
    };

    return statusMap[apiStatus.toLowerCase()] || 'PLANNED';
};


interface CurrentUser {
    id: number;
    login: string;
    email: string;
    first_name: string;
    last_name: string | null;
    avatar_url: string | null;
    telegram_link: string | null;
    created_at: string;
    updated_at: string;
}


interface GameModalData {
    isOpen: boolean;
    game: GameVariant | null;
}

const ActivityPage: React.FC = () => {
    const { activityId } = useParams<{ activityId: string }>();
    const ws = React.useRef<WebSocket | null>(null);

    const backendUrl = api.defaults.baseURL ? api.defaults.baseURL.split('/api')[0] : '';


    const [isConnected, setIsConnected] = React.useState(false);
    const [activityStatus, setActivityStatus] = React.useState<'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'>('PLANNED');
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
    const [activityInfo, setActivityInfo] = React.useState<ActivityInfo | null>(null);
    const [wsInitialized, setWsInitialized] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState<CurrentUser | null>(null);
    const [variantsCount, setVariantsCount] = React.useState<number>(0);
    const [notification, setNotification] = React.useState<NotificationProps | null>(null);
    const [rouletteActive, setRouletteActive] = React.useState(false);
    const [finalShowdown, setFinalShowdown] = React.useState(false);
    const [gameModal, setGameModal] = React.useState<GameModalData>({
        isOpen: false,
        game: null
    });

    
    const fetchCurrentUser = async () => {
        try {
            const response = await api.get('/users/me');
            const userData = response.data?.payload?.data || response.data;
            console.log("Данные текущего пользователя:", userData);

            if (userData) {
                setCurrentUser(userData);
                setCurrentUserId(userData.id);

                
                if (activityInfo && activityInfo.creator_user_id) {
                    const numUserId = Number(userData.id);
                    const numCreatorId = Number(activityInfo.creator_user_id);
                    const isUserCreator = numUserId === numCreatorId;

                    console.log("Проверка создателя после получения данных пользователя:", {
                        userId: numUserId,
                        creatorId: numCreatorId,
                        isCreator: isUserCreator
                    });

                    setIsCreator(isUserCreator);
                }
            }
            return userData;
        } catch (err) {
            console.error('Error fetching current user info:', err);
            setError('Не удалось получить информацию о пользователе');
            return null;
        }
    };

    
    const fetchActivityInfo = async () => {
        if (!activityId) return;

        try {
            const response = await api.get(`/activities/${activityId}`);
            const data = response.data?.payload?.data || response.data;
            console.log("Извлеченные данные активности:", data);

            if (data) {
                setActivityInfo(data);
                setActivityName(data.name || 'Активность без названия');

                const clientStatus = mapApiStatusToClientStatus(data.status);
                console.log("Преобразованный статус:", data.status, "->", clientStatus);
                setActivityStatus(clientStatus);

                
                if (currentUserId) {
                    const numCurrentUserId = Number(currentUserId);
                    const numCreatorId = Number(data.creator_user_id);
                    const isUserCreator = numCurrentUserId === numCreatorId;

                    console.log("Проверка создателя при загрузке активности:", {
                        currentUserId: numCurrentUserId,
                        creatorId: numCreatorId,
                        isCreator: isUserCreator
                    });

                    setIsCreator(isUserCreator);
                }
            } else {
                console.error("Неожиданный формат ответа API:", response);
                setError("Ошибка в формате данных с сервера");
            }
        } catch (err) {
            console.error('Error fetching activity info:', err);
            setError('Не удалось загрузить информацию об активности');
        }
    };

    const pingServer = () => {
        ws.current?.send(JSON.stringify({ action: "ping" }));
    };

    const getUsersList = () => {
        ws.current?.send(JSON.stringify({ action: "get_users" }));
    };

    
    const requestActivityVariants = () => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ action: "get_variants" }));
            console.log("Запрошены варианты активности");
        } else {
            console.log("WebSocket не подключен, невозможно запросить варианты. Статус:", ws.current?.readyState);

            
            if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
                setTimeout(() => {
                    console.log("Повторная попытка запроса вариантов...");
                    requestActivityVariants();
                }, 500);
            }
        }
    };

    const startGame = () => {
        ws.current?.send(JSON.stringify({ action: "start_game" }));
    };

    
    const submitVariant = (variant: GameVariant) => {
        console.log("Отправка варианта:", variant);

        
        const variantData = {
            id: variant.id || 0,
            name: variant.name,
            description: variant.description || "",
            background_image: variant.image || "",
            background_image_additional: "",
            released: variant.released || "",
            rating: variant.rating || 0,
            metacritic: variant.metacritic || 0,
            stores: [
                {
                    store: { id: 1, name: "Steam" },
                    url: variant.storeUrl || ""
                }
            ],
            platforms: [
                {
                    platform: { id: 4, name: "PC", slug: "pc" }
                }
            ]
        };

        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                action: "submit_variant",
                payload: {
                    variant: variantData
                }
            }));
        } else {
            setNotification({
                message: 'Не удалось отправить вариант: нет соединения с сервером',
                type: 'error'
            });
        }
    };

    
    const openGameModal = async (game: GameVariant | string, participantData?: UserVariant) => {
        console.log("Открываем модальное окно для:", game, "Данные участника:", participantData);

        
        setNotification({
            message: 'Загрузка информации о игре...',
            type: 'info'
        });

        
        if (participantData) {
            const gameDetails = {
                id: participantData.api_game_id,
                name: getVariantName(participantData),
                image: participantData.gameImage || participantData.background_image,
                storeUrl: participantData.stores && participantData.stores.length ? participantData.stores[0].store_url : null,
                description: participantData.description || "",
                released: participantData.release_date,
                rating: participantData.rating,
                metacritic: participantData.metacritic
            };

            
            if (!gameDetails.description && participantData.api_game_id) {
                try {
                    const apiData = await getGameDetails(participantData.api_game_id);
                    if (apiData) {
                        gameDetails.description = apiData.description || gameDetails.description;
                        gameDetails.released = apiData.released || gameDetails.released;
                        gameDetails.rating = apiData.rating || gameDetails.rating;
                        gameDetails.metacritic = apiData.metacritic || gameDetails.metacritic;
                    }
                } catch (error) {
                    console.error("Ошибка при получении дополнительных данных:", error);
                }
            }

            setGameModal({
                isOpen: true,
                game: gameDetails
            });

            setNotification(null);
            return;
        }

        
        
        if (typeof game === 'object' && game !== null && 'id' in game) {
            const gameObj = game as GameVariant;
            setGameModal({
                isOpen: true,
                game: {
                    id: gameObj.id,
                    name: gameObj.name,
                    image: gameObj.background_image || gameObj.image || null,
                    storeUrl: gameObj.storeUrl || null,
                    description: gameObj.description || "",
                    released: gameObj.released,
                    rating: gameObj.rating,
                    metacritic: gameObj.metacritic
                }
            });
            setNotification(null);
            return;
        }

        
        if (typeof game === 'string') {
            try {
                
                console.log("Ищем игру по названию:", game);
                const gameData = await searchGames(game);
                if (gameData && gameData.length > 0) {
                    
                    const gameDetails = await getGameDetails(gameData[0].id);
                    if (gameDetails) {
                        const storeUrl = await getGameStoreUrl(gameData[0].id);
                        setGameModal({
                            isOpen: true,
                            game: {
                                id: gameDetails.id,
                                name: gameDetails.name,
                                image: gameDetails.background_image,
                                storeUrl: storeUrl,
                                description: gameDetails.description || "",
                                released: gameDetails.released,
                                rating: gameDetails.rating,
                                metacritic: gameDetails.metacritic
                            }
                        });
                        setNotification(null);
                        return;
                    }
                }

                
                setGameModal({
                    isOpen: true,
                    game: {
                        name: game,
                        image: participantData?.background_image || participantData?.gameImage || null,
                        storeUrl: null,
                        description: participantData?.description || "Подробная информация не найдена. Попробуйте поискать игру в интернете."
                    }
                });
            } catch (error) {
                console.error("Ошибка при получении информации о игре:", error);
                setGameModal({
                    isOpen: true,
                    game: {
                        name: game,
                        image: participantData?.background_image || participantData?.gameImage || null,
                        storeUrl: null,
                        description: "Произошла ошибка при загрузке информации."
                    }
                });
            }
            setNotification(null);
            return;
        }

        
        setGameModal({
            isOpen: true,
            game: {
                ...game as GameVariant,
                description: (game as GameVariant).description || "Подробное описание для этой игры отсутствует."
            }
        });
        setNotification(null);
    };

    
    const closeGameModal = () => {
        setGameModal({
            isOpen: false,
            game: null
        });
    };

    
    const checkCurrentUserHasVariant = () => {
        if (!currentUser) return false;

        
        console.log("Проверка наличия варианта для пользователя:", currentUser.id);
        console.log("Доступные варианты:", participants.map(p => ({ userId: p.userId, hasVariant: !!p.variant })));

        
        const userVariant = participants.find(p => Number(p.userId) === Number(currentUser.id) && p.variant);

        if (userVariant) {
            console.log("Найден вариант текущего пользователя:", userVariant);
            setHasSubmitted(true);
            return true;
        }

        return false;
    };

    
    const hasUserSubmittedVariant = (): boolean => {
        if (!currentUser) return false;
        return participants.some(p => Number(p.userId) === Number(currentUser.id) && p.variant);
    };

    
    React.useEffect(() => {
        const userHasVariant = hasUserSubmittedVariant();
        if (userHasVariant !== hasSubmitted) {
            setHasSubmitted(userHasVariant);
        }
    }, [participants, currentUser]);

    
    React.useEffect(() => {
        fetchCurrentUser().then(userData => {
            if (userData) {
                
                setTimeout(() => {
                    checkCurrentUserHasVariant();
                }, 300);
            }
        });
    }, []); 

    
    React.useEffect(() => {
        if (activityId) {
            fetchActivityInfo();
        }
    }, [activityId]);

    
    React.useEffect(() => {
        if (currentUserId && activityInfo && activityInfo.creator_user_id) {
            const numCurrentUserId = Number(currentUserId);
            const numCreatorId = Number(activityInfo.creator_user_id);
            const isUserCreator = numCurrentUserId === numCreatorId;

            console.log("Обновление статуса создателя из эффекта:", {
                currentUserId: numCurrentUserId,
                creatorId: numCreatorId,
                isCreator: isUserCreator,
                activityStatus,
                activityName: activityInfo.name
            });

            setIsCreator(isUserCreator);
        }
    }, [currentUserId, activityInfo]);

    
    React.useEffect(() => {
        console.log('Activity ID:', activityId);
        if (!activityId || wsInitialized) {
            return;
        }

        const wsShortUrl = process.env.REACT_WS_APP_API_URL
            ? process.env.REACT_WS_APP_API_URL
            : "ws://localhost:8000/api/ws"
        ;

        const wsUrl =  wsShortUrl + `/activity/${activityId}`;

        console.log(`Connecting to WebSocket at: ${wsUrl}`);

        
        setWsInitialized(true);

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connection established');
            setIsConnected(true);
            getUsersList();
            setNotification({
                message: 'Соединение с активностью установлено',
                type: 'success'
            });

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
                setNotification({
                    message: 'Соединение с сервером потеряно',
                    type: 'error'
                });
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('Произошла ошибка соединения с WebSocket.');
            setNotification({
                message: 'Ошибка соединения',
                type: 'error'
            });
        };

        ws.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);

            setError(null);

            switch (message.event) {
                case 'activity_state':
                    setActivityStatus(message.status);
                    
                    console.log("Обновление статуса активности:", message.status);
                    break;

                case 'activity_state_changed':
                    setActivityStatus(message.status);
                    setNotification({
                        message: `Статус активности изменён на: ${message.status}`,
                        type: 'info'
                    });
                    break;

                case 'activity_variants':
                    if (message.variants && Array.isArray(message.variants)) {
                        console.log("Получены варианты активности:", message.variants);

                        
                        if (currentUser) {
                            const myVariant = message.variants.find(
                                (v: any) => Number(v.user_id) === Number(currentUser.id)
                            );

                            if (myVariant) {
                                console.log("Найден вариант текущего пользователя в activity_variants:", myVariant);
                                setHasSubmitted(true);
                            }
                        }

                        
                        setParticipants(prev => {
                            const updatedParticipants = [...prev];

                            
                            message.variants.forEach((variantData: any) => {
                                const {
                                    user_id,
                                    variant,
                                    name,
                                    background_image,
                                    metacritic,
                                    api_game_id,
                                    description,
                                    rating,
                                    release_date,
                                    stores,
                                    platforms
                                } = variantData;

                                
                                const variantObject = {
                                    name: name || variant,
                                    api_game_id,
                                    background_image,
                                    description,
                                    metacritic,
                                    rating,
                                    release_date,
                                    stores
                                };

                                
                                const participantIndex = updatedParticipants.findIndex(p => p.userId === user_id);

                                if (participantIndex !== -1) {
                                    
                                    updatedParticipants[participantIndex] = {
                                        ...updatedParticipants[participantIndex],
                                        variant: variantObject,
                                        gameImage: background_image,
                                        metacritic: metacritic || 0,
                                        api_game_id: api_game_id,
                                        background_image: background_image,
                                        description: description,
                                        rating: rating,
                                        release_date: release_date,
                                        stores: stores
                                    };
                                } else {
                                    
                                    
                                    console.log("Добавляем нового участника, которого не было в списке:", user_id);
                                    updatedParticipants.push({
                                        userId: user_id,
                                        variant: variantObject,
                                        isEliminated: false,
                                        gameImage: background_image,
                                        metacritic: metacritic || 0,
                                        api_game_id: api_game_id,
                                        background_image: background_image,
                                        description: description,
                                        rating: rating,
                                        release_date: release_date,
                                        stores: stores
                                    });
                                }
                            });

                            return updatedParticipants;
                        });
                    }
                    break;

                case 'users_in_activity':
                    if (message.users) {
                        
                        const currentVariants = new Map(
                            participants.map(p => [p.userId, {
                                variant: p.variant,
                                gameImage: p.gameImage,
                                metacritic: p.metacritic,
                                api_game_id: p.api_game_id,
                                background_image: p.background_image,
                                description: p.description,
                                rating: p.rating,
                                release_date: p.release_date,
                                stores: p.stores,
                                isEliminated: p.isEliminated
                            }])
                        );

                        
                        const userVariants = message.users.map((user: User) => {
                            const existingData = currentVariants.get(user.id);
                            return {
                                userId: user.id,
                                variant: existingData?.variant || null,
                                isEliminated: existingData?.isEliminated || false,
                                firstName: user.first_name,
                                lastName: user.last_name,
                                avatarUrl: user.avatar_url,
                                gameImage: existingData?.gameImage,
                                metacritic: existingData?.metacritic,
                                api_game_id: existingData?.api_game_id,
                                background_image: existingData?.background_image,
                                description: existingData?.description,
                                rating: existingData?.rating,
                                release_date: existingData?.release_date,
                                stores: existingData?.stores
                            };
                        });

                        setParticipants(userVariants);
                    }
                    break;

                case 'connected':
                    if (message.user_id) {
                        console.log("Получен ID текущего пользователя:", message.user_id);
                        setCurrentUserId(message.user_id);

                        
                        if (activityInfo && activityInfo.creator_user_id) {
                            const isUserCreator = message.user_id === activityInfo.creator_user_id;
                            console.log("Проверка создателя после подключения:", {
                                userId: message.user_id,
                                creatorId: activityInfo.creator_user_id,
                                isCreator: isUserCreator
                            });
                            setIsCreator(isUserCreator);
                        }

                        
                        const activityUserKey = `activity_${activityId}_user_${message.user_id}_connected`;
                        const wasConnectedBefore = localStorage.getItem(activityUserKey) === 'true';

                        
                        
                        setTimeout(() => {
                            console.log("Запрос вариантов после подключения (с задержкой)");
                            requestActivityVariants();
                        }, 300);

                        
                        if (!wasConnectedBefore && message.data && message.data.message) {
                            setNotification({
                                message: message.data.message,
                                type: 'success'
                            });
                        }
                    }
                    break;

                case 'variant_submitted':
                    if (message.user_id) {
                        console.log("Получен сигнал variant_submitted от пользователя:", message.user_id);

                        
                        if (currentUser && Number(message.user_id) === Number(currentUser.id)) {
                            setNotification({
                                message: `Ваш вариант ${message.variant} успешно принят!`,
                                type: 'success'
                            });
                        } else {
                            
                            setNotification({
                                message: `${message.username || 'Пользователь'} предложил вариант: ${message.variant}`,
                                type: 'info'
                            });
                        }

                        
                        requestActivityVariants();
                    }
                    break;

                case 'user_joined':
                    if (message.user) {
                        
                        setParticipants(prev => {
                            if (prev.some(p => p.userId === message.user.id)) {
                                return prev;
                            }
                            return [...prev, {
                                userId: message.user.id,
                                variant: null,
                                isEliminated: false,
                                firstName: message.user.first_name,
                                lastName: message.user.last_name,
                                avatarUrl: message.user.avatar_url
                            }];
                        });

                    } else if (message.user_id) {
                        
                        setParticipants(prev => {
                            if (prev.some(p => p.userId === message.user_id)) {
                                return prev;
                            }
                            return [...prev, {
                                userId: message.user_id,
                                variant: null,
                                isEliminated: false,
                                firstName: message.username,
                                lastName: '',
                                avatarUrl: message.avatar_url
                            }];
                        });

                        setNotification({
                            message: `Пользователь ${message.username} присоединился к активности`,
                            type: 'info'
                        });
                    }
                    
                    requestActivityVariants();
                    break;

                case 'user_left':
                    if (message.user_id) {
                        setParticipants(prev => prev.filter(p => p.userId !== message.user_id));
                        setNotification({
                            message: `Пользователь ${message.username || 'ID:' + message.user_id} покинул активность`,
                            type: 'info'
                        });
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
                    if (message.variants_count) {
                        setVariantsCount(message.variants_count);
                    }
                    setRouletteActive(true);
                    setNotification({
                        message: `Рулетка запущена! Вариантов: ${message.variants_count || 'неизвестно'}`,
                        type: 'info'
                    });
                    break;

                case 'variant_eliminated':
                    if (message.user_id) {
                        setEliminatingUserId(message.user_id);

                        
                        const remainingActive = participants.filter(p => p.variant && !p.isEliminated && p.userId !== message.user_id).length;
                        if (remainingActive === 2) {
                            setFinalShowdown(true);
                            setNotification({
                                message: `Осталось два варианта! Финальное противостояние!`,
                                type: 'warning'
                            });
                        }

                        setTimeout(() => {
                            setParticipants(prev => prev.map(p =>
                                p.userId === message.user_id ? { ...p, isEliminated: true } : p
                            ));
                            setEliminatingUserId(null);

                            
                            if (remainingActive === 2) {
                                setTimeout(() => {
                                    setFinalShowdown(false);
                            }, 3000); 
                            }
                        }, 1500);

                        setNotification({
                            message: `Вариант выбыл: ${message.variant}`,
                            type: 'warning'
                        });
                    }
                    break;

                case 'winner_declared':
                    if (message.user_id && message.variant) {
                        setWinner({ userId: message.user_id, variant: message.variant });
                        setActivityStatus('FINISHED');
                        setRouletteActive(false);
                        setFinalShowdown(false);

                        const winnerName = participants.find(p => p.userId === message.user_id)
                            ? getUserDisplayName(participants.find(p => p.userId === message.user_id)!)
                            : `Пользователь ${message.user_id}`;

                        setNotification({
                            message: `Победитель: ${winnerName} с вариантом ${message.variant}!`,
                            type: 'success'
                        });
                    }
                    break;

                case 'error':
                    setError(message.message || 'Произошла неизвестная ошибка');
                    setNotification({
                        message: message.message || 'Произошла ошибка',
                        type: 'error'
                    });
                    break;

                case 'pong':
                    
                    console.log('Received pong from server');
                    break;

                default:
                    console.log('Unhandled event type:', message.event);
                    break;
            }
        };

        
        return () => {
            console.log('Закрытие WebSocket соединения при размонтировании');
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
            setWsInitialized(false);
        };
    }, [activityId]); 

    React.useEffect(() => {
        if (timer === null || timer <= 0) return;
        const interval = setInterval(() => {
            setTimer(t => (t ? t - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    
    const handleSubmitVariant = (e: React.FormEvent) => {
        e.preventDefault();
        if (myVariant && !hasUserSubmittedVariant()) {
            submitVariant(myVariant);
        }
    };

    
    const handleGameSelect = (selectedGame: GameVariant) => {
        
        setMyVariant(selectedGame);

        
        submitVariant(selectedGame);

        
        setNotification({
            message: `Отправка варианта: ${selectedGame.name}...`,
            type: 'info'
        });
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
                const parsed = JSON.parse(variant);

                
                if (parsed && typeof parsed === 'object' && 'name' in parsed) {
                    
                    return {
                        id: parsed.id,
                        name: parsed.name,
                        image: parsed.background_image || parsed.image || null,
                        storeUrl: parsed.storeUrl || null,
                        description: parsed.description || "",
                        released: parsed.released,
                        rating: parsed.rating,
                        metacritic: parsed.metacritic
                    };
                }
                return parsed;
            } catch (e) {
                console.log("Не удалось распарсить вариант как JSON:", variant);
                return variant;
            }
        }

        
        if (typeof variant === 'object' && variant !== null) {
            if (!('name' in variant)) {
                console.warn("Объект варианта не содержит поле name:", variant);
                return JSON.stringify(variant);
            }

            
            return {
                id: variant.id,
                name: variant.name,
                image: variant.background_image || variant.image || null,
                storeUrl: variant.storeUrl || null,
                description: variant.description || "",
                released: variant.released,
                rating: variant.rating,
                metacritic: variant.metacritic
            };
        }

        return variant;
    };

    
    const getVariantImage = (participant: UserVariant): string | null => {
        
        if (participant.gameImage) return participant.gameImage;
        if (participant.background_image) return participant.background_image;

        
        if (typeof participant.variant === 'object' && participant.variant !== null) {
            const variant = participant.variant as any;
            if (variant.background_image) return variant.background_image;
            if (variant.image) return variant.image;
        }

        
        const parsedVariant = parseVariant(participant.variant);
        if (typeof parsedVariant === 'object' && parsedVariant !== null && 'image' in parsedVariant) {
            return (parsedVariant as GameVariant).image;
        }

        return null;
    };

    
    const getVariantName = (participant: UserVariant): string => {
        
        if (typeof participant.variant === 'object' && participant.variant !== null) {
            const variant = participant.variant as any;
            if (variant.name) return variant.name;
        }

        
        if (typeof participant.variant === 'string') {
            return participant.variant;
        }

        
        const parsedVariant = parseVariant(participant.variant);
        if (typeof parsedVariant === 'object' && parsedVariant !== null && 'name' in parsedVariant) {
            return (parsedVariant as GameVariant).name;
        }
        if (typeof parsedVariant === 'string') {
            return parsedVariant;
        }

        return 'Неизвестный вариант';
    };

    
    React.useEffect(() => {
        if (isConnected && currentUser) {
            console.log("Запрашиваем варианты при установке соединения и получении данных пользователя:", currentUser.id);
            setTimeout(() => {
                requestActivityVariants();

                
                setTimeout(() => {
                    checkCurrentUserHasVariant();
                }, 500);
            }, 300);
        }
    }, [isConnected, currentUser]);

    
    const renderVariants = () => {
        const activeVariants = participants.filter(p => p.variant && !p.isEliminated);
        console.log("Активные варианты для отображения:", activeVariants);

        if (activeVariants.length === 0) {
            return <div className="no-variants-placeholder">Ожидание вариантов от участников...</div>;
        }

        return activeVariants.map(p => {
            const variantCardClass = `variant-card ${eliminatingUserId === p.userId ? 'eliminating' : ''} ${rouletteActive ? 'roulette-spinning' : ''}`;

            
            const userName = getUserDisplayName(p);

            
            const gameImage = getVariantImage(p);

            
            const gameName = getVariantName(p);

            
            const handleCardClick = () => {
                console.log("Клик по карточке варианта:", p.variant);
                openGameModal(p.variant, p);
            };

            return (
                <div
                    key={p.userId}
                    className={variantCardClass}
                    style={{ backgroundImage: `url(${gameImage})` }}
                    onClick={handleCardClick}
                >
                    <div className="variant-overlay">
                        <span className="game-name">{gameName}</span>
                        <span className="participant-tag">
                            от {userName}
                        </span>
                        {p.metacritic && p.metacritic !== 0 ? (
                            <span className="metacritic-badge">
                                {p.metacritic}
                            </span>
                        ) : null}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="activity-container">
            {notification &&
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            }

            {/* Модальное окно с информацией о игре */}
            {gameModal.isOpen && gameModal.game && (
                <GameModal
                    game={gameModal.game}
                    onClose={closeGameModal}
                />
            )}

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
                    <div className="activity-logo-container">
                        <img src={logo} alt="Логотип" className="activity-logo" />
                        <h2 className="activity-name">{activityName}</h2>
                    </div>

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

                    {/* Расширенная отладочная информация о статусе создателя */}
                    <div className="creator-debug">
                        <div>Текущий пользователь: {currentUser?.first_name} {currentUser?.last_name} (ID: {currentUser?.id})</div>
                        <div>Статус создателя: {isCreator ? 'Да' : 'Нет'}</div>
                        <div>Статус активности: {activityStatus}</div>
                        <div>ID создателя активности: {activityInfo?.creator_user_id}</div>
                        <div>Кнопка должна отображаться: {(isCreator && activityStatus === 'PLANNED') ? 'Да' : 'Нет'}</div>
                    </div>

                    {/* Изменено условие отображения кнопки на 'PLANNED' */}
                    {isCreator && (activityStatus === 'PLANNED' || activityStatus === 'planned') && (
                        <button
                            onClick={startGame}
                            className="start-game-button"
                        >
                            Начать игру
                        </button>
                    )}
                </div>

                <div className="game-panel">
                    {activityStatus !== 'FINISHED' && (
                        <div className="game-controls">
                            {timer !== null && <div className="timer">Осталось времени: {timer}с</div>}
                            <form className="variant-form">
                                <GameSearchInput
                                    onGameSelect={handleGameSelect} 
                                    disabled={hasUserSubmittedVariant()}
                                    defaultValue={
                                        
                                        currentUser && participants.find(p => Number(p.userId) === Number(currentUser.id) && p.variant)
                                            ? getVariantName(participants.find(p => Number(p.userId) === Number(currentUser.id))!)
                                            : ''
                                    }
                                />
                            </form>
                            {hasUserSubmittedVariant() && (
                                <div className="variant-submitted-notice">
                                    Ваш вариант уже отправлен. Нельзя отправить больше одного варианта.
                                </div>
                            )}

                            {/* Отладочная информация */}
                            <div className="debug-notice">
                                {currentUser && (
                                    <div>
                                        Текущий пользователь: {currentUser.first_name} {currentUser.last_name} (ID: {currentUser.id})<br/>
                                        Статус варианта: {hasUserSubmittedVariant() ? 'Вариант отправлен' : 'Вариант не отправлен'}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`roulette-container ${rouletteActive ? 'active' : ''} ${finalShowdown ? 'final-showdown' : ''}`}>
                        <h2>Варианты в игре:</h2>
                        <div className="variants-grid">
                            {renderVariants()}
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
