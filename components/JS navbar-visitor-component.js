(function () {
    'use strict';

    // =============================================
    // ESTILOS CSS (TUS ESTILOS ORIGINALES)
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
                width: 50%; 
                height: 100%;
                z-index: 1050; 
                display: none; 
                transition: 0.3s;
            }
            .paw-overlay.active { 
                display: block; 
            }

            .paw-toggle-btn {
                position: fixed; 
                top: 10px; 
                left: 5px; 
                width: 45px; 
                height: 45px;
                color: black !important; 
                border: none; 
                background: none;
                cursor: pointer; 
                z-index: 1160; 
                display: none; 
                align-items: center; 
                justify-content: center;
                font-size: 1.2rem; 
                transition: background-color 0.3s, transform 0.2s;
            }            
            .paw-toggle-btn i {
                color: black !important;
            }
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

            .login-btn {
                width: 100%; 
                padding: 12px; 
                border-radius: 50px; 
                border: none;
                background: rgba(86, 220, 53, 0.2); 
                color: #77ff6b !important;
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
            
            .login-btn i {
                color: #77ff6b !important;
            }
            
            .login-btn:hover {
                background: rgba(220, 53, 69, 0.3);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
                color: #ff6b6b !important;
            }
            
            .login-btn:hover i {
                color: #ff6b6b !important;
            }
            .logout-btn {
                width: 100%; 
                padding: 12px; 
                border-radius: 50px; 
                border: none;
                background: rgba(220, 53, 53, 0.2); 
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

            #sideUserName,
            #sideUserRole,
            .sidebar-section h2,
            .sidebar-section p {
                color: white !important;
            }

            @media (max-width: 992px) {
                .paw-navbar-desktop { display: none; }
                .paw-toggle-btn { display: flex; }
                .paw-sidebar { width: 65%; }
            }

            @media (min-width: 993px) {
                .paw-sidebar, .paw-toggle-btn, .paw-overlay { display: none !important; }
            }
        `;
        document.head.appendChild(style);
    }

    // =============================================
    // FUNCIÓN DE LOGOUT FORZADO
    // =============================================
    async function logout() {
        try {
            console.log('🔥 CERRANDO SESIÓN FORZADAMENTE');

            // 1. Deshabilitar persistencia de Firebase
            if (typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    await firebase.auth().setPersistence('none');
                    console.log('✅ Persistencia deshabilitada');
                } catch (e) {
                    console.log('No se pudo cambiar persistencia:', e);
                }

                // 2. Cerrar sesión
                await firebase.auth().signOut();
                console.log('✅ Firebase signOut OK');
            }

            // 3. Usar AuthManager si existe
            if (window.authManager && typeof window.authManager.logout === 'function') {
                await window.authManager.logout();
            }

            // 4. LIMPIAR TODO ABSOLUTAMENTE
            console.log('🧹 LIMPIANDO ALMACENAMIENTO');

            // LocalStorage - eliminar todo
            localStorage.clear();

            // SessionStorage - eliminar todo
            sessionStorage.clear();

            // Cookies - eliminar todas
            document.cookie.split(";").forEach(function (c) {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });

            // 5. Marcar en sessionStorage que cerramos sesión (para otras pestañas)
            sessionStorage.setItem('logout_event', Date.now().toString());

            console.log('✅ TODO LIMPIADO - REDIRIGIENDO');

            // 6. Redirigir con parámetro para evitar caché
            window.location.href = '/user/visitor/login/login.html?logout=' + Date.now();

        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);

            // Forzar limpieza
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/user/visitor/login/login.html?force=true';
        }
    }

    // =============================================
    // DETECTAR CIERRE DE SESIÓN EN OTRAS PESTAÑAS
    // =============================================
    function setupCrossTabLogout() {
        window.addEventListener('storage', function (e) {
            if (e.key === 'logout_event') {
                console.log('🔔 Detectado logout en otra pestaña');
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
            }
        });
    }

    // =============================================
    // CREAR ELEMENTOS DEL NAVBAR
    // =============================================
    function createNavbar() {
        if (document.querySelector('.paw-navbar-desktop')) return;

        const navbar = document.createElement('nav');
        navbar.className = 'paw-navbar-desktop';
        navbar.innerHTML = `
            <a href="/" class="paw-brand">
                <img src="/assets/images/PawPahtLogo.png" alt="Logo">
                <span>PawPath</span>
            </a>
            <ul class="paw-nav-links">
                <li><a href="/">Inicio</a></li>
                <li><a href="/user/visitor/foro/foro.html">Foro</a></li>
                <li><a href="/user/visitor/MapaForo/mapaforo.html">Mapa</a></li>
                <!-- <li><a href="/user/visitor/citas/citas.html">Agendar Cita</a></li> -->
                <li><a href="/user/visitor/mascotas/mascotas.html">Mis Mascotas</a></li>
            </ul> 
            <div id="userActionDesktop"></div>
        `;

        const sidebar = document.createElement('div');
        sidebar.className = 'paw-sidebar';
        sidebar.id = 'pawSidebar';
        sidebar.innerHTML = `
            <div style="padding: 40px 20px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <img src="/assets/images/PawPahtLogo.png" style="width:70px; border-radius:50%; border:3px solid #ff6b6b;">
                <h2 id="sideUserName" style="margin: 10px 0 5px; font-size: 1.2rem;">Usuario</h2>
                <p id="sideUserRole" style="font-size:0.8rem; color: #ffd93d; margin:0;">USUARIO</p>
            </div>
            
            <div class="sidebar-section">
                <button class="sidebar-header" onclick="this.nextElementSibling.classList.toggle('active')">
                    <span><i class="fas fa-bars"></i> Menú Principal</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="sidebar-content active">
                    <a href="/" class="sidebar-link"><i class="fas fa-home"></i> Inicio</a>
                    <a href="/user/visitor/foro/foro.html" class="sidebar-link"><i class="fas fa-comments"></i> Foro</a>
                    <a href="/user/visitor/MapaForo/mapaforo.html" class="sidebar-link"><i class="fas fa-map"></i> Mapa</a>
                    <!--<a href="/user/visitor/citas/citas.html" class="sidebar-link"><i class="fas fa-user-md"></i> Agendar Cita</a>-->
                    <a href="/user/visitor/mascotas/mascotas.html" class="sidebar-link"><i class="fas fa-paw"></i> Mis Mascotas</a>
                    <a href="#planes" class="sidebar-link"><i class="fas fa-tags"></i> Planes</a>
                </div>
            </div>
            <div id="userActionMovil"></div>
        `;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'paw-toggle-btn';
        toggleBtn.id = 'pawToggleBtn';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';

        const overlay = document.createElement('div');
        overlay.className = 'paw-overlay';
        overlay.id = 'pawOverlay';

        document.body.prepend(navbar, sidebar, toggleBtn, overlay);
    }

    // =============================================
    // CONFIGURAR NAVBAR
    // =============================================
    function setupNavbar() {
        const toggleBtn = document.getElementById('pawToggleBtn');
        const sidebar = document.getElementById('pawSidebar');
        const overlay = document.getElementById('pawOverlay');

        if (!toggleBtn || !sidebar || !overlay) return;

        const toggleMenu = () => {
            const active = sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            toggleBtn.innerHTML = active ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
            toggleBtn.classList.toggle('menu-abierto',active);
            
        };


        toggleBtn.onclick = toggleMenu;
        overlay.onclick = toggleMenu;

        sidebar.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';

                toggleBtn.classList.remove('menu-abierto');
            });
        });
        sidebar.addEventListener('click', (e) => {
            const logoutBtn = e.target.closest('#sidebarLogoutBtn');
            if (logoutBtn) {
                e.preventDefault();
                e.stopPropagation();

                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';

                logout();
            }
        })

        cargarDatosUsuario();
    }

    // =============================================
    // CARGAR DATOS DEL USUARIO
    // =============================================
    function cargarDatosUsuario() {
        // Verificar si hay datos en localStorage
        let userData = null;
        let pNombre = null;
        let aPaterno = null;
        let rol = null;

        try {
            const fullData = localStorage.getItem('userFullData');
            if (fullData) {
                userData = JSON.parse(fullData);
                pNombre = userData.primer_nombre;
                aPaterno = userData.apellido_paterno;
                rol = userData.rol;
            }

            if (!pNombre) pNombre = localStorage.getItem('user_primer_nombre');
            if (!aPaterno) aPaterno = localStorage.getItem('user_apellido_paterno');
            if (!rol) rol = localStorage.getItem('user_rol');

        } catch (error) {
            console.error('Error leyendo datos:', error);
        }

        const userAction = document.getElementById('userActionDesktop');
        const userMovilAction = document.getElementById('userActionMovil');
        const sideUserName = document.getElementById('sideUserName');
        const sideUserRole = document.getElementById('sideUserRole');

        if (pNombre) {
            // Hay usuario logueado
            const initial = pNombre.charAt(0).toUpperCase();
            const fullName = aPaterno ? `${pNombre} ${aPaterno}` : pNombre;
            const userRole = rol ? rol.toUpperCase() : 'USUARIO';

            if (userAction && userMovilAction) {
                userAction.innerHTML = `
                    <div class="user-card-desktop">
                        <div class="avatar-mini">${initial}</div>
                        <div style="display:flex; flex-direction:column">
                            <span style="font-size:0.85rem; font-weight:700;">${fullName}</span>
                            <span style="font-size:0.65rem; opacity:0.7;">${userRole}</span>
                        </div>
                        <button class="desktop-logout-btn" id="desktopLogoutBtn">
                            <i class="fas fa-sign-out-alt"></i> Salir
                        </button>
                    </div>
                `;
                userMovilAction.innerHTML = ` 
                    <div style="padding: 20px;">
                        <button class="logout-btn" id="sidebarLogoutBtn">
                            <i class="fas fa-sign-in-alt"></i> Cerrar sesion
                        </button>
                    </div>`;

                const desktopLogoutBtn = document.getElementById('desktopLogoutBtn');
                if (desktopLogoutBtn) {
                    desktopLogoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        logout();
                    });
                }
            }

            if (sideUserName) sideUserName.textContent = fullName;
            if (sideUserRole) sideUserRole.textContent = userRole;

        } else {
            // No hay usuario - mostrar botón de login
            if (userAction && userMovilAction) {
                userAction.innerHTML = `
                 <div style="display:flex; gap:10px;">
                    <i class="fa-solid fa-user"></i>                    
                </div>
                `;
                userMovilAction.innerHTML = ` <div style="padding: 20px;">
                <a href="/user/visitor/login/login.html" style="text-decoration: none;">
                    <button class="login-btn">
                        <i class="fas fa-sign-in-alt"></i> Iniciar sesion
                    </button>
                </a>
            </div>`;
            }

            if (sideUserName) sideUserName.textContent = 'Invitado';
            if (sideUserRole) sideUserRole.textContent = 'VISITANTE';
        }
    }

    // =============================================
    // VERIFICAR SESIÓN EN FIREBASE
    // =============================================
    function verificarSesionFirebase() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged((user) => {
                console.log('🔔 Estado Firebase:', user ? 'logueado' : 'no logueado');

                // Si Firebase dice que no hay usuario pero hay datos en localStorage, limpiar
                if (!user) {
                    const hasData = localStorage.getItem('userFullData');
                    if (hasData) {
                        console.log('⚠️ Datos fantasma detectados, limpiando...');
                        localStorage.clear();
                        sessionStorage.clear();
                        cargarDatosUsuario();
                    }
                }
            });
        }
    }

    // =============================================
    // INICIAR TODO
    // =============================================
    function init() {
        addStyles();
        createNavbar();
        setupNavbar();
        setupCrossTabLogout();
        verificarSesionFirebase();

        // Verificar cada segundo
        setInterval(cargarDatosUsuario, 1000);

        // Al volver a la pestaña
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                cargarDatosUsuario();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();