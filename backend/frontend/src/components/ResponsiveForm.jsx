import React from 'react';
import { useIsMobile } from '../hooks/useResponsive';

const ResponsiveForm = ({ 
  children, 
  onSubmit, 
  title,
  columns = 2,
  className = "",
  style = {}
}) => {
  const isMobile = useIsMobile();
  
  const formStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : `repeat(${columns}, 1fr)`,
    gap: isMobile ? '15px' : '20px',
    ...style
  };

  return (
    <div className={`card ${className}`}>
      {title && <h3 style={{ marginBottom: '20px', color: 'var(--cor-primaria)' }}>{title}</h3>}
      <form onSubmit={onSubmit} style={formStyle}>
        {children}
      </form>
    </div>
  );
};

const FormGroup = ({ 
  label, 
  children, 
  required = false,
  error = null,
  fullWidth = false,
  className = ""
}) => {
  const isMobile = useIsMobile();
  
  const groupStyle = {
    gridColumn: (fullWidth || isMobile) ? '1 / -1' : 'auto',
    marginBottom: isMobile ? '15px' : '0'
  };

  return (
    <div className={`input-group ${className}`} style={groupStyle}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '5px',
          fontWeight: 'bold',
          color: 'var(--cor-texto-label)',
          fontSize: isMobile ? '14px' : '16px'
        }}>
          {label}
          {required && <span style={{ color: 'var(--cor-erro)' }}> *</span>}
        </label>
      )}
      {children}
      {error && (
        <span style={{
          color: 'var(--cor-erro)',
          fontSize: '12px',
          marginTop: '5px',
          display: 'block'
        }}>
          {error}
        </span>
      )}
    </div>
  );
};

const FormActions = ({ children, align = 'right' }) => {
  const isMobile = useIsMobile();
  
  const actionsStyle = {
    gridColumn: '1 / -1',
    display: 'flex',
    gap: '10px',
    justifyContent: isMobile ? 'stretch' : align,
    flexDirection: isMobile ? 'column' : 'row',
    marginTop: '20px'
  };

  return (
    <div style={actionsStyle}>
      {children}
    </div>
  );
};

const ResponsiveInput = ({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  required = false,
  disabled = false,
  ...props 
}) => {
  const isMobile = useIsMobile();
  
  const inputStyle = {
    width: '100%',
    padding: isMobile ? '12px' : '10px',
    border: '1px solid var(--cor-borda)',
    borderRadius: '6px',
    fontSize: isMobile ? '16px' : '14px', // 16px evita zoom no iOS
    backgroundColor: 'var(--cor-fundo)',
    color: 'var(--cor-texto)',
    boxSizing: 'border-box',
    minHeight: isMobile ? '44px' : 'auto' // Tamanho mínimo para touch
  };

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      style={inputStyle}
      {...props}
    />
  );
};

const ResponsiveSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Selecione...",
  required = false,
  disabled = false,
  ...props 
}) => {
  const isMobile = useIsMobile();
  
  const selectStyle = {
    width: '100%',
    padding: isMobile ? '12px' : '10px',
    border: '1px solid var(--cor-borda)',
    borderRadius: '6px',
    fontSize: isMobile ? '16px' : '14px',
    backgroundColor: 'var(--cor-fundo)',
    color: 'var(--cor-texto)',
    boxSizing: 'border-box',
    minHeight: isMobile ? '44px' : 'auto'
  };

  return (
    <select
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      style={selectStyle}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((option, index) => (
        <option key={index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

const ResponsiveTextarea = ({ 
  placeholder, 
  value, 
  onChange, 
  rows = 4,
  required = false,
  disabled = false,
  ...props 
}) => {
  const isMobile = useIsMobile();
  
  const textareaStyle = {
    width: '100%',
    padding: isMobile ? '12px' : '10px',
    border: '1px solid var(--cor-borda)',
    borderRadius: '6px',
    fontSize: isMobile ? '16px' : '14px',
    backgroundColor: 'var(--cor-fundo)',
    color: 'var(--cor-texto)',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: isMobile ? '100px' : 'auto'
  };

  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      required={required}
      disabled={disabled}
      style={textareaStyle}
      {...props}
    />
  );
};

const ResponsiveButton = ({ 
  children, 
  type = 'button', 
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  ...props 
}) => {
  const isMobile = useIsMobile();
  
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--cor-primaria)',
          color: 'white'
        };
      case 'secondary':
        return {
          backgroundColor: '#6c757d',
          color: 'white'
        };
      case 'success':
        return {
          backgroundColor: 'var(--cor-sucesso)',
          color: 'white'
        };
      case 'danger':
        return {
          backgroundColor: 'var(--cor-erro)',
          color: 'white'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--cor-aviso)',
          color: 'white'
        };
      default:
        return {
          backgroundColor: 'var(--cor-primaria)',
          color: 'white'
        };
    }
  };
  
  const buttonStyle = {
    ...getVariantStyle(),
    border: 'none',
    padding: isMobile ? '12px 15px' : '10px 15px',
    borderRadius: '6px',
    fontSize: isMobile ? '16px' : '14px',
    fontWeight: 'bold',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
    minHeight: isMobile ? '44px' : 'auto',
    transition: 'all 0.2s'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={buttonStyle}
      {...props}
    >
      {children}
    </button>
  );
};

// Exportar todos os componentes
ResponsiveForm.Group = FormGroup;
ResponsiveForm.Actions = FormActions;
ResponsiveForm.Input = ResponsiveInput;
ResponsiveForm.Select = ResponsiveSelect;
ResponsiveForm.Textarea = ResponsiveTextarea;
ResponsiveForm.Button = ResponsiveButton;

export default ResponsiveForm;