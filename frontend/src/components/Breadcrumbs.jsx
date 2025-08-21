import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icons } from './Icons';
import './Breadcrumbs.css';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  const breadcrumbNameMap = {
    'dashboard': { name: 'Dashboard', icon: <Icons.Dashboard /> },
    'vitrine': { name: 'Vitrine', icon: <Icons.Store /> },
    'lancamentos': { name: 'Lançamentos', icon: <Icons.FileText /> },
    'cadastro': { name: 'Cadastro', icon: <Icons.Users /> },
    'relatorios': { name: 'Relatórios', icon: <Icons.Chart /> },
    'profile': { name: 'Perfil', icon: <Icons.Settings /> },
    'admin': { name: 'Administração', icon: <Icons.Settings /> },
    'partners': { name: 'Parceiros', icon: <Icons.Users /> }
  };

  if (pathnames.length === 0) return null;

  return (
    <nav className="breadcrumbs">
      <div className="breadcrumb-item">
        <Link to="/" className="breadcrumb-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
          </svg>
          Início
        </Link>
      </div>
      
      {pathnames.map((pathname, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const breadcrumb = breadcrumbNameMap[pathname];

        if (!breadcrumb) return null;

        return (
          <React.Fragment key={pathname}>
            <div className="breadcrumb-separator">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
              </svg>
            </div>
            <div className={`breadcrumb-item ${isLast ? 'active' : ''}`}>
              {isLast ? (
                <span className="breadcrumb-current">
                  {breadcrumb.icon}
                  {breadcrumb.name}
                </span>
              ) : (
                <Link to={routeTo} className="breadcrumb-link">
                  {breadcrumb.icon}
                  {breadcrumb.name}
                </Link>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;