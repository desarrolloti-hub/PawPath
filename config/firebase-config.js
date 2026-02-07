// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyABACTyV6lId6OAiRorJF_DMXHuCTycMoY",
  authDomain: "pawpath-mx.firebaseapp.com",
  projectId: "pawpath-mx",
  storageBucket: "pawpath-mx.firebasestorage.app",
  messagingSenderId: "511881737688",
  appId: "1:511881737688:web:5326412bffef94f7ecaead",
  measurementId: "G-2WG7WEV833"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);