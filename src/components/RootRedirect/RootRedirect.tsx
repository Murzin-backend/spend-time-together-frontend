import React from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../api/axiosConfig.ts';

// Корневой маршрут «/»: если сессия жива (кука) — ведём на /home, иначе на /login.
// Пробный запрос помечен skipAuthRedirect, чтобы 401 не дёргал глобальный редирект.
const RootRedirect: React.FC = () => {
    const [state, setState] = React.useState<'loading' | 'auth' | 'guest'>('loading');

    React.useEffect(() => {
        let mounted = true;
        api.get('/users/me', { skipAuthRedirect: true } as any)
            .then(() => { if (mounted) setState('auth'); })
            .catch(() => { if (mounted) setState('guest'); });
        return () => { mounted = false; };
    }, []);

    if (state === 'loading') {
        return (
            <div className="auth-container">
                <div className="spinner" />
            </div>
        );
    }

    return <Navigate to={state === 'auth' ? '/home' : '/login'} replace />;
};

export default RootRedirect;
