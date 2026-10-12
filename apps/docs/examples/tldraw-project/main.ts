import { mountExample } from './mount-example.ts';
import './page.css';

// Mount only after the host exists. The HTML entry loads this as a module.
const root = document.querySelector<HTMLElement>('#example');
if (!root) throw new Error('Missing example root');
const dispose = mountExample(root, document.documentElement.lang === 'ru');

// Stop editor subscriptions and remove listeners when Vite replaces this module.
// In a routed application, also call dispose() when leaving the page.
if (import.meta.hot) import.meta.hot.dispose(dispose);
