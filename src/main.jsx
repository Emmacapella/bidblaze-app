import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { PrivyProvider } from '@privy-io/react-auth';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
<PrivyProvider 
  appId="cmjd3lz86008nih0d7zq8qfro"
  config={{ 
    loginMethods: ['email', 'google'],
    appearance: { theme: 'dark' },
    embeddedWallets: { createOnLogin: 'all-users' } 
  }}
>
  <App />
</PrivyProvider>
  </React.StrictMode>
);

