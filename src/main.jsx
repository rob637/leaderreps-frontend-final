import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// --- START FIREBASE CONFIGURATION (LIVE KEYS) ---
const liveFirebaseConfig = {
  apiKey: "AIzaSyD6eHDIDgC6NEIHLxMpQSe9l8X9MjKV6gk",
  authDomain: "leaderreps-pd-plan.firebaseapp.com",
  projectId: "leaderreps-pd-plan",
  storageBucket: "leaderreps-pd-plan.firebasestorage.app",
  messagingSenderId: "931832203209",
  appId: "1:931832203209:web:a81dafbeb5b5da42b14a18",
  measurementId: "G-1N7B7HQJZM"
};

// Define necessary context variables for the App component
const firebaseConfig = liveFirebaseConfig;
const appId = liveFirebaseConfig.projectId; 
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