import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import './AuthLayout.css';

interface Props {
    active: 'login' | 'register';
    children: React.ReactNode;
}

const AuthLayout: React.FC<Props> = ({ active, children }) => {
    return (
        <div className="auth2">
            <div className="auth2-brand">
                <div className="auth2-brand-top">
                    <img className="auth2-brand-logo" src={logo} alt="" />
                    <span className="auth2-brand-word">Spend Time Together</span>
                </div>

                <div className="auth2-hero">
                    <h1>Собираемся. <span className="hl">Рандомим</span>. Играем.</h1>
                    <p>Создавайте комнаты с друзьями, планируйте встречи и выбирайте, чем заняться. Если мнения разделились — пусть великий рандом честно решит за вас.</p>
                </div>

                <div className="auth2-brand-foot"><span className="dot" /> Играй с друзьями, а не в одиночку</div>

                <svg className="auth2-wheel" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="47" fill="#0d1219" />
                    <path d="M50,50 L50,3 A47,47 0 0 1 90.7,26.5 Z" fill="#7c4dff" opacity=".9" />
                    <path d="M50,50 L90.7,26.5 A47,47 0 0 1 90.7,73.5 Z" fill="#e0a53a" opacity=".9" />
                    <path d="M50,50 L90.7,73.5 A47,47 0 0 1 50,97 Z" fill="#26a69a" opacity=".9" />
                    <path d="M50,50 L50,97 A47,47 0 0 1 9.3,73.5 Z" fill="#66bb6a" opacity=".9" />
                    <path d="M50,50 L9.3,73.5 A47,47 0 0 1 9.3,26.5 Z" fill="#ec6a5e" opacity=".9" />
                    <path d="M50,50 L9.3,26.5 A47,47 0 0 1 50,3 Z" fill="#4c9ffe" opacity=".9" />
                    <circle cx="50" cy="50" r="9" fill="#141922" stroke="#333d4d" strokeWidth="1.5" />
                </svg>
            </div>

            <div className="auth2-form-side">
                <div className="auth2-card">
                    <img className="auth2-logo" src={logo} alt="Spend Time Together" />
                    <div className="auth2-tabs">
                        <Link to="/login" className={`auth2-tab ${active === 'login' ? 'on' : ''}`}>Вход</Link>
                        <Link to="/register" className={`auth2-tab ${active === 'register' ? 'on' : ''}`}>Регистрация</Link>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
