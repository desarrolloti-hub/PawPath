(function() {
    'use strict';

    // =============================================
    // ESTILOS CSS HÍBRIDOS (ESCRITORIO + SIDEBAR)
    // =============================================
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            :host, body { 
                font-family: 'Poppins', sans-serif; 
                margin: 0; 
            }

            /* --- NAVBAR PARA ESCRITORIO - LETRAS SIEMPRE BLANCAS --- */
            .paw-navbar-desktop {
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                padding: 0.7rem 2rem;
                background: linear-gradient(90deg, #33105c 0%, #090979 45%, #008cff 100%);
                color: white !important; 
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                position: sticky; 
                top: 0; 
                z-index: 1000;
            }

            /* FORZAR TODOS LOS TEXTOS A BLANCO EN EL NAVBAR */
            .paw-navbar-desktop,
            .paw-navbar-desktop *,
            .paw-navbar-desktop a,
            .paw-navbar-desktop span,
            .paw-navbar-desktop div,
            .paw-navbar-desktop li,
            .paw-navbar-desktop ul {
                color: white !important;
            }

            .paw-brand { 
                display: flex; 
                align-items: center; 
                gap: 0.8rem; 
                text-decoration: none; 
                color: white !important; 
            }
            
            .paw-brand img { 
                height: 45px; 
                width: 45px; 
                border-radius: 50%; 
                border: 2px solid rgba(255,255,255,0.3); 
            }
            
            .paw-brand span { 
                font-size: 1.6rem; 
                font-weight: 700; 
                color: white !important; 
            }

            .paw-nav-links { 
                display: flex; 
                gap: 1rem; 
                list-style: none; 
                margin: 0; 
                padding: 0; 
            }
            
            .paw-nav-links a,
            .paw-nav-links li,
            .paw-nav-links a:visited,
            .paw-nav-links a:hover,
            .paw-nav-links a:active,
            .paw-nav-links a:focus { 
                color: white !important; 
                text-decoration: none; 
                font-weight: 500; 
                font-size: 0.95rem;
                padding: 0.5rem 1.2rem; 
                border-radius: 25px; 
                transition: 0.3s;
            }
            
            .paw-nav-links a:hover { 
                background: rgba(255,255,255,0.2); 
                transform: translateY(-2px);
                color: white !important; 
            }

            /* Tarjeta de usuario en Escritorio - TODO BLANCO */
            .user-card-desktop {
                display: flex; 
                align-items: center; 
                gap: 0.8rem;
                background: rgba(255, 255, 255, 0.15); 
                backdrop-filter: blur(10px);
                padding: 0.4rem 1.2rem 0.4rem 0.5rem; 
                border-radius: 50px;
                border: 1px solid rgba(255, 255, 255, 0.25);
                color: white !important;
            }
            
            .user-card-desktop *,
            .user-card-desktop div,
            .user-card-desktop span {
                color: white !important;
            }
            
            .avatar-mini {
                width: 35px; 
                height: 35px; 
                background: #FF6B6B; 
                border-radius: 50%;
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-weight: 800; 
                font-size: 0.8rem;
                color: white !important;
            }

            /* --- SIDEBAR PARA MÓVIL - LETRAS SIEMPRE BLANCAS --- */
            .paw-sidebar {
                position: fixed; 
                top: 0; 
                left: -100%; 
                width: 100%; 
                height: 100vh;
                background: linear-gradient(135deg, #33105c 0%, #090979 100%);
                color: white !important; 
                transition: left 0.3s ease; 
                z-index: 1100; 
                overflow-y: auto;
            }
            
            /* FORZAR TODOS LOS TEXTOS A BLANCO EN EL SIDEBAR */
            .paw-sidebar,
            .paw-sidebar *,
            .paw-sidebar div,
            .paw-sidebar span,
            .paw-sidebar p,
            .paw-sidebar h1,
            .paw-sidebar h2,
            .paw-sidebar h3,
            .paw-sidebar a,
            .paw-sidebar button {
                color: white !important;
            }
            
            .paw-sidebar.active { 
                left: 0; 
            }
            
            .paw-overlay {
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%;
                background: rgba(0,0,0,0.5); 
                z-index: 1050; 
                display: none; 
                backdrop-filter: blur(4px);
                transition: 0.3s;
            }
            .paw-overlay.active { 
                display: block; 
            }

            .paw-toggle-btn {
                position: fixed; 
                top: 15px; 
                left: 15px; 
                width: 45px; 
                height: 45px;
                background: #008cff; 
                color: white !important; 
                border: none; 
                border-radius: 50%;
                cursor: pointer; 
                z-index: 1160; 
                display: none; 
                align-items: center; 
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0, 140, 255, 0.4); 
                font-size: 1.2rem; 
                transition: 0.3s;
            }
            
            .paw-toggle-btn i {
                color: white !important;
            }
            
            .paw-toggle-btn:hover { 
                background: #ff4757; 
                transform: scale(1.05);
                color: white !important; 
            }

            /* Secciones del Sidebar */
            .sidebar-section { 
                margin: 10px 15px; 
                border-radius: 8px; 
                overflow: hidden; 
                background: rgba(255,255,255,0.05); 
            }
            
            .sidebar-header {
                width: 100%; 
                padding: 12px; 
                background: rgba(0, 140, 255, 0.2);
                border: none; 
                color: white !important; 
                display: flex; 
                justify-content: space-between; 
                cursor: pointer;
                font-weight: 500;
            }
            
            .sidebar-header span,
            .sidebar-header i {
                color: white !important;
            }
            
            .sidebar-content { 
                max-height: 0; 
                overflow: hidden; 
                transition: max-height 0.3s ease; 
                background: rgba(255,255,255,0.02); 
            }
            .sidebar-content.active { 
                max-height: 500px; 
            }
            
            .sidebar-link {
                display: flex; 
                align-items: center; 
                padding: 12px 20px; 
                color: white !important;
                text-decoration: none; 
                font-size: 0.9rem; 
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            
            .sidebar-link i,
            .sidebar-link span,
            .sidebar-link:hover,
            .sidebar-link:visited,
            .sidebar-link:active {
                color: white !important;
            }

            /* Botón de cierre de sesión mejorado */
            .logout-btn {
                width: 100%; 
                padding: 12px; 
                border-radius: 50px; 
                border: none;
                background: rgba(220, 53, 69, 0.2); 
                color: #ff6b6b !important; 
                font-weight: bold;
                cursor: pointer; 
                font-size: 1rem; 
                transition: all 0.3s ease;
                display: flex; 
                align-items: center; 
                justify-content: center; 
                gap: 8px;
                border: 1px solid rgba(255, 107, 107, 0.3);
            }
            
            .logout-btn i {
                color: #ff6b6b !important;
            }
            
            .logout-btn:hover {
                background: rgba(220, 53, 69, 0.3);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
                color: #ff6b6b !important;
            }
            
            .logout-btn:hover i {
                color: #ff6b6b !important;
            }

            /* Botón de salir en escritorio */
            .desktop-logout-btn {
                background: rgba(255,255,255,0.1); 
                border: none; 
                color: white !important;
                padding: 5px 10px; 
                border-radius: 15px; 
                cursor: pointer; 
                font-size: 0.7rem;
                margin-left: 5px; 
                transition: 0.3s; 
                display: flex; 
                align-items: center; 
                gap: 4px;
            }
            
            .desktop-logout-btn i,
            .desktop-logout-btn span,
            .desktop-logout-btn:hover,
            .desktop-logout-btn:active,
            .desktop-logout-btn:focus {
                color: white !important;
            }
            
            .desktop-logout-btn:hover {
                background: #ff4757;
                transform: scale(1.05);
                color: white !important;
            }

            /* Estilos para texto en el sidebar */
            #sideUserName,
            #sideUserRole,
            .sidebar-section h2,
            .sidebar-section p {
                color: white !important;
            }

            /* --- MEDIA QUERIES PARA RESPONSIVE --- */
            @media (max-width: 992px) {
                .paw-navbar-desktop { display: none; }
                .paw-toggle-btn { display: flex; }
                .paw-sidebar { width: 100%; }
            }

            @media (min-width: 993px) {
                .paw-sidebar, .paw-toggle-btn, .paw-overlay { display: none !important; }
            }
        `;
        document.head.appendChild(style);
    }

    // =============================================
    // FUNCIÓN DE CIERRE DE SESIÓN (extraída de RSI)
    // =============================================
    async function handleLogout() {
        try {
            // Si hay Firebase, intentar cerrar sesión de Firebase
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().signOut();
            }
            
            // Limpiar localStorage
            localStorage.clear();
            
            // Mostrar mensaje de confirmación
            alert('Sesión cerrada correctamente');
            
            // Redirigir al inicio
            window.location.href = '/';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            
            // En caso de error con Firebase, igual limpiar localStorage
            localStorage.clear();
            alert('Sesión cerrada correctamente');
            window.location.href = '/';
        }
    }

    function createElements() {
        // 1. Barra de Escritorio
        const navbar = document.createElement('nav');
        navbar.className = 'paw-navbar-desktop';
        navbar.innerHTML = `
            <a href="/" class="paw-brand">
                <img src="/assets/images/PawPahtLogo.png" alt="Logo">
                <span>PawPath</span>
            </a>
            <ul class="paw-nav-links">
                <li><a href="/">Inicio</a></li>
                <li><a href="/user/visitor/foro/Foro.html">Foro</a></li>
                <li><a href="#map">Mapa</a></li>
                <li><a href="#veterinarios">Veterinarios</a></li>
                <li><a href="#planes">Planes</a></li>
            </ul>
            <div id="userActionDesktop"></div>
        `;

        // 2. Sidebar de Móvil
        const sidebar = document.createElement('div');
        sidebar.className = 'paw-sidebar';
        sidebar.id = 'pawSidebar';
        sidebar.innerHTML = `
            <div style="padding: 40px 20px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <img src="/assets/images/PawPahtLogo.png" style="width:70px; border-radius:50%; border:3px solid #ff6b6b;">
                <h2 id="sideUserName" style="margin: 10px 0 5px; font-size: 1.2rem; color: white !important;">Usuario</h2>
                <p id="sideUserRole" style="font-size:0.8rem; color: #ffd93d !important; margin:0;">USUARIO</p>
            </div>
            
            <div class="sidebar-section">
                <button class="sidebar-header" onclick="this.nextElementSibling.classList.toggle('active')">
                    <span><i class="fas fa-bars"></i> Menú Principal</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="sidebar-content active">
                    <a href="/" class="sidebar-link"><i class="fas fa-home"></i> Inicio</a>
                    <a href="/user/visitor/foro/Foro.html" class="sidebar-link"><i class="fas fa-comments"></i> Foro</a>
                    <a href="#map" class="sidebar-link"><i class="fas fa-map"></i> Mapa</a>
                    <a href="#veterinarios" class="sidebar-link"><i class="fas fa-user-md"></i> Veterinarios</a>
                    <a href="#planes" class="sidebar-link"><i class="fas fa-tags"></i> Planes</a>
                </div>
            </div>

            <div style="padding: 20px;">
                <button class="logout-btn" id="sidebarLogoutBtn">
                    <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                </button>
            </div>
        `;

        // 3. Botón flotante y Overlay
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'paw-toggle-btn';
        toggleBtn.id = 'pawToggleBtn';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';

        const overlay = document.createElement('div');
        overlay.className = 'paw-overlay';
        overlay.id = 'pawOverlay';

        document.body.prepend(navbar, sidebar, toggleBtn, overlay);
    }

    function setupLogic() {
        const toggleBtn = document.getElementById('pawToggleBtn');
        const sidebar = document.getElementById('pawSidebar');
        const overlay = document.getElementById('pawOverlay');
        const sidebarLinks = sidebar.querySelectorAll('.sidebar-link');
        const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');

        // Función para abrir/cerrar el menú
        const toggleMenu = () => {
            const active = sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            toggleBtn.innerHTML = active ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        };

        // Eventos de apertura/cierre
        toggleBtn.onclick = toggleMenu;
        overlay.onclick = toggleMenu;

        // Auto-cierre al tocar un enlace dentro del sidebar
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });

        // Evento de cierre de sesión para el botón del sidebar
        if (sidebarLogoutBtn) {
            sidebarLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }

        // Cargar datos del usuario
        const pNombre = localStorage.getItem('user_primer_nombre');
        const sNombre = localStorage.getItem('user_segundo_nombre');
        const aPaterno = localStorage.getItem('user_apellido_paterno');
        const rol = localStorage.getItem('user_rol');
        
        // Determinar inicial y nombre completo
        let initial = 'U';
        let fullName = 'Usuario';
        
        if (pNombre) {
            initial = pNombre.charAt(0).toUpperCase();
            
            // Usar formato: Primer Nombre + Apellido Paterno (si existe)
            if (pNombre && aPaterno) {
                fullName = `${pNombre} ${aPaterno}`;
            } else if (pNombre && sNombre) {
                fullName = `${pNombre} ${sNombre}`;
            } else {
                fullName = pNombre;
            }
        }

        // Actualizar Escritorio
        const userAction = document.getElementById('userActionDesktop');
        if (userAction) {
            if (pNombre) {
                userAction.innerHTML = `
                    <div class="user-card-desktop">
                        <div class="avatar-mini">${initial}</div>
                        <div style="display:flex; flex-direction:column">
                            <span style="font-size:0.85rem; font-weight:700; color: white !important;">${fullName}</span>
                            <span style="font-size:0.65rem; opacity:0.7; color: white !important;">${(rol || 'Usuario').toUpperCase()}</span>
                        </div>
                        <button class="desktop-logout-btn" id="desktopLogoutBtn">
                            <i class="fas fa-sign-out-alt"></i> Salir
                        </button>
                    </div>
                `;
                
                // Evento de cierre de sesión para el botón de escritorio
                const desktopLogoutBtn = document.getElementById('desktopLogoutBtn');
                if (desktopLogoutBtn) {
                    desktopLogoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        handleLogout();
                    });
                }
            } else {
                userAction.innerHTML = `
                    <div style="display:flex; gap:10px;">
                        <a href="/user/visitor/login/login.html" style="background:white; color:#090979; padding:8px 20px; border-radius:20px; text-decoration:none; font-weight:bold;">Iniciar sesión</a>
                    </div>
                `;
            }
        }

        // Actualizar Sidebar
        const sideUserName = document.getElementById('sideUserName');
        const sideUserRole = document.getElementById('sideUserRole');
        
        if (sideUserName) {
            sideUserName.textContent = fullName;
            sideUserName.style.color = 'white !important';
        }
        if (sideUserRole) {
            sideUserRole.textContent = (rol || 'Usuario').toUpperCase();
            sideUserRole.style.color = '#ffd93d !important';
        }
    }

    // Iniciar sistema
    addStyles();
    createElements();
    setupLogic();

})();