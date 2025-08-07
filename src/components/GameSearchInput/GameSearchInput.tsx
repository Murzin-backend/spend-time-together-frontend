import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce.ts';
import { searchGames, getGameStoreUrl, getGameDetails, RawgGame } from '../../api/rawgApi.ts';
import './GameSearchInput.css';

export interface GameVariant {
    id?: number;
    name: string;
    image: string | null;
    storeUrl: string | null;
    description?: string;
    released?: string;
    rating?: number;
    metacritic?: number;
}

interface GameSearchInputProps {
    onGameSelect: (game: GameVariant) => void;
    disabled: boolean;
    defaultValue?: string; // Добавляем возможность передать значение по умолчанию
}

const GameSearchInput: React.FC<GameSearchInputProps> = ({ onGameSelect, disabled, defaultValue = '' }) => {
    const [query, setQuery] = useState(defaultValue);
    const [results, setResults] = useState<RawgGame[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const debouncedQuery = useDebounce(query, 500);
    const [hasSelected, setHasSelected] = useState(!!defaultValue); // Если есть defaultValue, считаем что выбор уже сделан
    const inputRef = useRef<HTMLInputElement>(null); // Реф для сохранения фокуса

    // Применяем значение по умолчанию при изменении disabled или defaultValue
    useEffect(() => {
        console.log("GameSearchInput: disabled =", disabled, "defaultValue =", defaultValue);
        if (defaultValue) {
            setQuery(defaultValue);
            setHasSelected(true);
            console.log("GameSearchInput: установлено значение по умолчанию:", defaultValue);
        }
    }, [disabled, defaultValue]);

    // Новый эффект для принудительной блокировки ввода при disabled=true
    useEffect(() => {
        if (disabled) {
            setHasSelected(true);
            console.log("GameSearchInput: форма заблокирована");
        }
    }, [disabled]);

    // Выполняем поиск на основе debouncedQuery
    useEffect(() => {
        if (debouncedQuery && !hasSelected) {
            const performSearch = async () => {
                setIsLoading(true);
                setShowResults(true);
                try {
                    const games = await searchGames(debouncedQuery);
                    setResults(games);
                } catch (error) {
                    console.error("Error searching games:", error);
                } finally {
                    setIsLoading(false);
                    // Возвращаем фокус на инпут после завершения поиска
                    if (inputRef.current) {
                        inputRef.current.focus();

                        // Сохраняем позицию курсора
                        const cursorPosition = inputRef.current.selectionStart;
                        setTimeout(() => {
                            if (inputRef.current) {
                                inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                            }
                        }, 0);
                    }
                }
            };

            performSearch();
        } else if (!debouncedQuery) {
            setResults([]);
            setShowResults(false);
        }
    }, [debouncedQuery, hasSelected]);

    const handleSelect = async (game: RawgGame) => {
        setIsLoading(true);
        setHasSelected(true); // Устанавливаем флаг выбора

        try {
            // Всегда получаем полную информацию о выбранной игре
            console.log("Получаем информацию о выбранной игре:", game.name);
            const gameDetails = await getGameDetails(game.id);
            const storeUrl = await getGameStoreUrl(game.id);

            // Создаем объект с максимально полной информацией
            const selectedGame: GameVariant = {
                id: game.id,
                name: game.name,
                image: game.background_image,
                storeUrl: storeUrl,
                description: gameDetails?.description || game.description || "",
                released: gameDetails?.released || game.released,
                rating: gameDetails?.rating || game.rating,
                metacritic: gameDetails?.metacritic || game.metacritic
            };

            // Передаем выбранную игру наверх
            onGameSelect(selectedGame);

            // Обновляем интерфейс
            setQuery(game.name);
            setResults([]);
            setShowResults(false);
        } catch (error) {
            console.error("Ошибка при получении детальной информации об игре:", error);
            // Даже в случае ошибки отправляем базовую информацию
            onGameSelect({
                id: game.id,
                name: game.name,
                image: game.background_image,
                storeUrl: null
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Сохраняем позицию курсора при изменении запроса
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Если компонент заблокирован, не обрабатываем изменения
        if (disabled) return;

        const newQuery = e.target.value;
        const cursorPosition = e.target.selectionStart;

        setQuery(newQuery);

        if (newQuery !== query) {
            setHasSelected(false);
        }

        // Сохраняем позицию курсора после обновления состояния
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
            }
        }, 0);
    };

    // Обработчик клика вне компонента для скрытия результатов
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    // Показываем результаты при фокусе, если есть запрос
    const handleFocus = () => {
        // Если компонент заблокирован, не показываем результаты
        if (disabled) return;

        if (query && results.length > 0 && !disabled) {
            setShowResults(true);
        }
    };

    return (
        <div className="game-search-container" ref={wrapperRef}>
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={handleFocus}
                placeholder="Начните вводить название игры..."
                disabled={disabled || isLoading}
            />
            {isLoading && <div className="spinner-small"></div>}
            {disabled && <div className="search-disabled-indicator">✓</div>}
            {showResults && !hasSelected && !disabled && results.length > 0 && (
                <ul className="search-results">
                    {results.map(game => (
                        <li key={game.id} onClick={() => handleSelect(game)}>
                            <img src={game.background_image} alt={game.name} className="result-image" />
                            <span>{game.name}</span>
                            {game.metacritic && (
                                <span className="metacritic-score">{game.metacritic}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GameSearchInput;
