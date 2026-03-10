class NavbarAdmin extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.innerHTML = `
        <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .layout {
            display: flex;
        }

        .sidebar {
            width: 240px;
            height: 100vh;
            background: white;
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.05);
            padding: 30px 20px;
            position: fixed;
            transition: 0.3s ease;
        }

        .menu {
            list-style: none;
        }

        .menu li {
            margin-bottom: 15px;
        }

        .menu a {
            text-decoration: none;
            color: #444;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            border-radius: 10px;
            transition: 0.3s;
        }

        .menu a:hover {
            background-color: #e8f5e9;
            color: #2e7d32;
        }

        .main {
            margin-left: 240px;
            width: 100%;
            transition: 0.3s;
        }

        .navbar {
            height: 70px;
            background: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 30px;
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }

        .logo img {
            width: 40px;
            z-index: 10;
        }

        .logo span {
            font-weight: bold;
            font-size: 18px;
            z-index: 10;
        }

        .mobile-toggle {
            display: none;
            background: none;
            border: none;
            font-size: 1.8rem;
            cursor: pointer;
            color: #444;
        }

        @media(max-width: 780px) {

            .sidebar {
                left: -240px;
            }

            .sidebar.active {
                left: 0;
            }

            .main {
                margin-left: 0;
            }

            .mobile-toggle {
                display: block;
            }
            .menu{
                margin-top: 55px;
            }
        }
        </style>

        <div class="layout">
            
            <aside class="sidebar" id="sidebar">
                <ul class="menu">
                    <li class="logo">
                        <img src="/assets/images/PawPahtLogo.png" alt="Logo Pawpath">
                        <span>PawPath</span>
                    </li>
                    <hr>
                    <li><a href="/user/administrator/dashAdmin/dashboard.html">🏠 Inicio</a></li>
                    <li><a href="/user/administrator/GestionUsuarios/admin_usuarios.html">👥 Usuarios</a></li>
                    <li><a href="/user/administrator/GestionMascotas/admin_mascotas.html">🐾 Mascotas</a></li>
                    <li><a href="/user/administrator/GestionVeterinarios/admin_veterinarios.html">🩺 Veterinarios</a></li>
                    <li><a href="#">📊 Reportes</a></li>
                    <li><a href="#">💳 Suscripciones</a></li>
                </ul>
            </aside>

            <div class="main">
                <div class="navbar">
                    <button class="mobile-toggle" id="menuToggle">☰</button>
                    <h3>Panel Administrador</h3>
                </div>
            </div>

        </div>
        `;
    }

    setupEventListeners() {
        const menuToggle = this.querySelector('#menuToggle');
        const sidebar = this.querySelector('#sidebar');
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        const links = this.querySelectorAll('.menu a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('active');
            });
        });

        // Link activo
        this.querySelectorAll('.menu a').forEach(link => {
            link.addEventListener('click', function () {
                this.closest('.menu')
                    .querySelectorAll('a')
                    .forEach(a => a.classList.remove('active'));

                this.classList.add('active');
            });
        });
    }
}

customElements.define('navbar-admin', NavbarAdmin);