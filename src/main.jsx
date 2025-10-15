import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// --- START FIREBASE CONFIGURATION (LIVE KEYS) ---
// Note: These variables are provided by the Canvas environment during development, 
// but must be explicitly defined for Netlify/production deployment.
const liveFirebaseConfig = {
  apiKey: "AIzaSyD6eHDIDgC6NEIHLxMpQSe9l8X9MjKV6gk",
  authDomain: "leaderreps-pd-plan.firebaseapp.com",
  projectId: "leaderreps-pd-plan",
  storageBucket: "leaderreps-pd-plan.firebasestorage.app",
  messagingSenderId: "931832203209",
  appId: "1:931832203209:web:a81dafbeb5b5da42b14a18",
  measurementId: "G-1N7B7HQJZM"
};

// Global environment variables (required by the Firebase setup logic in App.jsx)
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : liveFirebaseConfig;

const appId = typeof __app_id !== 'undefined' 
    ? __app_id 
    : 'leaderreps-pd-plan'; // Using projectId as safe default

const initialAuthToken = typeof __initial_auth_token !== 'undefined' 
    ? __initial_auth_token 
    : null; // Null if running locally

window.__firebase_config = JSON.stringify(firebaseConfig);
window.__app_id = appId;
window.__initial_auth_token = initialAuthToken;
// --- END FIREBASE CONFIGURATION ---


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
