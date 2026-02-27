import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Remove the inline loader once React mounts
const removeLoader = () => {
  const loader = document.getElementById('app-loader');
  if (loader) loader.remove();
};

console.log('[Main] React app initializing...', window.location.pathname + window.location.search);

try {
  const root = document.getElementById('root');
  if (!root) {
    console.error('[Main] #root element not found!');
  } else {
    createRoot(root).render(
      <StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StrictMode>
    );
    removeLoader();
    console.log('[Main] React app mounted successfully');
  }
} catch (err) {
  console.error('[Main] Failed to mount React app:', err);
  const errorDiv = document.getElementById('app-error');
  const loader = document.getElementById('app-loader');
  if (loader) loader.style.display = 'none';
  if (errorDiv) {
    errorDiv.style.display = 'flex';
    const msg = document.getElementById('app-error-msg');
    if (msg) msg.textContent = String(err);
  }
}
