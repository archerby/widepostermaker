import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import './styles.css';

if (typeof window !== 'undefined') {
  const globalWindow = window as typeof window & { dragEvent?: () => void };
  if (typeof globalWindow.dragEvent !== 'function') {
    globalWindow.dragEvent = () => undefined;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
