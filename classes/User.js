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

export class AuthManager {
    constructor() {
        this.initializeDOMElements();
        this.attachEventListeners();
        this.showLoginForm();
        console.log('✅ AuthManager initialized');

    }

    initializeDOMElements() {
        // Containers
        this.loginContainer = document.getElementById('login-container');
        this.registerContainer = document.getElementById('register-container');
        
        // Navigation links
        this.showRegisterLink = document.getElementById('show-register-link');
        this.showLoginLink = document.getElementById('show-login-link');
        
        // Form titles
        this.formTitle = document.getElementById('form-title');
        this.formSubtitle = document.getElementById('form-subtitle');
        this.illustrationTitle = document.getElementById('illustration-title');
        this.illustrationText = document.getElementById('illustration-text');
        this.illustrationBenefits = document.getElementById('illustration-benefits');
        
        // Login form elements
        this.loginForm = document.getElementById('login-form');
        this.loginEmail = document.getElementById('login-email');
        this.loginPassword = document.getElementById('login-password');
        this.loginBtn = document.getElementById('login-btn');
        this.forgotPassword = document.getElementById('forgot-password');
        
        // Register form elements
        this.registerForm = document.getElementById('register-form');
        this.primerNombre = document.getElementById('primer_nombre');
        this.segundoNombre = document.getElementById('segundo_nombre');
        this.apellidoPaterno = document.getElementById('apellido_paterno');
        this.apellidoMaterno = document.getElementById('apellido_materno');
        this.registerEmail = document.getElementById('register-email');
        this.registerPassword = document.getElementById('register-password');
        this.confirmPassword = document.getElementById('confirm-password');
        this.registerBtn = document.getElementById('register-btn');
        this.termsCheckbox = document.getElementById('terms');
        
        // Google auth button
        this.googleAuthBtn = document.getElementById('google-auth');
        
        // Alert container
        this.alertContainer = document.getElementById('alert-container');
    }

    attachEventListeners() {
        // Navigation
        this.showRegisterLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        this.showLoginLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        // Forms
        this.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm?.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Google auth
        this.googleAuthBtn?.addEventListener('click', () => this.handleGoogleAuth());
        
        // Forgot password
        this.forgotPassword?.addEventListener('click', (e) => this.handleForgotPassword(e));
        
        // Password confirmation validation
        this.confirmPassword?.addEventListener('input', () => this.validatePasswordMatch());
    }

    // Utility methods
    showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        if (this.alertContainer) {
            this.alertContainer.innerHTML = '';
            this.alertContainer.appendChild(alertDiv);
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }

    setLoading(button, isLoading) {
        if (!button) return;
        
        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');
        
        button.disabled = isLoading;
        
        if (btnText) {
            btnText.style.display = isLoading ? 'none' : 'inline-block';
        }
        
        if (btnLoader) {
            btnLoader.style.display = isLoading ? 'inline-block' : 'none';
        }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    validatePasswordMatch() {
        if (this.confirmPassword?.value && 
            this.registerPassword?.value !== this.confirmPassword.value) {
            this.confirmPassword.style.borderColor = '#EF4444';
        } else {
            this.confirmPassword.style.borderColor = '';
        }
    }

    // Form display methods
    showLoginForm() {
        if (this.loginContainer) this.loginContainer.style.display = 'block';
        if (this.registerContainer) this.registerContainer.style.display = 'none';
        
        this.updateFormTexts('login');
    }

    showRegisterForm() {
        if (this.loginContainer) this.loginContainer.style.display = 'none';
        if (this.registerContainer) this.registerContainer.style.display = 'block';
        
        this.updateFormTexts('register');
    }

    updateFormTexts(formType) {
        const texts = {
            login: {
                title: 'Iniciar Sesión',
                subtitle: 'Accede a tu cuenta para continuar',
                illTitle: '¡Bienvenido de nuevo!',
                illText: 'Inicia sesión para acceder a tu cuenta',
                benefits: `
                    <div class="benefit-item"><i class="fas fa-check-circle"></i> Accede a tu cuenta</div>
                    <div class="benefit-item"><i class="fas fa-check-circle"></i> Gestiona tus mascotas</div>
                    <div class="benefit-item"><i class="fas fa-check-circle"></i> Conecta con veterinarios</div>
                `
            },
            register: {
                title: 'Crear Cuenta',
                subtitle: 'Únete a la comunidad PawPath',
                illTitle: '¡Comienza tu aventura!',
                illText: 'Regístrate gratis y accede a todos los beneficios',
                benefits: `
                    <div class="benefit-item"><i class="fas fa-check-circle"></i> Reporta mascotas perdidas</div>
                    <div class="benefit-item"><i class="fas fa-check-circle"></i> Acceso al foro comunitario</div>
                    <div class="benefit-item"><i class="fas fa-check-circle"></i> Alertas de rescate</div>
                    <div class="benefit-item"><i class="fas fa-check-circle"></i> Conecta con veterinarios</div>
                `
            }
        };

        const current = texts[formType];
        
        if (this.formTitle) this.formTitle.textContent = current.title;
        if (this.formSubtitle) this.formSubtitle.textContent = current.subtitle;
        if (this.illustrationTitle) this.illustrationTitle.textContent = current.illTitle;
        if (this.illustrationText) this.illustrationText.textContent = current.illText;
        if (this.illustrationBenefits) this.illustrationBenefits.innerHTML = current.benefits;
    }

    // Handlers
    async handleLogin(e) {
        e.preventDefault();
        
        const email = this.loginEmail?.value.trim();
        const password = this.loginPassword?.value;

        if (!email || !password) {
            this.showAlert('Completa todos los campos', 'error');
            return;
        }

        this.setLoading(this.loginBtn, true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            this.showAlert('¡Bienvenido!', 'success');
            setTimeout(() => window.location.href = '../../index.html', 1500);
        } catch (error) {
            console.error('Login error:', error);
            this.handleAuthError(error);
        } finally {
            this.setLoading(this.loginBtn, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        // Validate required fields
        if (!this.primerNombre?.value.trim() || 
            !this.apellidoPaterno?.value.trim() || 
            !this.apellidoMaterno?.value.trim()) {
            this.showAlert('Completa todos los campos obligatorios', 'error');
            return;
        }

        const email = this.registerEmail?.value.trim();
        
        if (!this.isValidEmail(email)) {
            this.showAlert('Correo electrónico inválido', 'error');
            return;
        }

        const password = this.registerPassword?.value;
        
        if (password.length < 6) {
            this.showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        if (password !== this.confirmPassword?.value) {
            this.showAlert('Las contraseñas no coinciden', 'error');
            return;
        }

        if (!this.termsCheckbox?.checked) {
            this.showAlert('Debes aceptar los términos', 'error');
            return;
        }

        this.setLoading(this.registerBtn, true);

        try {
            console.log('Intentando crear usuario con:', email);
            
            // 1. Crear usuario en Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Usuario creado en Auth:', user.uid);

            // 2. Crear documento en Firestore (colección 'users')
            const userData = {
                primer_nombre: this.primerNombre.value.trim(),
                segundo_nombre: this.segundoNombre?.value.trim() || '',
                apellido_paterno: this.apellidoPaterno.value.trim(),
                apellido_materno: this.apellidoMaterno.value.trim(),
                nombre_completo: this.getFullName(),
                email: email,
                rol: 'visitante',
                fecha_registro: serverTimestamp(),
                email_verificado: user.emailVerified
            };
            
            await setDoc(doc(db, 'usarios', user.uid), userData);
            console.log('✅ Documento creado en Firestore');

            // 3. Enviar correo de verificación
            await sendEmailVerification(user);
            console.log('✅ Email de verificación enviado');

            this.showAlert('¡Cuenta creada! Revisa tu correo para verificar tu cuenta', 'success');
            this.registerForm?.reset();
            
            setTimeout(() => {
                this.showLoginForm();
                if (this.loginEmail) this.loginEmail.value = email;
            }, 3000);

        } catch (error) {
            console.error('❌ Registration error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            if (error.code === 'auth/email-already-in-use') {
                this.showAlert('Este correo ya está registrado. ¿Olvidaste tu contraseña?', 'error');
            } else if (error.code === 'auth/configuration-not-found') {
                this.showAlert('Error de configuración: Email/Password no está habilitado en Firebase', 'error');
            } else if (error.code === 'auth/network-request-failed') {
                this.showAlert('Error de conexión. Verifica tu internet', 'error');
            } else {
                this.handleAuthError(error, 'register');
            }
        } finally {
            this.setLoading(this.registerBtn, false);
        }
    }

    async handleGoogleAuth() {
        this.setLoading(this.googleAuthBtn, true);

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Check if user document exists
            const userRef = doc(db, 'usuarios', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                const nameParts = user.displayName?.split(' ') || ['Usuario'];
                const userData = this.parseGoogleUserName(nameParts);
                
                await setDoc(userRef, {
                    ...userData,
                    email: user.email,
                    rol: 'visitante',
                    fecha_registro: serverTimestamp(),
                    email_verificado: user.emailVerified
                });
            }

            this.showAlert('¡Bienvenido!', 'success');
            setTimeout(() => window.location.href = '../../index.html', 1500);

        } catch (error) {
            console.error('Google auth error:', error);
            this.showAlert('Error con Google: ' + error.message, 'error');
        } finally {
            this.setLoading(this.googleAuthBtn, false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = this.loginEmail?.value.trim();

        if (!email) {
            this.showAlert('Ingresa tu correo electrónico', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showAlert('Correo electrónico inválido', 'error');
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            this.showAlert('Correo de recuperación enviado', 'success');
        } catch (error) {
            console.error('Password reset error:', error);
            this.showAlert('Error al enviar el correo', 'error');
        }
    }

    // Helper methods
    getFullName() {
        const parts = [
            this.primerNombre?.value.trim(),
            this.segundoNombre?.value.trim(),
            this.apellidoPaterno?.value.trim(),
            this.apellidoMaterno?.value.trim()
        ].filter(Boolean);
        
        return parts.join(' ');
    }

    parseGoogleUserName(nameParts) {
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

        return {
            primer_nombre,
            segundo_nombre,
            apellido_paterno,
            apellido_materno,
            nombre_completo: nameParts.join(' ')
        };
    }

    handleAuthError(error, context = 'login') {
        const errorMessages = {
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
            'auth/email-already-in-use': 'Este correo ya está registrado',
            'auth/weak-password': 'La contraseña es muy débil',
            'auth/invalid-email': 'Correo electrónico inválido',
            'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
            'auth/configuration-not-found': 'Error: Email/Password no está habilitado en Firebase',
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
        };

        const defaultMessage = context === 'login' 
            ? 'Correo o contraseña incorrectos' 
            : 'Error al crear la cuenta';

        const message = errorMessages[error.code] || defaultMessage;
        this.showAlert(message, 'error');
    }
}