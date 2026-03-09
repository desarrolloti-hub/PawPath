// navbar-visitor-component.js
class NavbarVisitor extends HTMLElement {
    constructor() {
        super();
        this.isAuthenticated = false;
        this.userData = null;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.checkAuthStatus();
        this.setupAuthListener();
    }

    checkAuthStatus() {
        try {
            const sessionData = localStorage.getItem('userSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                const sessionAge = Date.now() - session.timestamp;
                const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días

                if (sessionAge < SESSION_DURATION) {
                    this.isAuthenticated = true;
                    this.userData = session;
                } else {
                    // Sesión expirada
                    localStorage.removeItem('userSession');
                    localStorage.removeItem('currentUserId');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('currentUserRole');
                    this.isAuthenticated = false;
                    this.userData = null;
                }
            } else {
                this.isAuthenticated = false;
                this.userData = null;
            }
        } catch (error) {
            console.error('Error al verificar autenticación en navbar:', error);
            this.isAuthenticated = false;
            this.userData = null;
        }

        this.updateNavbarContent();
    }

    setupAuthListener() {
        // Escuchar cambios en localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'userSession' || e.key === null) {
                console.log('🔄 Cambio en localStorage detectado en navbar');
                this.checkAuthStatus();
            }
        });

        // Escuchar evento personalizado
        window.addEventListener('userSessionStored', () => {
            console.log('🎯 Evento userSessionStored recibido en navbar');
            this.checkAuthStatus();
        });

        // Verificar cada 30 segundos por si acaso
        setInterval(() => {
            this.checkAuthStatus();
        }, 30000);
    }

    handleLogout() {
        // Limpiar localStorage
        localStorage.removeItem('userSession');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('currentUserRole');
        
        this.isAuthenticated = false;
        this.userData = null;
        this.updateNavbarContent();
        
        // Opcional: mostrar mensaje
        alert('Sesión cerrada correctamente');
        
        // Si quieres redirigir al inicio
        // window.location.href = '/';
    }

    getInitials() {
        if (this.userData?.displayName) {
            return this.userData.displayName.charAt(0).toUpperCase();
        }
        if (this.userData?.email) {
            return this.userData.email.charAt(0).toUpperCase();
        }
        return 'U';
    }

    getDisplayName() {
        if (this.userData?.displayName) {
            const names = this.userData.displayName.split(' ');
            return names[0]; // Solo primer nombre
        }
        if (this.userData?.email) {
            return this.userData.email.split('@')[0];
        }
        return 'Usuario';
    }

    getRoleDisplay() {
        const role = this.userData?.userRole || 'usuario';
        const rolesDisplay = {
            'administrador': 'Admin',
            'veterinario': 'Vet',
            'usuario': 'User'
        };
        return rolesDisplay[role] || role;
    }

    updateNavbarContent() {
        const navActions = this.querySelector('#navActions');
        if (!navActions) return;

        if (this.isAuthenticated && this.userData) {
            // Usuario logueado - mostrar perfil
            navActions.innerHTML = `
                <div class="user-nav-menu">
                    <div class="user-nav-info">
                        <div class="user-nav-avatar">${this.getInitials()}</div>
                        <div class="user-nav-details">
                            <span class="user-nav-name">${this.getDisplayName()}</span>
                            <span class="user-nav-role">${this.getRoleDisplay()}</span>
                        </div>
                    </div>
                    <button class="btn-nav btn-logout" id="navLogoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Salir
                    </button>
                </div>
            `;

            // Agregar evento al botón de logout
            const logoutBtn = this.querySelector('#navLogoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }
        } else {
            // Usuario NO logueado - mostrar botones de login/registro
            navActions.innerHTML = `
                <a href="/user/visitor/login/login.html">
                    <button class="btn-nav btn-login">Iniciar Sesión</button>
                </a>
                <a href="/user/visitor/login/login.html">
                    <button class="btn-nav btn-register">Registrarse</button>
                </a>
            `;
        }

        // Re-configurar el toggle del menú móvil si es necesario
        this.setupMobileToggle();
    }

    setupMobileToggle() {
        const menuToggle = this.querySelector('#menuToggle');
        const navMenu = this.querySelector('#navMenu');
        const navActions = this.querySelector('#navActions');

        if (menuToggle && navMenu && navActions) {
            // Remover event listeners anteriores (para evitar duplicados)
            const newMenuToggle = menuToggle.cloneNode(true);
            menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
            
            newMenuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('show');
                navActions.classList.toggle('show');
            });
        }
    }

    render() {
        this.innerHTML = `
            <style>
                .navbar-visitor {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 2rem;
                    background: #33105c;
                    background: linear-gradient(90deg, rgba(51, 16, 92, 1) 20%, rgba(9, 9, 121, 1) 58%, rgba(0, 140, 255, 1) 100%);
                    color: white;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                }
                
                .nav-brand {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    font-size: 1.5rem;
                    font-weight: bold;
                    text-decoration: none;
                    color: white;
                }
                
                .nav-brand img {
                    height: 40px;
                    width: 40px;
                    border-radius: 50%;
                }
                
                .nav-menu {
                    display: flex;
                    gap: 2rem;
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }
                
                .nav-menu a {
                    color: white;
                    text-decoration: none;
                    font-weight: 500;
                    transition: all 0.3s;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                }
                
                .nav-menu a:hover {
                    background: rgba(255,255,255,0.1);
                    transform: translateY(-2px);
                }
                
                .nav-actions {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }
                
                .btn-nav {
                    padding: 0.5rem 1.5rem;
                    border-radius: 20px;
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 0.9rem;
                }
                
                .btn-login {
                    background: white;
                    color: #1A535C;
                }
                
                .btn-login:hover {
                    background: #f0f0f0;
                    transform: translateY(-2px);
                }
                
                .btn-register {
                    background: #FF6B6B;
                    color: white;
                }
                
                .btn-register:hover {
                    background: #ff5252;
                    transform: translateY(-2px);
                }
                
                /* Estilos para el menú de usuario */
                .user-nav-menu {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    padding: 0.3rem 0.5rem 0.3rem 1rem;
                    border-radius: 40px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .user-nav-info {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                }
                
                .user-nav-avatar {
                    width: 35px;
                    height: 35px;
                    background: linear-gradient(135deg, #FF6B6B, #FF8E8E);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 1rem;
                    box-shadow: 0 4px 10px rgba(255, 107, 107, 0.3);
                }
                
                .user-nav-details {
                    display: flex;
                    flex-direction: column;
                }
                
                .user-nav-name {
                    font-weight: 600;
                    font-size: 0.9rem;
                    color: white;
                    line-height: 1.2;
                }
                
                .user-nav-role {
                    font-size: 0.7rem;
                    color: rgba(255,255,255,0.7);
                    text-transform: capitalize;
                }
                
                .btn-logout {
                    background: rgba(255, 255, 255, 0.15);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    padding: 0.4rem 1rem;
                    font-size: 0.85rem;
                }
                
                .btn-logout:hover {
                    background: rgba(255, 255, 255, 0.25);
                    border-color: rgba(255, 255, 255, 0.5);
                }
                
                .btn-logout i {
                    margin-right: 0.3rem;
                }
                
                .mobile-toggle {
                    display: none;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                }
                
                @media (max-width: 768px) {
                    .nav-menu {
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: linear-gradient(90deg, rgba(51, 16, 92, 1) 20%, rgba(9, 9, 121, 1) 58%, rgba(0, 140, 255, 1) 100%);
                        flex-direction: column;
                        padding: 1rem;
                        box-shadow: 0 5px 10px rgba(0,0,0,0.1);
                        z-index: 999;
                    }
                    
                    .nav-actions {
                        display: none;
                        position: absolute;
                        top: calc(100% + 200px);
                        left: 0;
                        right: 0;
                        background: linear-gradient(90deg, rgba(51, 16, 92, 1) 20%, rgba(9, 9, 121, 1) 58%, rgba(0, 140, 255, 1) 100%);
                        flex-direction: column;
                        padding: 1rem;
                        box-shadow: 0 5px 10px rgba(0,0,0,0.1);
                        z-index: 999;
                    }
                    
                    .nav-menu.show {
                        display: flex;
                    }
                    
                    .nav-actions.show {
                        display: flex;
                    }
                    
                    .mobile-toggle {
                        display: block;
                    }
                    
                    .user-nav-menu {
                        flex-direction: column;
                        width: 100%;
                        background: transparent;
                        backdrop-filter: none;
                        padding: 0;
                    }
                    
                    .user-nav-info {
                        width: 100%;
                        justify-content: center;
                    }
                    
                    .btn-logout {
                        width: 100%;
                    }
                    
                    .nav-actions a {
                        width: 100%;
                    }
                    
                    .nav-actions .btn-nav {
                        width: 100%;
                    }
                }
            </style>
            
            <nav class="navbar-visitor">
                <a href="/" class="nav-brand">
                    <img src="/assets/images/PawPahtLogo.png" alt="PawPath Logo">
                    <span>PawPath</span>
                </a>
                
                <button class="mobile-toggle" id="menuToggle">☰</button>
                
                <ul class="nav-menu" id="navMenu">
                    <li><a href="/" class="active">Inicio</a></li>
                    <li><a href="/user/visitor/foro/foro.html">Foro</a></li>
                    <li><a href="#map">Mapa</a></li>
                    <li><a href="/user/visitor/citas/citas.html">Agenda tu Cita</a></li>
                    <li><a href="#planes">Planes</a></li>
                </ul>
                
                <div class="nav-actions" id="navActions">
                    <!-- Este contenido se actualizará dinámicamente -->
                </div>
            </nav>
        `;
    }

    setupEventListeners() {
        // Configurar toggle del menú móvil
        this.setupMobileToggle();

        // Cambiar enlace activo
        this.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Si es un ancla interna (#)
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const targetId = href.substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    }
                }
                
                // Actualizar clase active
                this.closest('.nav-menu').querySelectorAll('a').forEach(a => {
                    a.classList.remove('active');
                });
                this.classList.add('active');
                
                // Cerrar menú móvil
                const navMenu = this.closest('#navMenu');
                const navActions = document.querySelector('#navActions');
                if (navMenu && navActions) {
                    navMenu.classList.remove('show');
                    navActions.classList.remove('show');
                }
            });
        });
    }
}

customElements.define('navbar-visitor', NavbarVisitor);