// components/FooterVisitor.js
class FooterVisitor extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        // Verificar si la imagen existe
        const imagePath = '/assets/images/PawPahtLogo.png';
        const img = new Image();
        img.onerror = () => {
            console.warn('Logo image not found, using fallback');
        };
        img.src = imagePath;

        this.innerHTML = `
            <style>
                .main-footer {
                    background: #33105c;
                    background: linear-gradient(90deg, rgba(51, 16, 92, 1) 20%, rgba(9, 9, 121, 1) 58%, rgba(0, 140, 255, 1) 100%);
                    color: white;
                    padding: 50px 20px 20px;
                    margin-top: 80px;
                }
                
                .footer-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 40px;
                }
                
                .footer-section {
                    margin-bottom: 30px;
                }
                
                .footer-logo {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .footer-logo img {
                    height: 50px;
                    width: 50px;
                    border-radius: 50%;
                    border: 2px solid white;
                }
                
                .footer-logo h3 {
                    font-size: 1.8rem;
                    margin: 0;
                    color: #4ECDC4;
                }
                
                .footer-section p {
                    line-height: 1.6;
                    color: #BDEDFF;
                    font-size: 0.95rem;
                }
                
                .footer-section h4 {
                    color: #4ECDC4;
                    margin-bottom: 20px;
                    font-size: 1.2rem;
                    border-bottom: 2px solid rgba(78, 205, 196, 0.3);
                    padding-bottom: 10px;
                }
                
                .footer-links {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .footer-links li {
                    margin-bottom: 12px;
                }
                
                .footer-links a {
                    color: #BDEDFF;
                    text-decoration: none;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .footer-links a:hover {
                    color: #4ECDC4;
                    transform: translateX(5px);
                }
                
                .contact-info {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .contact-info li {
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #BDEDFF;
                }
                
                .social-links {
                    display: flex;
                    gap: 15px;
                    margin-top: 20px;
                }
                
                .social-link {
                    width: 40px;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    text-decoration: none;
                    transition: all 0.3s;
                    font-size: 1.2rem;
                }
                
                .social-link:hover {
                    background: #4ECDC4;
                    transform: translateY(-3px);
                }
                
                .footer-bottom {
                    max-width: 1200px;
                    margin: 50px auto 0;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    text-align: center;
                    color: #BDEDFF;
                    font-size: 0.9rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                }
                
                .pwa-badge {
                    background: rgba(78, 205, 196, 0.2);
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-weight: bold;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                
                @media (max-width: 768px) {
                    .footer-content {
                        grid-template-columns: 1fr;
                    }
                    
                    .footer-bottom {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .footer-logo {
                        justify-content: center;
                    }
                }
            </style>
            
            <footer class="main-footer">
                <div class="footer-content">
                    <div class="footer-section">
                        <div class="footer-logo">
                            <img src="/assets/images/PawPahtLogo.png" alt="PawPath Logo">
                            <h3>PawPath</h3>
                        </div>
                        <p>Plataforma PWA para el cuidado, rescate y bienestar de animales domésticos. Conectamos dueños, veterinarios y rescatistas.</p>
                        <div class="social-links">
                            <a href="#" class="social-link" title="Facebook">📘</a>
                            <a href="#" class="social-link" title="Instagram">📷</a>
                            <a href="#" class="social-link" title="Twitter">🐦</a>
                            <a href="#" class="social-link" title="YouTube">▶️</a>
                        </div>
                    </div>
                    
                    <div class="footer-section">
                        <h4>Enlaces Rápidos</h4>
                        <ul class="footer-links">
                            <li><a href="#forum">🐾 Foro de Rescate</a></li>
                            <li><a href="#map">🗺️ Mapa de Ayuda</a></li>
                            <li><a href="/user/veterinario/formVeterinario/formVeterinario.html">🏥 Veterinarios</a></li>
                            <li><a href="#subscriptions">💰 Planes y Precios</a></li>
                            <li><a href="#donations">💚 Donaciones</a></li>
                            <li><a href="#volunteer">🙋 Voluntariado</a></li>
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <h4>Recursos</h4>
                        <ul class="footer-links">
                            <li><a href="#blog">📝 Blog de Cuidado</a></li>
                            <li><a href="#guides">📚 Guías de Salud</a></li>
                            <li><a href="#emergency">🚨 Emergencias</a></li>
                            <li><a href="#adoption">🏠 Adopciones</a></li>
                            <li><a href="#training">🎓 Entrenamiento</a></li>
                            <li><a href="#faq">❓ Preguntas Frecuentes</a></li>
                        </ul>
                    </div>
                    
                    <div class="footer-section">
                        <h4>Contacto</h4>
                        <ul class="contact-info">
                            <li>
                                <span>📧</span>
                                <div>
                                    <strong>Correo:</strong><br>
                                    <a href="mailto:info@pawpath.com" style="color: #BDEDFF;">info@pawpath.com</a>
                                </div>
                            </li>
                            <li>
                                <span>📞</span>
                                <div>
                                    <strong>Teléfono:</strong><br>
                                    +1 (234) 567-890
                                </div>
                            </li>
                            <li>
                                <span>📍</span>
                                <div>
                                    <strong>Dirección:</strong><br>
                                    Calle Animales 123, Ciudad
                                </div>
                            </li>
                            <li>
                                <span>🕒</span>
                                <div>
                                    <strong>Horario:</strong><br>
                                    Lunes a Viernes: 9am - 6pm
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div class="footer-bottom">
                    <div>
                        <span class="pwa-badge">📱 PWA - Instala nuestra app</span>
                    </div>
                    <div>
                        © 2024 PawPath. Todos los derechos reservados.
                    </div>
                    <div>
                        <a href="#privacy" style="color: #BDEDFF; margin-right: 15px;">Política de Privacidad</a>
                        <a href="#terms" style="color: #BDEDFF;">Términos de Servicio</a>
                    </div>
                </div>
            </footer>
        `;
        
        this.setupPWAInstall();
    }
    
    setupPWAInstall() {
        // Tu código existente con un pequeño fix
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Verificar que el elemento existe antes de manipularlo
            const pwaBadge = this.querySelector('.pwa-badge');
            if (pwaBadge) {
                const installBtn = document.createElement('button');
                installBtn.innerHTML = '📲 Instalar App';
                installBtn.style.cssText = `
                    background: #4ECDC4;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-weight: bold;
                    margin-left: 10px;
                    transition: all 0.3s;
                    border: none;
                `;
                
                installBtn.onclick = async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        console.log(`User response: ${outcome}`);
                        deferredPrompt = null;
                        installBtn.style.display = 'none';
                    }
                };
                
                pwaBadge.appendChild(installBtn);
            }
        });
    }
}

customElements.define('main-footer', FooterVisitor);

