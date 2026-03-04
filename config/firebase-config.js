// /config/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Configuración de Firebase del proyecto PawPath
const firebaseConfig = {
    apiKey: "AIzaSyABACTyV6lId6OAiRorJF_DMXHuCTycMoY",
    authDomain: "pawpath-mx.firebaseapp.com",
    projectId: "pawpath-mx",
    storageBucket: "pawpath-mx.firebasestorage.app",
    messagingSenderId: "511881737688",
    appId: "1:511881737688:web:5326412bffef94f7ecaead",
    measurementId: "G-2WG7WEV833"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };