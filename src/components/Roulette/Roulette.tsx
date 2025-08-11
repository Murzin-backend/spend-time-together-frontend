import React, { useState, useEffect, useRef } from 'react';
import './Roulette.css';

interface RouletteVariant {
    userId: number;
    variant: string;
    gameImage?: string;
    userName: string;
    isEliminated?: boolean;
}

interface RouletteProps {
    variants: RouletteVariant[];
    isActive: boolean;
    eliminatedUserId?: number | null;
    winnerId?: number | null;
    isFinalShowdown: boolean;
    onAnimationComplete?: () => void;
}

const Roulette: React.FC<RouletteProps> = ({
    variants,
    isActive,
    eliminatedUserId,
    winnerId,
    isFinalShowdown,
    onAnimationComplete
}) => {
    const [currentHighlight, setCurrentHighlight] = useState<number | null>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [eliminationStage, setEliminationStage] = useState(false);
    const [rotation, setRotation] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const activeVariants = variants.filter(v => !v.isEliminated);

    // Начинаем анимацию рулетки
    useEffect(() => {
        if (isActive && activeVariants.length > 1) {
            setIsSpinning(true);
            startRouletteAnimation();
        } else {
            stopRouletteAnimation();
        }

        return () => {
            stopRouletteAnimation();
        };
    }, [isActive, variants]);

    // Обрабатываем исключение варианта
    useEffect(() => {
        if (eliminatedUserId && isActive) {
            handleElimination(eliminatedUserId);
        }
    }, [eliminatedUserId]);

    // Обрабатываем победителя
    useEffect(() => {
        if (winnerId) {
            handleWinner(winnerId);
        }
    }, [winnerId]);

    const startRouletteAnimation = () => {
        if (activeVariants.length <= 1) return;

        let speed = 150;
        let highlightIndex = 0;

        const animate = () => {
            setCurrentHighlight(activeVariants[highlightIndex].userId);
            highlightIndex = (highlightIndex + 1) % activeVariants.length;

            // Постепенно замедляем анимацию
            speed = Math.min(speed + 5, 400);

            intervalRef.current = setTimeout(animate, speed);
        };

        animate();
    };

    const stopRouletteAnimation = () => {
        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            intervalRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsSpinning(false);
        setCurrentHighlight(null);
    };

    const handleElimination = (userId: number) => {
        setEliminationStage(true);

        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
        }

        setCurrentHighlight(userId);

        timeoutRef.current = setTimeout(() => {
            setCurrentHighlight(null);
            setEliminationStage(false);

            const remainingVariants = variants.filter(v => !v.isEliminated && v.userId !== userId);
            if (remainingVariants.length > 1) {
                startRouletteAnimation();
            }

            onAnimationComplete?.();
        }, 2000);
    };

    const handleWinner = (userId: number) => {
        stopRouletteAnimation();
        setCurrentHighlight(userId);
        setIsSpinning(false);

        timeoutRef.current = setTimeout(() => {
            onAnimationComplete?.();
        }, 3000);
    };

    const getVariantStyle = (variant: RouletteVariant, index: number) => {
        const totalVariants = activeVariants.length;
        const angle = (360 / totalVariants) * index;
        const radius = Math.min(200, Math.max(120, 50 + totalVariants * 8));

        return {
            transform: `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`,
            backgroundImage: variant.gameImage ? `url(${variant.gameImage})` : undefined
        };
    };

    const getVariantClass = (variant: RouletteVariant) => {
        const classes = ['roulette-variant-card'];

        if (currentHighlight === variant.userId) {
            if (eliminationStage) {
                classes.push('eliminating');
            } else if (winnerId === variant.userId) {
                classes.push('winner');
            } else {
                classes.push('highlighted');
            }
        }

        if (variant.isEliminated) {
            classes.push('eliminated');
        }

        return classes.join(' ');
    };

    if (activeVariants.length === 0) {
        return (
            <div className="roulette-container">
                <div className="no-variants-message">
                    Ожидание вариантов от участников...
                </div>
            </div>
        );
    }

    if (activeVariants.length === 1) {
        const winner = activeVariants[0];
        return (
            <div className="roulette-container single-variant">
                <div className="single-variant-display">
                    <div
                        className="winner-card"
                        style={{
                            backgroundImage: winner.gameImage ? `url(${winner.gameImage})` : undefined
                        }}
                    >
                        <div className="winner-overlay">
                            <div className="winner-title">🏆 Победитель!</div>
                            <div className="winner-game">{winner.variant}</div>
                            <div className="winner-user">от {winner.userName}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`roulette-container ${isActive ? 'active' : ''} ${isFinalShowdown ? 'final-showdown' : ''}`}>
            <div className="roulette-wheel-circular">
                <div className="wheel-center">
                    <div className="wheel-pointer">▼</div>
                    {isSpinning && (
                        <div className="spinning-indicator">🎲</div>
                    )}
                </div>

                <div className="variants-circle">
                    {activeVariants.map((variant, index) => (
                        <div
                            key={variant.userId}
                            className={getVariantClass(variant)}
                            style={getVariantStyle(variant, index)}
                        >
                            <div className="variant-content">
                                <div className="variant-name">{variant.variant}</div>
                                <div className="variant-user">{variant.userName}</div>
                            </div>
                            {currentHighlight === variant.userId && (
                                <div className="highlight-effect"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isSpinning && (
                <div className="roulette-status">
                    <div className="status-text">
                        {isFinalShowdown ? '🔥 Финальный выбор!' : '🎰 Выбираем победителя...'}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Roulette;
