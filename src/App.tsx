import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage/LoginPage.tsx';
import RegistrationPage from './components/RegistrationPage/RegistrationPage.tsx';
import HomePage from './components/HomePage/HomePage.tsx';
import NotFoundPage from "./components/NotFoundPage/NotFoundPage.tsx";
import ActivityPage from './components/ActivityPage/ActivityPage.tsx';
import './components/ActivityPage/ActivityPage.css';
import './components/LoginPage/LoginPage.css';
import './components/RegistrationPage/RegistrationPage.css';
import './components/Notification/Notification.css';
import './components/HomePage/HomePage.css';
import './components/Modal/Modal.css';
import './components/LeftSidebar/LeftSidebar.css';
import './components/RightSidebar/RightSidebar.css';
import './components/GameSearchInput/GameSearchInput.css';
import './components/GameModal/GameModal.css';

function App() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/activity/:activityId" element={<ActivityPage />} />
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
}

export default App;
