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

// --- GLOBAL VARIABLES (FOR COMPATIBILITY) ---
// We define these using the live configuration so the App component can access them.
const firebaseConfig = liveFirebaseConfig;
const appId = liveFirebaseConfig.projectId; // Using projectId as safe default
const initialAuthToken = null; 

// We pass the live credentials as global variables for the App.jsx file to use during initialization.
window.__firebase_config = JSON.stringify(firebaseConfig);
window.__app_id = appId;
window.__initial_auth_token = initialAuthToken;
// --- END FIREBASE CONFIGURATION ---


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App 
      firebaseConfig={firebaseConfig} 
      appId={appId} 
      initialAuthToken={initialAuthToken} 
    />
  </React.StrictMode>
);
