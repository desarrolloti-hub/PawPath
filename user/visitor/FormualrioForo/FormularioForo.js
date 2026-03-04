// /user/visitor/FormularioForo/FormularioForo.js
import FormularioForo from '/classes/FormularioForo.js';

class ControladorFormularioForo {
    constructor() {
        this.btnGuardar = document.getElementById('btnGuardar');
        this.publicacionId = document.getElementById('publicacionId');
        this.titulo = document.getElementById('titulo');
        this.tipo = document.getElementById('tipo');
        this.descripcion = document.getElementById('descripcion');
        this.categoria = document.getElementById('categoria');
        this.ubicacionTexto = document.getElementById('ubicacionTexto');
        this.contacto = document.getElementById('contacto');
        this.recompensa = document.getElementById('recompensa');
        this.fechaEvento = document.getElementById('fechaEvento');
        this.fotosInput = document.getElementById('fotos');
        this.fotosPreview = document.getElementById('fotosPreview');
        
        this.seccionMapa = document.getElementById('seccionMapa');
        this.coordenadasLat = document.getElementById('coordenadasLat');
        this.coordenadasLng = document.getElementById('coordenadasLng');
        this.coordenadasTexto = document.getElementById('coordenadasTexto');
        this.btnMiUbicacion = document.getElementById('btnMiUbicacion');
        
        this.recompensaGroup = document.getElementById('recompensaGroup');
        this.fechaEventoGroup = document.getElementById('fechaEventoGroup');
        
        this.fotosCount = document.getElementById('fotosCount');
        this.maxFotos = 5;
        this.fotosSeleccionadas = [];
        
        this.mapa = null;
        this.marcador = null;
        
        this.usuarioId = this.obtenerUsuarioId();
        this.usuarioNombre = this.obtenerUsuarioNombre();
        
        this.inicializar();
    }
    
    obtenerUsuarioId() {
        try {
            const sessionData = localStorage.getItem('userAuth');
            if (sessionData) {
                const parsedData = JSON.parse(sessionData);
                return parsedData.userId || parsedData.uid || 'usuario_demo';
            }
            return 'usuario_demo_' + Date.now();
        } catch (error) {
            return 'usuario_demo_' + Date.now();
        }
    }
    
    obtenerUsuarioNombre() {
        try {
            const sessionData = localStorage.getItem('userAuth');
            if (sessionData) {
                const parsedData = JSON.parse(sessionData);
                return parsedData.userName || parsedData.displayName || parsedData.email || 'Usuario';
            }
            return 'Usuario Demo';
        } catch (error) {
            return 'Usuario Demo';
        }
    }
    
    inicializar() {
        this.configurarEventos();
        this.cargarDatosSiEdicion();
    }
    
    configurarEventos() {
        this.btnGuardar.addEventListener('click', () => this.guardarPublicacion());
        this.tipo.addEventListener('change', () => this.actualizarCamposPorTipo());
        this.fotosInput.addEventListener('change', (e) => this.previewFotos(e));
        
        if (this.btnMiUbicacion) {
            this.btnMiUbicacion.addEventListener('click', () => this.obtenerMiUbicacion());
        }
    }
    
    cargarDatosSiEdicion() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        
        if (id) {
            this.cargarDatosPublicacion(id);
        }
    }
    
    actualizarCamposPorTipo() {
        const tipoSeleccionado = this.tipo.value;
        
        if (tipoSeleccionado === 'Mascota Perdida' || tipoSeleccionado === 'En Adopción') {
            this.seccionMapa.style.display = 'block';
            setTimeout(() => {
                if (!this.mapa) {
                    this.inicializarMapa();
                } else {
                    this.mapa.invalidateSize();
                }
            }, 100);
        } else {
            this.seccionMapa.style.display = 'none';
        }
        
        if (tipoSeleccionado === 'Mascota Perdida') {
            this.recompensaGroup.style.display = 'block';
            this.fechaEventoGroup.style.display = 'block';
        } else {
            this.recompensaGroup.style.display = 'none';
            this.fechaEventoGroup.style.display = 'none';
        }
    }
    
    inicializarMapa() {
        const mapaContainer = document.getElementById('mapa');
        if (!mapaContainer) return;
        
        const latDefault = 19.4326;
        const lngDefault = -99.1332;
        
        this.mapa = L.map('mapa').setView([latDefault, lngDefault], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.mapa);
        
        this.mapa.on('click', (e) => {
            const { lat, lng } = e.latlng;
            this.colocarMarcador(lat, lng);
        });
        
        if (this.coordenadasLat.value && this.coordenadasLng.value) {
            const lat = parseFloat(this.coordenadasLat.value);
            const lng = parseFloat(this.coordenadasLng.value);
            this.colocarMarcador(lat, lng);
            this.mapa.setView([lat, lng], 15);
        }
    }
    
    colocarMarcador(lat, lng) {
        if (this.marcador) {
            this.mapa.removeLayer(this.marcador);
        }
        
        this.marcador = L.marker([lat, lng]).addTo(this.mapa);
        
        this.coordenadasLat.value = lat;
        this.coordenadasLng.value = lng;
        this.coordenadasTexto.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        
        this.obtenerDireccionDesdeCoordenadas(lat, lng);
    }
    
    async obtenerDireccionDesdeCoordenadas(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            
            if (data.display_name) {
                this.ubicacionTexto.value = data.display_name;
            }
        } catch (error) {
            console.error('Error obteniendo dirección:', error);
        }
    }
    
    obtenerMiUbicacion() {
        if (!navigator.geolocation) {
            this.mostrarAlerta('Error', 'Tu navegador no soporta geolocalización', 'error');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                if (!this.mapa) {
                    this.inicializarMapa();
                }
                
                this.colocarMarcador(latitude, longitude);
                this.mapa.setView([latitude, longitude], 16);
            },
            (error) => {
                let mensaje = 'Error obteniendo ubicación';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        mensaje = 'Permiso de ubicación denegado';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        mensaje = 'Información de ubicación no disponible';
                        break;
                    case error.TIMEOUT:
                        mensaje = 'Tiempo de espera agotado';
                        break;
                }
                this.mostrarAlerta('Error', mensaje, 'error');
            }
        );
    }
    
    async cargarDatosPublicacion(id) {
        try {
            const publicacion = new FormularioForo();
            const resultado = await publicacion.cargar(id);
            
            if (resultado.success) {
                this.publicacionId.value = publicacion.id;
                this.titulo.value = publicacion.titulo;
                this.tipo.value = publicacion.tipo;
                this.descripcion.value = publicacion.descripcion;
                this.categoria.value = publicacion.categoria;
                this.ubicacionTexto.value = publicacion.ubicacionTexto || '';
                this.contacto.value = publicacion.contacto;
                this.recompensa.value = publicacion.recompensa || '';
                this.fechaEvento.value = publicacion.fechaEvento || '';
                
                if (publicacion.coordenadas) {
                    this.coordenadasLat.value = publicacion.coordenadas.lat;
                    this.coordenadasLng.value = publicacion.coordenadas.lng;
                }
                
                this.fotosSeleccionadas = [...publicacion.fotos];
                this.mostrarPreviewsFotos();
                this.actualizarCamposPorTipo();
                
                setTimeout(() => {
                    if (this.mapa && publicacion.coordenadas) {
                        this.colocarMarcador(publicacion.coordenadas.lat, publicacion.coordenadas.lng);
                        this.mapa.setView([publicacion.coordenadas.lat, publicacion.coordenadas.lng], 15);
                    }
                }, 200);
                
                this.btnGuardar.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
            }
        } catch (error) {
            console.error('Error cargando publicación:', error);
        }
    }
    
    async guardarPublicacion() {
        if (!this.usuarioId) {
            this.mostrarAlerta('Error', 'Debes iniciar sesión para publicar', 'error');
            return;
        }
        
        const tipoSeleccionado = this.tipo.value;
        if ((tipoSeleccionado === 'Mascota Perdida' || tipoSeleccionado === 'En Adopción') && 
            (!this.coordenadasLat.value || !this.coordenadasLng.value)) {
            this.mostrarAlerta('Error', 'Debes seleccionar una ubicación en el mapa', 'warning');
            return;
        }
        
        const coordenadas = (this.coordenadasLat.value && this.coordenadasLng.value) ? {
            lat: parseFloat(this.coordenadasLat.value),
            lng: parseFloat(this.coordenadasLng.value)
        } : null;
        
        const publicacion = new FormularioForo(
            this.titulo.value,
            this.tipo.value,
            this.descripcion.value,
            this.categoria.value,
            this.ubicacionTexto.value,
            coordenadas,
            this.contacto.value,
            this.recompensa.value,
            this.fotosSeleccionadas,
            this.fechaEvento.value || null,
            this.usuarioId,
            this.usuarioNombre,
            this.publicacionId.value || null
        );
        
        const validacion = publicacion.validar();
        if (!validacion.valido) {
            this.mostrarAlerta('Campos requeridos', validacion.errores.join('<br>'), 'warning');
            return;
        }
        
        Swal.fire({
            title: 'Publicando...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const resultado = await publicacion.guardar();
        Swal.close();
        
        if (resultado.success) {
            this.mostrarAlerta('Éxito', resultado.message, 'success');
            setTimeout(() => {
                window.location.href = '/user/visitor/foro/foro.html';
            }, 1500);
        } else {
            this.mostrarAlerta('Error', resultado.error, 'error');
        }
    }
    
    previewFotos(event) {
        const files = Array.from(event.target.files);
        
        if (this.fotosSeleccionadas.length + files.length > this.maxFotos) {
            this.mostrarAlerta('Límite de fotos', `Solo puedes subir máximo ${this.maxFotos} fotos`, 'warning');
            return;
        }
        
        files.forEach(file => {
            if (file.size > 2 * 1024 * 1024) {
                this.mostrarAlerta('Archivo muy grande', 'Cada foto no debe superar los 2MB', 'warning');
                return;
            }
            
            if (!file.type.startsWith('image/')) {
                this.mostrarAlerta('Tipo no válido', 'Solo se permiten imágenes', 'warning');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                this.fotosSeleccionadas.push(e.target.result);
                this.mostrarPreviewsFotos();
            };
            reader.readAsDataURL(file);
        });
        
        event.target.value = '';
    }
    
    mostrarPreviewsFotos() {
        this.fotosPreview.innerHTML = '';
        this.fotosCount.textContent = `${this.fotosSeleccionadas.length}/${this.maxFotos}`;
        
        this.fotosSeleccionadas.forEach((foto, index) => {
            const container = document.createElement('div');
            container.className = 'foto-preview-item';
            container.innerHTML = `
                <img src="${foto}">
                <button class="btn-eliminar-foto" data-index="${index}"><i class="fas fa-times"></i></button>
            `;
            container.querySelector('.btn-eliminar-foto').addEventListener('click', () => {
                this.fotosSeleccionadas.splice(index, 1);
                this.mostrarPreviewsFotos();
            });
            this.fotosPreview.appendChild(container);
        });
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

document.addEventListener('DOMContentLoaded', () => {
    new ControladorFormularioForo();
});