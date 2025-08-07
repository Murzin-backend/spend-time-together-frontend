import axios from 'axios';

const API_KEY = '0baccfad9c324360bfb122bc5f753088';

const rawgApiClient = axios.create({
    baseURL: 'https://api.rawg.io/api',
    params: {
        key: API_KEY,
    },
});

export interface RawgGame {
    id: number;
    name: string;
    background_image: string;
    // Добавляем недостающие поля
    description?: string;
    released?: string;
    rating?: number;
    metacritic?: number;
    short_screenshots?: { id: number; image: string }[];
    genres?: { id: number; name: string; slug: string }[];
    platforms?: { platform: { id: number; name: string; slug: string } }[];
}

interface GameStoreResponse {
    results: {
        id: number;
        url: string;
        store_id: number;
        store: {
            id: number;
            name: string;
        }
    }[];
}

export const searchGames = async (query: string): Promise<RawgGame[]> => {
    if (!query) return [];
    try {
        const response = await rawgApiClient.get('/games', {
            params: {
                search: query,
                page_size: 5, // Ограничиваем количество результатов
                // Запрашиваем дополнительные поля
                fields: 'id,name,background_image,released,rating,metacritic,description',
            },
        });
        return response.data.results;
    } catch (error) {
        console.error("Error searching games on RAWG:", error);
        return [];
    }
};

// Улучшенная функция получения детальной информации о игре
export const getGameDetails = async (gameId: number): Promise<RawgGame | null> => {
    try {
        console.log(`Запрос детальной информации о игре ${gameId}`);
        const response = await rawgApiClient.get<RawgGame>(`/games/${gameId}`);
        console.log(`Получены данные игры ${gameId}:`, {
            name: response.data.name,
            hasDescription: !!response.data.description,
            descriptionLength: response.data.description?.length || 0
        });
        return response.data;
    } catch (error) {
        console.error(`Ошибка при получении информации о игре ${gameId}:`, error);
        return null;
    }
};

export const getGameStoreUrl = async (gameId: number): Promise<string | null> => {
    try {
        const response = await rawgApiClient.get<GameStoreResponse>(`/games/${gameId}/stores`);
        const stores = response.data.results;
        if (!stores || stores.length === 0) return null;

        // Отдаем предпочтение Steam, затем другим магазинам
        const steamStore = stores.find(s => s.store_id === 1);
        if (steamStore) return steamStore.url;

        const epicStore = stores.find(s => s.store_id === 11);
        if (epicStore) return epicStore.url;

        const gogStore = stores.find(s => s.store_id === 5);
        if (gogStore) return gogStore.url;

        return stores[0].url; // Возвращаем первый доступный
    } catch (error) {
        console.error(`Error fetching stores for game ${gameId}:`, error);
        return null;
    }
};
