import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmpresaMapa from './EmpresaMapa';
import EmpresaVitrine from './EmpresaVitrine';
import ClientNotifications from './ClientNotifications';
import LicenseWarning from './LicenseWarning';
import FavoritesManager from './FavoritesManager';
import PushNotifications from './PushNotifications';
import { Icons } from './Icons';



function EmpresaDashboard({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('mapa');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleSwitchToFeira = () => {
      setActiveTab('vitrine');
    };
    
    window.addEventListener('switchToFeira', handleSwitchToFeira);
    return () => window.removeEventListener('switchToFeira', handleSwitchToFeira);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div>
      <PushNotifications />
      <nav className="main-navbar">
        <div className="navbar-left">
          <img src="https://i.postimg.cc/Qd98gFMF/Sistema-ARK.webp" alt="Logo" className="navbar-logo" />
        </div>
        
        <div className={`navbar-center ${isMobileMenuOpen ? 'mobile-active' : ''}`}>
          <button 
            onClick={() => { setActiveTab('mapa'); setIsMobileMenuOpen(false); }}
            className={activeTab === 'mapa' ? 'active' : ''}
          >
            <Icons.MapPin /> Mapa
          </button>
          <button 
            onClick={() => { setActiveTab('vitrine'); setIsMobileMenuOpen(false); }}
            className={activeTab === 'vitrine' ? 'active' : ''}
          >
            <Icons.Store /> Feira
          </button>
          <button 
            onClick={() => { setActiveTab('favoritos'); setIsMobileMenuOpen(false); }}
            className={activeTab === 'favoritos' ? 'active' : ''}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg> Favoritos
          </button>
        </div>

        <div className="navbar-right" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
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
        </div>
      </nav>

      {/* Conteúdo */}
      <main className="container">
        <LicenseWarning />
        <ClientNotifications />
        {activeTab === 'mapa' && <EmpresaMapa />}
        {activeTab === 'vitrine' && <EmpresaVitrine />}
        {activeTab === 'favoritos' && <FavoritesManager />}
      </main>
    </div>
  );
}

export default EmpresaDashboard;