// navbar-visitor-component.js
class NavbarVisitor extends HTMLElement {
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
                .navbar-visitor {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 2rem;
                    background: linear-gradient(135deg, #1A535C 0%, #4ECDC4 100%);
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
                }
                
                .btn-nav {
                    padding: 0.5rem 1.5rem;
                    border-radius: 20px;
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
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
                
                .mobile-toggle {
                    display: none;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                }
                
                @media (max-width: 768px) {
                    .nav-menu, .nav-actions {
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: #1A535C;
                        flex-direction: column;
                        padding: 1rem;
                        box-shadow: 0 5px 10px rgba(0,0,0,0.1);
                    }
                    
                    .nav-menu.show, .nav-actions.show {
                        display: flex;
                    }
                    
                    .mobile-toggle {
                        display: block;
                    }
                    
                    .nav-menu {
                        order: 3;
                        width: 100%;
                    }
                    
                    .nav-actions {
                        order: 2;
                        width: 100%;
                        justify-content: center;
                    }
                }
            </style>
            
            <nav class="navbar-visitor">
                <a href="#home" class="nav-brand">
                    <img src="assets/images/PawPahtLogo.png" alt="PawPath Logo">
                    <span>PawPath</span>
                </a>
                
                <button class="mobile-toggle" id="menuToggle">☰</button>
                
                <ul class="nav-menu" id="navMenu">
                    <li><a href="#home" class="active">Inicio</a></li>
                    <li><a href="#forum">Foro</a></li>
                    <li><a href="#map">Mapa</a></li>
                    <li><a href="#veterinarios">Veterinarios</a></li>
                    <li><a href="#planes">Planes</a></li>
                </ul>
                
                <div class="nav-actions" id="navActions">
                    <button class="btn-nav btn-login" onclick="window.location='#login'">Iniciar Sesión</button>
                    <button class="btn-nav btn-register" onclick="window.location='#register'">Registrarse</button>
                </div>
            </nav>
        `;
    }

    setupEventListeners() {
        const menuToggle = this.querySelector('#menuToggle');
        const navMenu = this.querySelector('#navMenu');
        const navActions = this.querySelector('#navActions');

        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('show');
            navActions.classList.toggle('show');
        });

        // Cerrar menú al hacer clic en un enlace
        const links = this.querySelectorAll('.nav-menu a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('show');
                navActions.classList.remove('show');
            });
        });

        // Cambiar enlace activo
        this.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', function() {
                this.parentElement.parentElement.querySelectorAll('a').forEach(a => {
                    a.classList.remove('active');
                });
                this.classList.add('active');
            });
        });
    }
}

customElements.define('navbar-visitor', NavbarVisitor);