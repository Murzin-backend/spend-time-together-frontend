import React from 'react';
import './GameFinishedScreen.css';

interface GameFinishedVariant {
    userId: number;
    variant: string;
    gameImage?: string;
    userName: string;
    api_game_id?: number;
    description?: string;
    metacritic?: number;
    isWinner?: boolean;
    avatarUrl?: string | null;
}

interface GameFinishedScreenProps {
    winner: {
        userId: number;
        variant: string;
    };
    allVariants: GameFinishedVariant[];
    onOpenGameModal: (variant: any, participantData: any) => void;
    onStartNewGame?: () => void;
    isCreator: boolean;
    backendUrl: string;
}

const GameFinishedScreen: React.FC<GameFinishedScreenProps> = ({
    winner,
    allVariants,
    onOpenGameModal,
    backendUrl
}) => {
    const winnerVariant = allVariants.find(v => v.userId === winner.userId);
    const otherVariants = allVariants.filter(v => v.userId !== winner.userId);

    const handleVariantClick = (variant: GameFinishedVariant) => {
        onOpenGameModal(variant.variant, variant);
    };

    return (
        <div className="finished-container">
            <div className="confetti"></div>
            <div className="confetti"></div>
            <div className="confetti"></div>
            <div className="confetti"></div>
            <div className="confetti"></div>
            <div className="confetti"></div>
            <div className="confetti"></div>
            <div className="confetti"></div>
            <div className="confetti"></div>
            <div className="confetti"></div>

            <div className="winner-spotlight">
                <h1 className="winner-title-header">ПОБЕДИТЕЛЬ</h1>
                {winnerVariant && (
                    <div className="winner-avatar-container">
                        {winnerVariant.avatarUrl ? (
                            <img
                                src={`${backendUrl}${winnerVariant.avatarUrl}`}
                                alt={winnerVariant.userName}
                                className="winner-avatar"
                            />
                        ) : (
                            <div className="winner-avatar-placeholder">
                                <span>{winnerVariant.userName.charAt(0).toUpperCase()}</span>
                            </div>
                        )}
                        <div className="winner-crown-icon">👑</div>
                    </div>
                )}
                <h2 className="winner-name-header">{winnerVariant?.userName || `Пользователь ${winner.userId}`}</h2>
            </div>

            {winnerVariant && (
                <div className="winning-variant-section">
                    <div
                        className="winning-variant-card"
                        style={{ backgroundImage: `url(${winnerVariant.gameImage})` }}
                        onClick={() => handleVariantClick(winnerVariant)}
                    >
                        <div className="winning-variant-overlay">
                            <div className="winning-variant-name">{winnerVariant.variant}</div>
                            {winnerVariant.metacritic && winnerVariant.metacritic > 0 && (
                                <div className="winning-metacritic-score">{winnerVariant.metacritic}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {otherVariants.length > 0 && (
                <div className="runner-ups-section">
                    <h3>Остальные варианты</h3>
                    <div className="runner-ups-grid">
                        {otherVariants.map((variant) => (
                            <div
                                key={variant.userId}
                                className="runner-up-card"
                                style={{ backgroundImage: `url(${variant.gameImage})` }}
                                onClick={() => handleVariantClick(variant)}
                            >
                                <div className="runner-up-overlay">
                                    <div className="runner-up-name">{variant.variant}</div>
                                    <div className="runner-up-user">от {variant.userName}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameFinishedScreen;
