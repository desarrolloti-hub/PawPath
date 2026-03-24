// forum-card-component.js
import { db, auth } from '/config/firebase-config.js';
import { 
    collection, 
    query, 
    getDocs, 
    doc, 
    updateDoc, 
    increment, 
    arrayUnion, 
    arrayRemove,
    orderBy,
    limit,
    where
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

// Componente para una sola card
class ForumCard extends HTMLElement {
    constructor() {
        super();
        this.post = null;
        this.usuarioActual = null;
    }
    
    connectedCallback() {
        this.escucharAuth();
        const dataPost = this.getAttribute('data-post');
        if (dataPost) {
            try {
                this.post = JSON.parse(dataPost);
                this.render();
            } catch(e) {
                console.error('Error parsing post:', e);
            }
        }
    }
    
    static get observedAttributes() {
        return ['data-post'];
    }
    
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'data-post' && oldValue !== newValue && newValue) {
            try {
                this.post = JSON.parse(newValue);
                this.render();
            } catch (e) {
                console.error('Error:', e);
            }
        }
    }
    
    async escucharAuth() {
        auth.onAuthStateChanged((user) => {
            this.usuarioActual = user;
            if (this.post) this.render();
        });
    }
    
    formatearFecha(fecha) {
        if (!fecha) return 'Reciente';
        
        let fechaObj;
        if (fecha && typeof fecha.toDate === 'function') {
            fechaObj = fecha.toDate();
        } else if (fecha && fecha.seconds) {
            fechaObj = new Date(fecha.seconds * 1000);
        } else if (typeof fecha === 'string') {
            fechaObj = new Date(fecha);
        } else {
            return 'Reciente';
        }
        
        const ahora = new Date();
        const diffHoras = Math.floor((ahora - fechaObj) / (1000 * 60 * 60));
        
        if (diffHoras < 1) return 'Hace unos minutos';
        if (diffHoras < 24) return 'Hace ' + diffHoras + ' horas';
        if (diffHoras < 48) return 'Ayer';
        return 'Hace ' + Math.floor(diffHoras / 24) + ' dias';
    }
    
    getCategoriaIcon(categoria) {
        const icons = {
            'Perros': 'fa-dog',
            'Gatos': 'fa-cat',
            'Aves': 'fa-dove',
            'Roedores': 'fa-mouse',
            'Reptiles': 'fa-lizard',
            'Otros': 'fa-paw'
        };
        return icons[categoria] || 'fa-paw';
    }
    
    getTipoStyles(tipo) {
        const styles = {
            'Mascota Perdida': { bg: '#ef4444', text: '#ffffff', label: 'Perdido', icon: 'fa-search' },
            'Mascota Encontrada': { bg: '#10b981', text: '#ffffff', label: 'Encontrado', icon: 'fa-check-circle' },
            'En Adopción': { bg: '#f59e0b', text: '#ffffff', label: 'En Adopcion', icon: 'fa-home' },
            'Consejo de Cuidado': { bg: '#3b82f6', text: '#ffffff', label: 'Consejo', icon: 'fa-lightbulb' },
            'Galería de Fotos': { bg: '#8b5cf6', text: '#ffffff', label: 'Galeria', icon: 'fa-images' }
        };
        return styles[tipo] || { bg: '#64748b', text: '#ffffff', label: 'Publicacion', icon: 'fa-paw' };
    }
    
    getDefaultImage() {
        return 'https://via.placeholder.com/400x250/CCCCCC/FFFFFF?text=PawPath';
    }
    
    escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    render() {
        if (!this.post) {
            this.innerHTML = '<div style="padding:20px;text-align:center;">Sin datos</div>';
            return;
        }
        
        const tipoStyles = this.getTipoStyles(this.post.tipo);
        const categoriaIcon = this.getCategoriaIcon(this.post.categoria);
        const fechaFormateada = this.formatearFecha(this.post.fechaPublicacion);
        const foto = (this.post.fotos && this.post.fotos[0]) ? this.post.fotos[0] : this.getDefaultImage();
        const isLiked = this.usuarioActual && this.post.usuariosLike && this.post.usuariosLike.indexOf(this.usuarioActual.uid) !== -1;
        
        let nombreUsuario = 'Anonimo';
        if (this.post.usuarioNombre) {
            nombreUsuario = this.post.usuarioNombre;
        }
        
        const ubicacionHtml = this.post.ubicacionTexto ? '<div class="forum-location"><i class="fas fa-map-marker-alt"></i><span>' + this.escapeHtml(this.post.ubicacionTexto) + '</span></div>' : '';
        
        const recompensaHtml = this.post.recompensa ? '<div class="forum-recompensa"><i class="fas fa-trophy"></i><strong>Recompensa:</strong> ' + this.escapeHtml(this.post.recompensa) + '</div>' : '';
        
        this.innerHTML = 
            '<div class="publicacion-card" onclick="window.location.href=\'/user/visitor/foro/detallesforo.html?id=' + this.post.id + '\'">' +
                '<div class="publicacion-imagen">' +
                    '<img src="' + foto + '" alt="' + this.escapeHtml(this.post.titulo) + '" onerror="this.src=\'' + this.getDefaultImage() + '\'">' +
                    '<span class="publicacion-tipo" style="background: ' + tipoStyles.bg + ';">' + tipoStyles.label + '</span>' +
                '</div>' +
                '<div class="publicacion-contenido">' +
                    '<div class="publicacion-metadata">' +
                        '<span class="publicacion-categoria"><i class="fas ' + categoriaIcon + '"></i> ' + (this.post.categoria || 'Mascota') + '</span>' +
                        '<span class="publicacion-tiempo"><i class="far fa-clock"></i> ' + fechaFormateada + '</span>' +
                    '</div>' +
                    '<h3 class="publicacion-titulo">' + this.escapeHtml(this.post.titulo) + '</h3>' +
                    '<p class="publicacion-descripcion">' + this.escapeHtml((this.post.descripcion || '').substring(0, 120)) + ((this.post.descripcion && this.post.descripcion.length > 120) ? '...' : '') + '</p>' +
                    ubicacionHtml +
                    recompensaHtml +
                    '<div class="publicacion-footer">' +
                        '<div class="publicacion-estadisticas">' +
                            '<span onclick="event.stopPropagation(); window.forumCardIncrementarVista(\'' + this.post.id + '\')" title="Vistas"><i class="far fa-eye"></i> ' + (this.post.vistas || 0) + '</span>' +
                            '<span onclick="event.stopPropagation(); window.forumCardToggleLike(\'' + this.post.id + '\', ' + isLiked + ')" style="cursor:pointer; color: ' + (isLiked ? '#ef4444' : 'inherit') + '"><i class="' + (isLiked ? 'fas' : 'far') + ' fa-heart"></i> ' + (this.post.likes || 0) + '</span>' +
                            '<span onclick="event.stopPropagation(); window.location.href=\'/user/visitor/foro/detallesforo.html?id=' + this.post.id + '\'"><i class="far fa-comment"></i> ' + (this.post.comentarios || 0) + '</span>' +
                        '</div>' +
                        '<div class="publicacion-usuario"><i class="fas fa-user-circle"></i> ' + this.escapeHtml(nombreUsuario) + '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }
}

// Componente para el listado de publicaciones
class ForumList extends HTMLElement {
    constructor() {
        super();
        this.publicaciones = [];
        this.filtros = {
            tipo: '',
            categoria: '',
            orden: 'reciente'
        };
    }
    
    connectedCallback() {
        this.cargarPublicaciones();
    }
    
    async cargarPublicaciones() {
        this.innerHTML = '<div class="loading" style="display:flex;"><div class="spinner"></div><p>Cargando publicaciones...</p></div>';
        
        try {
            const pubsRef = collection(db, 'publicaciones');
            let q;
            
            // Aplicar filtros
            if (this.filtros.tipo && this.filtros.categoria) {
                q = query(pubsRef, where('tipo', '==', this.filtros.tipo), where('categoria', '==', this.filtros.categoria), orderBy('fechaPublicacion', 'desc'));
            } else if (this.filtros.tipo) {
                q = query(pubsRef, where('tipo', '==', this.filtros.tipo), orderBy('fechaPublicacion', 'desc'));
            } else if (this.filtros.categoria) {
                q = query(pubsRef, where('categoria', '==', this.filtros.categoria), orderBy('fechaPublicacion', 'desc'));
            } else {
                q = query(pubsRef, orderBy('fechaPublicacion', 'desc'));
            }
            
            const querySnapshot = await getDocs(q);
            this.publicaciones = [];
            
            querySnapshot.forEach((doc) => {
                this.publicaciones.push({ id: doc.id, ...doc.data() });
            });
            
            this.renderPublicaciones();
            
        } catch (error) {
            console.error('Error cargando:', error);
            this.innerHTML = '<div class="sin-resultados"><i class="fas fa-exclamation-triangle"></i><h3>Error al cargar</h3><button onclick="location.reload()">Reintentar</button></div>';
        }
    }
    
    renderPublicaciones() {
        if (this.publicaciones.length === 0) {
            this.innerHTML = '<div class="sin-resultados"><i class="fas fa-search"></i><h3>No hay publicaciones</h3><p>Se el primero en compartir algo</p><a href="/user/visitor/FormualrioForo/FormularioForo.html" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> Crear publicacion</a></div>';
            return;
        }
        
        const grid = document.createElement('div');
        grid.className = 'publicaciones-grid';
        
        for (let i = 0; i < this.publicaciones.length; i++) {
            const card = document.createElement('forum-card');
            card.setAttribute('data-post', JSON.stringify(this.publicaciones[i]));
            grid.appendChild(card);
        }
        
        this.innerHTML = '';
        this.appendChild(grid);
    }
    
    // Métodos para filtros
    filtrarPorTipo(tipo) {
        this.filtros.tipo = tipo;
        this.cargarPublicaciones();
    }
    
    filtrarPorCategoria(categoria) {
        this.filtros.categoria = categoria;
        this.cargarPublicaciones();
    }
    
    limpiarFiltros() {
        this.filtros = { tipo: '', categoria: '', orden: 'reciente' };
        this.cargarPublicaciones();
    }
}

// Componente para las últimas 3 publicaciones (para el dashboard)
class ForumUltimas extends HTMLElement {
    constructor() {
        super();
        this.publicaciones = [];
    }
    
    connectedCallback() {
        this.cargarUltimas();
    }
    
    async cargarUltimas() {
        this.innerHTML = '<div class="loading" style="display:flex; padding:20px;"><div class="spinner"></div><p>Cargando...</p></div>';
        
        try {
            const pubsRef = collection(db, 'publicaciones');
            const q = query(pubsRef, orderBy('fechaPublicacion', 'desc'), limit(3));
            const querySnapshot = await getDocs(q);
            this.publicaciones = [];
            
            querySnapshot.forEach((doc) => {
                this.publicaciones.push({ id: doc.id, ...doc.data() });
            });
            
            if (this.publicaciones.length === 0) {
                this.innerHTML = '<div style="text-align:center;padding:20px;"><p>No hay publicaciones recientes</p></div>';
                return;
            }
            
            const container = document.createElement('div');
            container.style.cssText = 'display:flex;flex-direction:column;gap:20px;';
            
            for (let i = 0; i < this.publicaciones.length; i++) {
                const card = document.createElement('forum-card');
                card.setAttribute('data-post', JSON.stringify(this.publicaciones[i]));
                container.appendChild(card);
            }
            
            this.innerHTML = '';
            this.appendChild(container);
            
        } catch (error) {
            console.error('Error:', error);
            this.innerHTML = '<div style="text-align:center;padding:20px;"><p>Error al cargar</p></div>';
        }
    }
}

// Funciones globales
window.forumCardIncrementarVista = async function(postId) {
    try {
        const docRef = doc(db, 'publicaciones', postId);
        await updateDoc(docRef, { vistas: increment(1) });
    } catch (e) {
        console.error('Error:', e);
    }
};

window.forumCardToggleLike = async function(postId, currentlyLiked) {
    if (!auth.currentUser) {
        Swal.fire({
            title: "Inicia sesion",
            text: "Debes iniciar sesion para dar like",
            icon: "warning",
            confirmButtonText: "Iniciar sesion",
            showCancelButton: true,
            confirmButtonColor: "#3b82f6"
        }).then((result) => {
            if (result.isConfirmed) window.location.href = "/login.html";
        });
        return;
    }
    
    try {
        const docRef = doc(db, 'publicaciones', postId);
        await updateDoc(docRef, {
            likes: increment(currentlyLiked ? -1 : 1),
            usuariosLike: currentlyLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
        });
        
        const event = new CustomEvent('likeUpdated', { detail: { postId, liked: !currentlyLiked } });
        window.dispatchEvent(event);
        
    } catch (e) {
        console.error('Error:', e);
        Swal.fire("Error", "No se pudo procesar tu like", "error");
    }
};

// Registrar componentes
customElements.define('forum-card', ForumCard);
customElements.define('forum-list', ForumList);
customElements.define('forum-ultimas', ForumUltimas);

export { ForumCard, ForumList, ForumUltimas };