import React from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

const NotFoundPage = () => {
    return (
        <div className="not-found-container">
            <div className="not-found-content">
                <h1 className="error-code">404</h1>
                <h2 className="error-message">Страница не найдена</h2>
                <p className="error-description">
                    К сожалению, страница, которую вы ищете, не существует.
                    Возможно, она была перемещена или удалена.
                </p>
                <Link to="/home" className="home-link-button">
                    Вернуться на главную
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;

