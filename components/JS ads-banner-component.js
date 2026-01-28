// ads-banner-component.js
class AdsBanner extends HTMLElement {
    constructor() {
        super();
        this.currentAd = 0;
        this.ads = [
            {
                id: 1,
                type: "lost",
                title: "🐕 PERDIDO EN NEZA - BOBBY",
                desc: "Perrito desaparecido en Col. Vicente Villada",
                cta: "VER DETALLES",
                color: "#FF6B6B",
                textColor: "#FFFFFF",
                location: "Col. Vicente Villada, Neza",
                date: "Desaparecido hoy 10:30 AM",
                breed: "French Poodle",
                age: "2 años",
                collar: "Rojo con chapita",
                
            },
            {
                id: 2,
                type: "found",
                title: "🐈 GATO ENCONTRADO - NEZA CENTRO",
                desc: "Gatito encontrado cerca de Plaza Jardín",
                cta: "IDENTIFICAR",
                color: "#4ECDC4",
                textColor: "#000000",
                location: "Av. Adolfo López Mateos, Neza Centro",
                date: "Encontrado ayer 15:45 PM",
                breed: "Gato Callejero",
                age: "Aprox. 6 meses",
                features: "Blanco con manchas negras",
                condition: "Sano, necesita hogar"
            },
            {
                id: 3,
                type: "urgent",
                title: "🆘 PERRO HERIDO - COL. ÁGUILA",
                desc: "Necesita ayuda veterinaria urgente",
                cta: "AYUDAR",
                color: "#FFE66D",
                textColor: "#000000",
                location: "Col. El Águila, Nezahualcóyotl",
                date: "Reportado hace 2 horas",
                breed: "Mestizo",
                age: "Adulto",
                condition: "Herida en pata trasera",
                status: "Esperando rescate"
            },
            {
                id: 4,
                type: "lost",
                title: "🐦 LORO EXTRAVIADO - NEZA NORTE",
                desc: "Loro hablador salió volando",
                cta: "REPORTAR AVISTAMIENTO",
                color: "#FF6B6B",
                textColor: "#FFFFFF",
                location: "Col. Benito Juárez, Neza Norte",
                date: "Extraviado ayer por la tarde",
                breed: "Loro Amazónico",
                age: "3 años",
                features: "Verde con rojo en la cabeza",
                says: "Dice 'Hola' y 'paseme con 10'"
            }
        ];
    }

    connectedCallback() {
        this.render();
        this.startAdRotation();
    }

    render() {
        const ad = this.ads[this.currentAd];
        const typeIcons = {
            "lost": "🚨 PERDIDO",
            "found": "🎯 ENCONTRADO",
            "urgent": "🆘 URGENTE"
        };
        
        const typeBadges = {
            "lost": "bg-danger",
            "found": "bg-success",
            "urgent": "bg-warning"
        };
        
        this.innerHTML = `
            <style>
                .ad-banner {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.2rem;
                    margin: 0.8rem 1rem;
                    border-radius: 12px;
                    position: relative;
                    animation: slideIn 0.5s ease;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                    border-left: 6px solid ${ad.color};
                    background: linear-gradient(135deg, ${this.adjustColor(ad.color, 20)} 0%, ${ad.color} 100%);
                    color: ${ad.textColor};
                    font-family: 'Segoe UI', Arial, sans-serif;
                }
                
                @keyframes slideIn {
                    from { transform: translateY(-10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .ad-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.8rem;
                }
                
                .ad-badge {
                    background: rgba(0,0,0,0.25);
                    padding: 0.3rem 0.8rem;
                    border-radius: 15px;
                    font-size: 0.8rem;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .ad-location {
                    font-size: 0.8rem;
                    opacity: 0.9;
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                }
                
                .ad-content {
                    flex: 1;
                }
                
                .ad-content h4 {
                    margin: 0.5rem 0;
                    font-size: 1.1rem;
                    font-weight: 700;
                    line-height: 1.3;
                }
                
                .ad-content p {
                    margin: 0.5rem 0;
                    font-size: 0.95rem;
                    line-height: 1.4;
                }
                
                .ad-details {
                    margin-top: 0.8rem;
                    font-size: 0.85rem;
                    opacity: 0.9;
                }
                
                .ad-detail-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.3rem;
                }
                
                .ad-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    min-width: 150px;
                    margin-left: 1.5rem;
                }
                
                .ad-cta {
                    background: ${ad.type === 'lost' ? '#FFFFFF' : 'rgba(0,0,0,0.85)'};
                    color: ${ad.type === 'lost' ? '#FF6B6B' : '#FFFFFF'};
                    border: none;
                    padding: 0.8rem 1.2rem;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 0.9rem;
                    transition: all 0.3s;
                    white-space: nowrap;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                .ad-cta:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                }
                
                .ad-secondary {
                    background: transparent;
                    color: ${ad.textColor};
                    border: 2px solid ${ad.textColor};
                    padding: 0.6rem 1rem;
                    border-radius: 20px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.8rem;
                    transition: all 0.3s;
                }
                
                .ad-secondary:hover {
                    background: ${ad.textColor};
                    color: ${ad.color};
                }
                
                .ad-close {
                    position: absolute;
                    top: 0.8rem;
                    right: 0.8rem;
                    background: rgba(0,0,0,0.2);
                    color: ${ad.textColor};
                    border: none;
                    border-radius: 50%;
                    width: 25px;
                    height: 25px;
                    cursor: pointer;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.3s;
                }
                
                .ad-close:hover {
                    background: rgba(0,0,0,0.4);
                }
                
                .ad-indicators {
                    position: absolute;
                    bottom: 0.8rem;
                    right: 0.8rem;
                    display: flex;
                    gap: 0.4rem;
                }
                
                .ad-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.4);
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .ad-indicator.active {
                    background: ${ad.textColor};
                    transform: scale(1.2);
                }
                
                .neza-tag {
                    display: inline-block;
                    background: #FF4757;
                    color: white;
                    padding: 0.2rem 0.6rem;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: bold;
                    margin-left: 0.5rem;
                    vertical-align: middle;
                }
                
                @media (max-width: 768px) {
                    .ad-banner {
                        flex-direction: column;
                        text-align: left;
                        padding: 1rem;
                        margin: 0.5rem;
                    }
                    
                    .ad-actions {
                        width: 100%;
                        margin-left: 0;
                        margin-top: 1rem;
                        flex-direction: row;
                        justify-content: space-between;
                    }
                    
                    .ad-cta, .ad-secondary {
                        flex: 1;
                        margin: 0 0.3rem;
                    }
                    
                    .ad-indicators {
                        position: relative;
                        bottom: 0;
                        right: 0;
                        justify-content: center;
                        margin-top: 1rem;
                    }
                }
            </style>
            
            <div class="ad-banner" id="currentAd">
                <button class="ad-close" onclick="this.closeAd()">×</button>
                
                <div class="ad-content">
                    <div class="ad-header">
                        <span class="ad-badge">${typeIcons[ad.type] || '📢 ALERTA'}</span>
                        <span class="ad-location">📍 ${ad.location}</span>
                        <span class="neza-tag">NEZA</span>
                    </div>
                    
                    <h4>${ad.title}</h4>
                    <p>${ad.desc}</p>
                    
                    <div class="ad-details">
                        <div class="ad-detail-item">
                            <strong>📅</strong> ${ad.date}
                        </div>
                        <div class="ad-detail-item">
                            <strong>🐕‍🦺</strong> Raza: ${ad.breed} • ${ad.age}
                        </div>
                        ${ad.collar ? `
                        <div class="ad-detail-item">
                            <strong>🔴</strong> Collar: ${ad.collar}
                        </div>
                        ` : ''}
                        ${ad.features ? `
                        <div class="ad-detail-item">
                            <strong>👁️</strong> ${ad.features}
                        </div>
                        ` : ''}
                        ${ad.reward ? `
                        <div class="ad-detail-item" style="color: #FFE66D; font-weight: bold;">
                            <strong>💰</strong> ${ad.reward}
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="ad-actions">
                    <button class="ad-cta" onclick="this.handleAdAction(${ad.id}, '${ad.type}')">
                        ${ad.cta}
                    </button>
                    <button class="ad-secondary" onclick="this.shareReport(${ad.id})">
                        🔗 Compartir Reporte
                    </button>
                </div>
                
                <div class="ad-indicators">
                    ${this.ads.map((_, index) => 
                        `<div class="ad-indicator ${index === this.currentAd ? 'active' : ''}" 
                              onclick="this.showAd(${index})"></div>`
                    ).join('')}
                </div>
            </div>
        `;

        // Configurar eventos
        this.querySelector('.ad-cta').addEventListener('click', () => this.handleAdAction(ad.id, ad.type));
        this.querySelector('.ad-secondary').addEventListener('click', () => this.shareReport(ad.id));
        this.querySelector('.ad-close').addEventListener('click', () => this.closeAd());
        
        const indicators = this.querySelectorAll('.ad-indicator');
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.showAd(index));
        });
    }

    adjustColor(color, amount) {
        // Aclarar el color para el gradiente
        let usePound = false;
        if (color[0] === "#") {
            color = color.slice(1);
            usePound = true;
        }
        const num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        if (r > 255) r = 255;
        else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amount;
        if (b > 255) b = 255;
        else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amount;
        if (g > 255) g = 255;
        else if (g < 0) g = 0;
        return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
    }

    showAd(index) {
        this.currentAd = index;
        this.render();
        this.resetRotation();
    }

    startAdRotation() {
        this.rotationInterval = setInterval(() => {
            this.currentAd = (this.currentAd + 1) % this.ads.length;
            this.render();
        }, 12000); // Cambia cada 12 segundos
    }

    resetRotation() {
        clearInterval(this.rotationInterval);
        this.startAdRotation();
    }

    handleAdAction(adId, type) {
        const ad = this.ads.find(a => a.id === adId);
        const actions = {
            'lost': `Mostrando detalles del perrito perdido:\n\n📍 ${ad.location}\n📅 ${ad.date}\n🐕 ${ad.breed} - ${ad.age}\n${ad.reward ? ad.reward : ''}\n\n¿Has visto a este perrito?`,
            'found': `Información del animal encontrado:\n\n📍 ${ad.location}\n📅 ${ad.date}\n🐈 ${ad.breed}\n${ad.features ? ad.features : ''}\n\n¿Es tu mascota?`,
            'urgent': `🚨 CASO URGENTE 🚨\n\n📍 ${ad.location}\n📅 ${ad.date}\n🐕 ${ad.breed}\n${ad.condition}\n\n¿Puedes ayudar?`
        };
        
        alert(actions[type] || 'Mostrando detalles del reporte...');
        
        // En producción, redirigiría a la página de detalles
        // window.location.href = `/reporte/${adId}`;
    }

    shareReport(adId) {
        const ad = this.ads.find(a => a.id === adId);
        const shareText = `🚨 Reporte de mascota en Nezahualcóyotl:\n\n${ad.title}\n${ad.desc}\n📍 ${ad.location}\n📅 ${ad.date}\n\nAyuda a compartir esta información. #PawPathNeza #MascotasPerdidas`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Reporte de Mascota - PawPath',
                text: shareText,
                url: window.location.href
            }).then(() => {
                console.log('Reporte compartido exitosamente');
            }).catch(console.error);
        } else {
            // Fallback para navegadores sin Web Share API
            navigator.clipboard.writeText(shareText).then(() => {
                alert('📋 Reporte copiado al portapapeles. ¡Compártelo en tus redes sociales!');
            }).catch(() => {
                alert(shareText + '\n\n(Copia este mensaje para compartir)');
            });
        }
    }

    closeAd() {
        this.style.display = 'none';
        clearInterval(this.rotationInterval);
    }

    disconnectedCallback() {
        clearInterval(this.rotationInterval);
    }
}

// Hacer métodos accesibles globalmente
AdsBanner.prototype.handleAdAction = function(adId, type) {
    const ad = this.ads.find(a => a.id === adId);
    alert(`Reporte de ${type === 'lost' ? 'mascota perdida' : type === 'found' ? 'mascota encontrada' : 'caso urgente'}:\n\n${ad.title}\n${ad.location}`);
};

AdsBanner.prototype.shareReport = function(adId) {
    alert(`Compartiendo reporte #${adId}... ¡Ayuda a difundir la información!`);
};

AdsBanner.prototype.closeAd = function() {
    this.style.display = 'none';
    clearInterval(this.rotationInterval);
};

AdsBanner.prototype.showAd = function(index) {
    this.currentAd = index;
    this.render();
    this.resetRotation();
};

customElements.define('ads-banner', AdsBanner);