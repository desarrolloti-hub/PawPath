class NavbarAdmin extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.render();
        this.toggleSidebar()
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

        .perfil img {
            width: 35px;
            height: 35px;
            border-radius: 50%;
        }

        @media(max-width: 780px) {
            .menu{
                margin-top: 25px;
            }
            .sidebar {
                left: -240px;
            }

            .sidebar.active {
                left: 0;
            }

            .main {
                margin-left: 0;
            }
        }
    </style>
        <div class="layout">
            <aside class="sidebar" id="sidebar">
                <ul class="menu">
                    <li><a href="#"><i class="fas fa-users"></i> Usuarios</a></li>
                    <li><a href="#"><i class="fas fa-paw"></i> Mascotas</a></li>
                    <li><a href="#"><i class="fas fa-stethoscope"></i> Veterinarios</a></li>
                    <li><a href="#"><i class="fas fa-chart-line"></i> Reportes</a></li>
                    <li><a href="#"><i class="fas fa-credit-card"></i> Suscripciones</a></li>
                </ul>
            </aside>
        <div class="main">
            <header class="navbar">
                <div class="logo" onclick="toggleSidebar()">
                    <img src="assets/images/PawPahtLogo.png" alt="Logo Pawpath">
                    <span>PawPath</span>
                </div>
                <div class="perfil">
                    <img src="" alt="foto de perfil">
                </div>
            </header>
        </div>
    </div>`;
    }
    toggleSidebar() {
        if (window.innerWidth <= 780) {
            document.getElementById("sidebar").classList.toggle("active")
        }
    }
}