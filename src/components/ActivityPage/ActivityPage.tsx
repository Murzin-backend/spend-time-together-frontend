import React from 'react';
import { useParams, Link } from 'react-router-dom';
import GameSearchInput, { GameVariant } from '../GameSearchInput/GameSearchInput.tsx';
import api from '../../api/axiosConfig.ts';
import './ActivityPage.css';
import logo from '../../assets/logo.png'; 
import Notification, { NotificationProps } from '../Notification/Notification.tsx';
import GameModal from '../GameModal/GameModal.tsx';
import {getGameDetails, getGameStoreUrl, searchGames} from "../../api/rawgApi.ts";
import GameFinishedScreen from '../GameFinishedScreen/GameFinishedScreen.tsx';

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
    isOnline?: boolean;
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

    const [highlightedVariantId, setHighlightedVariantId] = React.useState<number | null>(null);
    const [rouletteAnimationSpeed, setRouletteAnimationSpeed] = React.useState(150);
    const rouletteIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // Reactions
    const [showReactionPanel, setShowReactionPanel] = React.useState(false);
    const [activeReactions, setActiveReactions] = React.useState<Array<{
        id: string;
        userId: number;
        username: string;
        avatarUrl?: string | null;
        reactionId: string;
        timestamp: number;
    }>>([]);

    const REACTIONS = [
        { id: 'greeting', emoji: '👋', text: 'Привет!' },
        { id: 'well_played', emoji: '👏', text: 'Отлично!' },
        { id: 'thanks', emoji: '🙏', text: 'Спасибо!' },
        { id: 'oops', emoji: '😬', text: 'Ой-ой...' },
        { id: 'threaten', emoji: '😈', text: 'Мне повезёт!' },
        { id: 'wow', emoji: '😮', text: 'Ничего себе!' },
    ];

    const sendReaction = (reactionId: string) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                action: "send_reaction",
                payload: { reaction_id: reactionId }
            }));
        }
        setShowReactionPanel(false);
    };

    const startRouletteHighlightAnimation = React.useCallback(() => {
        const activeVariants = participants.filter(p => p.variant && !p.isEliminated);
        if (activeVariants.length <= 1) return;

        let currentIndex = 0;
        let speed = 150;
        let spinCounter = 0;
        const totalSpins = Math.floor(Math.random() * 3) + 5;

        const animate = () => {
            setHighlightedVariantId(activeVariants[currentIndex].userId);
            currentIndex = (currentIndex + 1) % activeVariants.length;

            if (currentIndex === 0) {
                spinCounter++;
            }

            if (spinCounter >= totalSpins) {
                speed = Math.min(speed + 15, 800);
            } else if (spinCounter >= totalSpins - 2) {
                speed = Math.min(speed + 5, 400);
            }

            setRouletteAnimationSpeed(speed);

            rouletteIntervalRef.current = setTimeout(animate, speed);
        };

        setTimeout(() => {
            setNotification({
                message: 'Крутим барабан!',
                type: 'info'
            });
            animate();
        }, 300);
    }, [participants]);

    const stopRouletteHighlightAnimation = React.useCallback(() => {
        if (rouletteIntervalRef.current) {
            clearTimeout(rouletteIntervalRef.current);
            rouletteIntervalRef.current = null;
        }
        setHighlightedVariantId(null);
        setRouletteAnimationSpeed(150);
    }, []);

    const handleVariantElimination = React.useCallback((userId: number, variant: string) => {
        stopRouletteHighlightAnimation();

        setHighlightedVariantId(userId);
        setEliminatingUserId(userId);

        setNotification({
            message: `Вариант "${variant}" выбывает!`,
            type: 'warning'
        });

        setTimeout(() => {
            setParticipants(prev => prev.map(p =>
                p.userId === userId ? { ...p, isEliminated: true } : p
            ));

            setHighlightedVariantId(null);
            setEliminatingUserId(null);

            const remainingCount = participants.filter(p => p.variant && !p.isEliminated && p.userId !== userId).length;

            if (remainingCount === 2) {
                setFinalShowdown(true);
                setNotification({
                    message: '🔥 Финальная битва! Осталось два варианта!',
                    type: 'warning'
                });

                // Запускаем замедленную анимацию для финальной битвы через небольшую паузу
                setTimeout(() => {
                    startRouletteHighlightAnimation();
                }, 1500);
            }
            // Если осталось больше 2-х вариантов, продолжаем обычную анимацию
            else if (remainingCount > 2) {
                setTimeout(() => {
                    startRouletteHighlightAnimation();
                }, 500);
            }
        }, 2000);
    }, [participants, startRouletteHighlightAnimation, stopRouletteHighlightAnimation]);

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

    React.useEffect(() => {
        if (activityInfo && activityInfo.status === 'finished' && activityInfo.winner_user_id) {
            console.log("Активность завершена, winner_id:", activityInfo.winner_user_id);
            setActivityStatus('FINISHED');

            // Устанавливаем победителя из информации об активности
            const winnerUser = participants.find(p => p.userId === activityInfo.winner_user_id);
            if (winnerUser) {
                setWinner({
                    userId: activityInfo.winner_user_id,
                    variant: getVariantName(winnerUser)
                });
            } else {
                // Если участник не найден, создаем базовую информацию о победителе
                setWinner({
                    userId: activityInfo.winner_user_id,
                    variant: 'Неизвестный вариант'
                });
            }
        }
    }, [activityInfo, participants]);

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

        setNotification({
            message: 'Запуск рулетки...',
            type: 'info'
        });
    };

    const startRouletteAnimation = () => {
        stopRouletteHighlightAnimation();

        const activeVariants = participants.filter(p => p.variant && !p.isEliminated);
        if (activeVariants.length <= 1) return;

        let currentIndex = 0;
        let speed = 150;
        let cyclesCompleted = 0;
        const maxCycles = 10;

        const animate = () => {

            setHighlightedVariantId(activeVariants[currentIndex].userId);


            currentIndex = (currentIndex + 1) % activeVariants.length;


            if (currentIndex === 0) {
                cyclesCompleted++;
            }


            if (cyclesCompleted > maxCycles * 0.7) {

                speed += 15;
            } else if (cyclesCompleted > maxCycles * 0.5) {

                speed += 8;
            } else if (cyclesCompleted > maxCycles * 0.3) {

                speed += 3;
            }


            if (cyclesCompleted < maxCycles) {
                rouletteIntervalRef.current = setTimeout(animate, speed);
            } else {

                setHighlightedVariantId(null);
            }
        };


        animate();
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
            stores: variant.stores && variant.stores.length > 0
                ? variant.stores
                : variant.storeUrl
                    ? [{ store: { id: 1, name: "Steam" }, url: variant.storeUrl }]
                    : [],
            platforms: variant.platforms && variant.platforms.length > 0
                ? variant.platforms
                : [{ platform: { id: 4, name: "PC", slug: "pc" } }],
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
            const storeUrl = participantData.stores && participantData.stores.length
                ? participantData.stores[0].store_url
                : null;

            const gameDetails: GameVariant = {
                id: participantData.api_game_id,
                name: getVariantName(participantData),
                image: participantData.gameImage || participantData.background_image || null,
                storeUrl: storeUrl,
                description: participantData.description || "",
                released: participantData.release_date,
                rating: participantData.rating,
                metacritic: participantData.metacritic,
                stores: participantData.stores?.map(s => ({
                    store: { id: s.store_id, name: s.store_name },
                    url: s.store_url,
                })),
            };

            if (!gameDetails.description && participantData.api_game_id) {
                try {
                    const apiData = await getGameDetails(participantData.api_game_id);
                    if (apiData) {
                        gameDetails.description = apiData.description || gameDetails.description;
                    }
                } catch (error) {
                    console.error("Ошибка при получении описания:", error);
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

        let wsUrl;
        const wsShortUrl = api.defaults.baseURL;
        if (wsShortUrl === 'http://localhost:8000/api') {
            wsUrl = wsShortUrl.replace(/^http/, 'ws') + `/ws/activity/${activityId}`;
        } else {
            wsUrl = wsShortUrl.replace(/^https/, 'wss') + `/ws/activity/${activityId}`;
        }

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
                                    platforms,
                                    user_first_name,
                                    user_last_name,
                                    user_avatar_url,
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
                                        stores: stores,
                                        firstName: updatedParticipants[participantIndex].firstName || user_first_name,
                                        lastName: updatedParticipants[participantIndex].lastName || user_last_name,
                                        avatarUrl: updatedParticipants[participantIndex].avatarUrl || user_avatar_url,
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
                                        stores: stores,
                                        firstName: user_first_name,
                                        lastName: user_last_name,
                                        avatarUrl: user_avatar_url,
                                    });
                                }
                            });

                            return updatedParticipants;
                        });
                    }
                    break;

                case 'users_in_activity':
                    if (message.users) {
                        console.log("Получено сообщение users_in_activity, сохраняем варианты");


                        const allCurrentVariants = new Map();
                        participants.forEach(p => {
                            if (p.variant) {
                                allCurrentVariants.set(p.userId, {
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
                                });
                            }
                        });


                        const onlineUserIds = new Set(message.users.map((u: User) => u.id));

                        const userVariants = message.users.map((user: User) => {
                            const savedVariantData = allCurrentVariants.get(user.id);
                            return {
                                userId: user.id,
                                variant: savedVariantData?.variant || null,
                                isEliminated: savedVariantData?.isEliminated || false,
                                isOnline: true,
                                firstName: user.first_name,
                                lastName: user.last_name,
                                avatarUrl: user.avatar_url,
                                gameImage: savedVariantData?.gameImage,
                                metacritic: savedVariantData?.metacritic,
                                api_game_id: savedVariantData?.api_game_id,
                                background_image: savedVariantData?.background_image,
                                description: savedVariantData?.description,
                                rating: savedVariantData?.rating,
                                release_date: savedVariantData?.release_date,
                                stores: savedVariantData?.stores
                            };
                        });

                        // Keep offline participants who have variants (they submitted but disconnected)
                        const offlineWithVariants = participants.filter(
                            p => p.variant && !onlineUserIds.has(p.userId)
                        ).map(p => ({ ...p, isOnline: false }));

                        userVariants.push(...offlineWithVariants);

                        setParticipants(userVariants);


                        setTimeout(() => {
                            console.log("Запрашиваем варианты после users_in_activity");
                            requestActivityVariants();
                        }, 100);
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
                            const existing = prev.find(p => p.userId === message.user.id);
                            if (existing) {
                                return prev.map(p => p.userId === message.user.id ? { ...p, isOnline: true } : p);
                            }
                            return [...prev, {
                                userId: message.user.id,
                                variant: null,
                                isEliminated: false,
                                isOnline: true,
                                firstName: message.user.first_name,
                                lastName: message.user.last_name,
                                avatarUrl: message.user.avatar_url
                            }];
                        });

                    } else if (message.user_id) {

                        setParticipants(prev => {
                            const existing = prev.find(p => p.userId === message.user_id);
                            if (existing) {
                                return prev.map(p => p.userId === message.user_id ? { ...p, isOnline: true } : p);
                            }
                            return [...prev, {
                                userId: message.user_id,
                                variant: null,
                                isEliminated: false,
                                isOnline: true,
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
                        setParticipants(prev => prev.map(p => {
                            if (p.userId === message.user_id) {
                                if (p.variant) {
                                    return { ...p, isOnline: false };
                                }
                                return null;
                            }
                            return p;
                        }).filter(Boolean) as typeof prev);
                        setNotification({
                            message: `Пользователь ${message.username || 'ID:' + message.user_id} покинул активность`,
                            type: 'info'
                        });
                    }
                    break;

                case 'reaction':
                    {
                        const reactionKey = `${message.user_id}-${message.reaction_id}-${Date.now()}`;
                        setActiveReactions(prev => [...prev, {
                            id: reactionKey,
                            userId: message.user_id,
                            username: message.username,
                            avatarUrl: message.avatar_url,
                            reactionId: message.reaction_id,
                            timestamp: Date.now()
                        }]);
                        // Auto-remove after 4 seconds
                        setTimeout(() => {
                            setActiveReactions(prev => prev.filter(r => r.id !== reactionKey));
                        }, 4000);
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
                    startRouletteHighlightAnimation();
                    setNotification({
                        message: `Рулетка запущена! Вариантов: ${message.variants_count || 'неизвестно'}`,
                        type: 'info'
                    });
                    break;

                case 'roulette_pre_eliminate':
                    if (message.user_id) {
                        stopRouletteHighlightAnimation();
                        setHighlightedVariantId(message.user_id);
                        setEliminatingUserId(message.user_id);
                        setNotification({
                            message: `Вариант "${message.variant}" под угрозой...`,
                            type: 'warning'
                        });
                    }
                    break;

                case 'variant_eliminated':
                    if (message.user_id) {
                        setParticipants(prev => prev.map(p =>
                            p.userId === message.user_id ? { ...p, isEliminated: true } : p
                        ));

                        setNotification({
                            message: `Вариант "${message.variant}" выбывает!`,
                            type: 'warning'
                        });

                        setTimeout(() => {
                            setEliminatingUserId(null);
                            setHighlightedVariantId(null);

                            const remainingVariants = participants.filter(p =>
                                p.variant && !p.isEliminated && p.userId !== message.user_id
                            );

                            if (remainingVariants.length === 2) {
                                setFinalShowdown(true);
                                setNotification({
                                    message: 'Финальная битва! Осталось два варианта!',
                                    type: 'warning'
                                });
                            }

                            if (remainingVariants.length > 1) {
                                startRouletteHighlightAnimation();
                            }
                        }, 800);
                    }
                    break;

                case 'winner_declared':
                    if (message.user_id && message.variant) {

                        stopRouletteHighlightAnimation();


                        setHighlightedVariantId(message.user_id);
                        setNotification({
                            message: '🎉 Определяем победителя...',
                            type: 'info'
                        });


                        setTimeout(() => {

                            const winnerName = participants.find(p => p.userId === message.user_id)
                                ? getUserDisplayName(participants.find(p => p.userId === message.user_id)!)
                                : `Пользователь ${message.user_id}`;


                        setNotification({
                            message: `🏆 Победитель: ${winnerName} с вариантом ${message.variant}!`,
                            type: 'success'
                        });


                        setTimeout(() => {
                            setWinner({ userId: message.user_id, variant: message.variant });
                            setActivityStatus('FINISHED');
                            setRouletteActive(false);
                            setFinalShowdown(false);
                            setHighlightedVariantId(null);
                        }, 2000);
                    }, 2000);
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
        return () => {
            stopRouletteHighlightAnimation();
        };
    }, [stopRouletteHighlightAnimation]);

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
            let variantCardClass = 'variant-card';


            if (highlightedVariantId === p.userId) {
                if (eliminatingUserId === p.userId) {
                    variantCardClass += ' eliminating';
                } else if (finalShowdown) {
                    variantCardClass += ' final-highlight';
                } else {
                    variantCardClass += ' highlighted-variant';
                }
            }


            if (finalShowdown && !eliminatingUserId) {
                variantCardClass += ' final-card';
            }


            if (rouletteActive && !eliminatingUserId && highlightedVariantId !== p.userId) {
                variantCardClass += ' variant-active';
            }

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
                    style={{ backgroundImage: gameImage ? `url(${gameImage})` : undefined }}
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


    const getRouletteVariants = () => {
        return participants
            .filter(p => p.variant)
            .map(p => ({
                userId: p.userId,
                variant: getVariantName(p),
                gameImage: getVariantImage(p),
                userName: getUserDisplayName(p),
                isEliminated: p.isEliminated
            }));
    };


    const getFinishedGameVariants = () => {
        return participants
            .filter(p => p.variant)
            .map(p => ({
                userId: p.userId,
                variant: getVariantName(p),
                gameImage: getVariantImage(p),
                userName: getUserDisplayName(p),
                api_game_id: p.api_game_id,
                description: p.description,
                metacritic: p.metacritic,
                isWinner: winner ? p.userId === winner.userId : false,
                avatarUrl: p.avatarUrl
            }));
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
                                    <div className="participant-avatar-wrapper">
                                        {p.avatarUrl ? (
                                            <img src={backendUrl + p.avatarUrl} alt={p.firstName} className="participant-avatar" />
                                        ) : (
                                            <div className="participant-avatar">👤</div>
                                        )}
                                        <span className={`online-indicator ${p.isOnline !== false ? 'online' : 'offline'}`} />
                                    </div>
                                    <span className="participant-name">{getUserDisplayName(p)}</span>
                                </div>
                                {p.variant && <span className="variant-badge">✓</span>}
                            </li>
                        ))}
                    </ul>

                    <div className="reactions-section">
                        <button
                            className="reaction-toggle-btn"
                            onClick={() => setShowReactionPanel(!showReactionPanel)}
                        >
                            💬
                        </button>
                        {showReactionPanel && (
                            <div className="reaction-panel">
                                {REACTIONS.map(r => (
                                    <button
                                        key={r.id}
                                        className="reaction-btn"
                                        onClick={() => sendReaction(r.id)}
                                    >
                                        <span className="reaction-emoji">{r.emoji}</span>
                                        <span className="reaction-text">{r.text}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Floating reactions */}
                    <div className="floating-reactions">
                        {activeReactions.map(r => {
                            const reactionDef = REACTIONS.find(def => def.id === r.reactionId);
                            return (
                                <div key={r.id} className="floating-reaction">
                                    <span className="floating-reaction-emoji">{reactionDef?.emoji}</span>
                                    <div className="floating-reaction-content">
                                        <span className="floating-reaction-user">{r.username}</span>
                                        <span className="floating-reaction-text">{reactionDef?.text}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

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
                    {/* Показываем экран результатов если игра завершена */}
                    {(activityStatus === 'FINISHED' || (activityInfo?.status === 'finished' && activityInfo?.winner_user_id)) ? (
                        <div className="game-finished-wrapper">
                            <GameFinishedScreen
                                winner={winner || { userId: activityInfo?.winner_user_id || 0, variant: 'Неизвестный вариант' }}
                                allVariants={getFinishedGameVariants()}
                                onOpenGameModal={openGameModal}
                                isCreator={isCreator}
                                backendUrl={backendUrl}
                            />
                        </div>
                    ) : (
                        <>
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

                                </div>
                            )}

                            <div className={`roulette-container ${rouletteActive ? 'active' : ''} ${finalShowdown ? 'final-showdown' : ''}`}>
                                <h2>Варианты в игре</h2>

                                {/* Обертка для эффекта рулетки */}
                                <div className={`roulette-drum ${finalShowdown ? 'final-showdown-grid' : ''}`}>
                                    <div className="variants-grid">
                                        {renderVariants()}
                                    </div>

                                    {/* Сообщение о финальной битве */}
                                    {finalShowdown && !eliminatingUserId && (
                                        <div className="roulette-message">
                                            Финальная битва!
                                        </div>
                                    )}
                                </div>

                                {rouletteActive && (
                                    <div className="roulette-status">
                                        <div className="status-text">
                                            {finalShowdown ? '🔥 Финальная битва!' : '🎰 Выбираем победителя...'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ActivityPage;
