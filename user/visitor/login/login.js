// Importar Firebase (asegúrate de tener instalado firebase o usar CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc,
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Firebase (REEMPLAZA CON TUS DATOS)
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_STORAGE_BUCKET",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elementos del DOM
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const illustrationTitle = document.getElementById('illustration-title');
const illustrationText = document.getElementById('illustration-text');
const illustrationBenefits = document.getElementById('illustration-benefits');

const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');
const forgotPassword = document.getElementById('forgot-password');

const registerForm = document.getElementById('register-form');
const primerNombre = document.getElementById('primer_nombre');
const segundoNombre = document.getElementById('segundo_nombre');
const apellidoPaterno = document.getElementById('apellido_paterno');
const apellidoMaterno = document.getElementById('apellido_materno');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const confirmPassword = document.getElementById('confirm-password');
const registerBtn = document.getElementById('register-btn');
const termsCheckbox = document.getElementById('terms');

const googleAuthBtn = document.getElementById('google-auth');
const alertContainer = document.getElementById('alert-container');

// Utilidades
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

function setLoading(button, isLoading) {
    if (!button) return;
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    button.disabled = isLoading;
    if (btnText) btnText.style.display = isLoading ? 'none' : 'inline-block';
    if (btnLoader) btnLoader.style.display = isLoading ? 'inline-block' : 'none';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Mostrar formularios
function showLoginForm() {
    loginContainer.style.display = 'block';
    registerContainer.style.display = 'none';
    formTitle.textContent = 'Iniciar Sesión';
    formSubtitle.textContent = 'Accede a tu cuenta para continuar';
    illustrationTitle.textContent = '¡Bienvenido de nuevo!';
    illustrationText.textContent = 'Inicia sesión para acceder a tu cuenta';
    illustrationBenefits.innerHTML = `
        <div class="benefit-item"><i class="fas fa-check-circle"></i> Accede a tu cuenta</div>
        <div class="benefit-item"><i class="fas fa-check-circle"></i> Gestiona tus mascotas</div>
        <div class="benefit-item"><i class="fas fa-check-circle"></i> Conecta con veterinarios</div>
    `;
}

function showRegisterForm() {
    loginContainer.style.display = 'none';
    registerContainer.style.display = 'block';
    formTitle.textContent = 'Crear Cuenta';
    formSubtitle.textContent = 'Únete a la comunidad PawPath';
    illustrationTitle.textContent = '¡Comienza tu aventura!';
    illustrationText.textContent = 'Regístrate gratis y accede a todos los beneficios';
    illustrationBenefits.innerHTML = `
        <div class="benefit-item"><i class="fas fa-check-circle"></i> Reporta mascotas perdidas</div>
        <div class="benefit-item"><i class="fas fa-check-circle"></i> Acceso al foro comunitario</div>
        <div class="benefit-item"><i class="fas fa-check-circle"></i> Alertas de rescate</div>
        <div class="benefit-item"><i class="fas fa-check-circle"></i> Conecta con veterinarios</div>
    `;
}

// Event listeners de navegación
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterForm();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) {
        showAlert('Completa todos los campos', 'error');
        return;
    }
    setLoading(loginBtn, true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showAlert('¡Bienvenido!', 'success');
        setTimeout(() => window.location.href = '../../index.html', 1500);
    } catch (error) {
        let msg = 'Correo o contraseña incorrectos';
        if (error.code === 'auth/user-not-found') msg = 'Usuario no encontrado';
        else if (error.code === 'auth/wrong-password') msg = 'Contraseña incorrecta';
        else if (error.code === 'auth/too-many-requests') msg = 'Demasiados intentos. Intenta más tarde';
        showAlert(msg, 'error');
    } finally {
        setLoading(loginBtn, false);
    }
});

// Registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!primerNombre.value.trim() || !apellidoPaterno.value.trim() || !apellidoMaterno.value.trim()) {
        showAlert('Completa todos los campos obligatorios', 'error');
        return;
    }
    const email = registerEmail.value.trim();
    if (!isValidEmail(email)) {
        showAlert('Correo electrónico inválido', 'error');
        return;
    }
    const password = registerPassword.value;
    if (password.length < 6) {
        showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    if (password !== confirmPassword.value) {
        showAlert('Las contraseñas no coinciden', 'error');
        return;
    }
    if (!termsCheckbox.checked) {
        showAlert('Debes aceptar los términos', 'error');
        return;
    }
    setLoading(registerBtn, true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, 'users', user.uid), {
            primer_nombre: primerNombre.value.trim(),
            segundo_nombre: segundoNombre.value.trim() || '',
            apellido_paterno: apellidoPaterno.value.trim(),
            apellido_materno: apellidoMaterno.value.trim(),
            nombre_completo: `${primerNombre.value.trim()} ${segundoNombre.value.trim()} ${apellidoPaterno.value.trim()} ${apellidoMaterno.value.trim()}`.replace(/\s+/g, ' ').trim(),
            email: email,
            rol: 'visitante',
            fecha_registro: serverTimestamp(),
            email_verificado: false
        });
        await sendEmailVerification(user);
        showAlert('¡Cuenta creada! Revisa tu correo para verificar tu cuenta', 'success');
        registerForm.reset();
        setTimeout(() => {
            showLoginForm();
            loginEmail.value = email;
        }, 3000);
    } catch (error) {
        let msg = 'Error al crear la cuenta';
        if (error.code === 'auth/email-already-in-use') msg = 'Este correo ya está registrado';
        else if (error.code === 'auth/weak-password') msg = 'La contraseña es muy débil';
        showAlert(msg, 'error');
    } finally {
        setLoading(registerBtn, false);
    }
});

// Google Auth
googleAuthBtn.addEventListener('click', async () => {
    setLoading(googleAuthBtn, true);
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            const nameParts = user.displayName?.split(' ') || ['Usuario'];
            let primer_nombre = nameParts[0] || 'Usuario';
            let segundo_nombre = '';
            let apellido_paterno = '';
            let apellido_materno = '';
            if (nameParts.length >= 3) {
                segundo_nombre = nameParts[1] || '';
                apellido_paterno = nameParts[2] || '';
                apellido_materno = nameParts.slice(3).join(' ') || '';
            } else if (nameParts.length === 2) {
                apellido_paterno = nameParts[1] || '';
            }
            await setDoc(userRef, {
                primer_nombre,
                segundo_nombre,
                apellido_paterno,
                apellido_materno,
                nombre_completo: user.displayName || '',
                email: user.email,
                rol: 'visitante',
                fecha_registro: serverTimestamp(),
                email_verificado: user.emailVerified
            });
        }
        showAlert('¡Bienvenido!', 'success');
        setTimeout(() => window.location.href = '../../index.html', 1500);
    } catch (error) {
        showAlert('Error con Google', 'error');
    } finally {
        setLoading(googleAuthBtn, false);
    }
});

// Forgot password
forgotPassword.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim();
    if (!email) {
        showAlert('Ingresa tu correo electrónico', 'error');
        return;
    }
    if (!isValidEmail(email)) {
        showAlert('Correo electrónico inválido', 'error');
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showAlert('Correo de recuperación enviado', 'success');
    } catch (error) {
        showAlert('Error al enviar el correo', 'error');
    }
});

// Validación en tiempo real
confirmPassword.addEventListener('input', () => {
    if (confirmPassword.value && registerPassword.value !== confirmPassword.value) {
        confirmPassword.style.borderColor = '#EF4444';
    } else {
        confirmPassword.style.borderColor = '';
    }
});

// Inicializar mostrando login
showLoginForm();
console.log('✅ Login inicializado');