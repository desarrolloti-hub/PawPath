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
    onAuthStateChanged
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
        this.checkStoredSession();
        this.setupAuthStateListener();
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
                
                // Obtener el rol del usuario desde Firestore
                const userRole = await this.getUserRole(user.uid);
                console.log('🎯 Rol obtenido de Firestore:', userRole);
                
                // Guardar sesión con el rol incluido
                this.saveSessionToStorage(user, userRole);
                
                // Verificar si debemos redirigir (solo si estamos en login)
                const currentPath = window.location.pathname;
                if (currentPath.includes('login.html') || currentPath === '/' || currentPath.includes('index.html')) {
                    console.log('🔄 Redirigiendo desde onAuthStateChanged');
                    this.redirectBasedOnRole(userRole);
                }
            } else {
                console.log('❌ Usuario no autenticado en Firebase Auth');
                this.clearSessionFromStorage();
            }
        });
    }

    async getUserRole(uid) {
        console.log('🔍 Buscando rol en Firestore para UID:', uid);
        
        try {
            // PRIMERO: Verificar todas las colecciones disponibles
            console.log('📁 Intentando con colección: usarios');
            const userRef = doc(db, 'usarios', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                console.log('✅ Documento ENCONTRADO en colección "usarios"');
                console.log('📦 Datos completos:', userData);
                console.log('👤 Campo "rol":', userData.rol);
                console.log('📧 Campo "email":', userData.email);
                
                // Mostrar TODOS los campos del documento
                console.log('📋 Todos los campos disponibles:');
                Object.keys(userData).forEach(key => {
                    console.log(`   - ${key}: ${userData[key]}`);
                });
                
                const rol = userData.rol || 'usuario';
                console.log('🎯 Rol a utilizar:', rol);
                return rol;
            } else {
                console.log('❌ No se encontró documento en "usarios"');
                
                // Intentar con otras posibles colecciones
                console.log('🔍 Intentando con colección: usuarios');
                const userRef2 = doc(db, 'usuarios', uid);
                const userSnap2 = await getDoc(userRef2);
                
                if (userSnap2.exists()) {
                    console.log('✅ Documento ENCONTRADO en colección "usuarios"');
                    const userData = userSnap2.data();
                    console.log('📦 Datos:', userData);
                    return userData.rol || 'usuario';
                }
                
                console.log('🔍 Intentando con colección: usuario');
                const userRef3 = doc(db, 'usuario', uid);
                const userSnap3 = await getDoc(userRef3);
                
                if (userSnap3.exists()) {
                    console.log('✅ Documento ENCONTRADO en colección "usuario"');
                    const userData = userSnap3.data();
                    console.log('📦 Datos:', userData);
                    return userData.rol || 'usuario';
                }
                
                console.log('❌ No se encontró el documento en NINGUNA colección');
            }
            
            console.log('⚠️ Usando rol por defecto: usuario');
            return 'usuario';
            
        } catch (error) {
            console.error('❌ Error CRÍTICO al obtener rol:', error);
            console.error('Código de error:', error.code);
            console.error('Mensaje:', error.message);
            return 'usuario';
        }
    }

    redirectBasedOnRole(role) {
        console.log('🔄 ===== INICIANDO REDIRECCIÓN =====');
        console.log('🔄 Rol recibido:', role);
        console.log('📍 URL actual:', window.location.href);
        console.log('📍 Pathname:', window.location.pathname);
        
        // 🔴 AJUSTA ESTAS RUTAS SEGÚN TU PROYECTO
        const roleRoutes = {
            'administrador': '/user/administrator/dashAdmin/dashboard.html',
            'veterinario': '/user/veterinario/dashVeterinario/dashVeterinario.html',
            'usuario': 'index.html'
        };

        console.log('📋 Rutas configuradas:', roleRoutes);
        
        // Verificar si el rol existe en las rutas
        if (!roleRoutes[role]) {
            console.error(`❌ ERROR: El rol "${role}" no tiene una ruta definida`);
            console.log('📌 Roles disponibles:', Object.keys(roleRoutes));
            
            // Fallback a usuario
            console.log('⚠️ Usando ruta de usuario como fallback');
            const fallbackRoute = roleRoutes['usuario'];
            console.log('📍 Ruta de fallback:', fallbackRoute);
            
            localStorage.setItem('currentUserRole', 'usuario');
            
            setTimeout(() => {
                console.log('🚀 Redirigiendo a (fallback):', fallbackRoute);
                window.location.href = fallbackRoute;
            }, 2000);
        } else {
            const route = roleRoutes[role];
            console.log('✅ Ruta seleccionada:', route);
            
            localStorage.setItem('currentUserRole', role);
            
            setTimeout(() => {
                console.log('🚀 Redirigiendo a:', route);
                window.location.href = route;
            }, 2000);
        }
        
        console.log('🔄 ===== FIN REDIRECCIÓN =====');
    }

    checkStoredSession() {
        try {
            console.log('🔍 Verificando sesión almacenada...');
            const sessionData = localStorage.getItem('userSession');
            
            if (sessionData) {
                console.log('📦 Sesión encontrada en localStorage');
                const session = JSON.parse(sessionData);
                console.log('📦 Datos de sesión:', session);
                
                const sessionAge = Date.now() - session.timestamp;
                const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
                
                if (sessionAge < SESSION_DURATION) {
                    console.log('✅ Sesión válida');
                    
                    const currentPath = window.location.pathname;
                    console.log('📍 Ruta actual:', currentPath);
                    
                    if (currentPath.includes('login.html') || currentPath === '/' || currentPath.includes('index.html')) {
                        console.log('🔄 Redirigiendo por sesión almacenada');
                        this.redirectBasedOnRole(session.userRole);
                    }
                } else {
                    console.log('❌ Sesión expirada');
                    this.clearSessionFromStorage();
                }
            } else {
                console.log('ℹ️ No hay sesión almacenada');
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            this.clearSessionFromStorage();
        }
    }

    saveSessionToStorage(user, role = 'usuario') {
        try {
            console.log('💾 Guardando sesión en localStorage...');
            console.log('👤 Usuario:', user.uid);
            console.log('🎯 Rol a guardar:', role);
            
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
            console.log('📦 Datos guardados:', sessionData);
            
            window.dispatchEvent(new CustomEvent('userSessionStored', { 
                detail: sessionData 
            }));
            
        } catch (error) {
            console.error('Error al guardar sesión:', error);
        }
    }

    clearSessionFromStorage() {
        console.log('🧹 Limpiando localStorage...');
        localStorage.removeItem('userSession');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('currentUserRole');
        localStorage.removeItem('rememberedEmail');
        console.log('✅ localStorage limpiado');
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
            console.log('👤 UID:', user.uid);
            console.log('👤 Email:', user.email);
            
            // Obtener el rol del usuario
            const userRole = await this.getUserRole(user.uid);
            console.log('🎯 Rol obtenido después de login:', userRole);
            
            this.saveRememberedEmail(email);
            this.showAlert('¡Bienvenido!', 'success');
            
            // Redirigir según el rol
            this.redirectBasedOnRole(userRole);
            
        } catch (error) {
            console.error('❌ Login error:', error);
            this.handleAuthError(error);
        } finally {
            this.setLoading(this.loginBtn, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

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
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            console.log('✅ Usuario creado en Auth:', user.uid);

            const userData = {
                primer_nombre: this.primerNombre.value.trim(),
                segundo_nombre: this.segundoNombre?.value.trim() || '',
                apellido_paterno: this.apellidoPaterno.value.trim(),
                apellido_materno: this.apellidoMaterno.value.trim(),
                nombre_completo: this.getFullName(),
                email: email,
                rol: 'usuario',
                fecha_registro: serverTimestamp(),
                email_verificado: user.emailVerified
            };
            
            console.log('📦 Datos a guardar en Firestore:', userData);
            
            await setDoc(doc(db, 'usarios', user.uid), userData);
            console.log('✅ Documento creado en Firestore');

            await sendEmailVerification(user);
            console.log('✅ Email de verificación enviado');

            this.showAlert('¡Cuenta creada! Revisa tu correo', 'success');
            this.registerForm?.reset();
            
            setTimeout(() => {
                this.showLoginForm();
                if (this.loginEmail) this.loginEmail.value = email;
            }, 3000);

        } catch (error) {
            console.error('❌ Registration error:', error);
            
            if (error.code === 'auth/email-already-in-use') {
                this.showAlert('Este correo ya está registrado', 'error');
            } else if (error.code === 'auth/configuration-not-found') {
                this.showAlert('Error de configuración en Firebase', 'error');
            } else if (error.code === 'auth/network-request-failed') {
                this.showAlert('Error de conexión', 'error');
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
                    email_verificado: user.emailVerified
                });
                console.log('✅ Usuario de Google creado en Firestore');
            }

            const userRole = await this.getUserRole(user.uid);
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
            this.showAlert('Correo de recuperación enviado', 'success');
        } catch (error) {
            console.error('Password reset error:', error);
            this.showAlert('Error al enviar el correo', 'error');
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
            'auth/configuration-not-found': 'Error: Email/Password no está habilitado en Firebase',
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
            await auth.signOut();
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
}

// Initialize the auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando AuthManager...');
    window.authManager = new AuthManager();
});

// Exportar para uso en otros módulos
export { AuthManager };