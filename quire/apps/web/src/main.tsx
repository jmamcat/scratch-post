import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { loadSettings } from './settings.ts';
import { Workspace } from './store/workspace.ts';
import './styles.css';

const ws = new Workspace(loadSettings());
void ws.start();
// Exposed for debugging from the browser console.
(globalThis as { quire?: Workspace }).quire = ws;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App ws={ws} />
  </StrictMode>,
);
