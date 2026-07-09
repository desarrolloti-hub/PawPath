// MapaForo.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { 
    getFirestore,
    collection, 
    query, 
    where, 
    getDocs,
    orderBy 
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

// Configuración de Firebase - REEMPLAZA CON TUS DATOS REALES
const firebaseConfig = {
    apiKey: "AIzaSyABACTyV6lId6OAiRorJF_DMXHuCTycMoY",
    authDomain: "pawpath-mx.firebaseapp.com",
    projectId: "pawpath-mx",
    storageBucket: "pawpath-mx.firebasestorage.app",
    messagingSenderId: "511881737688",
    appId: "1:511881737688:web:5326412bffef94f7ecaead",
    measurementId: "G-2WG7WEV833"
};
// Inicializar Firebase
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase inicializado correctamente');
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
}

class ControladorMapaForo {
    constructor() {
        // Verificar que Firebase esté inicializado
        if (!db) {
            console.error('❌ Firebase no está inicializado');
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de configuración',
                    text: 'No se pudo conectar con la base de datos. Por favor, contacta al administrador.'
                });
            }
            return;
        }

        // Verificar que Leaflet esté cargado
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet no está cargado');
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de mapa',
                    text: 'La biblioteca de mapas no se cargó correctamente.'
                });
            }
            return;
        }

        this.mapa = null;
        this.marcadores = [];
        this.publicaciones = [];
        this.layerGroup = null;
        this.geocoderCache = new Map();
        
        // Límites de México
        this.mexicoBounds = {
            north: 32.718,
            south: 14.532,
            west: -118.455,
            east: -86.711
        };
        
        // Centro en Nezahualcóyotl
        this.centroNeza = [19.4056, -98.9889];
        
        // Elementos DOM
        this.filtroTipo = document.getElementById('filtroTipoMapa');
        this.filtroTiempo = document.getElementById('filtroTiempo');
        this.btnActualizar = document.getElementById('btnActualizarMapa');
        this.btnMiUbicacion = document.getElementById('btnMiUbicacion');
        
        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.inicializar());
        } else {
            this.inicializar();
        }
    }

    async inicializar() {
        console.log('🚀 Inicializando ControladorMapaForo...');
        
        // Esperar a que el elemento del mapa exista
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('❌ Elemento #map no encontrado en el DOM');
            return;
        }
        
        await this.inicializarMapa();
        this.configurarEventos();
        await this.cargarPublicaciones();
        
        console.log('✅ Mapa inicializado correctamente');
    }

    inicializarMapa() {
        return new Promise((resolve) => {
            try {
                // Verificar que el elemento #map exista
                const mapContainer = document.getElementById('map');
                if (!mapContainer) {
                    console.error('❌ Contenedor del mapa no encontrado');
                    resolve();
                    return;
                }

                // Crear mapa centrado en Nezahualcóyotl
                this.mapa = L.map('map', {
                    center: this.centroNeza,
                    zoom: 13,
                    maxBounds: [
                        [this.mexicoBounds.south, this.mexicoBounds.west],
                        [this.mexicoBounds.north, this.mexicoBounds.east]
                    ],
                    maxBoundsViscosity: 1.0
                });
                
                // Capa de OpenStreetMap
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PawPath',
                    language: 'es'
                }).addTo(this.mapa);

                // Agregar escala
                L.control.scale({ imperial: false, metric: true }).addTo(this.mapa);

                // Crear grupo de capas para marcadores
                this.layerGroup = L.layerGroup().addTo(this.mapa);
                
                console.log('✅ Mapa creado exitosamente');
                resolve();
            } catch (error) {
                console.error('❌ Error creando el mapa:', error);
                resolve();
            }
        });
    }

    configurarEventos() {
        if (this.btnActualizar) {
            this.btnActualizar.addEventListener('click', () => this.cargarPublicaciones());
        }
        
        if (this.btnMiUbicacion) {
            this.btnMiUbicacion.addEventListener('click', () => this.irAMiUbicacion());
        }
    }

    irAMiUbicacion() {
        if (navigator.geolocation) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Obteniendo ubicación',
                    text: 'Por favor espera...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.mapa.setView([latitude, longitude], 15);
                    
                    if (typeof Swal !== 'undefined') {
                        Swal.close();
                    }
                    
                    // Agregar marcador temporal de tu ubicación
                    const ubicacionIcon = L.divIcon({
                        className: 'ubicacion-actual',
                        html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
                        iconSize: [16, 16]
                    });
                    
                    L.marker([latitude, longitude], { icon: ubicacionIcon })
                        .addTo(this.mapa)
                        .bindPopup('📍 Tu ubicación actual')
                        .openPopup();
                },
                (error) => {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'No se pudo obtener tu ubicación. Por favor, verifica los permisos.'
                        });
                    }
                }
            );
        } else {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'No soportado',
                    text: 'Tu navegador no soporta geolocalización'
                });
            }
        }
    }

    async cargarPublicaciones() {
        if (!db) {
            console.error('❌ Firebase no disponible');
            return;
        }

        try {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Cargando mapa...',
                    text: 'Buscando mascotas perdidas en tu área',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            }

            const pubsRef = collection(db, 'publicaciones');
            let q = query(pubsRef, orderBy('fechaPublicacion', 'desc'));

            // Aplicar filtro por tipo si existe
            if (this.filtroTipo && this.filtroTipo.value && this.filtroTipo.value !== '') {
                q = query(pubsRef, 
                    where('tipo', '==', this.filtroTipo.value), 
                    orderBy('fechaPublicacion', 'desc')
                );
            }

            const querySnapshot = await getDocs(q);
            this.publicaciones = [];
            
            querySnapshot.forEach((doc) => {
                this.publicaciones.push({ 
                    id: doc.id, 
                    ...doc.data() 
                });
            });

            // Aplicar filtro de tiempo
            if (this.filtroTiempo && this.filtroTiempo.value && parseInt(this.filtroTiempo.value) > 0) {
                const fechaLimite = new Date();
                fechaLimite.setDate(fechaLimite.getDate() - parseInt(this.filtroTiempo.value));
                
                this.publicaciones = this.publicaciones.filter(pub => {
                    if (!pub.fechaPublicacion) return false;
                    const fechaPub = pub.fechaPublicacion.toDate ? pub.fechaPublicacion.toDate() : new Date(pub.fechaPublicacion);
                    return fechaPub >= fechaLimite;
                });
            }

            console.log(`📊 Cargadas ${this.publicaciones.length} publicaciones`);
            
            await this.procesarUbicaciones();
            this.actualizarEstadisticas();
            
            if (typeof Swal !== 'undefined') {
                Swal.close();
            }
            
            if (this.marcadores.length === 0 && typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin resultados',
                    text: 'No hay mascotas reportadas en esta área',
                    timer: 3000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error("❌ Error cargando publicaciones:", error);
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudieron cargar las publicaciones. Verifica tu conexión.'
                });
            }
        }
    }

    async procesarUbicaciones() {
        if (!this.layerGroup) return;
        
        // Limpiar marcadores anteriores
        this.layerGroup.clearLayers();
        this.marcadores = [];

        for (const pub of this.publicaciones) {
            let coordenadas = null;
            
            // Caso 1: Ya tiene coordenadas guardadas
            if (pub.ubicacion && pub.ubicacion.lat && pub.ubicacion.lng) {
                coordenadas = [pub.ubicacion.lat, pub.ubicacion.lng];
            }
            // Caso 2: Tiene dirección pero no coordenadas
            else if (pub.direccion || pub.ubicacionTexto) {
                const direccion = pub.direccion || pub.ubicacionTexto;
                coordenadas = await this.geocodificarDireccion(direccion);
            }
            
            // Si tenemos coordenadas, crear marcador
            if (coordenadas && this.estaEnMexico(coordenadas)) {
                const marcador = this.crearMarcador(pub, coordenadas);
                this.layerGroup.addLayer(marcador);
                this.marcadores.push(marcador);
            }
        }

        // Ajustar zoom si hay marcadores
        if (this.marcadores.length > 0 && this.mapa) {
            try {
                const group = L.featureGroup(this.marcadores);
                this.mapa.fitBounds(group.getBounds().pad(0.1));
            } catch (error) {
                console.warn('Error ajustando bounds:', error);
                this.mapa.setView(this.centroNeza, 13);
            }
        } else if (this.mapa) {
            this.mapa.setView(this.centroNeza, 13);
        }
    }

    async geocodificarDireccion(direccion) {
        if (!direccion) return null;
        
        // Verificar cache
        if (this.geocoderCache.has(direccion)) {
            return this.geocoderCache.get(direccion);
        }

        try {
            // Usar Nominatim de OpenStreetMap
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion + ', México')}&limit=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'PawPath-App/1.0'
                }
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                this.geocoderCache.set(direccion, coords);
                return coords;
            }
        } catch (error) {
            console.error('Error geocodificando:', direccion, error);
        }
        
        return null;
    }

    estaEnMexico(coordenadas) {
        const [lat, lng] = coordenadas;
        return lat >= this.mexicoBounds.south && 
               lat <= this.mexicoBounds.north && 
               lng >= this.mexicoBounds.west && 
               lng <= this.mexicoBounds.east;
    }

    crearMarcador(pub, coordenadas) {
        const [lat, lng] = coordenadas;
        
        const icono = this.obtenerIcono(pub.tipo);
        const marcador = L.marker([lat, lng], { icon: icono });
        
        const foto = pub.fotos && pub.fotos[0] ? pub.fotos[0] : 'https://via.placeholder.com/100x80?text=No+Image';
        
        const popupContent = this.crearPopupContent(pub, foto);
        marcador.bindPopup(popupContent, {
            maxWidth: 300,
            minWidth: 250
        });

        const tooltipContent = this.crearTooltipContent(pub);
        marcador.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -30]
        });

        marcador.on('click', () => {
            window.open(`/user/visitor/detalleForo/detallesforo.html?id=${pub.id}`, '_blank');
        });

        return marcador;
    }

    obtenerIcono(tipo) {
        const colores = {
            'Mascota Perdida': '#ef4444',
            'En Adopción': '#10b981',
            'Avistamiento': '#8b5cf6',
            'Consejo de Cuidado': '#3b82f6',
            'Galería de Fotos': '#f59e0b'
        };

        const iconosFA = {
            'Mascota Perdida': 'fa-search',
            'En Adopción': 'fa-home',
            'Avistamiento': 'fa-eye',
            'Consejo de Cuidado': 'fa-lightbulb',
            'Galería de Fotos': 'fa-camera'
        };

        const color = colores[tipo] || '#3b82f6';
        const iconoFA = iconosFA[tipo] || 'fa-paw';

        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                background-color: ${color};
                width: 36px;
                height: 36px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                cursor: pointer;
            ">
                <i class="fas ${iconoFA}" style="
                    color: white;
                    transform: rotate(45deg);
                    font-size: 16px;
                "></i>
            </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
        });
    }

    crearPopupContent(pub, foto) {
        const tipoColor = this.obtenerColorTipo(pub.tipo);
        const fechaTexto = pub.fechaPublicacion ? 
            (pub.fechaPublicacion.toDate ? 
                new Date(pub.fechaPublicacion.toDate()).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                }) : 
                new Date(pub.fechaPublicacion).toLocaleDateString('es-MX')
            ) : 'Fecha no disponible';
        
        return `
            <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 250px;">
                <div style="position: relative;">
                    <img src="${foto}" alt="${pub.titulo || 'Sin título'}" 
                         style="width:100%; height:120px; object-fit:cover; border-radius:8px 8px 0 0;">
                    <span style="position: absolute; top: 8px; right: 8px; 
                               background: ${tipoColor}; color: white; 
                               padding: 4px 8px; border-radius: 20px; 
                               font-size: 11px; font-weight: 600;">
                        ${pub.tipo || 'Sin tipo'}
                    </span>
                </div>
                <div style="padding: 12px;">
                    <h3 style="margin:0 0 8px 0; font-size:16px; font-weight:700;">${pub.titulo || 'Sin título'}</h3>
                    <p style="margin:0 0 8px 0; font-size:13px; color:#666;">
                        ${pub.descripcion ? pub.descripcion.substring(0, 100) : 'Sin descripción'}...
                    </p>
                    <div style="display:flex; justify-content:space-around; margin:12px 0; padding:8px 0; border-top:1px solid #eee; border-bottom:1px solid #eee;">
                        <span style="font-size:12px;"><i class="fas fa-eye"></i> ${pub.vistas || 0}</span>
                        <span style="font-size:12px;"><i class="fas fa-heart" style="color:#ef4444;"></i> ${pub.likes || 0}</span>
                        <span style="font-size:12px;"><i class="fas fa-comment"></i> ${pub.comentarios || 0}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:#999;">
                        <i class="fas fa-map-pin"></i>
                        <span>${pub.direccion || pub.ubicacionTexto || 'Ubicación no especificada'}</span>
                    </div>
                    <small style="display:block; margin-top:8px; color:#999;">
                        <i class="fas fa-clock"></i> ${fechaTexto}
                    </small>
                </div>
            </div>
        `;
    }

    crearTooltipContent(pub) {
        const tipoColor = this.obtenerColorTipo(pub.tipo);
        return `
            <div style="
                background: white;
                padding: 10px 15px;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                border-left: 4px solid ${tipoColor};
                min-width: 220px;
                font-family: 'Plus Jakarta Sans', sans-serif;
            ">
                <strong style="font-size:14px; display:block; margin-bottom:4px;">${pub.titulo || 'Sin título'}</strong>
                <div style="font-size:12px; color:#666; margin-bottom:6px;">
                    <span style="display:inline-block; padding:2px 8px; background:#f0f0f0; border-radius:12px;">
                        ${pub.tipo || 'Sin tipo'}
                    </span>
                </div>
                <div style="font-size:11px; color:#999; display:flex; align-items:center; gap:4px;">
                    <i class="fas fa-map-marker-alt" style="color: ${tipoColor};"></i>
                    <span>${pub.direccion || pub.ubicacionTexto || 'Ubicación guardada'}</span>
                </div>
                ${pub.raza ? `<div style="font-size:11px; color:#999; margin-top:4px;">
                    <i class="fas fa-paw"></i> ${pub.raza}
                </div>` : ''}
            </div>
        `;
    }

    obtenerColorTipo(tipo) {
        const colores = {
            'Mascota Perdida': '#ef4444',
            'En Adopción': '#10b981',
            'Avistamiento': '#8b5cf6',
            'Consejo de Cuidado': '#3b82f6',
            'Galería de Fotos': '#f59e0b'
        };
        return colores[tipo] || '#3b82f6';
    }

    actualizarEstadisticas() {
        const totalEl = document.getElementById('totalMarcadores');
        const perdidasEl = document.getElementById('totalPerdidas');
        const adopcionEl = document.getElementById('totalAdopcion');
        const avistamientosEl = document.getElementById('totalAvistamientos');
        
        if (totalEl) totalEl.textContent = this.publicaciones.length;
        
        const perdidas = this.publicaciones.filter(p => p.tipo === 'Mascota Perdida').length;
        const adopcion = this.publicaciones.filter(p => p.tipo === 'En Adopción').length;
        const avistamientos = this.publicaciones.filter(p => p.tipo === 'Avistamiento').length;
        
        if (perdidasEl) perdidasEl.textContent = perdidas;
        if (adopcionEl) adopcionEl.textContent = adopcion;
        if (avistamientosEl) avistamientosEl.textContent = avistamientos;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📱 DOM cargado, inicializando mapa...');
        new ControladorMapaForo();
    });
} else {
    console.log('📱 DOM ya cargado, inicializando mapa...');
    new ControladorMapaForo();
}