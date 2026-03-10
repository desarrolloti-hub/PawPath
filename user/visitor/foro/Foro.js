import { db, auth } from '/config/firebase-config.js';
import FormularioForo from '/classes/FormularioForo.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    updateDoc, 
    increment, 
    arrayUnion, 
    arrayRemove,
    orderBy,
    getCountFromServer 
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

class ControladorForo {
    constructor() {
        this.publicacionesGrid = document.getElementById('publicacionesGrid');
        this.loading = document.getElementById('loading');
        this.sinResultados = document.getElementById('sinResultados');
        this.cargarMasContainer = document.getElementById('cargarMasContainer');
        this.btnCargarMas = document.getElementById('btnCargarMas');
        
        // Selectores de Filtros
        this.filtroTipo = document.getElementById('filtroTipo');
        this.filtroCategoria = document.getElementById('filtroCategoria');
        this.filtroOrden = document.getElementById('filtroOrden');
        this.btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
        this.btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
        
        this.publicaciones = [];
        this.usuarioActual = null;
        this.ultimoDoc = null;

        // Exponer instancia para eventos onclick en el HTML dinámico
        window.controlador = this;
        
        this.inicializar();
    }
    
    async inicializar() {
        this.escucharAuth();
        this.configurarEventos();
        await this.cargarEstadisticasSidebar();
        await this.cargarPublicaciones();
    }

    escucharAuth() {
        auth.onAuthStateChanged((user) => {
            this.usuarioActual = user;
            if (this.publicaciones.length > 0) this.renderizarPublicaciones();
        });
    }

    async cargarEstadisticasSidebar() {
        try {
            const pubsRef = collection(db, 'publicaciones');
            const snapTotal = await getCountFromServer(pubsRef);
            
            if(document.getElementById('statsPublicaciones')) {
                document.getElementById('statsPublicaciones').textContent = snapTotal.data().count;
            }
        } catch (error) {
            console.error("Error en estadísticas:", error);
        }
    }
    
    configurarEventos() {
        if (this.btnAplicarFiltros) this.btnAplicarFiltros.addEventListener('click', () => this.aplicarFiltros());
        if (this.btnLimpiarFiltros) this.btnLimpiarFiltros.addEventListener('click', () => this.limpiarFiltros());
        if (this.btnCargarMas) this.btnCargarMas.addEventListener('click', () => this.cargarPublicaciones());
        
        // Toggle de filtros
        const btnFiltros = document.getElementById('btnFiltros');
        const panelFiltros = document.getElementById('panelFiltros');
        if (btnFiltros && panelFiltros) {
            btnFiltros.addEventListener('click', () => {
                panelFiltros.style.display = panelFiltros.style.display === 'none' ? 'block' : 'none';
            });
        }
    }

    async aplicarFiltros() {
        this.publicaciones = [];
        this.ultimoDoc = null;
        await this.cargarPublicaciones();
    }

    limpiarFiltros() {
        this.filtroTipo.value = '';
        this.filtroCategoria.value = '';
        this.filtroOrden.value = 'reciente';
        this.aplicarFiltros();
    }

    async cargarPublicaciones() {
        if (this.loading) this.loading.style.display = 'flex';
        
        try {
            const pubsRef = collection(db, 'publicaciones');
            let q = query(pubsRef, orderBy('fechaPublicacion', 'desc'));

            if (this.filtroTipo && this.filtroTipo.value) {
                q = query(pubsRef, where('tipo', '==', this.filtroTipo.value), orderBy('fechaPublicacion', 'desc'));
            }

            const querySnapshot = await getDocs(q);
            this.publicaciones = [];
            
            querySnapshot.forEach((doc) => {
                this.publicaciones.push({ id: doc.id, ...doc.data() });
            });

            this.renderizarPublicaciones();
        } catch (error) {
            console.error("Error cargando publicaciones:", error);
        } finally {
            if (this.loading) this.loading.style.display = 'none';
        }
    }

    renderizarPublicaciones() {
        if (!this.publicacionesGrid) return;
        this.publicacionesGrid.innerHTML = '';

        if (this.publicaciones.length === 0) {
            this.sinResultados.style.display = 'block';
            return;
        }

        this.sinResultados.style.display = 'none';
        this.publicaciones.forEach(pub => {
            this.publicacionesGrid.appendChild(this.crearCard(pub));
        });
    }

    crearCard(pub) {
        const card = document.createElement('div');
        card.className = 'publicacion-card';
        
        const isLiked = this.usuarioActual && pub.usuariosLike?.includes(this.usuarioActual.uid);
        const foto = pub.fotos?.[0] || 'https://via.placeholder.com/300';
        
        const ultimoComentHtml = pub.ultimoComentario 
            ? `<div class="comentario-reciente">
                <strong>${pub.ultimoComentario.usuarioNombre}:</strong> ${pub.ultimoComentario.texto}
               </div>`
            : '';

        card.innerHTML = `
            <div class="publicacion-imagen" onclick="window.location.href='detallesforo.html?id=${pub.id}'">
                <img src="${foto}" alt="${pub.titulo}">
                <span class="publicacion-tipo">${pub.tipo}</span>
            </div>
            <div class="publicacion-contenido">
                <h3 class="publicacion-titulo">${pub.titulo}</h3>
                <p class="publicacion-descripcion">${pub.descripcion?.substring(0, 100)}...</p>
                
                ${ultimoComentHtml}
                
                <div class="publicacion-footer">
                    <div class="publicacion-estadisticas">
                        <span><i class="far fa-eye"></i> ${pub.vistas || 0}</span>
                        <span onclick="window.controlador.toggleLike('${pub.id}', ${isLiked})" style="cursor:pointer; color: ${isLiked ? '#ef4444' : 'inherit'}">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${pub.likes || 0}
                        </span>
                        <span onclick="window.location.href='detallesforo.html?id=${pub.id}'" style="cursor:pointer">
                            <i class="far fa-comment"></i> ${pub.comentarios || 0}
                        </span>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    async toggleLike(id, currentlyLiked) {
        if (!this.usuarioActual) {
            Swal.fire("Inicia sesión", "Debes estar conectado para dar like", "warning");
            return;
        }

        const docRef = doc(db, 'publicaciones', id);
        try {
            await updateDoc(docRef, {
                likes: increment(currentlyLiked ? -1 : 1),
                usuariosLike: currentlyLiked ? arrayRemove(this.usuarioActual.uid) : arrayUnion(this.usuarioActual.uid)
            });
            await this.cargarPublicaciones();
        } catch (e) {
            console.error("Error like:", e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => new ControladorForo());

// Funciones globales utilitarias
window.toggleDarkMode = function() {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('.theme-toggle i');
    const isDark = document.body.classList.contains('dark-mode');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
};