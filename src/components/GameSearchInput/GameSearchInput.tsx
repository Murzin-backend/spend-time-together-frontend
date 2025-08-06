import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '../../hooks/useDebounce.ts';
import { searchGames, getGameStoreUrl, RawgGame } from '../../api/rawgApi.ts';
import './GameSearchInput.css';

export interface GameVariant {
    name: string;
    image: string | null;
    storeUrl: string | null;
}

interface GameSearchInputProps {
    onGameSelect: (game: GameVariant) => void;
    disabled: boolean;
}

const GameSearchInput: React.FC<GameSearchInputProps> = ({ onGameSelect, disabled }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RawgGame[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const debouncedQuery = useDebounce(query, 500);

    useEffect(() => {
        if (debouncedQuery) {
            setIsLoading(true);
            searchGames(debouncedQuery).then(games => {
                setResults(games);
                setIsLoading(false);
            });
        } else {
            setResults([]);
        }
    }, [debouncedQuery]);

    const handleSelect = async (game: RawgGame) => {
        setIsLoading(true);
        const storeUrl = await getGameStoreUrl(game.id);
        onGameSelect({
            name: game.name,
            image: game.background_image,
            storeUrl: storeUrl,
        });
        setQuery(game.name);
        setResults([]);
        setIsLoading(false);
    };

    return (
        <div className="game-search-container">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Начните вводить название игры..."
                disabled={disabled || isLoading}
            />
            {isLoading && <div className="spinner-small"></div>}
            {results.length > 0 && (
                <ul className="search-results">
                    {results.map(game => (
                        <li key={game.id} onClick={() => handleSelect(game)}>
                            <img src={game.background_image} alt={game.name} className="result-image" />
                            <span>{game.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GameSearchInput;

