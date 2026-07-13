import { db, auth } from '/config/firebase-config.js';

// Importación modular estricta apuntando a la versión 11.6.0
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    doc,
    setDoc,
    updateDoc,
    addDoc,
    increment,
    arrayUnion,
    arrayRemove,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

class ControladorDetalles {
    constructor() {
        this.publicacionId = this.obtenerIdDeURL();
        this.usuarioActual = null;
        this.publicacion = null;

        // Elementos DOM
        this.detalleTitulo = document.getElementById('detalleTitulo');
        this.detalleImagenes = document.getElementById('detalleImagenes');
        this.detalleTipo = document.getElementById('detalleTipo');
        this.detalleCategoria = document.getElementById('detalleCategoria');
        this.detalleTiempo = document.getElementById('detalleTiempo');
        this.detalleDescripcion = document.getElementById('detalleDescripcion');
        this.detalleUbicacion = document.getElementById('detalleUbicacion');
        this.detalleContacto = document.getElementById('detalleContacto');
        this.detalleRecompensa = document.getElementById('detalleRecompensa');
        this.detalleVistas = document.getElementById('detalleVistas');
        this.detalleLikes = document.getElementById('detalleLikes');
        this.iconLike = document.getElementById('iconLike');
        this.detalleComentariosCount = document.getElementById('detalleComentariosCount');

        // Comentarios
        this.comentariosContainer = document.getElementById('comentariosContainer');
        this.nuevoComentario = document.getElementById('nuevoComentario');
        this.btnComentar = document.getElementById('btnComentar');

        // Exponer globalmente para los onClick del HTML
        window.controladorDetalles = this;

        this.inicializar();
    }

    obtenerIdDeURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    async inicializar() {
        if (!this.publicacionId) {
            Swal.fire('Error', 'No se encontró la publicación', 'error').then(() => window.history.back());
            return;
        }

        this.escucharAuth();
        await this.cargarPublicacion();
        await this.cargarComentarios();

    }

    escucharAuth() {
        auth.onAuthStateChanged((user) => {
            this.usuarioActual = user;

            // Habilitar o deshabilitar caja de comentarios según la sesión
            if (user) {
                this.btnComentar.disabled = false;
                this.nuevoComentario.disabled = false;
                this.nuevoComentario.placeholder = 'Escribe un comentario o actualización...';
            } else {
                this.btnComentar.disabled = true;
                this.nuevoComentario.disabled = true;
                this.nuevoComentario.placeholder = 'Inicia sesión para comentar...';
            }

            // Actualizar color del corazón si ya cargó la publicación
            if (this.publicacion) this.actualizarEstadoLikeUI();
        });
    }

    async cargarPublicacion() {
        try {
            console.log('🔍 Cargando publicación con ID:', this.publicacionId);

            const publicacionRef = doc(db, 'publicaciones', this.publicacionId);
            const publicacionSnap = await getDoc(publicacionRef);

            if (!publicacionSnap.exists()) {
                this.detalleTitulo.textContent = 'Publicación no encontrada';
                return;
            }

            this.publicacion = { id: publicacionSnap.id, ...publicacionSnap.data() };
            console.log('✅ Publicación cargada:', this.publicacion);

            // Incrementar vistas silenciosamente
            await updateDoc(publicacionRef, { vistas: increment(1) });
            this.publicacion.vistas = (this.publicacion.vistas || 0) + 1;

            this.mostrarPublicacion(this.publicacion);

        } catch (error) {
            console.error('Error cargando publicación:', error);
            Swal.fire('Error', 'Hubo un problema al cargar los detalles', 'error');
        }
    }

    mostrarPublicacion(pub) {
        console.log('🎨 Mostrando publicación:', pub);

        const tipoNormalizado = this.normalizarTipoPublicacion(pub.tipo);
        const tipoVisible = this.obtenerTipoVisible(pub.tipo);

        document.title = `${pub.titulo} - PawPath`;
        this.detalleTitulo.textContent = pub.titulo;
        this.detalleTipo.innerHTML = `<i class="fas fa-paw"></i> ${tipoVisible}`;

        let claseTipo = 'badge';
        if (tipoNormalizado === 'perdido') claseTipo += ' badge-danger';
        if (pub.tipo === 'En Adopción') claseTipo += ' badge-success';
        if (tipoNormalizado === 'adopcion' && !claseTipo.includes('badge-success')) claseTipo += ' badge-success';
        this.detalleTipo.className = claseTipo;

        this.detalleCategoria.innerHTML = `<i class="fas fa-tag"></i> ${pub.categoria || 'Sin categoría'}`;
        this.detalleDescripcion.textContent = pub.descripcion;
        this.detalleContacto.textContent = pub.contacto || 'No especificado';

        this.detalleVistas.textContent = pub.vistas;
        this.detalleLikes.textContent = pub.likes || 0;
        this.detalleComentariosCount.textContent = pub.comentarios || 0;

        this.actualizarEstadoLikeUI();

        // Galería de imágenes (AQUÍ ESTÁ LA MAGIA DEL MODAL)
        const fotosPublicacion = this.obtenerFotosPublicacion(pub);
        if (fotosPublicacion.length > 0) {
            this.detalleImagenes.innerHTML = fotosPublicacion.map(foto => `
                <img src="${foto}" alt="Foto" onclick="controladorDetalles.abrirImagenModal('${foto}')" title="Clic para ampliar" style="cursor: zoom-in;">
            `).join('');
        } else {
            this.detalleImagenes.innerHTML = `<img src="https://via.placeholder.com/600x400?text=Sin+imagen" alt="Sin imagen">`;
        }

        // Mapa de ubicación
        if (pub.coordenadas) {
            this.detalleUbicacion.innerHTML = `
                <h3><i class="fas fa-map-marker-alt"></i> Ubicación</h3>
                <div id="mapa" style="height: 250px; width: 100%; border-radius: 12px; margin-bottom: 10px; z-index: 1;"></div>
                <p>${pub.ubicacionTexto || 'Ubicación seleccionada en el mapa'}</p>
            `;
            setTimeout(() => {
                const mapa = L.map('mapa').setView([pub.coordenadas.lat, pub.coordenadas.lng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);
                L.marker([pub.coordenadas.lat, pub.coordenadas.lng]).addTo(mapa);
            }, 300);
        }

        // Recompensa
        if (pub.recompensa) {
            this.detalleRecompensa.innerHTML = `
                <h3><i class="fas fa-trophy" style="color:#f59e0b;"></i> Recompensa Ofrecida</h3>
                <p style="font-weight: bold; color: #f59e0b; font-size: 1.2rem;">${pub.recompensa}</p>
            `;
        }

        const btnContainer = document.getElementById('btnSolicitudContainer');
        let container = btnContainer;
        if (!container) {
            // Buscar dónde insertar el botón
            const detalleSeccion = document.querySelector('.detalle-seccion');
            if (detalleSeccion) {
                const newContainer = document.createElement('div');
                newContainer.id = 'btnSolicitudContainer';
                newContainer.style.marginTop = '20px';
                detalleSeccion.insertAdjacentElement('afterend', newContainer);
                container = newContainer;
            }
        }

        if (container && tipoNormalizado === 'adopcion') {
            container.innerHTML = `
                <button id="btnSolicitarAdopcion" style="background-color: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-size: 1rem; cursor: pointer;">
                    <i class="fas fa-paw"></i> Solicitar Adopcion
                </button>
                <br>
                <br>
            `;

            const btnSolicitar = document.getElementById('btnSolicitarAdopcion');
            if (btnSolicitar) {
                btnSolicitar.onclick = () => this.abrirModalSolicitudAdopcion(pub);
                if (this.usuarioActual) {
                    const solicitudesRef = collection(db, 'solicitudesAdopcion');
                    const q = query(
                        solicitudesRef,
                        where('publicacionId', '==', pub.id),
                        where('usuarioId', '==', this.usuarioActual.uid)
                    );
                    getDocs(q).then(querySnapshot => {
                        if (!querySnapshot.empty) {
                            this.marcarBotonCompletado(btnSolicitar, 'Solicitud enviada');
                        }
                    }).catch(err => console.error("Error al buscar solicitud previa:", err));
                }
            }
            return;
        }

        if (container && tipoNormalizado === 'encontrado') {
            container.innerHTML = `
                <button id="btnReclamarMascota" style="background-color: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-size: 1rem; cursor: pointer;">
                    <i class="fas fa-clipboard-list"></i> Reclamar esta mascota
                </button>
                <br>
                <br>
            `;

            const btnReclamar = document.getElementById('btnReclamarMascota');
            if (btnReclamar) {
                btnReclamar.onclick = () => this.abrirModalReclamo(pub);
                if (this.usuarioActual) {
                    this.existeInteraccion('reclamosMascotas', pub.id)
                        .then(existe => {
                            if (existe) this.marcarBotonCompletado(btnReclamar, 'Reclamo enviado');
                        })
                        .catch(error => console.error('Error al buscar reclamo previo:', error));
                }
            }
            return;
        }

        if (container) container.innerHTML = '';
    }


    normalizarTipoPublicacion(tipo) {
        const valor = (tipo || '').toLowerCase();
        if (valor.includes('adopc')) return 'adopcion';
        if (valor.includes('encontr')) return 'encontrado';
        if (valor.includes('perd')) return 'perdido';
        return valor;
    }

    obtenerTipoVisible(tipo) {
        const normalizado = this.normalizarTipoPublicacion(tipo);
        if (normalizado === 'adopcion') return 'En Adopcion';
        if (normalizado === 'encontrado') return 'Mascota Encontrada';
        if (normalizado === 'perdido') return 'Mascota Perdida';
        return tipo || 'General';
    }

    obtenerFotosPublicacion(pub) {
        const fotos = [];
        if (Array.isArray(pub?.fotos)) fotos.push(...pub.fotos);
        if (Array.isArray(pub?.foto)) fotos.push(...pub.foto);
        else if (typeof pub?.foto === 'string') fotos.push(pub.foto);
        if (typeof pub?.imagenUrl === 'string') fotos.push(pub.imagenUrl);
        return fotos.filter((foto, index, arr) =>
            typeof foto === 'string' &&
            foto.trim() !== '' &&
            arr.indexOf(foto) === index
        );
    }


    async abrirModalSolicitudAdopcion(pub) {
        if (!this.usuarioActual) {
            Swal.fire('Inicia sesión', 'Debes iniciar sesión para solicitar una adopción', 'warning');
            return;
        }

        if (!pub.veterinarioId) {
            Swal.fire('No disponible', 'Esta publicacion no tiene un veterinario asignado para recibir solicitudes.', 'warning');
            return;
        }

        const modal = document.getElementById('modalSolicitudAdopcion');
        if (modal) modal.style.display = 'flex';

        // Mostrar indicador de carga en los campos
        document.getElementById('solicitanteNombre').value = 'Cargando...';
        document.getElementById('solicitanteEmail').value = this.usuarioActual.email || '';

        try {
            // Obtener datos completos del usuario desde Firestore
            const userRef = doc(db, 'usarios', this.usuarioActual.uid);
            const userSnap = await getDoc(userRef);

            let nombreCompleto = '';
            let telefono = '';

            if (userSnap.exists()) {
                const userData = userSnap.data();
                // Construir nombre completo desde los campos de la colección usuarios
                const primerNombre = userData.primer_nombre || '';
                const segundoNombre = userData.segundo_nombre ? userData.segundo_nombre + ' ' : '';
                const apellidoPaterno = userData.apellido_paterno || '';
                const apellidoMaterno = userData.apellido_materno ? userData.apellido_materno : '';

                nombreCompleto = `${primerNombre} ${segundoNombre}${apellidoPaterno} ${apellidoMaterno}`.trim();
                telefono = userData.telefono || '';
            }

            // Si no se encontró en Firestore, usar displayName o email
            if (!nombreCompleto) {
                nombreCompleto = this.usuarioActual.displayName || this.usuarioActual.email.split('@')[0];
            }

            // Llenar campos
            document.getElementById('solicitanteNombre').value = nombreCompleto;
            document.getElementById('solicitanteEmail').value = this.usuarioActual.email || '';
            document.getElementById('solicitanteTelefono').value = telefono;

            // Limpiar otros campos
            document.getElementById('solicitanteDireccion').value = '';
            document.getElementById('mensajeAdopcion').value = '';
            document.getElementById('experienciaMascotas').value = '';

            // Resetear radio button
            const radioNo = document.querySelector('input[name="tieneOtrasMascotas"][value="false"]');
            if (radioNo) radioNo.checked = true;

            // Limpiar input de archivos
            document.getElementById('pruebasAdopcion').value = '';

        } catch (error) {
            console.error('Error cargando datos del usuario:', error);
            // Fallback: usar email como nombre
            document.getElementById('solicitanteNombre').value = this.usuarioActual.email.split('@')[0];
        }

        // Configurar evento del formulario
        const form = document.getElementById('formSolicitudAdopcion');
        if (form) {
            form.onsubmit = (e) => this.enviarSolicitudAdopcion(e, pub);
        }
    }

    // Cerrar modal
    cerrarModalSolicitud() {
        const modal = document.getElementById('modalSolicitudAdopcion');
        if (modal) modal.style.display = 'none';
        document.getElementById('formSolicitudAdopcion').reset();
    }

    // Enviar solicitud
    async enviarSolicitudAdopcion(e, pub) {
        e.preventDefault();

        if (await this.existeInteraccion('solicitudesAdopcion', pub.id)) {
            Swal.fire('Solicitud existente', 'Ya enviaste una solicitud para esta publicación.', 'info');
            return;
        }

        // Procesar pruebas (fotos)
        const pruebasInput = document.getElementById('pruebasAdopcion');
        const pruebas = [];

        for (const file of pruebasInput.files) {
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire('Error', 'Las imágenes no deben superar los 2MB', 'warning');
                return;
            }
            const base64 = await this.convertirImagenABase64(file);
            pruebas.push(base64);
        }

        const tieneOtrasMascotas = document.querySelector('input[name="tieneOtrasMascotas"]:checked')?.value === 'true';

        const solicitud = {
            publicacionId: pub.id,
            publicacionTitulo: pub.titulo || 'Publicacion sin titulo',
            veterinarioId: pub.veterinarioId,
            usuarioId: this.usuarioActual.uid,
            usuarioNombre: document.getElementById('solicitanteNombre').value,
            usuarioEmail: document.getElementById('solicitanteEmail').value,
            telefono: document.getElementById('solicitanteTelefono').value,
            direccion: document.getElementById('solicitanteDireccion').value,
            mensaje: document.getElementById('mensajeAdopcion').value,
            experiencia: document.getElementById('experienciaMascotas').value || '',
            tieneOtrasMascotas: tieneOtrasMascotas,
            pruebas: pruebas,
            estado: 'pendiente',
            fechaSolicitud: new Date().toISOString()
        };

        try {
            Swal.fire({
                title: 'Enviando solicitud...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const solicitudId = `${pub.id}_${this.usuarioActual.uid}`;
            await setDoc(doc(db, 'solicitudesAdopcion', solicitudId), solicitud);

            Swal.fire({
                icon: 'success',
                title: '¡Solicitud enviada!',
                text: 'El veterinario revisará tu solicitud y se pondrá en contacto contigo.',
                confirmButtonColor: '#ff6b6b'
            });

            this.cerrarModalSolicitud();

            // ========================================================
            // NUEVO: Cambiar el estado del botón inmediatamente en la UI
            // ========================================================
            const btnSolicitar = document.getElementById('btnSolicitarAdopcion');
            if (btnSolicitar) {
                this.marcarBotonCompletado(btnSolicitar, 'Solicitud enviada');
            }
            // ========================================================

        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'No se pudo enviar la solicitud', 'error');
        }
    }

    // Convertir imagen a Base64
    convertirImagenABase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
    }
    //mandar reclamo de mascota
    async abrirModalReclamo(pub) {
        if (!this.usuarioActual) {
            Swal.fire('Inicia sesión', 'Debes iniciar sesión para reclamar una mascota', 'warning');
            return;
        }

        if (!pub.veterinarioId) {
            Swal.fire('No disponible', 'Esta publicacion no tiene un veterinario asignado para recibir reclamos.', 'warning');
            return;
        }

        this.publicacionActual = pub;

        const modal = document.getElementById('modalReclamoMascota');
        if (modal) modal.style.display = 'flex';

        // Cargar datos del usuario desde Firestore
        try {
            const userRef = doc(db, 'usarios', this.usuarioActual.uid);
            const userSnap = await getDoc(userRef);

            let nombreCompleto = '';
            let telefono = '';

            if (userSnap.exists()) {
                const userData = userSnap.data();
                const primerNombre = userData.primer_nombre || '';
                const segundoNombre = userData.segundo_nombre ? userData.segundo_nombre + ' ' : '';
                const apellidoPaterno = userData.apellido_paterno || '';
                const apellidoMaterno = userData.apellido_materno ? userData.apellido_materno : '';

                nombreCompleto = `${primerNombre} ${segundoNombre}${apellidoPaterno} ${apellidoMaterno}`.trim();
                telefono = userData.telefono || '';
            }

            if (!nombreCompleto) {
                nombreCompleto = this.usuarioActual.displayName || this.usuarioActual.email.split('@')[0];
            }

            document.getElementById('reclamanteNombre').value = nombreCompleto;
            document.getElementById('reclamanteEmail').value = this.usuarioActual.email || '';
            document.getElementById('reclamanteTelefono').value = telefono;

        } catch (error) {
            console.error('Error cargando datos:', error);
            document.getElementById('reclamanteNombre').value = this.usuarioActual.email.split('@')[0];
            document.getElementById('reclamanteEmail').value = this.usuarioActual.email || '';
        }

        document.getElementById('descripcionReclamo').value = '';
        document.getElementById('pruebasReclamo').value = '';

        const form = document.getElementById('formReclamoMascota');
        form.onsubmit = (e) => this.enviarReclamo(e, pub);
    }

    cerrarModalReclamo() {
        const modal = document.getElementById('modalReclamoMascota');
        if (modal) modal.style.display = 'none';
        document.getElementById('formReclamoMascota').reset();
    }

    async enviarReclamo(e, pub) {
        e.preventDefault();

        if (await this.existeInteraccion('reclamosMascotas', pub.id)) {
            Swal.fire('Reclamo existente', 'Ya enviaste un reclamo para esta publicación.', 'info');
            return;
        }

        // Procesar pruebas
        const pruebasInput = document.getElementById('pruebasReclamo');
        const pruebas = [];

        if (pruebasInput.files.length === 0) {
            Swal.fire('Error', 'Debes subir al menos una prueba', 'warning');
            return;
        }

        for (const file of pruebasInput.files) {
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire('Error', 'Las imágenes no deben superar los 2MB', 'warning');
                return;
            }
            const base64 = await this.convertirImagenABase64(file);
            pruebas.push(base64);
        }

        const reclamo = {
            publicacionId: pub.id,
            publicacionTitulo: pub.titulo || 'Publicacion sin titulo',
            veterinarioId: pub.veterinarioId,
            usuarioId: this.usuarioActual.uid,
            usuarioNombre: document.getElementById('reclamanteNombre').value,
            usuarioEmail: document.getElementById('reclamanteEmail').value,
            telefono: document.getElementById('reclamanteTelefono').value,
            descripcion: document.getElementById('descripcionReclamo').value,
            pruebas: pruebas,
            estado: 'pendiente',
            fechaReclamo: new Date().toISOString()
        };

        if (!reclamo.usuarioNombre || !reclamo.usuarioEmail || !reclamo.telefono || !reclamo.descripcion) {
            Swal.fire('Campos incompletos', 'Por favor completa todos los campos requeridos', 'warning');
            return;
        }

        try {
            Swal.fire({
                title: 'Enviando reclamo...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const reclamoId = `${pub.id}_${this.usuarioActual.uid}`;
            await setDoc(doc(db, 'reclamosMascotas', reclamoId), reclamo);

            Swal.fire({
                icon: 'success',
                title: '¡Reclamo enviado!',
                text: 'El veterinario revisará tu reclamo y se pondrá en contacto contigo.',
                confirmButtonColor: '#3b82f6'
            });

            this.cerrarModalReclamo();

            const btnReclamar = document.getElementById('btnReclamarMascota');
            if (btnReclamar) this.marcarBotonCompletado(btnReclamar, 'Reclamo enviado');

        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'No se pudo enviar el reclamo', 'error');
        }
    }

    async existeInteraccion(nombreColeccion, publicacionId) {
        const q = query(
            collection(db, nombreColeccion),
            where('publicacionId', '==', publicacionId),
            where('usuarioId', '==', this.usuarioActual.uid)
        );
        const resultado = await getDocs(q);
        return !resultado.empty;
    }

    marcarBotonCompletado(boton, texto) {
        boton.disabled = true;
        boton.innerHTML = `<i class="fas fa-check"></i> ${texto}`;
        boton.style.backgroundColor = '#16a34a';
        boton.style.cursor = 'not-allowed';
    }



    // FUNCIÓN PARA ABRIR LA IMAGEN EN GRANDE CON SWEETALERT
    abrirImagenModal(url) {
        Swal.fire({
            imageUrl: url,
            imageAlt: 'Foto ampliada',
            showCloseButton: true,      // Muestra el tache (X)
            showConfirmButton: false,   // Oculta el botón de "OK"
            width: 'auto',              // Se ajusta a la imagen
            padding: '0',
            background: 'transparent',  // Quita el recuadro blanco
            backdrop: 'rgba(0,0,0,0.9)',// Fondo oscuro casi negro
            customClass: {
                closeButton: 'btn-cerrar-modal-img',
                image: 'img-modal-max'
            }
        });
    }

    actualizarEstadoLikeUI() {
        const isLiked = this.usuarioActual && this.publicacion.usuariosLike?.includes(this.usuarioActual.uid);
        if (isLiked) {
            this.iconLike.className = 'fas fa-heart';
            this.iconLike.style.color = '#ef4444';
        } else {
            this.iconLike.className = 'far fa-heart';
            this.iconLike.style.color = 'inherit';
        }
    }

    async toggleLike() {
        if (!this.usuarioActual) {
            Swal.fire('Inicia sesión', 'Debes iniciar sesión para dar me gusta', 'warning');
            return;
        }

        const isLiked = this.publicacion.usuariosLike?.includes(this.usuarioActual.uid);
        const publicacionRef = doc(db, 'publicaciones', this.publicacionId);

        try {
            if (isLiked) {
                // Quitar like
                await updateDoc(publicacionRef, {
                    likes: increment(-1),
                    usuariosLike: arrayRemove(this.usuarioActual.uid)
                });
                this.publicacion.likes = Math.max(0, (this.publicacion.likes || 1) - 1);
                this.publicacion.usuariosLike = this.publicacion.usuariosLike.filter(uid => uid !== this.usuarioActual.uid);
            } else {
                // Dar like
                await updateDoc(publicacionRef, {
                    likes: increment(1),
                    usuariosLike: arrayUnion(this.usuarioActual.uid)
                });
                this.publicacion.likes = (this.publicacion.likes || 0) + 1;
                if (!this.publicacion.usuariosLike) this.publicacion.usuariosLike = [];
                this.publicacion.usuariosLike.push(this.usuarioActual.uid);
            }

            this.detalleLikes.textContent = this.publicacion.likes;
            this.actualizarEstadoLikeUI();

        } catch (error) {
            console.error('Error toggling like:', error);
            Swal.fire('Error', 'No se pudo actualizar el me gusta', 'error');
        }
    }

    async cargarComentarios() {
        try {
            const comentariosRef = collection(db, 'comentarios');
            const q = query(comentariosRef, where('publicacionId', '==', this.publicacionId), orderBy('fecha', 'desc'));
            const snapshot = await getDocs(q);

            this.comentariosContainer.innerHTML = '';

            if (snapshot.empty) {
                this.comentariosContainer.innerHTML = '<p class="sin-comentarios">No hay comentarios aún. ¡Sé el primero en ayudar!</p>';
                return;
            }

            snapshot.forEach(doc => {
                const com = doc.data();
                this.comentariosContainer.innerHTML += `
                    <div class="comentario">
                        <div class="comentario-header">
                            <strong><i class="fas fa-user-circle"></i> ${com.usuarioNombre}</strong>
                        </div>
                        <p class="comentario-texto">${com.texto}</p>
                    </div>
                `;
            });
        } catch (error) {
            console.error('Error cargando comentarios:', error);
            if (error.message.includes('requires an index')) {
                this.comentariosContainer.innerHTML = '<p class="sin-comentarios" style="color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Falta crear el índice en Firebase. Revisa la consola para el enlace directo.</p>';
            } else {
                this.comentariosContainer.innerHTML = '<p class="sin-comentarios">Error al cargar comentarios.</p>';
            }
        }
    }

    async publicarComentario() {
        const texto = this.nuevoComentario.value.trim();
        if (!texto) return;

        this.btnComentar.disabled = true;
        this.btnComentar.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            // Guardar en la colección 'comentarios'
            await addDoc(collection(db, 'comentarios'), {
                publicacionId: this.publicacionId,
                usuarioId: this.usuarioActual.uid,
                usuarioNombre: this.usuarioActual.displayName || this.usuarioActual.email.split('@')[0],
                texto: texto,
                fecha: serverTimestamp()
            });

            // Actualizar la publicación con el contador y el último comentario
            const publicacionRef = doc(db, 'publicaciones', this.publicacionId);
            await updateDoc(publicacionRef, {
                comentarios: increment(1),
                ultimoComentario: {
                    usuarioNombre: this.usuarioActual.displayName || this.usuarioActual.email.split('@')[0],
                    texto: texto.substring(0, 80)
                }
            });

            this.nuevoComentario.value = '';

            // Refrescar UI
            this.publicacion.comentarios = (this.publicacion.comentarios || 0) + 1;
            this.detalleComentariosCount.textContent = this.publicacion.comentarios;
            await this.cargarComentarios();

        } catch (error) {
            console.error('Error publicando comentario:', error);
            Swal.fire('Error', 'No se pudo publicar el comentario', 'error');
        } finally {
            this.btnComentar.disabled = false;
            this.btnComentar.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ControladorDetalles();
});
