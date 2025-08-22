import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/tema-escuro.css';

// Debug inicial
console.log('🚀 ARK Sistema iniciando...');
window.ARK_LOADED = true;

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);