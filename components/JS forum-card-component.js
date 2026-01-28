// forum-card-component.js
class ForumCard extends HTMLElement {
    constructor() {
        super();
    }
    
    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }
    
    static get observedAttributes() {
        return ['data-post'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'data-post' && oldValue !== newValue) {
            this.render();
        }
    }
    
    render() {
        let post;
        try {
            post = JSON.parse(this.getAttribute('data-post') || '{}');
        } catch (e) {
            post = {};
        }
        
        const typeColors = {
            'lost': { bg: '#FF6B6B', text: '#FFFFFF' },
            'found': { bg: '#4ECDC4', text: '#000000' },
            'rescue': { bg: '#FFE66D', text: '#000000' },
            'default': { bg: '#6C757D', text: '#FFFFFF' }
        };
        
        const typeLabels = {
            'lost': '🐕 Perdido',
            'found': '🐈 Encontrado',
            'rescue': '🆘 Necesita Rescate',
            'default': '📝 Publicación'
        };
        
        const type = post.type || 'default';
        const colors = typeColors[type] || typeColors.default;
        const label = typeLabels[type] || typeLabels.default;
        
        this.innerHTML = `
            <style>
                .forum-card {
                    background: white;
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .forum-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
                }
                
                .forum-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.8rem 1rem;
                    font-weight: bold;
                    font-size: 0.9rem;
                }
                
                .forum-type {
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                }
                
                .forum-date {
                    background: rgba(255,255,255,0.2);
                    padding: 0.2rem 0.5rem;
                    border-radius: 10px;
                    font-size: 0.8rem;
                }
                
                .forum-image {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                    display: block;
                }
                
                .forum-card-body {
                    padding: 1rem;
                    flex-grow: 1;
                }
                
                .forum-card-body h4 {
                    color: #1A535C;
                    margin-bottom: 0.5rem;
                    font-size: 1.2rem;
                }
                
                .forum-location {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #6C757D;
                    font-size: 0.9rem;
                    margin-bottom: 0.8rem;
                }
                
                .forum-description {
                    color: #333;
                    font-size: 0.95rem;
                    line-height: 1.5;
                    margin-bottom: 1rem;
                }
                
                .forum-card-footer {
                    padding: 1rem;
                    border-top: 1px solid #eee;
                    display: flex;
                    gap: 0.5rem;
                }
                
                .btn-forum {
                    flex: 1;
                    padding: 0.6rem;
                    border: none;
                    border-radius: 20px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-size: 0.9rem;
                }
                
                .btn-contact {
                    background: #4ECDC4;
                    color: white;
                }
                
                .btn-contact:hover {
                    background: #3db9b0;
                    transform: translateY(-2px);
                }
                
                .btn-report {
                    background: transparent;
                    color: #6C757D;
                    border: 1px solid #6C757D;
                }
                
                .btn-report:hover {
                    background: #f8f9fa;
                }
                
                .btn-share {
                    background: #FFE66D;
                    color: #000;
                }
                
                .btn-share:hover {
                    background: #ffdd44;
                }
            </style>
            
            <div class="forum-card">
                <div class="forum-card-header" style="background: ${colors.bg}; color: ${colors.text}">
                    <span class="forum-type">${label}</span>
                    <span class="forum-date">${post.date || 'Reciente'}</span>
                </div>
                
                <img src="${post.image || 'https://via.placeholder.com/400x250/CCCCCC/FFFFFF?text=Sin+imagen'}" 
                     alt="${post.animal || 'Animal'}" 
                     class="forum-image"
                     onerror="this.src='https://via.placeholder.com/400x250/CCCCCC/FFFFFF?text=Imagen+no+disponible'">
                
                <div class="forum-card-body">
                    <h4>${post.animal || 'Animal'} - ${post.breed || 'Sin raza específica'}</h4>
                    
                    <div class="forum-location">
                        <span>📍</span>
                        <span>${post.location || 'Ubicación no especificada'}</span>
                    </div>
                    
                    <p class="forum-description">
                        ${post.description || 'Sin descripción disponible.'}
                    </p>
                </div>
                
                <div class="forum-card-footer">
                    <button class="btn-forum btn-contact" onclick="this.contactOwner('${post.id || ''}')">
                        ✉️ Contactar
                    </button>
                    <button class="btn-forum btn-report" onclick="this.reportPost('${post.id || ''}')">
                        ⚠️ Reportar
                    </button>
                    <button class="btn-forum btn-share" onclick="this.sharePost('${post.id || ''}')">
                        🔗 Compartir
                    </button>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Los event listeners se configuran en los botones con onclick
    }
    
    // Métodos para los botones
    contactOwner(postId) {
        if (postId) {
            alert(`Contactando al dueño de la publicación ${postId}...`);
        } else {
            alert('Contactando al dueño...\nEn una implementación real, esto abriría un chat o mostraría información de contacto.');
        }
    }
    
    reportPost(postId) {
        const reason = prompt('¿Por qué quieres reportar esta publicación?\n1. Contenido inapropiado\n2. Información falsa\n3. Otro');
        if (reason) {
            alert(`Publicación ${postId || ''} reportada por: ${reason}\nEl administrador revisará el contenido.`);
            // Aquí enviarías el reporte al backend
        }
    }
    
    sharePost(postId) {
        if (navigator.share) {
            navigator.share({
                title: 'Mira esta publicación de PawPath',
                text: 'Encontré esta publicación en PawPath, puede que te interese',
                url: window.location.href + '#post=' + (postId || '')
            });
        } else {
            alert('Enlace copiado al portapapeles');
            // Fallback para navegadores que no soportan Web Share API
        }
    }
}

// Hacer métodos accesibles globalmente
ForumCard.prototype.contactOwner = function(postId) {
    if (postId) {
        alert(`Contactando al dueño de la publicación ${postId}...`);
    } else {
        alert('Contactando al dueño...');
    }
};

ForumCard.prototype.reportPost = function(postId) {
    const reason = prompt('¿Por qué quieres reportar esta publicación?\n1. Contenido inapropiado\n2. Información falsa\n3. Otro');
    if (reason) {
        alert(`Publicación ${postId || ''} reportada. Gracias por tu colaboración.`);
    }
};

ForumCard.prototype.sharePost = function(postId) {
    alert(`Compartiendo publicación ${postId || ''}...`);
};

customElements.define('forum-card', ForumCard);