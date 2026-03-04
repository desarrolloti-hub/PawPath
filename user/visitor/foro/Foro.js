import FormularioForo from '/classes/FormularioForo.js';

class ControladorForo {
    constructor() {
        this.publicacionesGrid = document.getElementById('publicacionesGrid');
        this.loading = document.getElementById('loading');
        this.sinResultados = document.getElementById('sinResultados');
        this.cargarMasContainer = document.getElementById('cargarMasContainer');
        this.btnCargarMas = document.getElementById('btnCargarMas');
        this.btnFiltros = document.getElementById('btnFiltros');
        this.panelFiltros = document.getElementById('panelFiltros');
        this.btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
        this.btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
        
        this.filtroTipo = document.getElementById('filtroTipo');
        this.filtroCategoria = document.getElementById('filtroCategoria');
        this.filtroCercania = document.getElementById('filtroCercania');
        this.filtroOrden = document.getElementById('filtroOrden');
        
        this.modalDetalle = document.getElementById('modalDetalle');
        this.detalleTitulo = document.getElementById('detalleTitulo');
        this.detalleContenido = document.getElementById('detalleContenido');
        
        this.ultimoDoc = null;
        this.publicaciones = [];
        this.ubicacionUsuario = null;
        
        this.inicializar();
    }
    
    async inicializar() {
        this.configurarEventos();
        await this.obtenerUbicacionUsuario();
        await this.cargarPublicaciones();
    }
    
    configurarEventos() {
        this.btnFiltros.addEventListener('click', () => this.toggleFiltros());
        this.btnAplicarFiltros.addEventListener('click', () => this.aplicarFiltros());
        this.btnLimpiarFiltros.addEventListener('click', () => this.limpiarFiltros());
        this.btnCargarMas.addEventListener('click', () => this.cargarMasPublicaciones());
        
        window.addEventListener('click', (e) => {
            if (e.target === this.modalDetalle) {
                this.modalDetalle.style.display = 'none';
            }
        });
    }
    
    async obtenerUbicacionUsuario() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.ubicacionUsuario = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                },
                () => {
                    console.log('No se pudo obtener ubicación');
                }
            );
        }
    }
    
    toggleFiltros() {
        if (this.panelFiltros.style.display === 'none') {
            this.panelFiltros.style.display = 'block';
        } else {
            this.panelFiltros.style.display = 'none';
        }
    }
    
    async aplicarFiltros() {
        this.ultimoDoc = null;
        this.publicaciones = [];
        this.publicacionesGrid.innerHTML = '';
        this.loading.style.display = 'flex';
        await this.cargarPublicaciones();
    }
    
    limpiarFiltros() {
        this.filtroTipo.value = '';
        this.filtroCategoria.value = '';
        this.filtroCercania.value = '0';
        this.filtroOrden.value = 'reciente';
        this.aplicarFiltros();
    }
    
    async cargarPublicaciones() {
        try {
            let resultado;
            
            if (this.filtroTipo.value) {
                resultado = await FormularioForo.obtenerPorTipo(this.filtroTipo.value, this.ultimoDoc);
            } else {
                resultado = await FormularioForo.obtenerTodas(this.ultimoDoc);
            }
            
            if (resultado.success) {
                let publicaciones = resultado.publicaciones;
                
                // Filtrar por categoría
                if (this.filtroCategoria.value) {
                    publicaciones = publicaciones.filter(p => p.categoria === this.filtroCategoria.value);
                }
                
                // Filtrar por cercanía
                if (this.ubicacionUsuario && this.filtroCercania.value !== '0') {
                    const radioKm = parseInt(this.filtroCercania.value);
                    const cercanos = await FormularioForo.obtenerCercanos(
                        this.ubicacionUsuario.lat,
                        this.ubicacionUsuario.lng,
                        radioKm
                    );
                    if (cercanos.success) {
                        publicaciones = cercanos.publicaciones;
                    }
                }
                
                // Ordenar
                publicaciones = this.ordenarPublicaciones(publicaciones);
                
                this.publicaciones = [...this.publicaciones, ...publicaciones];
                this.ultimoDoc = resultado.ultimoDoc;
                
                this.renderizarPublicaciones();
            }
            
            this.loading.style.display = 'none';
            
            if (this.publicaciones.length === 0) {
                this.sinResultados.style.display = 'block';
                this.cargarMasContainer.style.display = 'none';
            } else {
                this.sinResultados.style.display = 'none';
                if (resultado.ultimoDoc) {
                    this.cargarMasContainer.style.display = 'block';
                } else {
                    this.cargarMasContainer.style.display = 'none';
                }
            }
            
        } catch (error) {
            console.error('Error cargando publicaciones:', error);
            this.loading.style.display = 'none';
            this.mostrarAlerta('Error', 'No se pudieron cargar las publicaciones', 'error');
        }
    }
    
    ordenarPublicaciones(publicaciones) {
        switch(this.filtroOrden.value) {
            case 'reciente':
                return publicaciones.sort((a, b) => new Date(b.fechaPublicacion) - new Date(a.fechaPublicacion));
            case 'antiguo':
                return publicaciones.sort((a, b) => new Date(a.fechaPublicacion) - new Date(b.fechaPublicacion));
            case 'vistas':
                return publicaciones.sort((a, b) => b.vistas - a.vistas);
            case 'likes':
                return publicaciones.sort((a, b) => b.likes - a.likes);
            default:
                return publicaciones;
        }
    }
    
    async cargarMasPublicaciones() {
        await this.cargarPublicaciones();
    }
    
    renderizarPublicaciones() {
        this.publicacionesGrid.innerHTML = '';
        
        this.publicaciones.forEach(pub => {
            const publicacion = new FormularioForo(
                pub.titulo,
                pub.tipo,
                pub.descripcion,
                pub.categoria,
                pub.ubicacionTexto,
                pub.coordenadas,
                pub.contacto,
                pub.recompensa,
                pub.fotos,
                pub.fechaEvento,
                pub.usuarioId,
                pub.usuarioNombre,
                pub.id
            );
            
            const card = this.crearCardPublicacion(publicacion);
            this.publicacionesGrid.appendChild(card);
        });
    }
    
    crearCardPublicacion(pub) {
        const card = document.createElement('div');
        card.className = 'publicacion-card';
        card.dataset.id = pub.id;
        
        const primeraFoto = pub.fotos && pub.fotos.length > 0 
            ? pub.fotos[0] 
            : 'https://via.placeholder.com/300x200?text=Sin+imagen';
        
        const tiempo = pub.getTiempoTranscurrido();
        const tipoIcono = pub.getTipoIcono();
        const categoriaIcono = pub.getCategoriaIcono();
        
        let ubicacionHtml = '';
        if (pub.coordenadas) {
            ubicacionHtml = `
                <div class="publicacion-ubicacion" onclick="event.stopPropagation(); window.open('${pub.getMapUrl()}', '_blank')">
                    <i class="fas fa-map-marker-alt"></i> Ver en mapa
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="publicacion-imagen">
                <img src="${primeraFoto}" alt="${pub.titulo}">
                <span class="publicacion-tipo">${tipoIcono} ${pub.tipo}</span>
                ${pub.fotos.length > 1 ? `<span class="publicacion-fotos-count"><i class="fas fa-images"></i> ${pub.fotos.length}</span>` : ''}
            </div>
            <div class="publicacion-contenido">
                <h3 class="publicacion-titulo">${pub.titulo}</h3>
                <p class="publicacion-descripcion">${pub.descripcion.substring(0, 120)}${pub.descripcion.length > 120 ? '...' : ''}</p>
                
                <div class="publicacion-metadata">
                    <span class="publicacion-categoria">${categoriaIcono} ${pub.categoria || 'Sin categoría'}</span>
                    <span class="publicacion-tiempo"><i class="far fa-clock"></i> ${tiempo}</span>
                </div>
                
                ${ubicacionHtml}
                
                <div class="publicacion-footer">
                    <div class="publicacion-estadisticas">
                        <span><i class="far fa-eye"></i> ${pub.vistas}</span>
                        <span><i class="far fa-heart"></i> ${pub.likes}</span>
                        <span><i class="far fa-comment"></i> ${pub.comentarios}</span>
                    </div>
                    <span class="publicacion-usuario">
                        <i class="far fa-user-circle"></i> ${pub.usuarioNombre}
                    </span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => this.verDetallePublicacion(pub));
        
        return card;
    }
    
    verDetallePublicacion(pub) {
        pub.incrementarVistas();
        
        const tipoIcono = pub.getTipoIcono();
        const categoriaIcono = pub.getCategoriaIcono();
        const tiempo = pub.getTiempoTranscurrido();
        
        let fotosHtml = '';
        if (pub.fotos && pub.fotos.length > 0) {
            fotosHtml = `
                <div class="detalle-fotos">
                    ${pub.fotos.map((foto, index) => `
                        <img src="${foto}" alt="Foto ${index + 1}" class="detalle-foto" onclick="window.open('${foto}', '_blank')">
                    `).join('')}
                </div>
            `;
        }
        
        let ubicacionHtml = '';
        if (pub.coordenadas) {
            ubicacionHtml = `
                <div class="detalle-mapa" id="detalleMapa-${pub.id}" style="height: 200px; margin: 15px 0;"></div>
                <p><i class="fas fa-map-marker-alt"></i> <strong>Dirección:</strong> ${pub.ubicacionTexto}</p>
            `;
        }
        
        let recompensaHtml = '';
        if (pub.recompensa) {
            recompensaHtml = `<p><i class="fas fa-trophy"></i> <strong>Recompensa:</strong> ${pub.recompensa}</p>`;
        }
        
        let fechaEventoHtml = '';
        if (pub.fechaEvento) {
            fechaEventoHtml = `<p><i class="fas fa-calendar"></i> <strong>Fecha del evento:</strong> ${new Date(pub.fechaEvento).toLocaleDateString()}</p>`;
        }
        
        this.detalleTitulo.innerHTML = `${tipoIcono} ${pub.titulo}`;
        
        this.detalleContenido.innerHTML = `
            <div class="detalle-info">
                <p><i class="fas fa-user"></i> <strong>Publicado por:</strong> ${pub.usuarioNombre} <span class="detalle-tiempo">(${tiempo})</span></p>
                <p><i class="fas fa-tag"></i> <strong>Tipo:</strong> ${pub.tipo}</p>
                <p><i class="fas fa-tags"></i> <strong>Categoría:</strong> ${categoriaIcono} ${pub.categoria || 'Sin categoría'}</p>
                <p><i class="fas fa-phone"></i> <strong>Contacto:</strong> ${pub.contacto}</p>
                ${recompensaHtml}
                ${fechaEventoHtml}
                
                <div class="detalle-descripcion">
                    <h4>Descripción:</h4>
                    <p>${pub.descripcion.replace(/\n/g, '<br>')}</p>
                </div>
                
                ${fotosHtml}
                ${ubicacionHtml}
            </div>
        `;
        
        this.modalDetalle.style.display = 'block';
        
        // Inicializar mapa si hay coordenadas
        if (pub.coordenadas) {
            setTimeout(() => {
                const mapaContainer = document.getElementById(`detalleMapa-${pub.id}`);
                if (mapaContainer) {
                    const mapa = L.map(mapaContainer).setView([pub.coordenadas.lat, pub.coordenadas.lng], 15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(mapa);
                    L.marker([pub.coordenadas.lat, pub.coordenadas.lng]).addTo(mapa);
                }
            }, 100);
        }
    }
    
    mostrarAlerta(titulo, mensaje, tipo) {
        Swal.fire({
            icon: tipo,
            title: titulo,
            text: mensaje,
            confirmButtonColor: '#ff6b6b'
        });
    }
}

// Función para abrir imagen ampliada (puedes usar SweetAlert2)
function abrirImagen(url) {
    Swal.fire({
        imageUrl: url,
        imageAlt: 'Imagen ampliada',
        showCloseButton: true,
        showConfirmButton: false,
        width: 'auto',
        padding: '0',
        background: 'transparent',
        customClass: {
            popup: 'image-modal-popup'
        }
    });
}

// O si prefieres un modal personalizado:
function abrirImagenModal(url) {
    const modal = document.getElementById('modalDetalle');
    const contenido = document.getElementById('detalleContenido');
    
    contenido.innerHTML = `
        <div style="text-align: center;">
            <img src="${url}" alt="Imagen ampliada" class="modal-image">
            <button onclick="document.getElementById('modalDetalle').style.display='none'" class="btn btn-primary btn-sm" style="margin-top: 16px;">
                <i class="fas fa-times"></i> Cerrar
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('modalDetalle');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new ControladorForo();
});
