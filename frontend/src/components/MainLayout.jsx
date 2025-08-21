import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import GlobalSearch from './GlobalSearch';
import WelcomeTips from './WelcomeTips';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { Icons } from './Icons';
import Breadcrumbs from './Breadcrumbs';
import TrialStatus from './TrialStatus';
import ClientNotifications from './ClientNotifications';
import useOnlineStatus from '../hooks/useOnlineStatus';
import API_URL from '../apiConfig';


const ExpiryWarning = ({ daysLeft }) => (
    <div className="expiry-warning">
        {daysLeft > 1 && `A sua licença expira em ${daysLeft} dias.`}
        {daysLeft === 1 && `A sua licença expira amanhã!`}
        {daysLeft === 0 && `A sua licença expira hoje!`}
    </div>
);

const ExpiryOverlay = () => (
    <div className="expiry-overlay">
        <div className="expiry-overlay-content">
            <h2>Sistema Vencido</h2>
            <p>A sua licença de acesso ao sistema expirou. Por favor, entre em contacto com o suporte para regularizar a sua situação e reativar o acesso.</p>
        </div>
    </div>
);

function MainLayout({ theme, toggleTheme, isAdmin = false }) {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [licenseStatus, setLicenseStatus] = useState({ status: 'active', daysLeft: null });
    
    // Hook para gerenciar status online
    useOnlineStatus();

    useEffect(() => {
        if (isAdmin) {
            setLicenseStatus({ status: 'active', daysLeft: null });
            return;
        }

        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.licenseExpiresAt) {
            const today = new Date();
            const expiryDate = new Date(user.licenseExpiresAt);
            
            today.setHours(0, 0, 0, 0);
            expiryDate.setHours(0, 0, 0, 0);

            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            if (daysLeft < 0) {
                setLicenseStatus({ status: 'expired', daysLeft: null });
            } else if (daysLeft <= 5) {
                setLicenseStatus({ status: 'warning', daysLeft: daysLeft });
            } else {
                setLicenseStatus({ status: 'active', daysLeft: null });
            }
        }
    }, [isAdmin]);

    const handleLogout = async () => {
        const token = localStorage.getItem('token');
        
        // Notificar servidor sobre logout
        if (token) {
            try {
                await axios.post(`${API_URL}/api/online/logout`, {}, {
                    headers: { 'x-auth-token': token }
                });
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
            }
        }
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <div>
            <nav className="main-navbar">
                <div className="navbar-left">
                    <NavLink to={isAdmin ? "/admin" : "/dashboard"}>
                        <img src="https://i.postimg.cc/Qd98gFMF/Sistema-ARK.webp" alt="Logo" className="navbar-logo" />
                    </NavLink>
                </div>
                
                {!isAdmin && (
                    <div className={`navbar-center ${isMobileMenuOpen ? 'mobile-active' : ''}`}>
                        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobileMenu}>
                            <Icons.Dashboard /> Dashboard
                        </NavLink>
                        <NavLink to="/vitrine" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobileMenu}>
                            <Icons.Store /> Feira
                        </NavLink>
                        <NavLink to="/lancamentos" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobileMenu}>
                            <Icons.FileText /> Lançamentos
                        </NavLink>
                        <NavLink to="/cadastro" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobileMenu}>
                            <Icons.Users /> Cadastro
                        </NavLink>
                        <NavLink to="/relatorios" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobileMenu}>
                            <Icons.Chart /> Relatórios
                        </NavLink>
                        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeMobileMenu}>
                            <Icons.Profile /> Perfil
                        </NavLink>
                    </div>
                )}

                <div className="navbar-right" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    {!isAdmin && <GlobalSearch />}

                    <div className="tooltip">
                        <button onClick={toggleTheme} className="nav-button theme-toggle">
                            {theme === 'light' ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z"/>
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8M12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z"/>
                                </svg>
                            )}
                        </button>
                        <span className="tooltiptext">Alternar tema</span>
                    </div>
                    <button onClick={handleLogout} className="nav-button logout">Sair</button>
                    
                    {!isAdmin && (
                        <button className="nav-button mobile-menu-icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            {isMobileMenuOpen ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/>
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </nav>

            {licenseStatus.status === 'expired' ? (
                <ExpiryOverlay />
            ) : (
                <main className="container">
                    {!isAdmin && <Breadcrumbs />}
                    {!isAdmin && <ClientNotifications />}
                    {!isAdmin && <TrialStatus user={JSON.parse(localStorage.getItem('user') || '{}')} />}
                    <Outlet />
                    {licenseStatus.status === 'warning' && (
                        <ExpiryWarning daysLeft={licenseStatus.daysLeft} />
                    )}
                </main>
            )}
            

            <WelcomeTips />
            <Toast />
            <ConfirmDialog />
        </div>
    );
}

export default MainLayout;