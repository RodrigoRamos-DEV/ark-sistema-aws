import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = 'Carregando...', overlay = false }) => {
  const sizeClass = {
    small: 'spinner-small',
    medium: 'spinner-medium', 
    large: 'spinner-large'
  }[size];

  const spinner = (
    <div className={`loading-container ${sizeClass}`}>
      <div className="spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loading-overlay">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;