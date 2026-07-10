// Import ONLY the initialized services from config
import { auth, db } from '/config/firebase-config.js';

// Import additional functions directly from Firebase
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class AuthManager {
    constructor() {
        this.initializeDOMElements();
        this.attachEventListeners();
        this.setupAuthStateListener();
        //this.setPersistenceToNone(); // Deshabilitar persistencia
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
        this.rememberMe = document.getElementById('remember-me');

        // Register form elements
        this.registerForm = document.getElementById('register-form');
        this.nombres = document.getElementById('nombres');
        this.apellidoPaterno = document.getElementById('apellido_paterno');
        this.apellidoMaterno = document.getElementById('apellido_materno');
        this.registerEmail = document.getElementById('register-email');
        this.registerPassword = document.getElementById('register-password');
        this.confirmPassword = document.getElementById('confirm-password');
        this.registerBtn = document.getElementById('register-btn');
        this.termsCheckbox = document.getElementById('terms');

        // Checklist elements for password validation
        this.reqLength = document.getElementById('req-length');
        this.reqUpper = document.getElementById('req-upper');
        this.reqLower = document.getElementById('req-lower');
        this.reqNumber = document.getElementById('req-number');
        this.reqSpecial = document.getElementById('req-special');
        this.reqConsecutive = document.getElementById('req-consecutive');

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

        // Password Security Validation
        this.registerPassword?.addEventListener('input', () => this.validatePasswordSecurity());

        // Password confirmation validation
        this.confirmPassword?.addEventListener('input', () => this.validatePasswordMatch());

        // Remember me functionality - SOLO para email
        if (this.rememberMe) {
            const savedEmail = localStorage.getItem('rememberedEmail');
            if (savedEmail && this.loginEmail) {
                this.loginEmail.value = savedEmail;
            }
        }
    }

    setupAuthStateListener() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('✅ Usuario autenticado en Firebase Auth');

                const userData = await this.getUserData(user.uid);
                this.saveUserDataToCache(user, userData);

            } else {
                console.log('❌ Usuario no autenticado en Firebase Auth');
                this.clearSessionFromStorage();
            }
        });
    }

    async getUserData(uid) {
        console.log('🔍 Buscando datos en Firestore para UID:', uid);

        try {
            const userRef = doc(db, 'usarios', uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                return userSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error('❌ Error al obtener datos del usuario:', error);
            return null;
        }
    }

    saveUserDataToCache(user, userData = null) {
        try {
            console.log('💾 Guardando datos en caché (localStorage)...');

            if (user) {
                const sessionData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    emailVerified: user.emailVerified,
                    timestamp: Date.now(),
                    lastLogin: new Date().toISOString()
                };

                localStorage.setItem('userSession', JSON.stringify(sessionData));
                localStorage.setItem('currentUserId', user.uid);
                localStorage.setItem('userEmail', user.email);

                if (userData) {
                    Object.keys(userData).forEach(key => {
                        if (typeof userData[key] !== 'object' || userData[key] === null) {
                            localStorage.setItem(`user_${key}`, userData[key]);
                        } else {
                            localStorage.setItem(`user_${key}`, JSON.stringify(userData[key]));
                        }
                    });

                    localStorage.setItem('currentUserRole', userData.rol || 'usuario');

                    if (userData.nombre_completo) {
                        localStorage.setItem('userDisplayName', userData.nombre_completo);
                    }

                    localStorage.setItem('userFullData', JSON.stringify(userData));
                }

            }
        } catch (error) {
            console.error('Error al guardar en caché:', error);
        }
    }

    redirectBasedOnRole(role) {

        const roleRoutes = {
            'administrador': '/user/administrator/dashAdmin/dashboard.html',
            'veterinario': '/user/veterinario/dashVeterinario/veterinario.html',
            'usuario': '/index.html'
        };

        const route = roleRoutes[role] || roleRoutes['usuario'];

        setTimeout(() => {
            console.log('🚀 Redirigiendo a:', route);
            window.location.href = route;
        }, 1500);
    }

    saveRememberedEmail(email) {
        if (this.rememberMe?.checked) {
            localStorage.setItem('rememberedEmail', email);
            console.log('💾 Email guardado para recordarme:', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
    }

    clearSessionFromStorage() {
        console.log('🧹 Limpiando caché de usuario...');

        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('user_') ||
                key === 'userSession' ||
                key === 'currentUserId' ||
                key === 'userEmail' ||
                key === 'currentUserRole' ||
                key === 'userFullData' ||
                key === 'userDisplayName') {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('✅ Caché de usuario limpiada');
    }

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
        } else {
            alert(message);
        }
    }

    setLoading(button, isLoading) {
        if (!button) return;

        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');

        button.disabled = isLoading;

        if (btnText) btnText.style.display = isLoading ? 'none' : 'inline-block';
        if (btnLoader) btnLoader.style.display = isLoading ? 'inline-block' : 'none';
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // --- Funciones de Validación de Contraseña ---
    
    updateChecklistItem(element, isValid) {
        if (!element) return false;
        
        const icon = element.querySelector('span');
        if (isValid) {
            element.classList.add('valid');
            if (icon) icon.textContent = '✔';
        } else {
            element.classList.remove('valid');
            if (icon) icon.textContent = '✖';
        }
        return isValid;
    }

    hasConsecutiveNumbers(str) {
        for (let i = 0; i < str.length - 1; i++) {
            if (/\d/.test(str[i]) && /\d/.test(str[i+1])) {
                let num1 = parseInt(str[i]);
                let num2 = parseInt(str[i+1]);
                
                if (Math.abs(num1 - num2) === 1 || num1 === num2) {
                    return true;
                }
            }
        }
        return false;
    }

    validatePasswordSecurity() {
        if (!this.registerPassword) return false;
        
        const val = this.registerPassword.value;

        const validLength = this.updateChecklistItem(this.reqLength, val.length >= 10);
        const validUpper = this.updateChecklistItem(this.reqUpper, /[A-Z]/.test(val));
        const validLower = this.updateChecklistItem(this.reqLower, /[a-z]/.test(val));
        const validNumber = this.updateChecklistItem(this.reqNumber, /\d/.test(val));
        const validSpecial = this.updateChecklistItem(this.reqSpecial, /[^A-Za-z0-9]/.test(val));
        const validConsecutive = this.updateChecklistItem(this.reqConsecutive, !this.hasConsecutiveNumbers(val));

        const allValid = validLength && validUpper && validLower && validNumber && validSpecial && validConsecutive;
        
        if (!allValid && val.length > 0) {
            this.registerPassword.setCustomValidity("La contraseña no cumple con los requisitos de seguridad de PawPath.");
        } else {
            this.registerPassword.setCustomValidity("");
        }
        
        return allValid;
    }

    validatePasswordMatch() {
        if (!this.confirmPassword) return;

        if (this.confirmPassword.value && 
            this.registerPassword?.value !== this.confirmPassword.value) {
            this.confirmPassword.style.borderColor = '#EF4444';
            this.confirmPassword.setCustomValidity("Las contraseñas no coinciden.");
        } else {
            this.confirmPassword.style.borderColor = '';
            this.confirmPassword.setCustomValidity("");
        }
    }

    // ---------------------------------------------

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
            console.log('🔐 Intentando login con email:', email);

            await setPersistence(auth, browserLocalPersistence);

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('✅ Login exitoso en Firebase Auth');

            if (user.emailVerified==false) {
                console.log('Email no verificado');
                this.showAlert('Por favor, verifica tu correo electrónico antes de iniciar sesión', 'warning');
                await signOut(auth);
                this.setLoading(this.loginBtn, false);
                return;
            }

            const userData = await this.getUserData(user.uid);

            // Verificar si existe el documento
            if (!userData) {
                console.log(' Usuario sin documento en Firestore');
                await signOut(auth);
                this.showAlert('Error de configuración de cuenta. Contacta al administrador.', 'error');
                this.setLoading(this.loginBtn, false);
                return;
            }

            // ERIFICAR SUSPENSIÓN
            if (userData.suspendido === true) {
                console.log('⛔ Cuenta suspendida');
                await signOut(auth);
                this.showAlert('⚠️ Cuenta suspendida. No puedes acceder.', 'error');
                this.setLoading(this.loginBtn, false);
                return;
            }

            const userRole = userData.rol || 'usuario';

            console.log('🎯 Rol obtenido después de login:', userRole);

            this.saveRememberedEmail(email);
            this.saveUserDataToCache(user, userData);
            this.showAlert('¡Bienvenido!', 'success');

            this.redirectBasedOnRole(userRole);

        } catch (error) {
            console.error('❌ Login error:', error);
            this.handleAuthError(error);
            this.setLoading(this.loginBtn, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        if (!this.nombres?.value.trim() ||
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

        // Se invoca la nueva lógica de validación de seguridad
        if (!this.validatePasswordSecurity()) {
            this.showAlert('La contraseña no cumple con los requisitos de seguridad', 'error');
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
            console.log('📝 Intentando registrar usuario:', email);

            // Configurar persistencia a NONE
            await setPersistence(auth, browserLocalPersistence);
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const arregloNombres = this.nombres.value.trim().split(' ');
            const primerNombre = arregloNombres[0] || '';
            const segundoNombre = arregloNombres.slice(1).join(' ') || '';

            console.log('✅ Usuario creado en Auth:', user.uid);

            // ==== CÓDIGO ORIGINAL: Preparar datos del usuario ====
            const userData = {
                primerNombre: primerNombre,
                segundoNombre: segundoNombre,
                apellido_paterno: this.apellidoPaterno.value.trim(),
                apellido_materno: this.apellidoMaterno.value.trim(),
                nombre_completo: this.nombres.value.trim(),
                email: email,
                // 👇 CAMBIO: Cambiamos de "usuario" a "visitante" (según tu captura)
                rol: 'visitante',  // ANTES era: 'usuario'
                fecha_registro: serverTimestamp(),
                email_verificado: user.emailVerified,
                uid: user.uid
            };
            
            await setDoc(doc(db, 'usarios', user.uid), userData);
            console.log('✅ Documento creado en Firestore');

            console.log('📧 Enviando correo de verificación...');
            await sendEmailVerification(user);
            console.log('✅ Email de verificación enviado correctamente a:', email);

            this.showAlert('¡Cuenta creada! Hemos enviado un correo de verificación a ' + email, 'success');

            this.registerForm?.reset();

            // Limpiar visualmente el checklist
            this.updateChecklistItem(this.reqLength, false);
            this.updateChecklistItem(this.reqUpper, false);
            this.updateChecklistItem(this.reqLower, false);
            this.updateChecklistItem(this.reqNumber, false);
            this.updateChecklistItem(this.reqSpecial, false);
            this.updateChecklistItem(this.reqConsecutive, true);

            setTimeout(() => {
                this.showLoginForm();
                if (this.loginEmail) {
                    this.loginEmail.value = email;
                }
            }, 3000);

        } catch (error) {
            console.error('❌ Registration error:', error);

            if (error.code === 'auth/email-already-in-use') {
                this.showAlert('Este correo ya está registrado. ¿Olvidaste tu contraseña?', 'error');
            } else {
                this.showAlert('Error al crear la cuenta: ' + error.message, 'error');
            }
        } finally {
            this.setLoading(this.registerBtn, false);
        }
    }
     
    /**
     * Verificar integridad de datos después del login
     * Puedes llamar a este método después de un login exitoso
     */
    async verifyUserDataIntegrity(user) {
        try {
            const userRef = doc(db, 'usarios', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                if (userData.security) {
                    const verification = await DataProtectionSHA256.verifyDataIntegrity(
                        {
                            email: user.email,
                            primer_nombre: userData.primer_nombre,
                            segundo_nombre: userData.segundo_nombre,
                            apellido_paterno: userData.apellido_paterno,
                            apellido_materno: userData.apellido_materno
                        },
                        userData.security
                    );
                    
                    console.log(verification.message);
                    
                    if (!verification.isIntegrity) {
                        console.warn('⚠️ Posible modificación de datos detectada');
                        // Opcional: Mostrar alerta al usuario
                        this.showAlert('Tus datos muestran inconsistencias de seguridad', 'warning');
                    }
                    
                    return verification;
                }
            }
            return null;
        } catch (error) {
            console.error('Error verificando integridad:', error);
            return null;
        }
    }


    async handleGoogleAuth() {
        this.setLoading(this.googleAuthBtn, true);

        try {
            // Configurar persistencia a NONE
            await setPersistence(auth, browserLocalPersistence);

            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            console.log('✅ Google Auth exitoso:', user.uid);

            const userRef = doc(db, 'usarios', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                const nameParts = user.displayName?.split(' ') || ['Usuario'];
                const userData = this.parseGoogleUserName(nameParts);

                await setDoc(userRef, {
                    ...userData,
                    email: user.email,
                    rol: 'usuario',
                    fecha_registro: serverTimestamp(),
                    email_verificado: user.emailVerified,
                    uid: user.uid
                });
                console.log('✅ Usuario de Google creado en Firestore');
            }

            const userData = await this.getUserData(user.uid);
            const userRole = userData?.rol || 'usuario';

            console.log('🎯 Rol de usuario Google:', userRole);

            this.saveUserDataToCache(user, userData);
            this.showAlert('¡Bienvenido!', 'success');

            this.redirectBasedOnRole(userRole);

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
            this.showAlert('Correo de recuperación enviado a ' + email, 'success');
        } catch (error) {
            console.error('Password reset error:', error);

            if (error.code === 'auth/user-not-found') {
                this.showAlert('No existe una cuenta con este correo', 'error');
            } else {
                this.showAlert('Error al enviar el correo de recuperación', 'error');
            }
        }
    }

    getFullName() {
        const parts = [
            this.nombres?.value.trim(),
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
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
        };

        const defaultMessage = context === 'login'
            ? 'Correo o contraseña incorrectos'
            : 'Error al crear la cuenta';

        const message = errorMessages[error.code] || defaultMessage;
        this.showAlert(message, 'error');
    }

    async logout() {
        try {
            // Forzar signOut
            await signOut(auth);

            // Limpiar localStorage
            this.clearSessionFromStorage();

            // Limpiar sessionStorage
            sessionStorage.clear();

            // Redirigir con timestamp para evitar caché
            window.location.href = '/user/visitor/login/login.html?logout=' + Date.now();
            return true;
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            return false;
        }
    }
}

// Initialize the auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando AuthManager...');
    window.authManager = new AuthManager();
});

// Exportar para uso en otros módulos
export { AuthManager };
