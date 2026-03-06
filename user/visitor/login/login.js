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
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import { 
    doc, 
    setDoc,
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class AuthManager {
    constructor() {
        console.log('🚀 Inicializando AuthManager...');
        this.initializeDOMElements();
        this.attachEventListeners();
        this.setupAuthStateListener();
        // Verificar sesión almacenada después de configurar el listener
        setTimeout(() => this.checkStoredSession(), 1000);
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
        this.rememberMe = document.getElementById('remember-me');
        
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

        // Remember me functionality
        if (this.rememberMe) {
            // Load saved email if exists
            const savedEmail = localStorage.getItem('rememberedEmail');
            if (savedEmail && this.loginEmail) {
                this.loginEmail.value = savedEmail;
                this.rememberMe.checked = true;
            }
        }
    }

    setupAuthStateListener() {
        // Listen for auth state changes
        onAuthStateChanged(auth, async (user) => {
            console.log('🔔 onAuthStateChanged disparado');
            if (user) {
                console.log('✅ Usuario autenticado en Firebase Auth:', user.uid);
                console.log('📧 Email en Auth:', user.email);
                console.log('✅ Email verificado:', user.emailVerified);
                
                // Obtener TODOS los datos del usuario desde Firestore
                const userData = await this.getUserData(user.uid);
                console.log('📦 Datos completos del usuario:', userData);
                
                // Guardar TODOS los datos en localStorage (caché)
                this.saveUserDataToCache(user, userData);
                
                // Verificar si debemos redirigir (solo si estamos en login)
                const currentPath = window.location.pathname;
                if (currentPath.includes('login.html') || currentPath === '/' || currentPath.includes('/index.html')) {
                    console.log('🔄 Redirigiendo desde onAuthStateChanged');
                    this.redirectBasedOnRole(userData?.rol || 'usuario');
                }
            } else {
                console.log('❌ Usuario no autenticado en Firebase Auth');
                this.clearSessionFromStorage();
            }
        });
    }

    async getUserData(uid) {
        console.log('🔍 Buscando datos completos en Firestore para UID:', uid);
        
        try {
            // Intentar con la colección 'usarios' (tu colección principal)
            const userRef = doc(db, 'usarios', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                console.log('✅ Datos encontrados en colección "usarios"');
                return userData;
            } else {
                console.log('⚠️ No se encontraron datos adicionales');
                return null;
            }
        } catch (error) {
            console.error('❌ Error al obtener datos del usuario:', error);
            return null;
        }
    }

    async getUserRole(uid) {
        console.log('🔍 Buscando rol en Firestore para UID:', uid);
        
        try {
            const userRef = doc(db, 'usarios', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                console.log('✅ Rol encontrado:', userData.rol || 'usuario');
                return userData.rol || 'usuario';
            } else {
                console.log('⚠️ Usando rol por defecto: usuario');
                return 'usuario';
            }
        } catch (error) {
            console.error('❌ Error al obtener rol:', error);
            return 'usuario';
        }
    }

    saveUserDataToCache(user, userData = null) {
        try {
            console.log('💾 Guardando datos en caché (localStorage)...');
            
            // Datos básicos de autenticación
            const sessionData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                timestamp: Date.now(),
                lastLogin: new Date().toISOString()
            };
            
            // Guardar sesión básica
            localStorage.setItem('userSession', JSON.stringify(sessionData));
            localStorage.setItem('currentUserId', user.uid);
            localStorage.setItem('userEmail', user.email);
            
            // Si tenemos datos adicionales de Firestore, guardarlos TODOS
            if (userData) {
                console.log('📦 Guardando datos completos de Firestore:', userData);
                
                // Guardar cada campo individualmente para fácil acceso
                Object.keys(userData).forEach(key => {
                    if (typeof userData[key] !== 'object' || userData[key] === null) {
                        localStorage.setItem(`user_${key}`, userData[key]);
                    } else {
                        // Para objetos (como fechas), guardar como string
                        localStorage.setItem(`user_${key}`, JSON.stringify(userData[key]));
                    }
                });
                
                // Guardar el rol específicamente
                localStorage.setItem('currentUserRole', userData.rol || 'usuario');
                
                // Guardar nombre completo si existe
                if (userData.nombre_completo) {
                    localStorage.setItem('userDisplayName', userData.nombre_completo);
                }
                
                // Guardar todos los datos en un solo objeto también
                localStorage.setItem('userFullData', JSON.stringify(userData));
            } else {
                localStorage.setItem('currentUserRole', 'usuario');
            }
            
            console.log('✅ Datos guardados en caché correctamente');
            
            // Disparar evento para notificar a otros componentes
            window.dispatchEvent(new CustomEvent('userDataCached', { 
                detail: { user, userData } 
            }));
            
        } catch (error) {
            console.error('Error al guardar en caché:', error);
        }
    }

    getCachedUserData() {
        try {
            const fullData = localStorage.getItem('userFullData');
            if (fullData) {
                return JSON.parse(fullData);
            }
            return null;
        } catch (error) {
            console.error('Error al obtener datos de caché:', error);
            return null;
        }
    }

    getCachedUserField(fieldName) {
        return localStorage.getItem(`user_${fieldName}`);
    }

    redirectBasedOnRole(role) {
        console.log('🔄 ===== INICIANDO REDIRECCIÓN =====');
        console.log('🔄 Rol recibido:', role);
        
        // 🔴 AJUSTA ESTAS RUTAS SEGÚN TU PROYECTO
        const roleRoutes = {
            'administrador': '/user/administrator/dashAdmin/dashboard.html',
            'veterinario': '/user/veterinario/dashVeterinario/dashVeterinario.html',
            'usuario': '/index.html'
        };

        const route = roleRoutes[role] || roleRoutes['usuario'];
        console.log('📍 Ruta de destino:', route);
        
        // Pequeño retraso para mostrar mensaje de éxito
        setTimeout(() => {
            console.log('🚀 Redirigiendo a:', route);
            window.location.href = route;
        }, 1500);
    }

    checkStoredSession() {
        try {
            console.log('🔍 Verificando caché de sesión...');
            const sessionData = localStorage.getItem('userSession');
            const userFullData = localStorage.getItem('userFullData');
            
            if (sessionData) {
                console.log('📦 Sesión encontrada en caché');
                const session = JSON.parse(sessionData);
                
                if (userFullData) {
                    console.log('📦 Datos completos encontrados en caché');
                }
                
                const sessionAge = Date.now() - session.timestamp;
                const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
                
                if (sessionAge < SESSION_DURATION) {
                    console.log('✅ Caché de sesión válida');
                    
                    const currentPath = window.location.pathname;
                    
                    if (currentPath.includes('login.html') || currentPath === '/' || currentPath.includes('/index.html')) {
                        console.log('🔄 Redirigiendo por sesión en caché');
                        const role = localStorage.getItem('currentUserRole') || 'usuario';
                        this.redirectBasedOnRole(role);
                    }
                } else {
                    console.log('❌ Caché de sesión expirada');
                    this.clearSessionFromStorage();
                }
            } else {
                console.log('ℹ️ No hay sesión en caché');
            }
        } catch (error) {
            console.error('Error al verificar caché:', error);
        }
    }

    saveSessionToStorage(user, role = 'usuario') {
        try {
            console.log('💾 Guardando sesión en localStorage...');
            
            const sessionData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified,
                userRole: role,
                timestamp: Date.now(),
                lastLogin: new Date().toISOString()
            };
            
            localStorage.setItem('userSession', JSON.stringify(sessionData));
            localStorage.setItem('currentUserId', user.uid);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('currentUserRole', role);
            
            console.log('✅ Sesión guardada correctamente');
            
        } catch (error) {
            console.error('Error al guardar sesión:', error);
        }
    }

    clearSessionFromStorage() {
        console.log('🧹 Limpiando caché de usuario...');
        
        // Obtener todas las keys de localStorage
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
        
        // Eliminar todas las keys relacionadas con el usuario
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // No eliminar rememberedEmail aquí
        console.log('✅ Caché de usuario limpiada');
    }

    saveRememberedEmail(email) {
        if (this.rememberMe?.checked) {
            localStorage.setItem('rememberedEmail', email);
            console.log('💾 Email guardado para recordarme:', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }
    }

    getStoredSession() {
        try {
            const sessionData = localStorage.getItem('userSession');
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.error('Error al obtener sesión:', error);
            return null;
        }
    }

    isSessionValid() {
        const session = this.getStoredSession();
        if (!session) return false;
        
        const sessionAge = Date.now() - session.timestamp;
        const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
        
        return sessionAge < SESSION_DURATION;
    }

    isAuthenticated() {
        const firebaseUser = auth.currentUser;
        const storedSession = this.getStoredSession();
        
        return !!(firebaseUser && storedSession && this.isSessionValid());
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
            
            // Auto-cerrar después de 5 segundos
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        } else {
            console.warn('Alert container no encontrado, mensaje:', message);
            alert(message); // Fallback a alert nativo
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
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Login exitoso en Firebase Auth');
            
            // Verificar si el email está verificado (opcional - puedes comentar esto si no quieres forzar verificación)
            if (!user.emailVerified) {
                console.log('⚠️ Email no verificado');
                this.showAlert('Por favor, verifica tu correo electrónico antes de iniciar sesión', 'warning');
                // No redirigir, solo mostrar advertencia
                this.setLoading(this.loginBtn, false);
                return;
            }
            
            // Obtener TODOS los datos del usuario
            const userData = await this.getUserData(user.uid);
            const userRole = userData?.rol || 'usuario';
            
            console.log('🎯 Rol obtenido después de login:', userRole);
            
            this.saveRememberedEmail(email);
            this.showAlert('¡Bienvenido!', 'success');
            
            // Redirigir según el rol
            this.redirectBasedOnRole(userRole);
            
        } catch (error) {
            console.error('❌ Login error:', error);
            this.handleAuthError(error);
            this.setLoading(this.loginBtn, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        // Validar campos obligatorios
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
            console.log('📝 Intentando registrar usuario:', email);
            
            // 1. Crear usuario en Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Usuario creado en Auth:', user.uid);

            // 2. Preparar datos del usuario
            const userData = {
                primer_nombre: this.primerNombre.value.trim(),
                segundo_nombre: this.segundoNombre?.value.trim() || '',
                apellido_paterno: this.apellidoPaterno.value.trim(),
                apellido_materno: this.apellidoMaterno.value.trim(),
                nombre_completo: this.getFullName(),
                email: email,
                rol: 'usuario',
                fecha_registro: serverTimestamp(),
                email_verificado: user.emailVerified,
                uid: user.uid
            };
            
            console.log('📦 Datos a guardar en Firestore:', userData);
            
            // 3. Guardar en Firestore
            await setDoc(doc(db, 'usarios', user.uid), userData);
            console.log('✅ Documento creado en Firestore');

            // 4. ENVIAR CORREO DE VERIFICACIÓN - ¡CORREGIDO!
            console.log('📧 Enviando correo de verificación...');
            await sendEmailVerification(user);
            console.log('✅ Email de verificación enviado correctamente a:', email);
            
            // 5. Mostrar mensaje de éxito
            this.showAlert('¡Cuenta creada! Hemos enviado un correo de verificación a ' + email, 'success');
            
            // 6. Limpiar formulario
            this.registerForm?.reset();
            
            // 7. Cambiar a login después de 3 segundos
            setTimeout(() => {
                this.showLoginForm();
                if (this.loginEmail) {
                    this.loginEmail.value = email;
                }
            }, 3000);

        } catch (error) {
            console.error('❌ Registration error:', error);
            
            // Manejar errores específicos
            if (error.code === 'auth/email-already-in-use') {
                this.showAlert('Este correo ya está registrado. ¿Olvidaste tu contraseña?', 'error');
            } else if (error.code === 'auth/configuration-not-found') {
                this.showAlert('Error de configuración en Firebase. Verifica que Email/Password esté habilitado.', 'error');
                console.error('Error de configuración: Asegúrate de tener habilitado Email/Password en Firebase Console');
            } else if (error.code === 'auth/network-request-failed') {
                this.showAlert('Error de conexión. Verifica tu internet.', 'error');
            } else {
                this.showAlert('Error al crear la cuenta: ' + error.message, 'error');
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

            console.log('✅ Google Auth exitoso:', user.uid);

            // Verificar si el usuario ya existe en Firestore
            const userRef = doc(db, 'usarios', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                // Crear nuevo usuario si no existe
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

            // Obtener datos completos
            const userData = await this.getUserData(user.uid);
            const userRole = userData?.rol || 'usuario';
            
            console.log('🎯 Rol de usuario Google:', userRole);
            
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
            await signOut(auth);
            this.clearSessionFromStorage();
            console.log('✅ Sesión cerrada correctamente');
            window.location.href = '/login.html';
            return true;
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            return false;
        }
    }

    getCurrentUserRole() {
        return localStorage.getItem('currentUserRole') || 'usuario';
    }

    // Método para obtener todos los datos del usuario en caché
    getAllCachedUserData() {
        const userData = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('user_')) {
                const value = localStorage.getItem(key);
                try {
                    userData[key.replace('user_', '')] = JSON.parse(value);
                } catch {
                    userData[key.replace('user_', '')] = value;
                }
            }
        }
        
        return userData;
    }
}

// Initialize the auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando AuthManager...');
    window.authManager = new AuthManager();
});

// Exportar para uso en otros módulos
export { AuthManager };