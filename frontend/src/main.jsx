import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfirmProvider>
      <App />
    </ConfirmProvider>
  </React.StrictMode>,
);
