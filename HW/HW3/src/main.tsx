import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Arena } from './components/Arena';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Arena />
  </StrictMode>,
);
