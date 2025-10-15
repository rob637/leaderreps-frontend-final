import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Import global styles

// Define global variables expected by the App component
// NOTE: You must replace the placeholder values below with your actual Firebase project configuration.
if (typeof window.__firebase_config === 'undefined') {
    window.__firebase_config = JSON.stringify({
        apiKey: "YOUR_FIREBASE_API_KEY", // REPLACE with your actual Firebase API Key
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    });
}
if (typeof window.__app_id === 'undefined') {
    window.__app_id = 'leaderreps-playground-dev';
}
if (typeof window.__initial_auth_token === 'undefined') {
    // Leaves it empty so the app signs in anonymously if no token is available.
    window.__initial_auth_token = ''; 
}


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
