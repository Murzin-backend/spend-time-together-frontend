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

                    {cleanGameData.storeUrl && (
                        <div className="game-modal-store">
                            <a href={cleanGameData.storeUrl} target="_blank" rel="noopener noreferrer" className="store-button">
                                Открыть в магазине
                            </a>
                        </div>
                    )}

                    {!cleanGameData.storeUrl && cleanGameData.id && (
                        <div className="game-modal-store">
                            <a
                                href={`https://rawg.io/games/${cleanGameData.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rawg-button"
                            >
                                Открыть на RAWG.io
                            </a>
                        </div>
                    )}

                    {!cleanGameData.storeUrl && !cleanGameData.id && (
                        <div className="game-modal-store">
                            <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(cleanGameData.name + ' игра')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="search-button"
                            >
                                Искать в Google
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameModal;
