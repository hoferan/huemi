import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Root } from './Root';
import { registerServiceWorker } from './registerServiceWorker';
import '../index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');
createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

// After load, so fetching the worker's precache never competes with the first paint.
window.addEventListener('load', () => void registerServiceWorker());
