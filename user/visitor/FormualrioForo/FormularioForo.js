// /user/visitor/FormularioForo/FormularioForo.js
import FormularioForo from '/classes/FormularioForo.js';
import { auth } from '/config/firebase-config.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import { db } from '/config/firebase-config.js';

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
        
        this.usuarioId = null;
        this.usuarioNombre = null;
        this.usuarioData = null;
        
        this.inicializar();
    }
    
    async obtenerDatosUsuario() {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.usuarioId = user.uid;
                    console.log('✅ Usuario autenticado UID:', this.usuarioId);
                    
                    try {
                        const usersRef = collection(db, 'users');
                        const q = query(usersRef, where('uid', '==', user.uid));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                            this.usuarioData = querySnapshot.docs[0].data();
                            console.log('📝 Datos del usuario desde Firestore:', this.usuarioData);
                            
                            const nombre = this.usuarioData.user_primer_nombre || 
                                          this.usuarioData.primer_nombre || 
                                          this.usuarioData.nombre || 
                                          '';
                            const apellido = this.usuarioData.user_appellido_paterno || 
                                            this.usuarioData.apellido_paterno || 
                                            this.usuarioData.apellido || 
                                            '';
                            
                            if (nombre && apellido) {
                                this.usuarioNombre = `${nombre} ${apellido}`;
                            } else if (nombre) {
                                this.usuarioNombre = nombre;
                            } else if (user.displayName) {
                                this.usuarioNombre = user.displayName;
                            } else {
                                this.usuarioNombre = user.email?.split('@')[0] || 'Usuario';
                            }
                        } else {
                            console.log('⚠️ Usuario no encontrado en Firestore, usando datos de Auth');
                            if (user.displayName) {
                                this.usuarioNombre = user.displayName;
                            } else {
                                this.usuarioNombre = user.email?.split('@')[0] || 'Usuario';
                            }
                        }
                        
                        console.log('👤 Nombre del usuario que se guardará:', this.usuarioNombre);
                        
                    } catch (error) {
                        console.error('❌ Error obteniendo datos del usuario:', error);
                        this.usuarioNombre = user.displayName || user.email?.split('@')[0] || 'Usuario';
                    }
                    
                    resolve(true);
                } else {
                    console.warn('⚠️ No hay usuario autenticado');
                    this.usuarioId = null;
                    this.usuarioNombre = null;
                    resolve(false);
                }
                
                unsubscribe();
            });
        });
    }
    
    async inicializar() {
        const usuarioAutenticado = await this.obtenerDatosUsuario();
        
        if (!usuarioAutenticado) {
            this.mostrarMensajeNoAutenticado();
            this.btnGuardar.disabled = true;
            this.btnGuardar.style.opacity = '0.5';
            this.btnGuardar.style.cursor = 'not-allowed';
        }
        
        this.configurarEventos();
        this.cargarDatosSiEdicion();
    }
    
    mostrarMensajeNoAutenticado() {
        const formContainer = document.querySelector('.form-container');
        const mensajeNoAuth = document.createElement('div');
        mensajeNoAuth.style.cssText = `
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 20px 32px;
            border-radius: 12px;
            text-align: center;
        `;
        mensajeNoAuth.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; color: #f59e0b; margin-bottom: 10px; display: block;"></i>
            <strong style="color: #92400e;">¡Inicia sesión para publicar!</strong>
            <p style="color: #b45309; margin-top: 8px;">Debes iniciar sesión para crear publicaciones en PawPath</p>
            <button id="btnIrLogin" class="btn btn-primary btn-sm" style="margin-top: 12px; background: #f59e0b;">
                <i class="fas fa-sign-in-alt"></i> Iniciar sesión
            </button>
        `;
        
        const formHeader = document.querySelector('.form-header');
        if (formHeader && formContainer) {
            formContainer.insertBefore(mensajeNoAuth, formHeader.nextSibling);
            
            document.getElementById('btnIrLogin')?.addEventListener('click', () => {
                window.location.href = '/login.html';
            });
        }
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
        this.coordenadasTexto.textContent = `📍 Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        
        this.obtenerDireccionDesdeCoordenadas(lat, lng);
    }
    
    async obtenerDireccionDesdeCoordenadas(lat, lng) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
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
        
        Swal.fire({
            title: 'Obteniendo ubicación',
            text: 'Por favor espera...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                Swal.close();
                const { latitude, longitude } = position.coords;
                
                if (!this.mapa) {
                    this.inicializarMapa();
                }
                
                this.colocarMarcador(latitude, longitude);
                this.mapa.setView([latitude, longitude], 16);
            },
            (error) => {
                Swal.close();
                let mensaje = 'Error obteniendo ubicación';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        mensaje = 'Permiso de ubicación denegado. Actívalo para usar esta función';
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
                this.categoria.value = publicacion.categoria || '';
                this.ubicacionTexto.value = publicacion.ubicacionTexto || '';
                this.contacto.value = publicacion.contacto;
                this.recompensa.value = publicacion.recompensa || '';
                this.fechaEvento.value = publicacion.fechaEvento || '';
                
                if (publicacion.coordenadas) {
                    this.coordenadasLat.value = publicacion.coordenadas.lat;
                    this.coordenadasLng.value = publicacion.coordenadas.lng;
                }
                
                this.fotosSeleccionadas = [...(publicacion.fotos || [])];
                this.mostrarPreviewsFotos();
                this.actualizarCamposPorTipo();
                
                setTimeout(() => {
                    if (this.mapa && publicacion.coordenadas) {
                        this.colocarMarcador(publicacion.coordenadas.lat, publicacion.coordenadas.lng);
                        this.mapa.setView([publicacion.coordenadas.lat, publicacion.coordenadas.lng], 15);
                    }
                }, 200);
                
                this.btnGuardar.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar publicación';
            }
        } catch (error) {
            console.error('Error cargando publicación:', error);
            this.mostrarAlerta('Error', 'No se pudo cargar la publicación', 'error');
        }
    }
    
    async guardarPublicacion() {
        if (!this.usuarioId) {
            const result = await Swal.fire({
                title: "🐾 ¡Inicia sesión!",
                html: `
                    <div style="text-align: center;">
                        <i class="fas fa-lock" style="font-size: 48px; color: #3b82f6; margin-bottom: 15px;"></i>
                        <p style="margin-bottom: 10px;">Debes iniciar sesión para <strong>publicar en PawPath</strong></p>
                        <p style="color: #64748b;">¡Regístrate y comparte con la comunidad!</p>
                    </div>
                `,
                icon: "warning",
                confirmButtonText: "Iniciar sesión",
                cancelButtonText: "Cancelar",
                showCancelButton: true,
                confirmButtonColor: "#3b82f6",
                cancelButtonColor: "#64748b",
                allowOutsideClick: false
            });
            
            if (result.isConfirmed) {
                window.location.href = "/login.html";
            }
            return;
        }
        
        const tipoSeleccionado = this.tipo.value;
        if (!tipoSeleccionado) {
            this.mostrarAlerta('Campos requeridos', 'Selecciona un tipo de publicación', 'warning');
            return;
        }
        
        if ((tipoSeleccionado === 'Mascota Perdida' || tipoSeleccionado === 'En Adopción') && 
            (!this.coordenadasLat.value || !this.coordenadasLng.value)) {
            this.mostrarAlerta('Ubicación requerida', 'Debes seleccionar una ubicación en el mapa', 'warning');
            return;
        }
        
        const coordenadas = (this.coordenadasLat.value && this.coordenadasLng.value) ? {
            lat: parseFloat(this.coordenadasLat.value),
            lng: parseFloat(this.coordenadasLng.value)
        } : null;
        
        const publicacion = new FormularioForo(
            this.titulo.value,
            tipoSeleccionado,
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
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const resultado = await publicacion.guardar();
        Swal.close();
        
        if (resultado.success) {
            Swal.fire({
                icon: 'success',
                title: '¡Publicado!',
                text: resultado.message,
                confirmButtonColor: '#3b82f6',
                timer: 2000,
                showConfirmButton: true
            }).then(() => {
                window.location.href = '/user/visitor/foro/foro.html';
            });
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
                <button class="btn-eliminar-foto" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.querySelector('.btn-eliminar-foto').addEventListener('click', (e) => {
                e.stopPropagation();
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
            html: mensaje,
            confirmButtonColor: '#3b82f6'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ControladorFormularioForo();
});