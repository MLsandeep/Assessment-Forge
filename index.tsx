
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress benign ResizeObserver loop errors which are common in React Flow / Resizable layouts
const resizeError = 'ResizeObserver loop completed with undelivered notifications.';
const loopLimitError = 'ResizeObserver loop limit exceeded';

const originalConsoleError = console.error;
console.error = function(...args) {
  if (typeof args[0] === 'string' && (args[0].includes(resizeError) || args[0].includes(loopLimitError))) {
    return;
  }
  originalConsoleError.apply(console, args);
};

window.addEventListener('error', (event) => {
  if (event.message === resizeError || event.message === loopLimitError) {
    event.stopImmediatePropagation();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
