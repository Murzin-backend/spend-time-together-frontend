import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage/LoginPage.tsx';
import RegistrationPage from './components/RegistrationPage/RegistrationPage.tsx';
import HomePage from './components/HomePage/HomePage.tsx';
import './App.css';
import './components/LoginPage/LoginPage.css';
import './components/RegistrationPage/RegistrationPage.css';
import './components/Notification/Notification.css';
import './components/HomePage/HomePage.css';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </div>
  );
}

export default App;
