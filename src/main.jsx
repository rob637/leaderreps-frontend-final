import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// --- START FIREBASE CONFIGURATION (LIVE KEYS) ---
// Note: Netlify injects environment variables via VITE_*.
const liveFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Define necessary context variables for the App component
const firebaseConfig = liveFirebaseConfig;
const appId = import.meta.env.VITE_FIREBASE_PROJECT_ID; // Use projectId for the AppId
const initialAuthToken = null; 

// We keep the window assignments primarily for backward compatibility with the original Canvas environment.
window.__firebase_config = JSON.stringify(firebaseConfig);
window.__app_id = appId;
window.__initial_auth_token = initialAuthToken;


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App 
      firebaseConfig={firebaseConfig} 
      appId={appId} 
      initialAuthToken={initialAuthToken} 
    />
  </React.StrictMode>
);