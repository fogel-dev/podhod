import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app';
import '@/app/styles/index.css';
import { applyTheme } from '@/shared/lib/theme';

applyTheme();

const root = document.getElementById('root');
if (!root) throw new Error('Не найден корневой элемент приложения');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
