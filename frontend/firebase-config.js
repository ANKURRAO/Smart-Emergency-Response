import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDM-wcrDb6Tdnzv3fAA_yc4FOyrrGpnFe4",
  authDomain: "smart-emergency-response-56ea8.firebaseapp.com",
  projectId: "smart-emergency-response-56ea8",
  storageBucket: "smart-emergency-response-56ea8.firebasestorage.app",
  messagingSenderId: "431640489745",
  appId: "1:431640489745:web:f6923ae439a14187f566b0",
  measurementId: "G-B6C2PVXV0M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication
const auth = getAuth(app);
const db = getDatabase(app);

export { app, auth, db };