import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { firebaseConfig } from "./firebaseConfig";

// If you need a custom token, you can source it from env too (optional)
const initialAuthToken = undefined;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App firebaseConfig={firebaseConfig} initialAuthToken={initialAuthToken} />
  </React.StrictMode>
);