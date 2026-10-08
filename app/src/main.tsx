import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Application root element was not found.');
}

const prerenderYear = Number(root.dataset.prerenderYear);
const renderYear = Number.isInteger(prerenderYear) && prerenderYear > 0
  ? prerenderYear
  : new Date().getFullYear();

const application = (
  <StrictMode>
    <BrowserRouter>
      <App renderYear={renderYear} />
    </BrowserRouter>
  </StrictMode>
);

if (root.dataset.prerendered === 'true') {
  hydrateRoot(root, application);
} else {
  createRoot(root).render(application);
}
