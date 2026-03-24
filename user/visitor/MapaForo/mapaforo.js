import { db } from '/config/firebase-config.js';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    orderBy 
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

class ControladorMapaForo {
    constructor() {
        this.mapa = null;
        this.marcadores = [];
        this.publicaciones = [];
        this.layerGroup = null;
        this.geocoderCache = new Map(); // Cache para direcciones ya geocodificadas
        
        // Límites de México (para restringir el mapa)
        this.mexicoBounds = {
            north: 32.718,  // Frontera norte
            south: 14.532,  // Frontera sur
            west: -118.455, // Baja California
            east: -86.711   // Quintana Roo
        };
        
        // Centro en Nezahualcóyotl
        this.centroNeza = [19.4056, -98.9889];
        
        // Elementos DOM
        this.filtroTipo = document.getElementById('filtroTipoMapa');
        this.filtroTiempo = document.getElementById('filtroTiempo');
        this.btnActualizar = document.getElementById('btnActualizarMapa');
        this.btnMiUbicacion = document.getElementById('btnMiUbicacion');
        
        this.inicializar();
    }

    async inicializar() {
        await this.inicializarMapa();
        this.configurarEventos();
        await this.cargarPublicaciones();
    }

    inicializarMapa() {
        return new Promise((resolve) => {
            // Crear mapa centrado en Nezahualcóyotl
            this.mapa = L.map('map', {
                center: this.centroNeza,
                zoom: 13,
                maxBounds: [
                    [this.mexicoBounds.south, this.mexicoBounds.west],
                    [this.mexicoBounds.north, this.mexicoBounds.east]
                ],
                maxBoundsViscosity: 1.0 // Hace que los límites sean estrictos
            });
            
            // Capa de OpenStreetMap en español
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | PawPath',
                language: 'es'
            }).addTo(this.mapa);

            // Agregar escala
            L.control.scale({ imperial: false, metric: true }).addTo(this.mapa);

            // Crear grupo de capas para marcadores
            this.layerGroup = L.layerGroup().addTo(this.mapa);
            
            resolve();
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
            Swal.fire({
                title: 'Obteniendo ubicación',
                text: 'Por favor espera...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.mapa.setView([latitude, longitude], 15);
                    Swal.close();
                    
                    // Agregar marcador temporal de tu ubicación
                    L.marker([latitude, longitude], {
                        icon: L.divIcon({
                            className: 'ubicacion-actual',
                            html: '<i class="fas fa-circle" style="color: #3b82f6; font-size: 16px;"></i>',
                            iconSize: [16, 16]
                        })
                    }).addTo(this.mapa)
                      .bindPopup('Tu ubicación actual')
                      .openPopup();
                },
                (error) => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'No se pudo obtener tu ubicación'
                    });
                }
            );
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'No soportado',
                text: 'Tu navegador no soporta geolocalización'
            });
        }
    }

    async cargarPublicaciones() {
        try {
            Swal.fire({
                title: 'Cargando mapa...',
                text: 'Buscando mascotas perdidas en tu área',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const pubsRef = collection(db, 'publicaciones');
            let q = query(pubsRef, orderBy('fechaPublicacion', 'desc'));

            // Aplicar filtro por tipo si existe
            if (this.filtroTipo && this.filtroTipo.value) {
                q = query(pubsRef, 
                    where('tipo', '==', this.filtroTipo.value), 
                    orderBy('fechaPublicacion', 'desc')
                );
            }

            const querySnapshot = await getDocs(q);
            this.publicaciones = [];
            
            // Primero, recolectar todas las publicaciones
            querySnapshot.forEach((doc) => {
                this.publicaciones.push({ 
                    id: doc.id, 
                    ...doc.data() 
                });
            });

            // Aplicar filtro de tiempo
            if (this.filtroTiempo && this.filtroTiempo.value > 0) {
                const fechaLimite = new Date();
                fechaLimite.setDate(fechaLimite.getDate() - parseInt(this.filtroTiempo.value));
                
                this.publicaciones = this.publicaciones.filter(pub => {
                    if (!pub.fechaPublicacion) return false;
                    const fechaPub = pub.fechaPublicacion.toDate();
                    return fechaPub >= fechaLimite;
                });
            }

            // Procesar ubicaciones
            await this.procesarUbicaciones();
            
            this.actualizarEstadisticas();
            
            Swal.close();
            
            if (this.marcadores.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin resultados',
                    text: 'No hay mascotas reportadas en esta área',
                    timer: 3000
                });
            }
        } catch (error) {
            console.error("Error cargando publicaciones:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar las publicaciones'
            });
        }
    }

    async procesarUbicaciones() {
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
            if (coordenadas) {
                // Verificar que esté dentro de México
                if (this.estaEnMexico(coordenadas)) {
                    const marcador = this.crearMarcador(pub, coordenadas);
                    this.layerGroup.addLayer(marcador);
                    this.marcadores.push(marcador);
                }
            }
        }

        // Ajustar zoom si hay marcadores
        if (this.marcadores.length > 0) {
            const group = L.featureGroup(this.marcadores);
            this.mapa.fitBounds(group.getBounds().pad(0.1));
        } else {
            // Si no hay marcadores, volver a Neza
            this.mapa.setView(this.centroNeza, 13);
        }
    }

    async geocodificarDireccion(direccion) {
        // Verificar cache
        if (this.geocoderCache.has(direccion)) {
            return this.geocoderCache.get(direccion);
        }

        try {
            // Usar Nominatim de OpenStreetMap para geocodificación (gratuito)
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion + ', México')}&limit=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'PawPath-App'
                }
            });
            
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
        
        // Determinar icono según el tipo
        const icono = this.obtenerIcono(pub.tipo);
        
        // Crear marcador
        const marcador = L.marker([lat, lng], { icon: icono });
        
        // Obtener primera foto o placeholder
        const foto = pub.fotos?.[0] || 'https://via.placeholder.com/100x80';
        
        // Crear popup (aparece al hacer click)
        const popupContent = this.crearPopupContent(pub, foto);
        marcador.bindPopup(popupContent, {
            maxWidth: 300,
            minWidth: 250
        });

        // Crear tooltip (aparece al hacer hover)
        const tooltipContent = this.crearTooltipContent(pub);
        marcador.bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -30],
            className: 'custom-tooltip'
        });

        // Agregar evento click para ir a detalles
        marcador.on('click', () => {
            window.open(`/user/visitor/foro/detallesforo.html?id=${pub.id}`, '_blank');
        });

        return marcador;
    }

    obtenerIcono(tipo) {
        // Iconos personalizados según tipo
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
                transition: transform 0.2s;
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
        return `
            <div class="map-popup" style="font-family: 'Plus Jakarta Sans', sans-serif;">
                <div class="popup-image" style="position: relative;">
                    <img src="${foto}" alt="${pub.titulo}" 
                         style="width:100%; height:120px; object-fit:cover; border-radius:8px 8px 0 0;">
                    <span style="position: absolute; top: 8px; right: 8px; 
                               background: ${tipoColor}; color: white; 
                               padding: 4px 8px; border-radius: 20px; 
                               font-size: 11px; font-weight: 600;">
                        ${pub.tipo}
                    </span>
                </div>
                <div class="popup-content" style="padding: 12px;">
                    <h3 style="margin:0 0 8px 0; font-size:16px; font-weight:700;">${pub.titulo}</h3>
                    <p style="margin:0 0 8px 0; font-size:13px; color:#666;">
                        ${pub.descripcion?.substring(0, 100)}...
                    </p>
                    <div style="display:flex; justify-content:space-around; margin:12px 0; padding:8px 0; border-top:1px solid #eee; border-bottom:1px solid #eee;">
                        <span style="font-size:12px;"><i class="fas fa-eye"></i> ${pub.vistas || 0}</span>
                        <span style="font-size:12px;"><i class="fas fa-heart" style="color:#ef4444;"></i> ${pub.likes || 0}</span>
                        <span style="font-size:12px;"><i class="fas fa-comment"></i> ${pub.comentarios || 0}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:#999;">
                        <i class="fas fa-map-pin"></i>
                        <span>${pub.direccion || 'Ubicación no especificada'}</span>
                    </div>
                    <small style="display:block; margin-top:8px; color:#999;">
                        <i class="fas fa-clock"></i> ${pub.fechaPublicacion ? new Date(pub.fechaPublicacion.toDate()).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        }) : 'Fecha no disponible'}
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
                <strong style="font-size:14px; display:block; margin-bottom:4px;">${pub.titulo}</strong>
                <div style="font-size:12px; color:#666; margin-bottom:6px;">
                    <span style="display:inline-block; padding:2px 8px; background:#f0f0f0; border-radius:12px;">
                        ${pub.tipo}
                    </span>
                </div>
                <div style="font-size:11px; color:#999; display:flex; align-items:center; gap:4px;">
                    <i class="fas fa-map-marker-alt" style="color: ${tipoColor};"></i>
                    <span>${pub.direccion || 'Ubicación guardada'}</span>
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
        document.getElementById('totalMarcadores').textContent = this.publicaciones.length;
        
        const perdidas = this.publicaciones.filter(p => p.tipo === 'Mascota Perdida').length;
        const adopcion = this.publicaciones.filter(p => p.tipo === 'En Adopción').length;
        const avistamientos = this.publicaciones.filter(p => p.tipo === 'Avistamiento').length;
        
        document.getElementById('totalPerdidas').textContent = perdidas;
        document.getElementById('totalAdopcion').textContent = adopcion;
        document.getElementById('totalAvistamientos').textContent = avistamientos;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => new ControladorMapaForo());