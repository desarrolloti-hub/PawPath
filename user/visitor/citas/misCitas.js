// mis-citas.js
import { auth, db } from '/config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    collection, query, where, getDocs, orderBy,
    updateDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { ChatService } from './chatService.js';

class MiPanelController {
    constructor() {
        // Datos
        this.citas = [];
        this.solicitudesAdopcion = [];
        this.reclamos = [];
        this.usuarioActual = null;

        //chat
        this.chatActual = null;
        this.unsubscribeMensajes = null;

        this.chatNombre = document.getElementById("chatNombre");
        this.chatMascota = document.getElementById("chatMascota");
        this.chatMessages = document.getElementById("chatMessages");
        this.inputMensaje = document.getElementById("mensajeInput");
        this.btnEnviar = document.getElementById("btnEnviar");
        this.setComposerEnabled(false);
        
        // Filtros citas
        this.citasFiltroTab = 'proximas';
        this.citasFiltroEstado = 'todos';
        this.citasFiltroOrden = 'fecha_desc';
        this.citasBusqueda = '';

        // Filtros adopciones
        this.adopcionesFiltroTab = 'pendientes';
        this.adopcionesBusqueda = '';

        // Filtros reclamos
        this.reclamosFiltroTab = 'pendientes';
        this.reclamosBusqueda = '';

        this.init();
    }

    async init() {
        await this.checkAuth();
        await Promise.all([
            this.cargarCitas(),
            this.cargarSolicitudesAdopcion(),
            this.cargarReclamos()
        ]);
        this.setupEventListeners();
        if (this.btnEnviar) {

            this.btnEnviar.addEventListener(
                "click",
                () => this.enviarMensaje()
            );

        }

        if (this.inputMensaje) {

            this.inputMensaje.addEventListener("keydown", e => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.enviarMensaje();
                }
            });

        }
    }

    checkAuth() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, (user) => {
                if (!user) {
                    window.location.href = '/user/visitor/login/login.html';
                } else {
                    this.usuarioActual = user;
                    resolve(user);
                }
            });
        });
    }

    // ========== CITAS ==========
    async cargarCitas() {
        if (!this.usuarioActual) return;

        try {
            const citasRef = collection(db, 'citas');
            const q = query(
                citasRef,
                where('usuarioId', '==', this.usuarioActual.uid),
                orderBy('fecha', 'desc'),
                orderBy('hora', 'desc')
            );

            const querySnapshot = await getDocs(q);
            this.citas = [];

            querySnapshot.forEach(doc => {
                this.citas.push({ id: doc.id, ...doc.data() });
            });

            this.actualizarContadores();
            this.renderizarCitas();

        } catch (error) {
            console.error('Error cargando citas:', error);
        }
    }

    actualizarContadores() {
        const ahora = new Date();
        const hoy = ahora.toISOString().split('T')[0];

        const proximas = this.citas.filter(c => {
            if (c.estado === 'rechazada' || c.estado === 'concluida') return false;
            if (c.fecha > hoy) return true;
            if (c.fecha === hoy) return c.hora > `${ahora.getHours()}:${ahora.getMinutes()}`;
            return false;
        });

        const historial = this.citas.filter(c =>
            c.estado === 'concluida' || c.estado === 'rechazada'
        );

        document.getElementById('proximasCount').textContent = proximas.length;
        document.getElementById('historialCount').textContent = historial.length;
        document.getElementById('citasBadge').textContent = proximas.length;
    }

    filtrarCitas() {
        let filtradas = [...this.citas];

        if (this.citasFiltroTab === 'proximas') {
            const ahora = new Date();
            const hoy = ahora.toISOString().split('T')[0];
            filtradas = filtradas.filter(c => {
                if (c.estado === 'rechazada' || c.estado === 'concluida') return false;
                if (c.fecha > hoy) return true;
                if (c.fecha === hoy) return c.hora > `${ahora.getHours()}:${ahora.getMinutes()}`;
                return false;
            });
        } else if (this.citasFiltroTab === 'historial') {
            filtradas = filtradas.filter(c =>
                c.estado === 'concluida' || c.estado === 'rechazada'
            );
        }

        if (this.citasFiltroEstado !== 'todos') {
            filtradas = filtradas.filter(c => c.estado === this.citasFiltroEstado);
        }

        if (this.citasBusqueda.trim()) {
            const busq = this.citasBusqueda.toLowerCase();
            filtradas = filtradas.filter(c =>
                c.veterinarioNombre?.toLowerCase().includes(busq) ||
                c.nombreMascota?.toLowerCase().includes(busq) ||
                c.especie?.toLowerCase().includes(busq)
            );
        }

        if (this.citasFiltroOrden === 'fecha_desc') {
            filtradas.sort((a, b) => {
                if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
                return b.hora.localeCompare(a.hora);
            });
        } else {
            filtradas.sort((a, b) => {
                if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
                return a.hora.localeCompare(b.hora);
            });
        }

        return filtradas;
    }

    renderizarCitas() {
        const container = document.getElementById('citasLista');
        const filtradas = this.filtrarCitas();
        const sinResultados = document.getElementById('sinResultados');
        const sinTexto = document.getElementById('sinResultadosTexto');

        if (filtradas.length === 0) {
            container.style.display = 'none';
            sinTexto.textContent = 'No tienes citas que coincidan con los filtros';
            sinResultados.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        sinResultados.style.display = 'none';

        let html = '';
        filtradas.forEach(cita => {
            html += this.generarCardCita(cita);
        });
        container.innerHTML = html;
        container.querySelectorAll(".btn-chat").forEach(btn => {

            btn.addEventListener("click", () => {

                const cita = this.citas.find(
                    c => c.id === btn.dataset.citaId
                );

                if (!cita) return;

                this.abrirChat(cita);

            });

        });
    }

    generarCardCita(cita) {
        const fechaObj = new Date(cita.fecha + 'T' + cita.hora);
        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });

        const puedeCancelar = cita.estado === 'pendiente' &&
            new Date(cita.fecha + 'T' + cita.hora) > new Date();

        return `
            <div class="item-card estado-${cita.estado} ${this.chatActual?.citaId === cita.id ? 'chat-selected' : ''}">
                <div class="item-header">
                    <div class="item-fecha">
                        <i class="fas fa-calendar-alt"></i> ${fechaFormateada} - ${cita.hora}
                    </div>
                    <span class="item-estado estado-${cita.estado}">
                        ${this.estadoTexto(cita.estado)}
                    </span>
                </div>
                <div class="item-body">
                    <img src="${cita.imagenMascota || 'https://via.placeholder.com/70x70?text=Mascota'}" 
                         class="item-imagen" alt="${cita.nombreMascota}">
                    <div class="item-info">
                        <h3>${cita.nombreMascota || 'Mascota'}</h3>
                        <p><i class="fas fa-dog"></i> ${cita.especie || 'No especificada'} - ${cita.raza || 'Sin raza'}</p>
                        <p><i class="fas fa-stethoscope"></i> ${(cita.problemaSalud || '').substring(0, 50)}${cita.problemaSalud?.length > 50 ? '...' : ''}</p>
                        <p><i class="fas fa-hospital-user"></i> ${cita.veterinarioNombre || 'No asignado'}</p>
                    </div>
                </div>
               <div class="item-footer">
                    <button class="btn-ver"
                        onclick="miPanel.verDetalleCita('${cita.id}')">

                        <i class="fas fa-eye"></i>
                        Ver detalles

                    </button>

                    ${(cita.estado === 'aceptada' || cita.estado === 'concluida') ? `

                        <button class="btn-chat" data-cita-id="${cita.id}">
                            <i class="fas fa-comments"></i>
                            Chat
                        </button>
                    ` : ''}

                    ${puedeCancelar ? `

                        <button class="btn-ver"
                            style="color:#f56565;"
                            onclick="miPanel.cancelarCita('${cita.id}')">

                            <i class="fas fa-times"></i>
                            Cancelar

                        </button>

                    ` : ''}

                </div>
            </div>
        `;
    }

    async verDetalleCita(citaId) {
        const cita = this.citas.find(c => c.id === citaId);
        if (!cita) return;

        const fechaObj = new Date(cita.fecha + 'T' + cita.hora);
        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        document.getElementById('modalTitulo').innerHTML = '<i class="fas fa-calendar-check"></i> Detalles de la cita';
        document.getElementById('modalBody').innerHTML = `
            <div class="detalle-item">
                <div class="detalle-campo"><strong>🐾 Mascota:</strong><p>${cita.nombreMascota || 'No especificado'}</p></div>
                <div class="detalle-campo"><strong>📋 Especie / Raza:</strong><p>${cita.especie || 'No especificada'} / ${cita.raza || 'No especificada'}</p></div>
                <div class="detalle-campo"><strong>⚥ Género:</strong><p>${cita.genero || 'No especificado'}</p></div>
                <div class="detalle-campo"><strong>🎂 Edad:</strong><p>${cita.edad || 'No especificada'}</p></div>
                <div class="detalle-campo"><strong>💊 Enfermedades:</strong><p>${cita.enfermedades || 'Ninguna'}</p></div>
                <div class="detalle-campo"><strong>🩺 Motivo:</strong><p>${cita.problemaSalud || 'No especificado'}</p></div>
                <div class="detalle-campo"><strong>📅 Fecha y hora:</strong><p>${fechaFormateada} - ${cita.hora}</p></div>
                <div class="detalle-campo"><strong>🏥 Veterinario:</strong><p>${cita.veterinarioNombre || 'No asignado'}</p></div>
                <div class="detalle-campo"><strong>📝 Estado:</strong><p><span class="item-estado estado-${cita.estado}">${this.estadoTexto(cita.estado)}</span></p></div>
                ${cita.notasVeterinario ? `<div class="detalle-campo"><strong>📌 Notas:</strong><p>${cita.notasVeterinario}</p></div>` : ''}
                ${cita.imagenMascota ? `<div class="detalle-campo"><strong>📸 Foto:</strong><div><img src="${cita.imagenMascota}" style="max-width:100%; border-radius:8px; margin-top:8px;"></div></div>` : ''}
            </div>
        `;
        document.getElementById('detalleModal').style.display = 'flex';
    }

    async cancelarCita(citaId) {
        const result = await Swal.fire({
            title: '¿Cancelar cita?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f56565',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No'
        });

        if (result.isConfirmed) {
            try {
                const citaRef = doc(db, 'citas', citaId);
                await updateDoc(citaRef, { estado: 'rechazada', notasVeterinario: 'Cancelada por el usuario' });
                Swal.fire('Cancelada', 'Tu cita ha sido cancelada', 'success');
                await this.cargarCitas();
            } catch (error) {
                Swal.fire('Error', 'No se pudo cancelar', 'error');
            }
        }
    }

    // ========== SOLICITUDES DE ADOPCIÓN ==========
    async cargarSolicitudesAdopcion() {
        if (!this.usuarioActual) return;

        try {
            const solicitudesRef = collection(db, 'solicitudesAdopcion');
            // Removemos orderBy para evitar requerir un índice compuesto en Firestore
            const q = query(
                solicitudesRef,
                where('usuarioId', '==', this.usuarioActual.uid)
            );

            const querySnapshot = await getDocs(q);
            this.solicitudesAdopcion = [];

            querySnapshot.forEach(doc => {
                this.solicitudesAdopcion.push({ id: doc.id, ...doc.data() });
            });

            // Ordenamos en memoria de forma descendente por fechaSolicitud
            this.solicitudesAdopcion.sort((a, b) => {
                const dateA = a.fechaSolicitud?.toDate ? a.fechaSolicitud.toDate() : new Date(a.fechaSolicitud);
                const dateB = b.fechaSolicitud?.toDate ? b.fechaSolicitud.toDate() : new Date(b.fechaSolicitud);
                return dateB - dateA;
            });

            // Mapeamos el filtro para empatar pestañas (plural) con estados de Firestore (singular)
            this.filtrarSolicitudesAdopcion = () => {
                let filtradas = [...this.solicitudesAdopcion];

                const tabMapeada = this.adopcionesFiltroTab === 'pendientes' ? 'pendiente' :
                    this.adopcionesFiltroTab === 'aprobadas' ? 'aprobada' :
                        this.adopcionesFiltroTab === 'rechazadas' ? 'rechazada' :
                            this.adopcionesFiltroTab;

                filtradas = filtradas.filter(s => s.estado === tabMapeada);

                if (this.adopcionesBusqueda.trim()) {
                    const busq = this.adopcionesBusqueda.toLowerCase();
                    filtradas = filtradas.filter(s => {
                        return s.usuarioNombre?.toLowerCase().includes(busq) ||
                            s.mensaje?.toLowerCase().includes(busq);
                    });
                }

                return filtradas;
            };

            this.actualizarContadoresAdopciones();
            this.renderizarSolicitudesAdopcion();

        } catch (error) {
            console.error('Error cargando solicitudes:', error);
        }
    }

    actualizarContadoresAdopciones() {
        const pendientes = this.solicitudesAdopcion.filter(s => s.estado === 'pendiente').length;
        document.getElementById('adopcionesPendientesBadge').textContent = pendientes;
        document.getElementById('adopcionesBadge').textContent = pendientes;
    }

    filtrarSolicitudesAdopcion() {
        let filtradas = [...this.solicitudesAdopcion];

        filtradas = filtradas.filter(s => s.estado === this.adopcionesFiltroTab);

        if (this.adopcionesBusqueda.trim()) {
            const busq = this.adopcionesBusqueda.toLowerCase();
            filtradas = filtradas.filter(s => {
                // Buscar en publicación (necesitamos cargar el título)
                return s.usuarioNombre?.toLowerCase().includes(busq) ||
                    s.mensaje?.toLowerCase().includes(busq);
            });
        }

        return filtradas;
    }

    async renderizarSolicitudesAdopcion() {
        const container = document.getElementById('adopcionesLista');
        const filtradas = this.filtrarSolicitudesAdopcion();
        const sinResultados = document.getElementById('sinResultados');
        const sinTexto = document.getElementById('sinResultadosTexto');

        if (filtradas.length === 0) {
            container.style.display = 'none';
            sinTexto.textContent = 'No tienes solicitudes de adopción en este estado';
            sinResultados.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        sinResultados.style.display = 'none';

        let html = '';
        for (const sol of filtradas) {
            // Obtener título de la publicación
            let tituloPublicacion = 'Mascota';
            if (sol.publicacionId) {
                try {
                    const pubRef = doc(db, 'publicaciones', sol.publicacionId);
                    const pubSnap = await getDoc(pubRef);
                    if (pubSnap.exists()) {
                        tituloPublicacion = pubSnap.data().titulo || 'Mascota';
                    }
                } catch (e) { }
            }

            html += `
                <div class="item-card estado-${sol.estado}">
                    <div class="item-header">
                        <div class="item-fecha">
                            <i class="fas fa-calendar-alt"></i> ${new Date(sol.fechaSolicitud).toLocaleDateString()}
                        </div>
                        <span class="item-estado estado-${sol.estado}">
                            ${this.estadoTextoAdopcion(sol.estado)}
                        </span>
                    </div>
                    <div class="item-body">
                        <i class="fas fa-paw" style="font-size: 3rem; color: var(--primary); width: 70px; text-align: center;"></i>
                        <div class="item-info">
                            <h3>${tituloPublicacion}</h3>
                            <p><i class="fas fa-user"></i> Solicitaste: ${new Date(sol.fechaSolicitud).toLocaleDateString()}</p>
                            <p><i class="fas fa-comment"></i> "${(sol.mensaje || '').substring(0, 60)}${sol.mensaje?.length > 60 ? '...' : ''}"</p>
                            ${sol.notasVeterinario ? `<p><i class="fas fa-stethoscope"></i> Respuesta: ${sol.notasVeterinario.substring(0, 50)}</p>` : ''}
                        </div>
                    </div>
                    <div class="item-footer">
                        <button class="btn-ver" onclick="miPanel.verDetalleAdopcion('${sol.id}')">
                            <i class="fas fa-eye"></i> Ver detalles
                        </button>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    async verDetalleAdopcion(solicitudId) {
        const solicitud = this.solicitudesAdopcion.find(s => s.id === solicitudId);
        if (!solicitud) return;

        let tituloPublicacion = 'Mascota';
        if (solicitud.publicacionId) {
            try {
                const pubRef = doc(db, 'publicaciones', solicitud.publicacionId);
                const pubSnap = await getDoc(pubRef);
                if (pubSnap.exists()) {
                    tituloPublicacion = pubSnap.data().titulo;
                }
            } catch (e) { }
        }

        document.getElementById('modalTitulo').innerHTML = '<i class="fas fa-paw"></i> Detalles de solicitud de adopción';
        document.getElementById('modalBody').innerHTML = `
            <div class="detalle-item">
                <div class="detalle-campo"><strong>🐾 Mascota:</strong><p>${tituloPublicacion}</p></div>
                <div class="detalle-campo"><strong>📅 Fecha de solicitud:</strong><p>${new Date(solicitud.fechaSolicitud).toLocaleString()}</p></div>
                <div class="detalle-campo"><strong>💬 Tu mensaje:</strong><p>${solicitud.mensaje || 'No especificado'}</p></div>
                <div class="detalle-campo"><strong>🐕 Experiencia con mascotas:</strong><p>${solicitud.experiencia || 'No especificada'}</p></div>
                <div class="detalle-campo"><strong>🐶 ¿Tienes otras mascotas?:</strong><p>${solicitud.tieneOtrasMascotas ? 'Sí' : 'No'}</p></div>
                <div class="detalle-campo"><strong>📞 Contacto:</strong><p>${solicitud.telefono || 'No especificado'} | ${solicitud.direccion || 'Sin dirección'}</p></div>
                <div class="detalle-campo"><strong>📝 Estado actual:</strong><p><span class="item-estado estado-${solicitud.estado}">${this.estadoTextoAdopcion(solicitud.estado)}</span></p></div>
                ${solicitud.notasVeterinario ? `<div class="detalle-campo"><strong>📌 Respuesta del veterinario:</strong><p>${solicitud.notasVeterinario}</p></div>` : ''}
                ${solicitud.pruebas?.length ? `<div class="detalle-campo"><strong>📸 Pruebas adjuntas:</strong><div class="detalle-pruebas">${solicitud.pruebas.map(p => `<img src="${p}" onclick="miPanel.verImagen('${p}')">`).join('')}</div></div>` : ''}
            </div>
        `;
        document.getElementById('detalleModal').style.display = 'flex';
    }

    // ========== RECLAMOS ==========
    async cargarReclamos() {
        if (!this.usuarioActual) return;

        try {
            const reclamosRef = collection(db, 'reclamosMascotas');
            const q = query(
                reclamosRef,
                where('usuarioId', '==', this.usuarioActual.uid),
                orderBy('fechaReclamo', 'desc')
            );

            const querySnapshot = await getDocs(q);
            this.reclamos = [];

            querySnapshot.forEach(doc => {
                this.reclamos.push({ id: doc.id, ...doc.data() });
            });

            this.actualizarContadoresReclamos();
            this.renderizarReclamos();

        } catch (error) {
            console.error('Error cargando reclamos:', error);
        }
    }

    actualizarContadoresReclamos() {
        const pendientes = this.reclamos.filter(r => r.estado === 'pendiente').length;
        document.getElementById('reclamosPendientesBadge').textContent = pendientes;
        document.getElementById('reclamosBadge').textContent = pendientes;
    }

    filtrarReclamos() {
        let filtradas = [...this.reclamos];

        filtradas = filtradas.filter(r => r.estado === this.reclamosFiltroTab);

        if (this.reclamosBusqueda.trim()) {
            const busq = this.reclamosBusqueda.toLowerCase();
            filtradas = filtradas.filter(r =>
                r.descripcion?.toLowerCase().includes(busq) ||
                r.usuarioNombre?.toLowerCase().includes(busq)
            );
        }

        return filtradas;
    }

    async renderizarReclamos() {
        const container = document.getElementById('reclamosLista');
        const filtradas = this.filtrarReclamos();
        const sinResultados = document.getElementById('sinResultados');
        const sinTexto = document.getElementById('sinResultadosTexto');

        if (filtradas.length === 0) {
            container.style.display = 'none';
            sinTexto.textContent = 'No tienes reclamos en este estado';
            sinResultados.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        sinResultados.style.display = 'none';

        let html = '';
        for (const rec of filtradas) {
            let tituloPublicacion = 'Mascota';
            if (rec.publicacionId) {
                try {
                    const pubRef = doc(db, 'publicaciones', rec.publicacionId);
                    const pubSnap = await getDoc(pubRef);
                    if (pubSnap.exists()) {
                        tituloPublicacion = pubSnap.data().titulo;
                    }
                } catch (e) { }
            }

            html += `
                <div class="item-card estado-${rec.estado}">
                    <div class="item-header">
                        <div class="item-fecha">
                            <i class="fas fa-calendar-alt"></i> ${new Date(rec.fechaReclamo).toLocaleDateString()}
                        </div>
                        <span class="item-estado estado-${rec.estado}">
                            ${this.estadoTextoReclamo(rec.estado)}
                        </span>
                    </div>
                    <div class="item-body">
                        <i class="fas fa-clipboard-list" style="font-size: 3rem; color: var(--primary); width: 70px; text-align: center;"></i>
                        <div class="item-info">
                            <h3>${tituloPublicacion}</h3>
                            <p><i class="fas fa-user"></i> Reclamaste: ${new Date(rec.fechaReclamo).toLocaleDateString()}</p>
                            <p><i class="fas fa-comment"></i> "${(rec.descripcion || '').substring(0, 60)}${rec.descripcion?.length > 60 ? '...' : ''}"</p>
                            ${rec.notasVeterinario ? `<p><i class="fas fa-stethoscope"></i> Respuesta: ${rec.notasVeterinario.substring(0, 50)}</p>` : ''}
                        </div>
                    </div>
                    <div class="item-footer">
                        <button class="btn-ver" onclick="miPanel.verDetalleReclamo('${rec.id}')">
                            <i class="fas fa-eye"></i> Ver detalles
                        </button>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    async verDetalleReclamo(reclamoId) {
        const reclamo = this.reclamos.find(r => r.id === reclamoId);
        if (!reclamo) return;

        let tituloPublicacion = 'Mascota';
        if (reclamo.publicacionId) {
            try {
                const pubRef = doc(db, 'publicaciones', reclamo.publicacionId);
                const pubSnap = await getDoc(pubRef);
                if (pubSnap.exists()) {
                    tituloPublicacion = pubSnap.data().titulo;
                }
            } catch (e) { }
        }

        document.getElementById('modalTitulo').innerHTML = '<i class="fas fa-clipboard-list"></i> Detalles del reclamo';
        document.getElementById('modalBody').innerHTML = `
            <div class="detalle-item">
                <div class="detalle-campo"><strong>🐾 Mascota reclamada:</strong><p>${tituloPublicacion}</p></div>
                <div class="detalle-campo"><strong>📅 Fecha del reclamo:</strong><p>${new Date(reclamo.fechaReclamo).toLocaleString()}</p></div>
                <div class="detalle-campo"><strong>📝 Tu descripción:</strong><p>${reclamo.descripcion || 'No especificada'}</p></div>
                <div class="detalle-campo"><strong>📞 Contacto:</strong><p>${reclamo.telefono || 'No especificado'}</p></div>
                <div class="detalle-campo"><strong>📝 Estado actual:</strong><p><span class="item-estado estado-${reclamo.estado}">${this.estadoTextoReclamo(reclamo.estado)}</span></p></div>
                ${reclamo.notasVeterinario ? `<div class="detalle-campo"><strong>📌 Respuesta del veterinario:</strong><p>${reclamo.notasVeterinario}</p></div>` : ''}
                ${reclamo.pruebas?.length ? `<div class="detalle-campo"><strong>📸 Pruebas adjuntas:</strong><div class="detalle-pruebas">${reclamo.pruebas.map(p => `<img src="${p}" onclick="miPanel.verImagen('${p}')">`).join('')}</div></div>` : ''}
            </div>
        `;
        document.getElementById('detalleModal').style.display = 'flex';
    }

    // ========== UTILIDADES ==========
    estadoTexto(estado) {
        const estados = { 'pendiente': 'Pendiente', 'aceptada': 'Aceptada', 'rechazada': 'Rechazada', 'concluida': 'Concluida' };
        return estados[estado] || estado;
    }

    estadoTextoAdopcion(estado) {
        const estados = { 'pendiente': 'Pendiente', 'aprobada': 'Aprobada', 'rechazada': 'Rechazada' };
        return estados[estado] || estado;
    }

    estadoTextoReclamo(estado) {
        const estados = { 'pendiente': 'Pendiente', 'verificados': 'En verificación', 'aprobados': 'Aprobado', 'rechazados': 'Rechazado' };
        return estados[estado] || estado;
    }

    verImagen(url) {
        Swal.fire({ imageUrl: url, imageAlt: 'Imagen ampliada', showCloseButton: true, showConfirmButton: false, width: 'auto', padding: '0', background: 'transparent', backdrop: 'rgba(0,0,0,0.9)' });
    }

    // ========== EVENTOS ==========
    setupEventListeners() {
        // Cambio entre secciones principales
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const seccion = tab.dataset.main;
                document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.main-section').forEach(s => s.classList.remove('active'));
                document.getElementById(`${seccion}Section`).classList.add('active');

                // Ocultar sinResultados al cambiar
                document.getElementById('sinResultados').style.display = 'none';
            });
        });

        // CITAS
        document.querySelectorAll('#citasSection .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#citasSection .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.citasFiltroTab = btn.dataset.tab;
                this.renderizarCitas();
            });
        });
        document.getElementById('citasFiltroEstado')?.addEventListener('change', (e) => { this.citasFiltroEstado = e.target.value; this.renderizarCitas(); });
        document.getElementById('citasFiltroOrden')?.addEventListener('change', (e) => { this.citasFiltroOrden = e.target.value; this.renderizarCitas(); });
        document.getElementById('citasBuscar')?.addEventListener('input', (e) => { this.citasBusqueda = e.target.value; this.renderizarCitas(); });

        // ADOPCIONES
        document.querySelectorAll('#adopcionesSection .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#adopcionesSection .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.adopcionesFiltroTab = btn.dataset.adopcionTab;
                this.renderizarSolicitudesAdopcion();
            });
        });
        document.getElementById('adopcionesBuscar')?.addEventListener('input', (e) => { this.adopcionesBusqueda = e.target.value; this.renderizarSolicitudesAdopcion(); });

        // RECLAMOS
        document.querySelectorAll('#reclamosSection .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#reclamosSection .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.reclamosFiltroTab = btn.dataset.reclamoTab;
                this.renderizarReclamos();
            });
        });
        document.getElementById('reclamosBuscar')?.addEventListener('input', (e) => { this.reclamosBusqueda = e.target.value; this.renderizarReclamos(); });

        // Refrescar botones
        document.getElementById('btnRefrescar')?.addEventListener('click', () => this.cargarCitas());
        document.getElementById('btnRefrescarAdopciones')?.addEventListener('click', () => this.cargarSolicitudesAdopcion());
        document.getElementById('btnRefrescarReclamos')?.addEventListener('click', () => this.cargarReclamos());
    }

    async abrirChat(cita) {

        try {

            const chatId = await ChatService.crearChatSiNoExiste(cita);

            this.chatActual = {
                ...cita,
                id: chatId,
                chatId,
                citaId: cita.id
            };
            this.setComposerEnabled(true);
            this.marcarCitaChatActiva(cita.id);

            this.chatNombre.textContent = cita.veterinarioNombre || cita.nombreVeterinario || "Veterinario";

            this.chatMascota.textContent =
                `Mascota: ${cita.nombreMascota || "Mascota"}`;

            this.chatMessages.innerHTML = "";

            if (this.unsubscribeMensajes) {
                this.unsubscribeMensajes();
            }

            this.unsubscribeMensajes =
                ChatService.escucharMensajes(chatId, (mensajes) => {

                    this.chatMessages.innerHTML = "";

                    if (mensajes.length === 0) {

                        this.chatMessages.innerHTML = `
                            <div class="empty-chat">
                                Todavía no hay mensajes.
                            </div>
                        `;

                        return;
                    }

                    mensajes.forEach(msg => {

                        const tipo =
                            msg.emisorTipo === "cliente"
                                ? "sent"
                                : "received";

                        this.agregarMensaje(msg, tipo);

                    });

                });

        } catch (e) {

            console.error(e);

        }

    }
    agregarMensaje(mensaje, tipo) {

        const div = document.createElement("div");

        div.className = `message ${tipo}`;

        let hora = "";

        if (mensaje.fecha?.toDate) {

            hora = mensaje.fecha
                .toDate()
                .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                });

        }

        div.innerHTML = `
            <div class="message-text">${this.escapeHTML(mensaje.texto || "")}</div>
            <div class="message-time">${hora}</div>
        `;

        this.chatMessages.appendChild(div);

        this.chatMessages.scrollTop =
            this.chatMessages.scrollHeight;

    }

    async enviarMensaje() {

        if (!this.chatActual || !this.inputMensaje || this.btnEnviar?.disabled) return;

        const texto = this.inputMensaje.value.trim();

        if (texto === "") return;

        this.btnEnviar.disabled = true;

        try {
            await ChatService.enviarMensaje(
                this.chatActual.id,
                {
                    texto,
                    emisorId: this.usuarioActual.uid,
                    emisorTipo: "cliente"
                }
            );

            this.inputMensaje.value = "";
        } catch (error) {
            console.error("Error enviando mensaje:", error);
            Swal.fire("Error", "No se pudo enviar el mensaje", "error");
        } finally {
            this.btnEnviar.disabled = false;
            this.inputMensaje.focus();
        }

    }

    setComposerEnabled(enabled) {
        if (this.inputMensaje) {
            this.inputMensaje.disabled = !enabled;
            this.inputMensaje.placeholder = enabled ? "Escribe un mensaje..." : "Selecciona una cita";
        }

        if (this.btnEnviar) {
            this.btnEnviar.disabled = !enabled;
        }
    }

    marcarCitaChatActiva(citaId) {
        document.querySelectorAll("#citasLista .item-card").forEach(card => {
            card.classList.remove("chat-selected");
        });

        const boton = document.querySelector(`.btn-chat[data-cita-id="${citaId}"]`);
        boton?.closest(".item-card")?.classList.add("chat-selected");
    }

    escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicializar
const miPanel = new MiPanelController();
window.miPanel = miPanel;
window.cerrarModal = () => document.getElementById('detalleModal').style.display = 'none';

export default MiPanelController;
