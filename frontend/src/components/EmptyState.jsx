import React from 'react';
import './EmptyState.css';

const EmptyState = ({ 
  icon, 
  title, 
  description, 
  actionText, 
  onAction, 
  size = 'medium' 
}) => {
  const defaultIcon = (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z"/>
    </svg>
  );

  return (
    <div className={`empty-state empty-state-${size}`}>
      <div className="empty-state-icon">
        {icon || defaultIcon}
      </div>
      
      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>
        {description && (
          <p className="empty-state-description">{description}</p>
        )}
        
        {actionText && onAction && (
          <button 
            className="empty-state-action"
            onClick={onAction}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;