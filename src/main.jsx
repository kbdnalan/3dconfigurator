import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Точка входа: React «монтирует» приложение в <div id="root"> из index.html.
// StrictMode в режиме разработки монтирует компоненты дважды — это помогает
// убедиться, что 3D-сцена корректно очищается и не создаёт лишних renderer.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
