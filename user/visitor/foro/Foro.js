import { db, auth } from '/config/firebase-config.js';
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
    limit,
    getCountFromServer,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

class ControladorForo {
    constructor() {
        // Elementos DOM
        this.publicacionesGrid = document.getElementById('publicacionesGrid');
        this.loading = document.getElementById('loading');
        this.sinResultados = document.getElementById('sinResultados');
        this.cargarMasContainer = document.getElementById('cargarMasContainer');
        this.btnCargarMas = document.getElementById('btnCargarMas');
        this.buscadorInput = document.getElementById('buscador');
        
        // Selectores de Filtros
        this.filtroTipo = document.getElementById('filtroTipo');
        this.filtroCategoria = document.getElementById('filtroCategoria');
        this.filtroCercania = document.getElementById('filtroCercania');
        this.filtroOrden = document.getElementById('filtroOrden');
        this.btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
        this.btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
        
        // Filtros rápidos
        this.filtrosRapidos = document.querySelectorAll('.filter-list a');
        
        // Estado
        this.publicaciones = [];
        this.publicacionesOriginales = [];
        this.usuarioActual = null;
        this.usuarioData = null; // Para almacenar datos completos del usuario
        this.ultimoDoc = null;
        this.cargandoMas = false;
        this.filtrosActivos = {
            tipo: '',
            categoria: '',
            cercania: 0,
            orden: 'reciente',
            rapido: 'all',
            busqueda: ''
        };
        
        this.usuarioLat = 19.4326;
        this.usuarioLng = -99.1332;
        
        window.controlador = this;
        
        // Cargar modo oscuro
        this.cargarModoOscuro();
        
        this.inicializar();
    }
    
    cargarModoOscuro() {
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
        }
    }
    
    async inicializar() {
        console.log('🚀 Inicializando ControladorForo...');
        await this.obtenerUbicacionUsuario();
        this.escucharAuth();
        this.configurarEventos();
        await this.cargarEstadisticasReales();
        await this.cargarTendencias();
        await this.cargarConsejos();
        await this.cargarPublicaciones();
    }
    
    async cargarEstadisticasReales() {
        try {
            const pubsRef = collection(db, 'publicaciones');
            
            const totalPubs = await getCountFromServer(pubsRef);
            
            const hace24h = new Date();
            hace24h.setHours(hace24h.getHours() - 24);
            const qHoy = query(pubsRef, where('fechaPublicacion', '>=', hace24h));
            const pubsHoy = await getCountFromServer(qHoy);
            
            const qEncontradas = query(pubsRef, where('tipo', 'in', ['Mascota Encontrada', 'Encontrada', 'Encontrado']));
            const encontradas = await getCountFromServer(qEncontradas);
            
            const pubsActivas = await getDocs(qHoy);
            const usuariosUnicos = new Set();
            pubsActivas.forEach(doc => {
                const data = doc.data();
                if (data.usuarioId) usuariosUnicos.add(data.usuarioId);
            });
            
            const statsPublicaciones = document.getElementById('statsPublicaciones');
            const statsHoy = document.getElementById('statsHoy');
            const statsEncontradas = document.getElementById('statsEncontradas');
            const statsUsuarios = document.getElementById('statsUsuarios');
            
            if (statsPublicaciones) statsPublicaciones.textContent = totalPubs.data().count;
            if (statsHoy) statsHoy.textContent = pubsHoy.data().count;
            if (statsEncontradas) statsEncontradas.textContent = encontradas.data().count;
            if (statsUsuarios) statsUsuarios.textContent = usuariosUnicos.size;
            
        } catch (error) {
            console.error("❌ Error en estadísticas:", error);
        }
    }
    
    async obtenerUbicacionUsuario() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.usuarioLat = position.coords.latitude;
                    this.usuarioLng = position.coords.longitude;
                    console.log('📍 Ubicación obtenida:', this.usuarioLat, this.usuarioLng);
                },
                (error) => console.log('⚠️ Error ubicación:', error)
            );
        }
    }
    
    escucharAuth() {
        auth.onAuthStateChanged(async (user) => {
            this.usuarioActual = user;
            
            if (user) {
                // Obtener datos adicionales del usuario desde Firestore
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
                    
                    if (!userDoc.empty) {
                        this.usuarioData = userDoc.docs[0].data();
                        console.log('👤 Datos del usuario:', this.usuarioData);
                    } else {
                        // Si no hay datos en Firestore, usar datos de auth
                        this.usuarioData = {
                            nombre: user.displayName || user.email?.split('@')[0],
                            apellido_paterno: '',
                            apellido_materno: ''
                        };
                    }
                } catch (error) {
                    console.error('Error obteniendo datos del usuario:', error);
                    this.usuarioData = {
                        nombre: user.email?.split('@')[0] || 'Usuario',
                        apellido_paterno: '',
                        apellido_materno: ''
                    };
                }
            } else {
                this.usuarioData = null;
            }
            
            console.log('👤 Usuario:', this.obtenerNombreUsuario(this.usuarioData, user));
            if (this.publicaciones.length > 0) this.renderizarPublicaciones();
        });
    }
    
    // Función para obtener el nombre completo del usuario
    obtenerNombreUsuario(usuarioData, authUser) {
        if (!authUser) return 'Anónimo';
        
        // Si tenemos datos de Firestore
        if (usuarioData) {
            const nombre = usuarioData.user_primer_nombre || usuarioData.nombre || '';
            const apellidoPaterno = usuarioData.user_appellido_paterno || usuarioData.apellido_paterno || '';
            
            if (nombre && apellidoPaterno) {
                return `${nombre} ${apellidoPaterno}`;
            } else if (nombre) {
                return nombre;
            }
        }
        
        // Si no hay datos, usar el displayName o el email
        if (authUser.displayName) {
            const partes = authUser.displayName.split(' ');
            if (partes.length >= 2) {
                return `${partes[0]} ${partes[1]}`;
            }
            return authUser.displayName;
        }
        
        // Último recurso: usar el email sin el dominio
        return authUser.email ? authUser.email.split('@')[0] : 'Usuario';
    }
    
    async cargarTendencias() {
        const tendenciasContainer = document.getElementById('tendenciasContainer');
        if (!tendenciasContainer) return;
        
        try {
            const pubsRef = collection(db, 'publicaciones');
            const q = query(pubsRef, orderBy('vistas', 'desc'), limit(5));
            const querySnapshot = await getDocs(q);
            
            tendenciasContainer.innerHTML = '';
            if (querySnapshot.empty) {
                tendenciasContainer.innerHTML = '<div class="trending-item"><div class="trending-info">Sin tendencias aún</div></div>';
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const pub = doc.data();
                tendenciasContainer.innerHTML += `
                    <div class="trending-item" onclick="window.location.href='detallesforo.html?id=${doc.id}'">
                        <div class="trending-icon"><i class="fas fa-fire"></i></div>
                        <div class="trending-info">
                            <div class="trending-title">${this.escapeHtml(pub.titulo || 'Sin título')}</div>
                            <div class="trending-stats">${pub.vistas || 0} vistas • ${pub.likes || 0} likes</div>
                        </div>
                    </div>
                `;
            });
        } catch (error) {
            console.error("❌ Error tendencias:", error);
            tendenciasContainer.innerHTML = '<div class="trending-item"><div class="trending-info">Error cargando tendencias</div></div>';
        }
    }
    
    async cargarConsejos() {
        const consejosContainer = document.getElementById('consejosContainer');
        if (!consejosContainer) return;
        
        const consejos = [
            { texto: "Mantén siempre identificación actualizada en tu mascota", icono: "fas fa-id-card" },
            { texto: "Visita al veterinario cada 6 meses para chequeos preventivos", icono: "fas fa-hospital" },
            { texto: "La esterilización ayuda a prevenir enfermedades", icono: "fas fa-heartbeat" },
            { texto: "Proporciona agua fresca y limpia todos los días", icono: "fas fa-tint" },
            { texto: "El ejercicio diario es fundamental para su salud", icono: "fas fa-walking" }
        ];
        
        consejosContainer.innerHTML = consejos.map(consejo => `
            <div class="tip-item">
                <div class="tip-icon"><i class="${consejo.icono}"></i></div>
                <div class="tip-text">${consejo.texto}</div>
            </div>
        `).join('');
    }
    
    configurarEventos() {
        console.log('⚙️ Configurando eventos...');
        
        if (this.btnAplicarFiltros) {
            this.btnAplicarFiltros.addEventListener('click', () => {
                console.log('🔍 Click en APLICAR FILTROS');
                this.aplicarFiltros();
            });
        }
        
        if (this.btnLimpiarFiltros) {
            this.btnLimpiarFiltros.addEventListener('click', () => {
                console.log('🧹 Click en LIMPIAR FILTROS');
                this.limpiarFiltros();
            });
        }
        
        if (this.btnCargarMas) {
            this.btnCargarMas.addEventListener('click', () => this.cargarMasPublicaciones());
        }
        
        if (this.buscadorInput) {
            this.buscadorInput.addEventListener('input', (e) => {
                this.filtrosActivos.busqueda = e.target.value;
                this.aplicarBusqueda();
            });
        }
        
        this.filtrosRapidos.forEach(filtro => {
            filtro.addEventListener('click', (e) => {
                e.preventDefault();
                const filterValue = filtro.getAttribute('data-filter');
                console.log('⚡ Filtro rápido:', filterValue);
                this.aplicarFiltroRapido(filterValue);
                
                this.filtrosRapidos.forEach(f => f.classList.remove('active'));
                filtro.classList.add('active');
            });
        });
        
        const btnFiltros = document.getElementById('btnFiltros');
        const panelFiltros = document.getElementById('panelFiltros');
        if (btnFiltros && panelFiltros) {
            btnFiltros.addEventListener('click', () => {
                panelFiltros.style.display = panelFiltros.style.display === 'none' ? 'block' : 'none';
            });
        }
    }
    
    aplicarBusqueda() {
        if (!this.filtrosActivos.busqueda.trim()) {
            this.publicaciones = [...this.publicacionesOriginales];
        } else {
            const texto = this.filtrosActivos.busqueda.toLowerCase();
            this.publicaciones = this.publicacionesOriginales.filter(pub => 
                pub.titulo?.toLowerCase().includes(texto) ||
                pub.descripcion?.toLowerCase().includes(texto) ||
                pub.usuarioNombre?.toLowerCase().includes(texto)
            );
        }
        this.renderizarPublicaciones();
    }
    
    aplicarFiltroRapido(valor) {
        if (this.filtroTipo) this.filtroTipo.value = '';
        if (this.filtroCategoria) this.filtroCategoria.value = '';
        if (this.filtroCercania) this.filtroCercania.value = '0';
        
        this.filtrosActivos = {
            tipo: '',
            categoria: '',
            cercania: 0,
            orden: 'reciente',
            rapido: valor,
            busqueda: this.filtrosActivos.busqueda || ''
        };
        
        if (valor === 'Perros') {
            this.filtrosActivos.categoria = 'Perros';
        } else if (valor === 'Gatos') {
            this.filtrosActivos.categoria = 'Gatos';
        } else if (valor === 'Otros') {
            this.filtrosActivos.rapido = 'Otros';
        } else if (valor === 'ultimas24h') {
            this.filtrosActivos.rapido = 'ultimas24h';
        } else if (valor === 'cerca') {
            this.filtrosActivos.rapido = 'cerca';
        }
        
        this.aplicarFiltrosCompletos();
    }
    
    async aplicarFiltros() {
        this.filtrosActivos = {
            tipo: this.filtroTipo?.value || '',
            categoria: this.filtroCategoria?.value || '',
            cercania: parseInt(this.filtroCercania?.value || '0'),
            orden: this.filtroOrden?.value || 'reciente',
            rapido: 'all',
            busqueda: this.filtrosActivos.busqueda || ''
        };
        
        this.filtrosRapidos.forEach(f => f.classList.remove('active'));
        const filtroAll = document.querySelector('.filter-list a[data-filter="all"]');
        if (filtroAll) filtroAll.classList.add('active');
        
        this.aplicarFiltrosCompletos();
    }
    
    limpiarFiltros() {
        if (this.filtroTipo) this.filtroTipo.value = '';
        if (this.filtroCategoria) this.filtroCategoria.value = '';
        if (this.filtroCercania) this.filtroCercania.value = '0';
        if (this.filtroOrden) this.filtroOrden.value = 'reciente';
        if (this.buscadorInput) this.buscadorInput.value = '';
        
        this.filtrosActivos = {
            tipo: '',
            categoria: '',
            cercania: 0,
            orden: 'reciente',
            rapido: 'all',
            busqueda: ''
        };
        
        this.filtrosRapidos.forEach(f => f.classList.remove('active'));
        const filtroAll = document.querySelector('.filter-list a[data-filter="all"]');
        if (filtroAll) filtroAll.classList.add('active');
        
        this.aplicarFiltrosCompletos();
    }
    
    async cargarPublicaciones() {
        if (this.loading) this.loading.style.display = 'flex';
        
        try {
            const pubsRef = collection(db, 'publicaciones');
            let q = query(pubsRef, orderBy('fechaPublicacion', 'desc'));
            
            const querySnapshot = await getDocs(q);
            let todasPublicaciones = [];
            querySnapshot.forEach((doc) => {
                todasPublicaciones.push({ id: doc.id, ...doc.data() });
            });
            
            let publicacionesFiltradas = [...todasPublicaciones];
            
            // Filtro por tipo
            if (this.filtrosActivos.tipo) {
                publicacionesFiltradas = publicacionesFiltradas.filter(pub => 
                    pub.tipo === this.filtrosActivos.tipo
                );
            }
            
            // Filtro por categoría
            if (this.filtrosActivos.categoria) {
                publicacionesFiltradas = publicacionesFiltradas.filter(pub => 
                    pub.categoria === this.filtrosActivos.categoria
                );
            }
            
            // Filtro "Otras mascotas"
            if (this.filtrosActivos.rapido === 'Otros') {
                publicacionesFiltradas = publicacionesFiltradas.filter(pub => 
                    pub.categoria !== 'Perros' && pub.categoria !== 'Gatos'
                );
            }
            
            // Filtro "Últimas 24h"
            if (this.filtrosActivos.rapido === 'ultimas24h') {
                const hace24h = new Date();
                hace24h.setHours(hace24h.getHours() - 24);
                publicacionesFiltradas = publicacionesFiltradas.filter(pub => {
                    if (!pub.fechaPublicacion) return false;
                    const fechaPub = pub.fechaPublicacion.toDate ? pub.fechaPublicacion.toDate() : new Date(pub.fechaPublicacion);
                    return fechaPub >= hace24h;
                });
            }
            
            // Filtro por cercanía
            if (this.filtrosActivos.cercania > 0 || this.filtrosActivos.rapido === 'cerca') {
                let radio = this.filtrosActivos.cercania;
                if (this.filtrosActivos.rapido === 'cerca') radio = 10;
                
                publicacionesFiltradas = publicacionesFiltradas.filter(pub => {
                    if (!pub.ubicacion || !pub.ubicacion.lat || !pub.ubicacion.lng) return false;
                    const distancia = this.calcularDistancia(
                        this.usuarioLat, this.usuarioLng,
                        pub.ubicacion.lat, pub.ubicacion.lng
                    );
                    return distancia <= radio;
                });
            }
            
            // Ordenamiento
            switch(this.filtrosActivos.orden) {
                case 'antiguo':
                    publicacionesFiltradas.sort((a, b) => {
                        const fechaA = a.fechaPublicacion?.toDate ? a.fechaPublicacion.toDate() : new Date(a.fechaPublicacion);
                        const fechaB = b.fechaPublicacion?.toDate ? b.fechaPublicacion.toDate() : new Date(b.fechaPublicacion);
                        return fechaA - fechaB;
                    });
                    break;
                case 'vistas':
                    publicacionesFiltradas.sort((a, b) => (b.vistas || 0) - (a.vistas || 0));
                    break;
                case 'likes':
                    publicacionesFiltradas.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                    break;
                default:
                    publicacionesFiltradas.sort((a, b) => {
                        const fechaA = a.fechaPublicacion?.toDate ? a.fechaPublicacion.toDate() : new Date(a.fechaPublicacion);
                        const fechaB = b.fechaPublicacion?.toDate ? b.fechaPublicacion.toDate() : new Date(b.fechaPublicacion);
                        return fechaB - fechaA;
                    });
            }
            
            this.publicacionesOriginales = publicacionesFiltradas;
            this.aplicarBusqueda();
            
            if (this.cargarMasContainer) {
                this.cargarMasContainer.style.display = 'none';
            }
            
        } catch (error) {
            console.error("❌ Error cargando publicaciones:", error);
            if (this.sinResultados) {
                this.sinResultados.style.display = 'block';
                this.sinResultados.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar publicaciones</h3>
                    <p>Verifica tu conexión a internet</p>
                `;
            }
        } finally {
            if (this.loading) this.loading.style.display = 'none';
        }
    }
    
    async cargarMasPublicaciones() {
        console.log('No hay más publicaciones para cargar');
    }
    
    calcularDistancia(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    renderizarPublicaciones() {
        if (!this.publicacionesGrid) return;
        this.publicacionesGrid.innerHTML = '';
        
        if (this.publicaciones.length === 0) {
            if (this.sinResultados) {
                this.sinResultados.style.display = 'block';
                this.sinResultados.innerHTML = `
                    <i class="fas fa-search"></i>
                    <h3>No hay publicaciones con estos filtros</h3>
                    <p>Intenta con otros filtros o crea una nueva publicación</p>
                    <a href="/user/visitor/FormualrioForo/FormularioForo.html" class="btn btn-primary btn-sm">
                        <i class="fas fa-plus"></i> Crear publicación
                    </a>
                `;
            }
            return;
        }
        
        if (this.sinResultados) this.sinResultados.style.display = 'none';
        
        this.publicaciones.forEach(pub => {
            this.publicacionesGrid.appendChild(this.crearCard(pub));
        });
    }
    
    async mostrarMapa(id) {
        const pub = this.publicaciones.find(p => p.id === id);
        if (pub && pub.ubicacion) {
            Swal.fire({
                title: "📍 Ubicación",
                html: `
                    <div id="mapaMini" style="height: 300px; width: 100%; border-radius: 12px;"></div>
                    <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
                        <i class="fas fa-map-marker-alt"></i> Lat: ${pub.ubicacion.lat.toFixed(6)}, Lng: ${pub.ubicacion.lng.toFixed(6)}
                    </p>
                `,
                showConfirmButton: true,
                confirmButtonText: "Cerrar",
                confirmButtonColor: "#3b82f6",
                didOpen: () => {
                    const map = L.map('mapaMini').setView([pub.ubicacion.lat, pub.ubicacion.lng], 15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(map);
                    L.marker([pub.ubicacion.lat, pub.ubicacion.lng]).addTo(map)
                        .bindPopup(`<strong>${this.escapeHtml(pub.titulo)}</strong>`)
                        .openPopup();
                }
            });
        } else {
            Swal.fire("Sin ubicación", "Esta publicación no tiene ubicación registrada", "info");
        }
    }
    
    async compartirPublicacion(pub) {
        const url = `${window.location.origin}/user/visitor/foro/detallesforo.html?id=${pub.id}`;
        const texto = `🐾 ${pub.titulo} - ${pub.descripcion?.substring(0, 100)}...`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: pub.titulo,
                    text: texto,
                    url: url
                });
            } catch (err) {
                console.log('Compartir cancelado');
            }
        } else {
            navigator.clipboard.writeText(url);
            Swal.fire({
                title: "¡Enlace copiado! 📋",
                text: "Comparte este enlace con tus amigos",
                icon: "success",
                toast: true,
                timer: 2000,
                showConfirmButton: false,
                position: 'top-end'
            });
        }
    }
    
    // Función para obtener el nombre del usuario de la publicación
    obtenerNombrePublicacion(pub) {
        // Si la publicación tiene un nombre de usuario guardado
        if (pub.usuarioNombre) {
            return pub.usuarioNombre;
        }
        
        // Si es el usuario actual
        if (this.usuarioActual && pub.usuarioId === this.usuarioActual.uid && this.usuarioData) {
            const nombre = this.usuarioData.user_primer_nombre || this.usuarioData.nombre || '';
            const apellido = this.usuarioData.user_appellido_paterno || this.usuarioData.apellido_paterno || '';
            
            if (nombre && apellido) {
                return `${nombre} ${apellido}`;
            } else if (nombre) {
                return nombre;
            }
        }
        
        // Si no hay datos, mostrar "Anónimo"
        return 'Anónimo';
    }
    
    crearCard(pub) {
        const card = document.createElement('div');
        card.className = 'publicacion-card';
        card.setAttribute('data-id', pub.id);
        
        const isLiked = this.usuarioActual && pub.usuariosLike?.includes(this.usuarioActual.uid);
        const foto = pub.fotos?.[0] || 'https://via.placeholder.com/300x200?text=PawPath';
        
        let fechaTexto = 'Reciente';
        if (pub.fechaPublicacion) {
            const fecha = pub.fechaPublicacion.toDate ? pub.fechaPublicacion.toDate() : new Date(pub.fechaPublicacion);
            const ahora = new Date();
            const diffHoras = Math.floor((ahora - fecha) / (1000 * 60 * 60));
            
            if (diffHoras < 1) fechaTexto = 'Hace unos minutos';
            else if (diffHoras < 24) fechaTexto = `Hace ${diffHoras} horas`;
            else fechaTexto = `Hace ${Math.floor(diffHoras / 24)} días`;
        }
        
        const categoriaIcon = this.getCategoriaIcon(pub.categoria);
        const nombreUsuario = this.obtenerNombrePublicacion(pub);
        
        const ubicacionHtml = pub.ubicacion && pub.ubicacion.lat ? `
            <div class="publicacion-ubicacion-mini" onclick="event.stopPropagation(); window.controlador.mostrarMapa('${pub.id}')">
                <i class="fas fa-map-marker-alt"></i>
                <span>Ver ubicación</span>
            </div>
        ` : '';
        
        card.innerHTML = `
            <div class="publicacion-imagen" onclick="window.location.href='detallesforo.html?id=${pub.id}'">
                <img src="${foto}" alt="${this.escapeHtml(pub.titulo)}">
                <span class="publicacion-tipo">${this.escapeHtml(pub.tipo || 'General')}</span>
            </div>
            <div class="publicacion-contenido">
                <div class="publicacion-metadata">
                    <span class="publicacion-categoria">
                        <i class="${categoriaIcon}"></i> ${this.escapeHtml(pub.categoria || 'Mascota')}
                    </span>
                    <span class="publicacion-tiempo">
                        <i class="far fa-clock"></i> ${fechaTexto}
                    </span>
                </div>
                <h3 class="publicacion-titulo">${this.escapeHtml(pub.titulo)}</h3>
                <p class="publicacion-descripcion">${this.escapeHtml(pub.descripcion?.substring(0, 120) || '')}...</p>
                
                ${ubicacionHtml}
                
                <div class="publicacion-footer">
                    <div class="publicacion-estadisticas">
                        <span onclick="event.stopPropagation(); window.controlador.incrementarVista('${pub.id}')" title="Vistas">
                            <i class="far fa-eye"></i> ${pub.vistas || 0}
                        </span>
                        <span onclick="event.stopPropagation(); window.controlador.toggleLike('${pub.id}', ${isLiked})" 
                              style="cursor:pointer; color: ${isLiked ? '#ef4444' : 'inherit'}">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${pub.likes || 0}
                        </span>
                        <span onclick="event.stopPropagation(); window.location.href='detallesforo.html?id=${pub.id}'" title="Comentarios">
                            <i class="far fa-comment"></i> ${pub.comentarios || 0}
                        </span>
                        <span onclick="event.stopPropagation(); window.controlador.compartirPublicacion(${JSON.stringify(pub).replace(/"/g, '&quot;')})" title="Compartir">
                            <i class="fas fa-share-alt"></i>
                        </span>
                    </div>
                    <div class="publicacion-usuario">
                        <i class="fas fa-user-circle"></i> 
                        ${this.escapeHtml(nombreUsuario)}
                    </div>
                </div>
            </div>
        `;
        return card;
    }
    
    getCategoriaIcon(categoria) {
        const icons = {
            'Perros': 'fas fa-dog',
            'Gatos': 'fas fa-cat',
            'Aves': 'fas fa-dove',
            'Roedores': 'fas fa-mouse',
            'Reptiles': 'fas fa-lizard',
            'Otros': 'fas fa-paw'
        };
        return icons[categoria] || 'fas fa-paw';
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async incrementarVista(id) {
        try {
            const docRef = doc(db, 'publicaciones', id);
            await updateDoc(docRef, { vistas: increment(1) });
        } catch (e) {
            console.error("Error:", e);
        }
    }
    
    async toggleLike(id, currentlyLiked) {
        if (!this.usuarioActual) {
            await Swal.fire({
                title: "🐾 ¡Inicia sesión!",
                html: "Debes iniciar sesión para <strong>interactuar con la comunidad PawPath</strong><br><br>¡Regístrate y sé parte de nuestra familia!",
                icon: "warning",
                confirmButtonText: "Iniciar sesión",
                cancelButtonText: "Cancelar",
                showCancelButton: true,
                confirmButtonColor: "#3b82f6",
                cancelButtonColor: "#64748b",
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = "/login.html";
                }
            });
            return;
        }
        
        const docRef = doc(db, 'publicaciones', id);
        try {
            await updateDoc(docRef, {
                likes: increment(currentlyLiked ? -1 : 1),
                usuariosLike: currentlyLiked ? arrayRemove(this.usuarioActual.uid) : arrayUnion(this.usuarioActual.uid)
            });
            
            const pubIndex = this.publicaciones.findIndex(p => p.id === id);
            if (pubIndex !== -1) {
                this.publicaciones[pubIndex].likes = (this.publicaciones[pubIndex].likes || 0) + (currentlyLiked ? -1 : 1);
                if (currentlyLiked) {
                    this.publicaciones[pubIndex].usuariosLike = this.publicaciones[pubIndex].usuariosLike?.filter(uid => uid !== this.usuarioActual.uid) || [];
                } else {
                    this.publicaciones[pubIndex].usuariosLike = [...(this.publicaciones[pubIndex].usuariosLike || []), this.usuarioActual.uid];
                }
                this.renderizarPublicaciones();
            }
        } catch (e) {
            console.error("Error:", e);
            Swal.fire("Error", "No se pudo procesar tu like", "error");
        }
    }
    
    async mostrarEstadisticasVisuales() {
        const pubsRef = collection(db, 'publicaciones');
        const snapshot = await getDocs(pubsRef);
        
        const stats = {
            perdidas: 0,
            adopcion: 0,
            consejos: 0,
            galeria: 0
        };
        
        snapshot.forEach(doc => {
            const tipo = doc.data().tipo;
            if (tipo === 'Mascota Perdida') stats.perdidas++;
            else if (tipo === 'En Adopción') stats.adopcion++;
            else if (tipo === 'Consejo de Cuidado') stats.consejos++;
            else if (tipo === 'Galería de Fotos') stats.galeria++;
        });
        
        const total = stats.perdidas + stats.adopcion + stats.consejos + stats.galeria;
        
        Swal.fire({
            title: "📊 Estadísticas del Foro",
            html: `
                <div style="text-align: left;">
                    <div style="margin-bottom: 15px;">
                        <strong>🔍 Mascotas Perdidas:</strong> ${stats.perdidas}
                        <div style="background: #e2e8f0; height: 8px; border-radius: 4px; margin-top: 5px;">
                            <div style="background: #ef4444; width: ${total > 0 ? (stats.perdidas / total) * 100 : 0}%; height: 8px; border-radius: 4px;"></div>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <strong>🏠 En Adopción:</strong> ${stats.adopcion}
                        <div style="background: #e2e8f0; height: 8px; border-radius: 4px; margin-top: 5px;">
                            <div style="background: #10b981; width: ${total > 0 ? (stats.adopcion / total) * 100 : 0}%; height: 8px; border-radius: 4px;"></div>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <strong>💡 Consejos:</strong> ${stats.consejos}
                        <div style="background: #e2e8f0; height: 8px; border-radius: 4px; margin-top: 5px;">
                            <div style="background: #f59e0b; width: ${total > 0 ? (stats.consejos / total) * 100 : 0}%; height: 8px; border-radius: 4px;"></div>
                        </div>
                    </div>
                    <div>
                        <strong>📷 Galería:</strong> ${stats.galeria}
                        <div style="background: #e2e8f0; height: 8px; border-radius: 4px; margin-top: 5px;">
                            <div style="background: #8b5cf6; width: ${total > 0 ? (stats.galeria / total) * 100 : 0}%; height: 8px; border-radius: 4px;"></div>
                        </div>
                    </div>
                </div>
            `,
            icon: "info",
            confirmButtonColor: "#3b82f6"
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new ControladorForo();
});

// Funciones globales
window.toggleDarkMode = function() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    
    Swal.fire({
        title: isDark ? "🌙 Modo Oscuro" : "☀️ Modo Claro",
        text: isDark ? "Activado para cuidar tus ojos" : "Activado para mejor visibilidad",
        icon: "success",
        toast: true,
        timer: 1500,
        showConfirmButton: false,
        position: 'top-end'
    });
};

window.mostrarNotificacion = function() {
    Swal.fire({
        title: "🔔 Notificaciones",
        text: "No tienes notificaciones nuevas en este momento",
        icon: "info",
        confirmButtonColor: "#3b82f6"
    });
};

window.mostrarEstadisticas = function() {
    if (window.controlador) {
        window.controlador.mostrarEstadisticasVisuales();
    }
};