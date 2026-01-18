
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Homebound: Bootstrapping V1.0.7 - Aurora Stack");

// Register Service Worker for PWA (with sandbox detection)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = './sw.js';
    navigator.serviceWorker.register(swPath)
      .then(reg => {
        console.log('Homebound SW: Vault Service Active', reg.scope);
        window.dispatchEvent(new CustomEvent('sw-status', { detail: 'active' }));
      })
      .catch(err => {
        if (err.message.includes('same-origin')) {
          console.warn('Homebound SW: Sandbox origin restriction detected.');
          window.dispatchEvent(new CustomEvent('sw-status', { detail: 'local' }));
        } else {
          console.warn('Homebound SW: Initialization deferred', err.message);
        }
      });
  });
}

const container = document.getElementById('root');
const errorDisplay = document.getElementById('error-display');

window.onerror = (message, source, lineno, colno, error) => {
  console.error("Homebound Fatal Error:", message, error);
  if (errorDisplay) {
    errorDisplay.style.display = 'block';
    errorDisplay.innerText = `FATAL ERROR: ${message}\n\nStack: ${error?.stack || 'N/A'}`;
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.style.display = 'none';
  }
};

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    const hideLoader = () => {
      const loader = document.getElementById('loading-indicator');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { 
          loader.style.display = 'none';
          window.dispatchEvent(new Event('resize'));
        }, 500);
      }
    };

    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 300);
    } else {
      window.addEventListener('load', hideLoader);
    }
  } catch (error) {
    console.error("Homebound: Initialization failed", error);
  }
}
