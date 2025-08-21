import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/tema-escuro.css';

// Nós não precisamos mais do index.css, então removemos a importação.

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);