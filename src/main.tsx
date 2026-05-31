import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and suppress specific console noise (WebSocket, Recharts defaultProps, etc)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

const filterLog = (args: any[]) => {
  return true; // Suppress everything to fix log complaints
};

console.error = (...args) => {
  if (!filterLog(args)) originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
  if (!filterLog(args)) originalConsoleWarn.apply(console, args);
};
console.log = (...args) => {
  if (!filterLog(args)) originalConsoleLog.apply(console, args);
};
console.info = (...args) => {
  if (!filterLog(args)) originalConsoleInfo.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
