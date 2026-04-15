import React from 'react';
import { GameVariant } from '../GameSearchInput/GameSearchInput';
import './GameModal.css';

interface GameModalProps {
    game: GameVariant;
    onClose: () => void;
}

const GameModal: React.FC<GameModalProps> = ({ game, onClose }) => {
    // Останавливаем всплытие клика на контенте модального окна
    const handleContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    // Добавляем логирование для отладки
    React.useEffect(() => {
        console.log("Модальное окно открыто с данными:", game);
    }, [game]);

    // Форматируем дату для красивого отображения
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Неизвестно';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    // Очищаем данные от нулевых значений
    const cleanGameData = {
        ...game,
        // Если metacritic равен 0, устанавливаем undefined
        metacritic: game.metacritic && game.metacritic !== 0 ? game.metacritic : undefined,
        // То же самое для других числовых значений, которые могут быть 0
        rating: game.rating && game.rating !== 0 ? game.rating : undefined
    };

    const STORE_META: Record<number, { label: string; icon: string; searchUrl?: (name: string) => string }> = {
        1:  { label: 'Steam',           icon: '🎮', searchUrl: (n) => `https://store.steampowered.com/search/?term=${encodeURIComponent(n)}` },
        2:  { label: 'Xbox Store',      icon: '🟢', searchUrl: (n) => `https://www.xbox.com/search?q=${encodeURIComponent(n)}` },
        3:  { label: 'PlayStation Store',icon: '🔵', searchUrl: (n) => `https://store.playstation.com/search/${encodeURIComponent(n)}` },
        4:  { label: 'App Store',       icon: '🍎' },
        5:  { label: 'GOG',             icon: '🟣', searchUrl: (n) => `https://www.gog.com/games?search=${encodeURIComponent(n)}` },
        6:  { label: 'Nintendo Store',  icon: '🔴', searchUrl: (n) => `https://www.nintendo.com/search/#q=${encodeURIComponent(n)}` },
        7:  { label: 'Xbox 360 Store',  icon: '🟢' },
        8:  { label: 'Google Play',     icon: '▶️' },
        9:  { label: 'itch.io',         icon: '🎲' },
        11: { label: 'Epic Games',      icon: '🏔️', searchUrl: (n) => `https://store.epicgames.com/browse?q=${encodeURIComponent(n)}` },
    };

    const getStoreMeta = (storeId: number, storeName?: string) => {
        return STORE_META[storeId] || { label: storeName || 'Магазин', icon: '🛒' };
    };

    const renderStoreLinks = () => {
        // If we have stores from API
        if (cleanGameData.stores && cleanGameData.stores.length > 0) {
            return (
                <div className="store-links-grid">
                    {cleanGameData.stores.map((s, idx) => {
                        const meta = getStoreMeta(s.store.id, s.store.name);
                        return (
                            <a
                                key={idx}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="store-link-btn"
                            >
                                <span className="store-icon">{meta.icon}</span>
                                <span>{meta.label}</span>
                            </a>
                        );
                    })}
                </div>
            );
        }

        // Fallback: search links for major stores
        if (cleanGameData.id || cleanGameData.name) {
            const searchStores = [1, 3, 11, 5]; // Steam, PS, Epic, GOG
            return (
                <div className="store-links-grid">
                    {searchStores.map(storeId => {
                        const meta = STORE_META[storeId];
                        if (!meta?.searchUrl) return null;
                        return (
                            <a
                                key={storeId}
                                href={meta.searchUrl(cleanGameData.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="store-link-btn store-link-btn--search"
                            >
                                <span className="store-icon">{meta.icon}</span>
                                <span>Найти в {meta.label}</span>
                            </a>
                        );
                    })}
                    {cleanGameData.id && (
                        <a
                            href={`https://rawg.io/games/${cleanGameData.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="store-link-btn store-link-btn--rawg"
                        >
                            <span className="store-icon">📋</span>
                            <span>RAWG.io</span>
                        </a>
                    )}
                </div>
            );
        }

        return (
            <a
                href={`https://www.google.com/search?q=${encodeURIComponent(cleanGameData.name + ' купить игру')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="search-button"
            >
                Найти игру в Google
            </a>
        );
    };

    return (
        <div className="game-modal-overlay" onClick={onClose}>
            <div className="game-modal-content" onClick={handleContentClick}>
                <button className="game-modal-close" onClick={onClose}>×</button>

                <div className="game-modal-header">
                    {cleanGameData.image && (
                        <div className="game-modal-image" style={{ backgroundImage: `url(${cleanGameData.image})` }}></div>
                    )}
                    <h2 className="game-modal-title">{cleanGameData.name}</h2>
                </div>

                <div className="game-modal-body">
                    {cleanGameData.metacritic && (
                        <div className="game-modal-rating">
                            <span className="rating-label">Рейтинг Metacritic:</span>
                            <span className={`rating-value ${cleanGameData.metacritic >= 75 ? 'high' : cleanGameData.metacritic >= 50 ? 'medium' : 'low'}`}>
                                {cleanGameData.metacritic}
                            </span>
                        </div>
                    )}

                    {cleanGameData.released && (
                        <div className="game-modal-info">
                            <span className="info-label">Дата выхода:</span>
                            <span className="info-value">
                                {formatDate(cleanGameData.released)}
                            </span>
                        </div>
                    )}

                    {cleanGameData.rating && (
                        <div className="game-modal-info">
                            <span className="info-label">Рейтинг игроков:</span>
                            <span className="info-value">{cleanGameData.rating} / 5</span>
                        </div>
                    )}

                    <div className="game-modal-description">
                        <h3>Описание:</h3>
                        {cleanGameData.description ? (
                            // Если описание это HTML, отображаем его как HTML
                            typeof cleanGameData.description === 'string' && cleanGameData.description.includes('<') ? (
                                <div dangerouslySetInnerHTML={{ __html: cleanGameData.description }} />
                            ) : (
                                <p>{cleanGameData.description}</p>
                            )
                        ) : (
                            <p>Подробная информация об этой игре недоступна.</p>
                        )}
                    </div>

                    <div className="game-modal-store">
                        <h3>Где купить:</h3>
                        {renderStoreLinks()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameModal;
