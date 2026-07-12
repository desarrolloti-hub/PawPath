// ============================================================
// navbar-admin-component.js - Sidebar Admin (sin Shadow DOM)
// ============================================================

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
        this.setupLogout(); // ✅ Ahora el logout funciona
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
        // Insertamos el HTML directamente en el DOM
        this.innerHTML = `
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
                            <a href="#">
                                <i class="fas fa-th-large"></i>
                                <span>Dashboard</span>
                            </a>
                        </li>
                        <li>
                            <a href="/user/administrator/GestionUsuarios/admin_usuarios.html">
                                <i class="fas fa-users"></i>
                                <span>Usuarios</span>
                                <span class="badge-nav">12</span>
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
            /* Estilos adicionales para el sidebar (complemento a dashboard.css) */
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
                z-index: 999;
                backdrop-filter: blur(2px);
            }
            @media (max-width: 768px) {
                .sidebar {
                    position: fixed;
                    transform: translateX(-100%);
                    width: 280px;
                    height: 100vh;
                    box-shadow: 4px 0 30px rgba(0,0,0,0.08);
                    border-right: none;
                }
                .sidebar.open {
                    transform: translateX(0);
                }
                .sidebar.open ~ .sidebar-overlay,
                .sidebar.open + .sidebar-overlay {
                    display: block;
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
        // Esperamos a que el DOM esté listo
        setTimeout(() => {
            const menuToggle = document.getElementById('menuToggle');
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');

            if (!menuToggle) {
                console.warn('No se encontró el botón #menuToggle en el DOM');
                return;
            }
            if (!sidebar) {
                console.warn('No se encontró el sidebar #sidebar en el DOM');
                return;
            }

            // Función toggle
            const toggleSidebar = (e) => {
                if (e) e.stopPropagation();
                sidebar.classList.toggle('open');
            };

            // Evento click en el botón hamburguesa
            menuToggle.addEventListener('click', toggleSidebar);

            // Cerrar con overlay
            if (overlay) {
                overlay.addEventListener('click', () => {
                    sidebar.classList.remove('open');
                });
            }

            // Cerrar al hacer clic fuera en móvil
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    const isClickInside = sidebar.contains(e.target) || menuToggle.contains(e.target);
                    if (!isClickInside) {
                        sidebar.classList.remove('open');
                    }
                }
            });

            // Cerrar al redimensionar a escritorio
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    sidebar.classList.remove('open');
                }
            });

            console.log('✅ Mobile toggle configurado correctamente');
        }, 100);
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

    // ✅ NUEVO MÉTODO: Configura el cierre de sesión
    setupLogout() {
        const logoutBtn = this.querySelector('#logoutBtn');
        if (!logoutBtn) {
            console.warn('No se encontró el botón de cerrar sesión');
            return;
        }

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. Limpiar todo el localStorage y sessionStorage
            localStorage.clear();
            sessionStorage.clear();

            // 2. Eliminar cookies de sesión (si existen)
            document.cookie.split(';').forEach(cookie => {
                document.cookie = cookie
                    .replace(/^ +/, '')
                    .replace(/=.*/, '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/');
            });

            // 3. Redirigir al login (ajusta la ruta según tu proyecto)
            window.location.href = '/user/visitor/login/login.html';
        });
    }
}

// Registrar el componente
customElements.define('navbar-admin', NavbarAdmin);

// Definir logout global por si se necesita desde otros scripts
if (typeof window.logout !== 'function') {
    window.logout = function() {
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