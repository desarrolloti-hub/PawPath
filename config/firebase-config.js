// /config/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Configuración única para el proyecto PawPath
const firebaseConfig = {
    apiKey: "AIzaSyABACTyV6lId6OAiRorJF_DMXHuCTycMoY",
    authDomain: "pawpath-mx.firebaseapp.com",
    projectId: "pawpath-mx",
    storageBucket: "pawpath-mx.firebasestorage.app",
    messagingSenderId: "511881737688",
    appId: "1:511881737688:web:5326412bffef94f7ecaead",
    measurementId: "G-2WG7WEV833"
};

// Inicialización de la instancia principal
const app = initializeApp(firebaseConfig);

// Exportaciones nombradas (Sintaxis moderna y compatible)
export const db = getFirestore(app);
export const auth = getAuth(app);

// Exportación por defecto o de la instancia de la app si fuera necesario
export default app;