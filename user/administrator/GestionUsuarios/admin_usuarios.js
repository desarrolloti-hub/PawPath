// Import ONLY the initialized services from config
import { auth, db } from '/config/firebase-config.js';

// Import additional functions directly from Firebase
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
class Usuarios {
    constructor(
        nombre = "",
        apellidos = "",
        email = "",
        nombreMascota="",
        id=''
    ) {
        this.nombre=nombre;
        this.apellidos=apellidos;
    }
}