// ============================================================
// navbar-admin-component.js - Sidebar Admin (sin Shadow DOM)
// ============================================================
import { auth } from '/config/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
class NavbarAdmin extends HTMLElement {
    constructor() {
        super();
        // No usamos Shadow DOM para que los estilos globales funcionen
    }

    connectedCallback() {
        this.render();
        this.setupMobileToggle();
        this.highlightCurrentPage();
        this._injectChatbot();
        this.setupLogout();
    }

    _injectChatbot() {
        if (document.querySelector('paw-chatbot')) return;
        // Carga el módulo del chatbot y luego inyecta el elemento
        const s = document.createElement('script');
        s.type = 'module';
        s.textContent = `
            import '/components/JS chatbot-component.js';
            if (!document.querySelector('paw-chatbot')) {
                document.body.appendChild(document.createElement('paw-chatbot'));
            }
        `;
        document.head.appendChild(s);
    }

    render() {
        // Insertamos el HTML directamente en el DOM, inyectando el botón hamburguesa móvil autónomamente
        this.innerHTML = `
            <!-- Botón de menú hamburguesa móvil inyectado automáticamente -->
            <button class="menu-btn" id="menuToggle" aria-label="Abrir menú">
                <i class="fas fa-bars"></i>
            </button>

            <aside class="sidebar" id="sidebar">
                <!-- Brand -->
                <div class="sidebar-brand">
                    <div class="brand-icon">
                        <i class="fas fa-paw"></i>
                    </div>
                    <div class="brand-text">Pet<span>Admin</span></div>
                </div>

                <!-- User info -->
                <div class="sidebar-user">
                    <div class="user-avatar">A</div>
                    <div class="user-details">
                        <span class="name">Administrador</span>
                        <span class="role">Super Admin</span>
                    </div>
                    <div class="user-status" title="Activo"></div>
                </div>

                <!-- Navigation -->
                <nav class="sidebar-nav">
                    <span class="nav-label">Menú principal</span>
                    <ul>
                        <li class="active">
                            <a href="/user/administrator/dashAdmin/dashboard.html">
                                <i class="fas fa-th-large"></i>
                                <span>Dashboard</span>
                            </a>
                        </li>
                        <li>
                            <a href="/user/administrator/GestionUsuarios/admin_usuarios.html">
                                <i class="fas fa-users"></i>
                                <span>Usuarios</span>
                            </a>
                        </li>
                        <li>
                            <a href="../GestionMascotas/admin_mascotas.html">
                                <i class="fas fa-dog"></i>
                                <span>Mascotas</span>
                            </a>
                        </li>
                        <li>
                            <a href="../GestionVeterinarios/admin_veterinarios.html">
                                <i class="fas fa-user-md"></i>
                                <span>Veterinarios</span>
                            </a>
                        </li>
                        <li>
                            <a href="#">
                                <i class="fas fa-chart-pie"></i>
                                <span>Reportes</span>
                            </a>
                        </li>
                        <li>
                            <a href="#">
                                <i class="fas fa-credit-card"></i>
                                <span>Suscripciones</span>
                            </a>
                        </li>
                    </ul>
                    <span class="nav-label" style="margin-top: 1.2rem;">Configuración</span>
                    <ul>
                        <li>
                            <a href="#">
                                <i class="fas fa-cog"></i>
                                <span>Ajustes</span>
                            </a>
                        </li>
                        <li>
                            <a href="#">
                                <i class="fas fa-shield-alt"></i>
                                <span>Seguridad</span>
                            </a>
                        </li>
                    </ul>
                </nav>

                <!-- Footer -->
                <div class="sidebar-footer">
                    <button class="footer-item" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Cerrar sesión</span>
                    </button>
                    <div class="version">v2.0.0 · PawPath</div>
                </div>
            </aside>

            <!-- Overlay para móvil -->
            <div class="sidebar-overlay" id="sidebarOverlay"></div>
        `;

        // Añadir estilos específicos del componente (opcional, pero los estilos globales ya los tienes en dashboard.css)
        this.injectStyles();
    }

    injectStyles() {
        // Si ya existen estilos del componente, no los duplicamos
        if (document.getElementById('navbar-admin-styles')) return;

        const style = document.createElement('style');
        style.id = 'navbar-admin-styles';
        style.textContent = `
           .sidebar {
                width: 280px;
                background: #ffffff;
                border-right: 1px solid #e9edf2;
                display: flex;
                flex-direction: column;
                padding: 2rem 1.2rem 1.5rem;
                position: sticky;
                top: 0;
                height: 100vh;
                overflow-y: auto;
                flex-shrink: 0;
                transition: transform 0.3s ease;
                z-index: 1000;
            }
            .sidebar-brand {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding-bottom: 2rem;
                border-bottom: 1px solid #eef2f6;
                margin-bottom: 1.8rem;
            }
            .sidebar-brand .brand-icon {
                width: 42px;
                height: 42px;
                background: #3b82f6;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 1.4rem;
            }
            .sidebar-brand .brand-text {
                font-size: 1.3rem;
                font-weight: 700;
                color: #0f172a;
            }
            .sidebar-brand .brand-text span {
                color: #3b82f6;
            }
            .sidebar-user {
                display: flex;
                align-items: center;
                gap: 0.8rem;
                padding: 0.8rem 0.5rem;
                margin-bottom: 1.8rem;
                background: #f1f5f9;
                border-radius: 16px;
            }
            .sidebar-user .user-avatar {
                width: 44px;
                height: 44px;
                background: #3b82f6;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-weight: 700;
            }
            .sidebar-user .user-details .name {
                font-weight: 600;
                font-size: 0.9rem;
                color: #0f172a;
            }
            .sidebar-user .user-details .role {
                font-size: 0.7rem;
                color: #64748b;
                text-transform: uppercase;
            }
            .sidebar-user .user-status {
                width: 10px;
                height: 10px;
                background: #10b981;
                border-radius: 50%;
                border: 2px solid #fff;
            }
            .sidebar-nav .nav-label {
                font-size: 0.65rem;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: #94a3b8;
                font-weight: 600;
                padding: 0.5rem 0.5rem 0.8rem;
                display: block;
            }
            .sidebar-nav ul {
                list-style: none;
                display: flex;
                flex-direction: column;
                gap: 0.15rem;
            }
            .sidebar-nav ul li a {
                display: flex;
                align-items: center;
                gap: 0.9rem;
                padding: 0.75rem 1rem;
                border-radius: 14px;
                color: #475569;
                text-decoration: none;
                font-weight: 500;
                font-size: 0.9rem;
                transition: all 0.2s;
            }
            .sidebar-nav ul li a i {
                width: 1.6rem;
                font-size: 1.2rem;
                text-align: center;
                color: #64748b;
            }
            .sidebar-nav ul li a:hover {
                background: #f1f5f9;
                color: #0f172a;
            }
            .sidebar-nav ul li.active a {
                background: #eef2ff;
                color: #3b82f6;
                font-weight: 600;
            }
            .sidebar-nav ul li.active a i {
                color: #3b82f6;
            }
            .sidebar-nav ul li a .badge-nav {
                margin-left: auto;
                background: #ef4444;
                color: #fff;
                font-size: 0.6rem;
                font-weight: 700;
                padding: 0.1rem 0.6rem;
                border-radius: 40px;
            }
            .sidebar-nav ul li a .badge-nav {
                margin-left: auto;
                background: #ef4444;
                color: #fff;
                font-size: 0.6rem;
                font-weight: 700;
                padding: 0.1rem 0.6rem;
                border-radius: 40px;
            }
            .sidebar-footer {
                margin-top: auto;
                border-top: 1px solid #eef2f6;
                padding-top: 1.2rem;
            }
            .sidebar-footer .footer-item {
                display: flex;
                align-items: center;
                gap: 0.9rem;
                padding: 0.7rem 1rem;
                border-radius: 14px;
                color: #475569;
                background: none;
                border: none;
                width: 100%;
                font-weight: 500;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s;
                font-family: inherit;
            }
            .sidebar-footer .footer-item:hover {
                background: #fee2e2;
                color: #b91c1c;
            }
            .sidebar-footer .version {
                text-align: center;
                font-size: 0.6rem;
                color: #cbd5e1;
                margin-top: 0.8rem;
            }
            .sidebar-overlay {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.3);
                z-index: 1040;
                backdrop-filter: blur(2px);
            }
            
            /* Estilo de visibilidad y posicionamiento del botón hamburguesa móvil */
            #menuToggle, .menu-btn {
                display: none; /* Oculto por defecto en escritorio */
            }

            @media (max-width: 768px) {
                #menuToggle, .menu-btn {
                    display: inline-flex !important;
                    align-items: center;
                    justify-content: center;
                    position: fixed;
                    top: 15px;
                    left: 15px;
                    width: 42px;
                    height: 42px;
                    background: #ffffff;
                    border: 1px solid #cbd5e1;
                    color: #0f172a;
                    font-size: 1.2rem;
                    border-radius: 12px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    z-index: 1100 !important;
                    transition: all 0.2s ease;
                }
                #menuToggle:hover, .menu-btn:hover {
                    background: #f1f5f9;
                    color: #3b82f6;
                }

                .sidebar {
                    position: fixed;
                    transform: translateX(-100%);
                    width: 280px;
                    height: 100vh;
                    box-shadow: 4px 0 30px rgba(0,0,0,0.08);
                    border-right: none;
                    z-index: 1050 !important; /* Por encima de todo el contenido de la tabla */
                }
                .sidebar.open {
                    transform: translateX(0);
                }
                .sidebar.open ~ .sidebar-overlay,
                .sidebar.open + .sidebar-overlay {
                    display: block !important;
                }
            }
            @media (max-width: 480px) {
                .sidebar {
                    width: 260px;
                    padding: 1.2rem 0.8rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupMobileToggle() {
        const init = () => {
            const menuToggle = document.getElementById('menuToggle') ||
                document.querySelector('.menu-btn');

            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');

            if (!menuToggle || !sidebar) {
                return false;
            }

            // Función toggle limpia
            const toggleSidebar = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                sidebar.classList.toggle('open');
            };

            // Evento click al botón de menú hamburguesa
            menuToggle.removeEventListener('click', toggleSidebar);
            menuToggle.addEventListener('click', toggleSidebar);

            // Cerrar sidebar al hacer clic en el overlay (el fondo gris semitransparente)
            const closeSidebar = (e) => {
                if (e) e.preventDefault();
                sidebar.classList.remove('open');
            };

            if (overlay) {
                overlay.removeEventListener('click', closeSidebar);
                overlay.addEventListener('click', closeSidebar);
            }

            // Cerrar automáticamente al hacer clic en cualquier enlace del menú en móvil (UX limpia)
            const menuLinks = sidebar.querySelectorAll('.sidebar-nav ul li a');
            menuLinks.forEach(link => {
                link.addEventListener('click', () => {
                    sidebar.classList.remove('open');
                });
            });

            // Cerrar automáticamente al redimensionar a escritorio
            const handleResize = () => {
                if (window.innerWidth > 768) {
                    sidebar.classList.remove('open');
                }
            };
            window.removeEventListener('resize', handleResize);
            window.addEventListener('resize', handleResize);

            console.log('✅ Mobile toggle configurado correctamente');
            return true; // Configurado con éxito
        };

        // Bucle de reintento corto por si el DOM asíncrono tarda un instante extra
        if (!init()) {
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (init() || attempts > 20) {
                    clearInterval(interval);
                }
            }, 100);
        }
    }

    highlightCurrentPage() {
        const currentPath = window.location.pathname;
        const links = this.querySelectorAll('.sidebar-nav ul li a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href !== '#' && currentPath.includes(href.replace(/^\.\.\//, ''))) {
                link.closest('li').classList.add('active');
            } else {
                link.closest('li').classList.remove('active');
            }
        });
    }

    setupLogout() {
        const logoutBtn = this.querySelector('#logoutBtn');
        if (!logoutBtn) {
            console.warn('No se encontró el botón de cerrar sesión');
            return;
        }

        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                console.log('🔥 CERRANDO SESIÓN FORZADAMENTE');

                if (auth) {
                    await signOut(auth);
                    console.log('✅ Firebase signOut OK');
                }

                if (window.authManager && typeof window.authManager.logout === 'function') {
                    await window.authManager.logout();
                }

                localStorage.clear();
                sessionStorage.clear();

                document.cookie.split(";").forEach(function (c) {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });

                sessionStorage.setItem('logout_event', Date.now().toString());
                window.location.href = '/user/visitor/login/login.html?logout=' + Date.now();

            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/user/visitor/login/login.html?force=true';
            }
        });
    }
}

// Registrar el componente
customElements.define('navbar-admin', NavbarAdmin);

if (typeof window.logout !== 'function') {
    window.logout = function () {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(';').forEach(cookie => {
            document.cookie = cookie
                .replace(/^ +/, '')
                .replace(/=.*/, '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/');
        });
        window.location.href = '/user/visitor/login/login.html';
    };
}

console.log('✅ NavbarAdmin (sin Shadow DOM) registrado');