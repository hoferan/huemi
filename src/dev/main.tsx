import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Harness from './Harness';
import '../index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');
createRoot(root).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
