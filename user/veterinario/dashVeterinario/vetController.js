import { auth, db  } from '/config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import Veterinario from '/classes/veterinario.js';
import Citas from '../../../classes/Citas.js';
import { ChatController } from '../../../classes/chatController.js';


class VetController {
    constructor() {
        this.veterinarioId = null;
        this.vetModel = new Veterinario();
        this.citasModel = new Citas(); // Instancia del archivo Citas.js
        this.chatController = null; // Instancia del ChatController
        this.veterinarioActual = null;
        this.citas = [];
        this.publicaciones = [];
        this.solicitudesAdopcion = [];
        this.reclamos = [];
        this.filtros = {
            citas: 'todos',
            adopciones: 'pendientes',
            reclamos: 'pendientes',
            publicaciones: 'adopcion'
        };

        this.initialize();
    }

    async initialize() {
        try {
            const user = await this.checkAuth();
            this.veterinarioId = user.uid;
            // Ahora que ya tenemos el UID, creamos el chat
            this.chatController = new ChatController(this.veterinarioId);
            await this.cargarDatosVeterinario();
            this.setupEventListeners();
            this.actualizarFecha();
            this.cambiarSeccion('dashboard');
            await this.cargarTodo();
        } catch (error) {
            console.error('Error al inicializar:', error);
            this.mostrarNotificacion('Error al cargar el panel', 'error');
        }
    }

    checkAuth() {
        return new Promise((resolve, reject) => {
            onAuthStateChanged(auth,(user) => {
                if (!user) {
                    window.location.href = '../../visitor/login/login.html';
                    reject();
                } else {
                    resolve(user);
                }
            });
        });
    }

   async cargarDatosVeterinario() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, 'veterinarios', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        this.veterinarioActual = {
                            id: user.uid, //AGREGAMOS EL .id PARA QUE COMPATIBILICE CON EL RESTO DEL CÓDIGO
                            uid: user.uid,
                            nombre: data.nombreCompleto || data.nombre || 'Veterinario Registrado',
                            especialidad: data.especialidad || 'Medicina General',
                            clinica: data.nombreClinica || data.clinica || 'Mi Clínica',
                            ...data
                        };
                    } else {
                        this.veterinarioActual = {
                            id: user.uid,
                            uid: user.uid,
                            nombre: "Veterinario",
                            especialidad: "Medicina General",
                            clinica: "Mi Clínica"
                        };
                    }

                    // Pintamos los datos en la UI de forma segura
                    const txtName = document.getElementById('vetName');
                    const txtSpecialty = document.getElementById('vetSpecialty');
                    const divFoto = document.getElementById('vetFoto');

                    if (txtName) txtName.textContent = this.veterinarioActual.nombre;
                    if (txtSpecialty) txtSpecialty.textContent = this.veterinarioActual.especialidad;
                    if (divFoto) divFoto.innerHTML = `<i class="fas fa-user-md"></i>`;

                    resolve();
                } catch (error) {
                    console.error("🔴 Error crítico al consultar Firestore:", error);
                    reject(error);
                }
            } else {
                window.location.href = '../../../index.html';
                reject(new Error('No hay usuario autenticado'));
            }
        });
    });
}

    actualizarFecha() {
        const fecha = new Date();
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = fecha.toLocaleDateString('es-ES', opciones);
    }

    async cargarTodo() {
    if (!this.veterinarioActual) return;

    try {
        // 1. CARGAR CITAS REALES DESDE FIRESTORE
        if (this.citasModel && typeof this.citasModel.obtenerCitasVeterinario === 'function') {
            const resultadoCitas = await this.citasModel.obtenerCitasVeterinario(this.veterinarioActual.uid);
            if (resultadoCitas && resultadoCitas.success) {
                this.citas = resultadoCitas.data || [];
                this.renderizarCitas();
                this.renderizarProximasCitas(); // <- Añadido para que pinte la lista del Home del Dashboard
            } else {
                console.warn('No se pudieron obtener citas reales o el arreglo está vacío.');
                this.citas = [];
                this.renderizarCitas();
            }
        }

        // Cargar interacciones antes de las publicaciones para mostrar contadores reales.
        await this.cargarSolicitudesAdopcion();
        await this.cargarReclamos();

        await this.cargarPublicaciones();

        // 6. ACTUALIZAR LOS CONTADORES DEL DASHBOARD (Adiós al "Cargando...")
        this.actualizarContadoresSeguros();

    } catch (error) {
        console.error('Error crítico al cargar los componentes del dashboard:', error);
    }
}
actualizarContadoresSeguros() {
    
    const hoy = new Date().toISOString().split('T')[0];

    // Contamos según el estado real de las citas
    const pendientes = this.citas.filter(c => c.estado === 'pendiente').length;
    const aceptadas = this.citas.filter(c => c.estado === 'aceptada' || c.estado === 'confirmada').length;
    const concluidas = this.citas.filter(c => c.estado === 'concluida').length;
    const hoyCitas = this.citas.filter(c => c.fecha === hoy).length;

    // Asignamos directamente a los IDs reales del HTML de veterinario.html
    const txtHoy = document.getElementById('statsCitasHoy');
    const txtPendientes = document.getElementById('statsPendientes');
    const txtAceptadas = document.getElementById('statsAceptadas');
    const txtConcluidas = document.getElementById('statsConcluidas');

    if (txtHoy) txtHoy.textContent = hoyCitas;
    if (txtPendientes) txtPendientes.textContent = pendientes;
    if (txtAceptadas) txtAceptadas.textContent = aceptadas;
    if (txtConcluidas) txtConcluidas.textContent = concluidas;
    
    // Actualizamos también los badges del menú lateral
    this.actualizarBadges();
}

    async cargarCitas() {
    try {
        // Aseguramos obtener el ID del veterinario logueado
        const vId = this.veterinarioActual?.id || auth.currentUser?.uid;
        
        if (!vId) {
            console.error("No se pueden cargar citas: Falta ID del veterinario.");
            return;
        }

        const resultado = await this.citasModel.obtenerCitasVeterinario(vId);
        
        if (resultado.success) {
            this.citas = resultado.data;
            this.renderizarCitas(); // Aquí se quita el "Cargando..." del HTML
        } else {
            console.error('Error al obtener citas del modelo:', resultado.error);
            this.citas = [];
            this.renderizarCitas();
        }
    } catch (error) {
        console.error('Error al obtener citas:', error);
        // Evitamos que la UI se quede congelada en "Cargando..." si falla Firestore
        this.citas = [];
        this.renderizarCitas();
    }
}

    async cargarPublicaciones() {
    const contenedor = document.getElementById('listaPublicaciones');
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando publicaciones...</p>
            </div>
        `;
    }

    try {
        const vId = this.veterinarioActual?.id || auth.currentUser?.uid;
        if (!vId) {
            console.error("No se pueden cargar publicaciones: Falta ID del veterinario.");
            return;
        }
        
        // 1. Quitamos el 'orderBy' de la consulta de Firebase para evitar que se congele por falta de índices.
        const q = query(
            collection(db, 'publicaciones'),
            where('veterinarioId', '==', vId)
        );

        const querySnapshot = await getDocs(q);
        const listaDocs = [];
        
        querySnapshot.forEach((doc) => {
            listaDocs.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // 2. Ordenamos por fecha aquí mismo en JavaScript (Súper seguro y rápido)
        this.publicaciones = listaDocs.sort((a, b) => {
            const fechaA = a.fechaCreacion?.seconds || 0;
            const fechaB = b.fechaCreacion?.seconds || 0;
            return fechaB - fechaA; // De la más reciente a la más antigua
        });
        
        // 3. Mandamos a dibujar las tarjetas en la pantalla
        this.renderizarPublicaciones();

    } catch (error) {
        console.error('Error crítico al cargar publicaciones de Firestore:', error);
        
        // Si Firebase llega a fallar, limpiamos el estado de "Cargando..." para que no se congele la UI
        this.publicaciones = [];
        this.renderizarPublicaciones();
    }
}

    contarSolicitudesAdopcion(publicacionId) {
        return this.solicitudesAdopcion.filter(
            solicitud => solicitud.publicacionId === publicacionId
        ).length;
    }

    // Método para contar reclamos de una publicación
    contarReclamos(publicacionId) {
        return this.reclamos.filter(
            reclamo => reclamo.publicacionId === publicacionId
        ).length;
    }

    async cargarSolicitudesAdopcion() {
        if (!this.veterinarioActual) return;

        try {
            const solicitudesRef = collection(db, 'solicitudesAdopcion');
            const q = query(
                solicitudesRef,
                where('veterinarioId', '==', this.veterinarioActual.id)
            );
            
            const querySnapshot = await getDocs(q);
            this.solicitudesAdopcion = [];
            
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const solicitud = {
                    id: doc.id,
                    ...doc.data()
                };
                this.solicitudesAdopcion.push(solicitud);
            });
            this.solicitudesAdopcion.sort((a, b) =>
                this.obtenerFechaMs(b.fechaSolicitud) - this.obtenerFechaMs(a.fechaSolicitud)
            );
            this.renderizarSolicitudesAdopcion();
            this.renderizarSolicitudesRecientes();
            this.actualizarBadges();

            
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
        }
    }

       
    async cargarReclamos() {
        if (!this.veterinarioActual) return;

        try {
            const reclamosRef = collection(db, 'reclamosMascotas');
            const q = query(
                reclamosRef,
                where('veterinarioId', '==', this.veterinarioActual.id)
            );
            
            const querySnapshot = await getDocs(q);
            this.reclamos = [];
            
            querySnapshot.forEach(doc => {
                this.reclamos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            this.reclamos.sort((a, b) =>
                this.obtenerFechaMs(b.fechaReclamo) - this.obtenerFechaMs(a.fechaReclamo)
            );
                        
            this.renderizarReclamos();
            this.renderizarReclamosRecientes();
            
        } catch (error) {
            console.error('❌ Error cargando reclamos:', error);
            this.mostrarNotificacion('Error al cargar reclamos', 'error');
        }
    }

    

    actualizarEstadisticas() {
        const hoy = new Date().toISOString().split('T')[0];

        document.getElementById('statsCitasHoy').textContent =
            this.citas.filter(c => c.fecha === hoy).length;
        document.getElementById('statsPendientes').textContent =
            this.citas.filter(c => c.estado === 'pendiente').length;
        document.getElementById('statsAceptadas').textContent =
            this.citas.filter(c => c.estado === 'aceptada').length;
        document.getElementById('statsConcluidas').textContent =
            this.citas.filter(c => c.estado === 'concluida').length;
    }

    actualizarBadges() {
        document.getElementById('citasPendientesBadge').textContent =
            this.citas.filter(c => c.estado === 'pendiente').length;
        document.getElementById('adopcionesBadge').textContent =
            this.solicitudesAdopcion.filter(s => this.normalizarEstadoAdopcion(s.estado) === 'pendiente').length;
        document.getElementById('notificaciones').textContent =
            this.citas.filter(c => c.estado === 'pendiente').length +
            this.solicitudesAdopcion.filter(s => this.normalizarEstadoAdopcion(s.estado) === 'pendiente').length;
    }

    renderizarCitas() {

        const container = document.getElementById('citasGrid');

        let citas = [...this.citas];

        switch (this.filtros.citas) {

            case 'pendiente':
                citas = citas.filter(c => c.estado === 'pendiente');
                break;

            case 'aceptada':
                citas = citas.filter(c => c.estado === 'aceptada');
                break;

            case 'rechazadas':
                citas = citas.filter(c => c.estado === 'rechazadas');
                break;

            case 'concluida':
                citas = citas.filter(c => c.estado === 'concluida');
                break;

            case 'cancelada':
                citas = citas.filter(c => c.estado === 'cancelada');
                break;

            default:
                break;

        }

        citas.sort((a,b)=>{

            if(a.fecha!==b.fecha){
                return a.fecha.localeCompare(b.fecha);
            }

            return a.hora.localeCompare(b.hora);

        });

        if(citas.length===0){

            container.innerHTML=`
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No hay citas para este estado.</p>
                </div>
            `;

            return;
        }

        container.innerHTML=citas
            .map(c=>this.generarCardCita(c))
            .join('');

    }

    filtrarCitas(estado){

        this.filtros.citas=estado;

        document.querySelectorAll('.btnFiltroCitas').forEach(btn=>{

            btn.classList.remove('active');

        });

        document
            .querySelector(`[data-estado="${estado}"]`)
            ?.classList.add('active');

        this.renderizarCitas();

    }

    generarCardCita(cita) {
        const fechaObj = new Date(cita.fecha + 'T' + cita.hora);
        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return `
            <div class="cita-card">
                <div class="cita-header">
                    <span class="cita-estado estado-${cita.estado}">${cita.estado}</span>
                    <span class="cita-fecha">${fechaFormateada} - ${cita.hora}</span>
                </div>
                <div class="cita-body">
                    <div class="cita-mascota">
                        <i class="fas fa-paw"></i> ${cita.nombreMascota || 'Mascota'}
                    </div>
                    <div class="cita-detalle">
                        <p><strong>Propietario:</strong> ${cita.usuarioEmail || 'No especificado'}</p>
                        <p><strong>Especie:</strong> ${cita.especie || 'No especificada'}</p>
                        <p><strong>Raza:</strong> ${cita.raza || 'No especificada'}</p>
                        <p><strong>Motivo:</strong> ${cita.problemaSalud?.substring(0, 60)}${cita.problemaSalud?.length > 60 ? '...' : ''}</p>
                    </div>
                </div>
                <div class="cita-footer">
                    <button class="btn-icon btn-ver" onclick="vetController.verDetalle('cita', '${cita.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-icon btn-estado" onclick="vetController.abrirModalEstado('cita', '${cita.id}', '${cita.estado}')">
                        <i class="fas fa-check-circle"></i> Estado
                    </button>
                </div>
            </div>
        `;
    }

    renderizarProximasCitas() {
        const container = document.getElementById('proximasCitasList');
        const hoy = new Date().toISOString().split('T')[0];

        const proximas = this.citas
            .filter(c => c.fecha >= hoy && c.estado !== 'rechazada' && c.estado !== 'concluida')
            .sort((a, b) => {
                if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
                return a.hora.localeCompare(b.hora);
            })
            .slice(0, 5);

        if (proximas.length === 0) {
            container.innerHTML = '<p class="loading">No hay citas próximas</p>';
            return;
        }

        let html = '';
        proximas.forEach(cita => {
            html += `
                <div class="cita-card" style="margin-bottom: 10px;">
                    <div class="cita-header">
                        <span class="cita-estado estado-${cita.estado}">${cita.estado}</span>
                        <span class="cita-fecha">${cita.fecha} ${cita.hora}</span>
                    </div>
                    <div class="cita-body">
                        <strong>${cita.nombreMascota || 'Mascota'}</strong> - ${cita.usuarioEmail || 'Sin email'}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderizarPublicaciones() {
        const contenedor = document.getElementById('publicacionesGrid'); 
        if (!contenedor) return;

        // Filtramos las publicaciones de forma estricta según el botón seleccionado
        const publicacionesFiltradas = this.publicaciones.filter(pub => {
            const tipoFiltro = this.filtros.publicaciones; // 'adopcion', 'perdido' o 'encontrado'
            const tipoPub = (pub.tipo || '').toLowerCase();

            if (tipoFiltro === 'adopcion') {
                return tipoPub.includes('adopc') && !tipoPub.includes('perd') && !tipoPub.includes('encontr');
            } else if (tipoFiltro === 'perdido') {
                // Retorna SÓLO si es perdido, ignorando explícitamente "encontrado"
                return tipoPub.includes('perd') && !tipoPub.includes('encontr');
            } else if (tipoFiltro === 'encontrado') {
                // Retorna SÓLO si contiene la palabra encontrado
                return tipoPub.includes('encontr');
            }
            return true;
        });

        if (publicacionesFiltradas.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bullhorn"></i>
                    <p>No tienes publicaciones en esta categoría.</p>
                </div>
            `;
            return;
        }

        let html = '';
        publicacionesFiltradas.forEach(pub => {
            const fecha = pub.fechaCreacion ? new Date(pub.fechaCreacion.seconds * 1000).toLocaleDateString() : 'Reciente';
            
            const tipoPubBajo = (pub.tipo || '').toLowerCase();
            let tipoTexto = 'En Adopción';
            let claseBadge = 'badge-adopcion';

            // Asignamos la etiqueta visual correcta a la tarjeta
            if (tipoPubBajo.includes('encontr')) {
                tipoTexto = 'Mascota Encontrada';
                claseBadge = 'badge-encontrado'; // Asegúrate de tener este estilo o usará el diseño base
            } else if (tipoPubBajo.includes('perd')) {
                tipoTexto = 'Mascota Perdida';
                claseBadge = 'badge-perdido';
            }
            
            const fotosPublicacion = this.normalizarFotosPublicacion(pub);
            const urlImagen = fotosPublicacion[0] || 'https://via.placeholder.com/300x180?text=Sin+Foto';
            const totalSolicitudes = this.contarSolicitudesAdopcion(pub.id);
            const totalReclamos = this.contarReclamos(pub.id);

            html += `
                <div class="pub-card">
                    <div class="pub-image-container">
                        <span class="pub-badge ${claseBadge}">${tipoTexto}</span>
                        <img src="${urlImagen}" alt="${pub.titulo || 'Mascota'}">
                    </div>
                    <div class="pub-body">
                        <div class="pub-info-meta">
                            <i class="far fa-calendar-alt"></i> ${fecha}
                        </div>
                        <h3>${pub.titulo || 'Sin Título'}</h3>
                        <p>${pub.descripcion || 'Sin descripción disponible.'}</p>
                        ${pub.ubicacionTexto ? `<div class="pub-info-meta"><i class="fas fa-map-marker-alt"></i> ${pub.ubicacionTexto}</div>` : ''}
                    </div>
                    <div class="pub-stats" aria-label="Estadísticas de la publicación">
                        <span class="pub-stat">
                            <i class="fas fa-eye" aria-hidden="true"></i>
                            <strong>${pub.vistas || 0}</strong> vistas
                        </span>
                        ${tipoPubBajo.includes('adopc') ? `
                            <span class="pub-stat">
                                <i class="fas fa-paw" aria-hidden="true"></i>
                                <strong>${totalSolicitudes}</strong> solicitudes
                            </span>
                        ` : ''}
                        ${tipoPubBajo.includes('encontr') ? `
                            <span class="pub-stat">
                                <i class="fas fa-clipboard-check" aria-hidden="true"></i>
                                <strong>${totalReclamos}</strong> reclamos
                            </span>
                        ` : ''}
                    </div>
                    <div class="pub-footer-actions">
                        <button
                            type="button"
                            class="pub-action-btn pub-action-edit"
                            onclick="vetController.editarPublicacion('${pub.id}')">
                            <i class="fas fa-pen" aria-hidden="true"></i>
                            <span>Editar publicación</span>
                        </button>
                        <button
                            type="button"
                            class="pub-action-btn pub-action-delete"
                            onclick="vetController.eliminarPublicacion('${pub.id}')">
                            <i class="fas fa-trash-alt" aria-hidden="true"></i>
                            <span>Eliminar</span>
                        </button>
                    </div>
                </div>
            `;
        });
        
        contenedor.innerHTML = html;
    }
    // Método auxiliar para escapar HTML y evitar XSS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    normalizarFotosPublicacion(publicacion) {
        const fotos = [];

        if (Array.isArray(publicacion?.fotos)) {
            fotos.push(...publicacion.fotos);
        }

        if (Array.isArray(publicacion?.foto)) {
            fotos.push(...publicacion.foto);
        } else if (typeof publicacion?.foto === 'string') {
            fotos.push(publicacion.foto);
        }

        if (typeof publicacion?.imagenUrl === 'string') {
            fotos.push(publicacion.imagenUrl);
        }

        return fotos.filter((foto, index, arr) =>
            typeof foto === 'string' &&
            foto.trim() !== '' &&
            arr.indexOf(foto) === index
        );
    }

    obtenerFechaMs(fecha) {
        if (!fecha) return 0;
        if (fecha.toDate) return fecha.toDate().getTime();
        if (fecha.seconds) return fecha.seconds * 1000;
        return new Date(fecha).getTime() || 0;
    }

    formatearFecha(fecha) {
        const ms = this.obtenerFechaMs(fecha);
        return ms ? new Date(ms).toLocaleDateString('es-ES') : 'Reciente';
    }

    normalizarEstadoAdopcion(estado) {
        const valor = (estado || 'pendiente').toLowerCase();
        if (valor.includes('aprob')) return 'aprobada';
        if (valor.includes('rechaz')) return 'rechazada';
        return 'pendiente';
    }

    normalizarEstadoReclamo(estado) {
        const valor = (estado || 'pendiente').toLowerCase();
        if (valor.includes('verific')) return 'verificados';
        if (valor.includes('aprob')) return 'aprobados';
        if (valor.includes('rechaz')) return 'rechazados';
        return 'pendiente';
    }

    filtroAdopcionAEstado(filtro) {
        if (filtro === 'aprobadas') return 'aprobada';
        if (filtro === 'rechazadas') return 'rechazada';
        return 'pendiente';
    }

    filtroReclamoAEstado(filtro) {
        if (filtro === 'verificados') return 'verificados';
        if (filtro === 'aprobados') return 'aprobados';
        if (filtro === 'rechazados') return 'rechazados';
        return 'pendiente';
    }

    async verSolicitudesAdopcion(publicacionId) {
        this.mostrarNotificacion('Funcionalidad en desarrollo', 'info');
    }

    async verReclamos(publicacionId) {
        this.mostrarNotificacion('Funcionalidad en desarrollo', 'info');
    }


    renderizarSolicitudesAdopcion() {
        const container = document.getElementById('solicitudesGrid');
        if (!container) return;
        
        const estadoFiltro = this.filtroAdopcionAEstado(this.filtros.adopciones);
        let filtradas = this.solicitudesAdopcion.filter(s =>
            this.normalizarEstadoAdopcion(s.estado) === estadoFiltro
        );
        
        if (filtradas.length === 0) {
            container.innerHTML = '<p class="loading">No hay solicitudes de adopción en este estado</p>';
            return;
        }
        
        let html = '';
        filtradas.forEach(sol => {
            html += this.generarCardSolicitudAdopcion(sol);
        });
        
        container.innerHTML = html;
    }

    generarCardSolicitudAdopcion(sol) {
        const fechaFormateada = this.formatearFecha(sol.fechaSolicitud);
        const estado = this.normalizarEstadoAdopcion(sol.estado);
        
        return `
            <div class="solicitud-card">
                <div class="cita-header">
                    <span class="cita-estado estado-${estado}">${estado}</span>
                    <span class="cita-fecha">${fechaFormateada}</span>
                </div>
                <div class="cita-body">
                    <div class="cita-mascota">
                        <i class="fas fa-user"></i> ${sol.usuarioNombre || 'Anónimo'}
                    </div>
                    <div class="cita-detalle">
                        <p><strong>Email:</strong> ${sol.usuarioEmail || 'No especificado'}</p>
                        <p><strong>Teléfono:</strong> ${sol.telefono || 'No especificado'}</p>
                        <p><strong>Mensaje:</strong> ${(sol.mensaje || '').substring(0, 80)}${sol.mensaje?.length > 80 ? '...' : ''}</p>
                    </div>
                    ${sol.pruebas && sol.pruebas.length > 0 ? `
                        <div class="pruebas-container">
                            <strong>📸 Pruebas:</strong>
                            <div class="pruebas-miniaturas">
                                ${sol.pruebas.slice(0, 3).map(foto => `
                                    <img src="${foto}" class="prueba-thumb" onclick="vetController.verImagen('${foto}')">
                                `).join('')}
                                ${sol.pruebas.length > 3 ? `<span class="mas-fotos">+${sol.pruebas.length - 3}</span>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="cita-footer">
                    <button class="btn-icon btn-ver" onclick="vetController.verDetalleSolicitudAdopcion('${sol.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-icon btn-estado" onclick="vetController.abrirModalEstadoAdopcion('${sol.id}', '${estado}')">
                        <i class="fas fa-check-circle"></i> Estado
                    </button>
                </div>
            </div>
        `;
    }

    verDetalleSolicitudAdopcion(solicitudId) {
        const solicitud = this.solicitudesAdopcion.find(s => s.id === solicitudId);
        if (!solicitud) {
            this.mostrarNotificacion('Solicitud no encontrada', 'error');
            return;
        }
        const estado = this.normalizarEstadoAdopcion(solicitud.estado);
        
        const fechaMs = this.obtenerFechaMs(solicitud.fechaSolicitud);
        const fechaFormateada = fechaMs ? new Date(fechaMs).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Reciente';
        
        let pruebasHtml = '';
        if (solicitud.pruebas && solicitud.pruebas.length > 0) {
            pruebasHtml = `
                <div class="detalle-pruebas">
                    <strong>📸 Pruebas adjuntas:</strong>
                    <div class="pruebas-galeria">
                        ${solicitud.pruebas.map((foto, idx) => `
                            <img src="${foto}" alt="Prueba ${idx + 1}" class="prueba-imagen" onclick="vetController.verImagen('${foto}')">
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        const contenido = `
            <div class="detalle-solicitud">
                <div class="detalle-campo">
                    <strong>🐾 Publicación:</strong>
                    <p>${solicitud.publicacionTitulo || solicitud.publicacionId}</p>
                </div>
                <div class="detalle-campo">
                    <strong>👤 Solicitante:</strong>
                    <p>${solicitud.usuarioNombre || 'No especificado'}</p>
                </div>
                <div class="detalle-campo">
                    <strong>📧 Email:</strong>
                    <p>${solicitud.usuarioEmail || 'No especificado'}</p>
                </div>
                <div class="detalle-campo">
                    <strong>📞 Teléfono:</strong>
                    <p>${solicitud.telefono || 'No especificado'}</p>
                </div>
                <div class="detalle-campo">
                    <strong>📍 Dirección:</strong>
                    <p>${solicitud.direccion || 'No especificada'}</p>
                </div>
                <div class="detalle-campo">
                    <strong>💬 Mensaje:</strong>
                    <p>${solicitud.mensaje || 'No especificado'}</p>
                </div>
                <div class="detalle-campo">
                    <strong>🐕 Experiencia con mascotas:</strong>
                    <p>${solicitud.experiencia || 'No especificada'}</p>
                </div>
                <div class="detalle-campo">
                    <strong>🐶 ¿Tiene otras mascotas?:</strong>
                    <p>${solicitud.tieneOtrasMascotas ? 'Sí' : 'No'}</p>
                </div>
                <div class="detalle-campo">
                    <strong>📅 Fecha de solicitud:</strong>
                    <p>${fechaFormateada}</p>
                </div>
                <div class="detalle-campo">
                    <strong>🏷️ Estado:</strong>
                    <p><span class="estado-badge estado-${estado}">${estado}</span></p>
                </div>
                ${solicitud.notasVeterinario ? `
                    <div class="detalle-campo">
                        <strong>📝 Notas del veterinario:</strong>
                        <p>${solicitud.notasVeterinario}</p>
                    </div>
                ` : ''}
                ${pruebasHtml}
            </div>
        `;
        
        document.getElementById('modalTitulo').textContent = 'Detalles de la solicitud de adopción';
        document.getElementById('modalBody').innerHTML = contenido;
        document.getElementById('detalleModal').style.display = 'flex';
    }

    // Método para ver imagen ampliada
    verImagen(url) {
        Swal.fire({
            imageUrl: url,
            imageAlt: 'Imagen ampliada',
            showCloseButton: true,
            showConfirmButton: false,
            width: 'auto',
            padding: '0',
            background: 'transparent',
            backdrop: 'rgba(0,0,0,0.9)'
        });
    }

    abrirModalEstadoAdopcion(solicitudId, estadoActual) {
        document.getElementById('itemIdActual').value = solicitudId;
        document.getElementById('itemTipoActual').value = 'adopcion';
        
        const select = document.getElementById('nuevoEstado');
        select.innerHTML = `
            <option value="pendiente" ${estadoActual === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="aprobada" ${estadoActual === 'aprobada' ? 'selected' : ''}>Aprobada</option>
            <option value="rechazada" ${estadoActual === 'rechazada' ? 'selected' : ''}>Rechazada</option>
        `;
        
        document.getElementById('estadoModal').style.display = 'flex';
    }

    renderizarReclamos() {
        const container = document.getElementById('reclamosGrid');
        if (!container) {
            return;
        }
        
        
        const estadoFiltro = this.filtroReclamoAEstado(this.filtros.reclamos);
        let filtradas = this.reclamos.filter(r =>
            this.normalizarEstadoReclamo(r.estado) === estadoFiltro
        );
        
        
        if (filtradas.length === 0) {
            container.innerHTML = '<p class="loading">No hay reclamos para mostrar</p>';
            return;
        }
        
        let html = '';
        filtradas.forEach(rec => {
            html += this.generarCardReclamo(rec);
        });
        
        container.innerHTML = html;
    }

    generarCardReclamo(rec) {
        const fechaFormateada = this.formatearFecha(rec.fechaReclamo);
        const estado = this.normalizarEstadoReclamo(rec.estado);
        
        // Determinar clase de estado
        let estadoClass = 'estado-pendiente';
        if (estado === 'verificados') estadoClass = 'estado-verificacion';
        if (estado === 'aprobados') estadoClass = 'estado-aprobada';
        if (estado === 'rechazados') estadoClass = 'estado-rechazada';
        
        // Mostrar primeras pruebas como miniaturas
        let pruebasHtml = '';
        if (rec.pruebas && rec.pruebas.length > 0) {
            pruebasHtml = `
                <div class="pruebas-container">
                    <strong>📸 Pruebas:</strong>
                    <div class="pruebas-miniaturas">
                        ${rec.pruebas.slice(0, 3).map(foto => `
                            <img src="${foto}" class="prueba-thumb" onclick="vetController.verImagen('${foto}')">
                        `).join('')}
                        ${rec.pruebas.length > 3 ? `<span class="mas-fotos">+${rec.pruebas.length - 3}</span>` : ''}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="reclamo-card">
                <div class="cita-header">
                    <span class="cita-estado ${estadoClass}">${estado}</span>
                    <span class="cita-fecha">${fechaFormateada}</span>
                </div>
                <div class="cita-body">
                    <div class="cita-mascota">
                        <i class="fas fa-user"></i> ${rec.usuarioNombre || 'Anónimo'}
                    </div>
                    <div class="cita-detalle">
                        <p><strong>Email:</strong> ${rec.usuarioEmail || 'No especificado'}</p>
                        <p><strong>Teléfono:</strong> ${rec.telefono || 'No especificado'}</p>
                        <p><strong>Descripción:</strong> ${(rec.descripcion || '').substring(0, 80)}${rec.descripcion?.length > 80 ? '...' : ''}</p>
                    </div>
                    ${pruebasHtml}
                </div>
                <div class="cita-footer">
                    <button class="btn-icon btn-ver" onclick="vetController.verDetalleReclamo('${rec.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-icon btn-estado" onclick="vetController.abrirModalEstadoReclamo('${rec.id}', '${estado}')">
                        <i class="fas fa-check-circle"></i> Estado
                    </button>
                </div>
            </div>
        `;
    }

    verDetalleReclamo(reclamoId) {
        const reclamo = this.reclamos.find(r => r.id === reclamoId);
        if (!reclamo) return;
        const estado = this.normalizarEstadoReclamo(reclamo.estado);
        
        const fechaMs = this.obtenerFechaMs(reclamo.fechaReclamo);
        const fechaFormateada = fechaMs ? new Date(fechaMs).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'Reciente';
        
        let pruebasHtml = '';
        if (reclamo.pruebas && reclamo.pruebas.length > 0) {
            pruebasHtml = `
                <div class="detalle-pruebas">
                    <strong>📸 Pruebas adjuntas:</strong>
                    <div class="pruebas-galeria">
                        ${reclamo.pruebas.map((foto, idx) => `
                            <img src="${foto}" alt="Prueba ${idx + 1}" class="prueba-imagen" onclick="vetController.verImagen('${foto}')">
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        const contenido = `
            <div class="detalle-solicitud">
                <div class="detalle-campo"><strong>🐾 Publicación ID:</strong><p>${reclamo.publicacionId || 'No especificada'}</p></div>
                <div class="detalle-campo"><strong>👤 Reclamante:</strong><p>${reclamo.usuarioNombre || 'No especificado'}</p></div>
                <div class="detalle-campo"><strong>📧 Email:</strong><p>${reclamo.usuarioEmail || 'No especificado'}</p></div>
                <div class="detalle-campo"><strong>📞 Teléfono:</strong><p>${reclamo.telefono || 'No especificado'}</p></div>
                <div class="detalle-campo"><strong>📝 Descripción del reclamo:</strong><p>${reclamo.descripcion || 'No especificada'}</p></div>
                <div class="detalle-campo"><strong>📅 Fecha del reclamo:</strong><p>${fechaFormateada}</p></div>
                <div class="detalle-campo"><strong>🏷️ Estado actual:</strong><p><span class="estado-badge estado-${reclamo.estado}">${reclamo.estado}</span></p></div>
                ${reclamo.notasVeterinario ? `<div class="detalle-campo"><strong>📝 Notas del veterinario:</strong><p>${reclamo.notasVeterinario}</p></div>` : ''}
                ${pruebasHtml}
            </div>
        `;
        
        document.getElementById('modalTitulo').textContent = 'Detalles del reclamo';
        document.getElementById('modalBody').innerHTML = contenido;
        document.getElementById('detalleModal').style.display = 'flex';
    }

    abrirModalEstadoReclamo(reclamoId, estadoActual) {
        document.getElementById('itemIdActual').value = reclamoId;
        document.getElementById('itemTipoActual').value = 'reclamo';
        
        const select = document.getElementById('nuevoEstado');
        select.innerHTML = `
            <option value="pendiente" ${estadoActual === 'pendiente' ? 'selected' : ''}>📌 Pendiente</option>
            <option value="verificados" ${estadoActual === 'verificados' ? 'selected' : ''}>🔍 En verificación</option>
            <option value="aprobados" ${estadoActual === 'aprobados' ? 'selected' : ''}>✅ Aprobado</option>
            <option value="rechazados" ${estadoActual === 'rechazados' ? 'selected' : ''}>❌ Rechazado</option>
        `;
        
        document.getElementById('estadoModal').style.display = 'flex';
    }

    renderizarSolicitudesRecientes() {
        const container = document.getElementById('solicitudesRecientes');
        if (!container) {
            return;
        }

        const pendientes = this.solicitudesAdopcion.filter(s => this.normalizarEstadoAdopcion(s.estado) === 'pendiente');

        if (pendientes.length === 0) {
            container.innerHTML = '<p class="loading">No hay solicitudes pendientes</p>';
            return;
        }

        const recientes = this.solicitudesAdopcion.slice(0, 3);

        let html = '';
        recientes.forEach(sol => {
            const fechaFormateada = this.formatearFecha(sol.fechaSolicitud);
            
            html += `
                <div class="cita-card" style="margin-bottom: 10px; cursor: pointer;" onclick="vetController.verDetalleSolicitudAdopcion('${sol.id}')">
                    <div class="cita-header">
                        <span class="cita-estado estado-${sol.estado}">${sol.estado}</span>
                        <span class="cita-fecha">${fechaFormateada}</span>
                    </div>
                    <div class="cita-body">
                        <strong>${sol.usuarioNombre || 'Anónimo'}</strong> - ${sol.usuarioEmail || 'Sin email'}
                        <p style="font-size: 0.8rem; color: #666; margin-top: 5px;">${(sol.mensaje || '').substring(0, 60)}${sol.mensaje?.length > 60 ? '...' : ''}</p>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    renderizarReclamosRecientes() {
        const container = document.getElementById('reclamosRecientes');
        if (!container) return;
        
        const pendientes = this.reclamos.filter(r => this.normalizarEstadoReclamo(r.estado) === 'pendiente');
        
        if (pendientes.length === 0) {
            container.innerHTML = '<p class="loading">No hay reclamos pendientes</p>';
            return;
        }
        
        const recientes = pendientes.slice(0, 3);
        
        let html = '';
        recientes.forEach(rec => {
            const fechaFormateada = this.formatearFecha(rec.fechaReclamo);
            
            html += `
                <div class="cita-card" style="margin-bottom: 10px; cursor: pointer;" onclick="vetController.verDetalleReclamo('${rec.id}')">
                    <div class="cita-header">
                        <span class="cita-estado estado-pendiente">${rec.estado}</span>
                        <span class="cita-fecha">${fechaFormateada}</span>
                    </div>
                    <div class="cita-body">
                        <strong>${rec.usuarioNombre || 'Anónimo'}</strong> - ${rec.usuarioEmail || 'Sin email'}
                        <p style="font-size: 0.8rem; color: #666; margin-top: 5px;">${(rec.descripcion || '').substring(0, 50)}...</p>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }


    configurarFormularioHorarios() {
        const horarioGrid = document.getElementById('horarioGrid');
        const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

        const horarioActual = this.veterinarioActual?.horarioSemanal || [];

        let html = '';
        dias.forEach(dia => {
            const config = horarioActual.find(h => h.dia === dia) || {
                activo: dia !== 'domingo',
                apertura: '09:00',
                cierre: '18:00'
            };

            html += `
                <div class="dia-config">
                    <h4>${dia}</h4>
                    <div class="dia-activo">
                        <input type="checkbox" id="${dia}_activo" ${config.activo ? 'checked' : ''}>
                        <label for="${dia}_activo">Atendemos este día</label>
                    </div>
                    <div class="horario-inputs">
                        <input type="time" id="${dia}_apertura" value="${config.apertura || '09:00'}" ${!config.activo ? 'disabled' : ''}>
                        <input type="time" id="${dia}_cierre" value="${config.cierre || '18:00'}" ${!config.activo ? 'disabled' : ''}>
                    </div>
                </div>
            `;
        });

        horarioGrid.innerHTML = html;

+        dias.forEach(dia => {
            const checkbox = document.getElementById(`${dia}_activo`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    const apertura = document.getElementById(`${dia}_apertura`);
                    const cierre = document.getElementById(`${dia}_cierre`);
                    apertura.disabled = !e.target.checked;
                    cierre.disabled = !e.target.checked;
                });
            }
        });

        if (this.veterinarioActual?.duracionCita) {
            document.getElementById('duracionCita').value = this.veterinarioActual.duracionCita;
        }
        if (this.veterinarioActual?.diasAnticipacion) {
            document.getElementById('diasAnticipacion').value = this.veterinarioActual.diasAnticipacion;
        }
    }

    async guardarHorario(e) {
    e.preventDefault();

    try {
        const vId = this.veterinarioActual?.id || auth.currentUser?.uid;
        if (!vId) throw new Error("No hay UID de veterinario disponible.");

        const inputDuracion = document.getElementById('duracionCita');
        const inputDias = document.getElementById('diasAnticipacion');
        
        const duracionCita = inputDuracion ? parseInt(inputDuracion.value) : 30;
        const diasAnticipacion = inputDias ? parseInt(inputDias.value) : 7;

        // Recolectamos los checkboxes de los días de la semana
        const horarioSemanal = [];
        const diasSemana = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
        
        diasSemana.forEach(dia => {
            // Nota: Asegúrate de que el ID en tu HTML sea exactamente como lo busca el script
            const checkbox = document.getElementById(`${dia}_activo`);
            if (checkbox && checkbox.checked) {
                const apertura = document.getElementById(`${dia}_apertura`)?.value || "09:00";
                const cierre = document.getElementById(`${dia}_cierre`)?.value || "18:00";
                
                horarioSemanal.push({
                    dia: dia,
                    activo: true,
                    apertura: apertura,
                    cierre: cierre
                });
            } else {
                horarioSemanal.push({
                    dia: dia,
                    activo: false,
                    apertura: "09:00",
                    cierre: "18:00"
                });
            }
        });
        
        const resultado = await this.vetModel.guardarConfiguracionHorario(vId, horarioSemanal, duracionCita, diasAnticipacion);

        if (resultado.success) {
            //LA CLAVE: Actualizamos la memoria local del controlador de inmediato
            this.veterinarioActual.horarioSemanal = horarioSemanal;
            this.veterinarioActual.duracionCita = duracionCita;
            this.veterinarioActual.diasAnticipacion = diasAnticipacion;

            Swal.fire('¡Agenda Guardada!', 'Tus días de atención han sido actualizados en el sistema.', 'success');
        } else {
            throw new Error(resultado.error);
        }

    } catch (error) {
        console.error("Error al guardar horario en el controlador:", error);
        Swal.fire('Error al guardar agenda', 'Detalles: ' + error.message, 'error');
    }
}

    async cargarHorariosDisponibles() {

        const veterinarioId = document.getElementById('veterinario')?.value;
        const fecha = document.getElementById('fecha')?.value;
        const horaSelect = document.getElementById('hora');

        if (!veterinarioId || !fecha) {
            horaSelect.innerHTML = '<option value="">Primero selecciona veterinario y fecha</option>';
            return;
        }

        try {
            horaSelect.innerHTML = '<option value="">Cargando horarios...</option>';
            horaSelect.disabled = true;

            const vetResult = await this.vetModel.obtenerVeterinarioPorId(veterinarioId);
            
            let vetSeleccionado;
            if (vetResult.success) {
                vetSeleccionado = vetResult.data;
            } else {
                vetSeleccionado = this.veterinarios.find(v => v.id === veterinarioId);
            }
            
            if (!vetSeleccionado) {
                horaSelect.innerHTML = '<option value="">Error: Veterinario no encontrado</option>';
                horaSelect.disabled = false;
                return;
            }

            if (!vetSeleccionado.horarioSemanal || vetSeleccionado.horarioSemanal.length === 0) {
                horaSelect.innerHTML = '<option value="">El veterinario no tiene horario configurado</option>';
                horaSelect.disabled = false;
                return;
            }

            const horariosOcupados = await this.citasModel.obtenerHorariosOcupados(veterinarioId, fecha);
            const horariosDisponibles = this.generarHorarios(vetSeleccionado, horariosOcupados);

            let options = '<option value="">Selecciona una hora</option>';
            horariosDisponibles.forEach(hora => {
                options += `<option value="${hora}">${hora}</option>`;
            });

            horaSelect.innerHTML = options;
            horaSelect.disabled = false;

        } catch (error) {
            console.error('❌ Error al cargar horarios:', error);
            horaSelect.innerHTML = '<option value="">Error al cargar horarios</option>';
            horaSelect.disabled = false;
        }
    }



    generarHorarios(vet, horariosOcupados = []) {
        if (!vet || !vet.horarioSemanal) return [];
        
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const fechaInput = document.getElementById('fecha')?.value;
        if (!fechaInput) return [];
        
        const fecha = new Date(fechaInput);
        const diaSemana = dias[fecha.getDay()];
        
        const horarioDia = vet.horarioSemanal.find(h => h.dia === diaSemana);
        
        if (!horarioDia || !horarioDia.activo) {
            return [];
        }

        const duracion = vet.duracionCita || 30;
        const horarios = [];
        
        const [horaInicio, minInicio] = horarioDia.apertura.split(':').map(Number);
        const [horaFin, minFin] = horarioDia.cierre.split(':').map(Number);
        
        let horaActual = horaInicio;
        let minActual = minInicio;
        
        while (horaActual < horaFin || (horaActual === horaFin && minActual < minFin)) {
            const horaStr = `${horaActual.toString().padStart(2, '0')}:${minActual.toString().padStart(2, '0')}`;
            
            if (!horariosOcupados.includes(horaStr)) {
                horarios.push(horaStr);
            }
            
            minActual += duracion;
            if (minActual >= 60) {
                horaActual += Math.floor(minActual / 60);
                minActual = minActual % 60;
            }
        }
        
        return horarios;
    }

    cambiarSeccion(seccion) {
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.dataset.section === seccion) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        document.querySelectorAll('.content-section').forEach(section => {
            if (section.id === `${seccion}-section`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        const titulos = {
            dashboard: 'Dashboard',
            Mensajes: 'Mensajes',
            chats: 'Mensajes',
            citas: 'Gestión de Citas',
            publicaciones: 'Gestionar Publicaciones',
            adopciones: 'Solicitudes de Adopción',
            reclamos: 'Reclamos de Mascotas',
            horarios: 'Configuración de Horarios'
        };
        document.getElementById('currentSection').textContent = titulos[seccion] || seccion;

        if (seccion === 'horarios') {
            this.configurarFormularioHorarios();
        }
    }

    aplicarFiltroCitas(filtro) {
        document.querySelectorAll('#citas-section .filter-btn').forEach(btn => {
            if (btn.dataset.filter === filtro) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        this.filtros.citas = filtro;
        this.cargarCitas();
    }



    aplicarFiltroAdopciones(filtro) {

        document.querySelectorAll('#adopciones-section .filter-btn').forEach(btn => {
            if (btn.dataset.filter === filtro) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        this.filtros.adopciones = filtro;
        this.renderizarSolicitudesAdopcion();
    }


    aplicarFiltroPublicaciones(tipo) {
        document.querySelectorAll('.pub-tab').forEach(btn => {
            if (btn.dataset.pubType === tipo) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        this.filtros.publicaciones = tipo;
        this.renderizarPublicaciones();
    }

    aplicarFiltroReclamos(filtro) {
        
        document.querySelectorAll('#reclamos-section .filter-btn').forEach(btn => {
            if (btn.dataset.filter === filtro) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        this.filtros.reclamos = filtro;
        
        this.renderizarReclamos();
    }

    verDetalle(tipo, id) {
        let item = null;
        let titulo = '';

        switch (tipo) {
            case 'cita':
                item = this.citas.find(c => c.id === id);
                titulo = 'Detalles de la cita';
                break;
            case 'adopcion':
                item = this.solicitudesAdopcion.find(s => s.id === id);
                titulo = 'Detalles de la solicitud';
                break;
            case 'reclamo':
                item = this.reclamos.find(r => r.id === id);
                titulo = 'Detalles del reclamo';
                break;
            case 'publicacion':
                item = this.publicaciones.find(p => p.id === id);
                titulo = 'Detalles de la publicación';
                break;
        }

        if (!item) return;

        document.getElementById('modalTitulo').textContent = titulo;
        const urlImagen = item.imagenMascota || 'Sin imagen';
        const fecha = item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'No especificada';
        let contenido = '';
        contenido += `
                <p><strong>Nombre de la mascota:</strong> ${item.nombreMascota}</p>
                <p><strong>Raza:</strong> ${item.raza}</p>
                <p><strong>Especie:</strong> ${item.especie}</p>
                <p><strong>Genero:</strong> ${item.genero}</p>
                <p><strong>Edad:</strong> ${item.edad}</p>
                <p><strong>Enfermedades preexistentes:</strong> ${item.enfermedades}</p>
                <p><strong>Motivo de la cita:</strong> ${item.problemaSalud}</p>
                <p><strong>Hora de la cita:</strong> ${item.hora}</p>
                <p><strong>Fecha de la cita:</strong> ${fecha}</p>
                <p><strong>Estado:</strong> ${item.estado}</p>
                <p><strong style="display: block; text-align: center;"><img src="${urlImagen}" alt="Imagen de la mascota" style="max-width: 300px; max-height: 300px; border: 1px solid #ccc; border-radius: 5px;"></p>

                `;


        document.getElementById('modalBody').innerHTML = contenido;
        document.getElementById('detalleModal').style.display = 'flex';
    }

    abrirModalEstado(tipo, id, estadoActual) {
        document.getElementById('itemIdActual').value = id;
        document.getElementById('itemTipoActual').value = tipo;

        const select = document.getElementById('nuevoEstado');
        select.innerHTML = '';

        let opciones = [];
        switch (tipo) {
            case 'cita':
                opciones = ['pendiente', 'aceptada', 'rechazada', 'concluida'];
                break;
            case 'adopcion':
                opciones = ['pendiente', 'aprobada', 'rechazada'];
                break;
            case 'reclamo':
                opciones = ['pendiente', 'verificados', 'aprobados', 'rechazados'];
                break;
        }

        opciones.forEach(op => {
            const option = document.createElement('option');
            option.value = op;
            option.textContent = op.charAt(0).toUpperCase() + op.slice(1);
            if (op === estadoActual) option.selected = true;
            select.appendChild(option);
        });

        document.getElementById('estadoModal').style.display = 'flex';
    }

    async guardarCambioEstado(e) {
        e.preventDefault();
        
        const id = document.getElementById('itemIdActual').value;
        const tipo = document.getElementById('itemTipoActual').value;
        const nuevoEstado = document.getElementById('nuevoEstado').value;
        const notas = document.getElementById('notasEstado').value;
        
        if (tipo === 'cita') {
            const result = await this.vetModel.actualizarEstadoCita(id, nuevoEstado, notas);
            if (result.success) this.mostrarNotificacion(`Cita ${result.message}`, 'success');
        } else if (tipo === 'adopcion') {
            await this.actualizarEstadoSolicitudAdopcion(id, nuevoEstado, notas);
        } else if (tipo === 'reclamo') {
            await this.actualizarEstadoReclamo(id, nuevoEstado, notas);
        }
        
        this.cerrarEstadoModal();
        await this.cargarTodo();
    }

    nuevaPublicacion() {
        document.getElementById('publicacionForm')?.reset();
        document.getElementById("pubFotosPreview").innerHTML = "";
        document.getElementById("pubFotos").value = "";
        document.getElementById("publicacionId").value = "";

        const modalTitulo = document.querySelector('#publicacionModal .modal-header h3');
        if (modalTitulo) modalTitulo.textContent = 'Nueva publicacion';

        const btnGuardar = document.querySelector('#publicacionForm button[type="submit"]');
        if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar';

        document.getElementById('publicacionModal').style.display = 'flex';
    }

    async guardarPublicacion(e) {
    e.preventDefault();

    if (!this.veterinarioActual) {
        Swal.fire('Error', 'No se identificaron datos del veterinario', 'error');
        return;
    }

    try {
        const tipoInput = document.getElementById('pubTipo').value; // Ej: "En Adopción" o "Mascota Perdida"
        let tipoEstandar = "";

switch (tipoInput) {

    case "En Adopción":
        tipoEstandar = "adopcion";
        break;

    case "Mascota Perdida":
        tipoEstandar = "perdido";
        break;

    case "Mascota Encontrada":
        tipoEstandar = "encontrado";
        break;

    default:
        tipoEstandar = tipoInput;

}
        const titulo = document.getElementById('pubTitulo').value;
        const descripcion = document.getElementById('pubDescripcion').value;
        const contacto = document.getElementById('pubContacto').value;
        const categoria = document.getElementById("pubCategoria").value;
        const ubicacionTexto = document.getElementById("pubUbicacion").value;   
        const fotos = Array.from(document.querySelectorAll('#pubFotosPreview img'))
            .map(img => img.src)
            .filter(src => src && src.trim() !== '');

        // Validaciones básicas de tus campos obligatorios
        if (!titulo || !descripcion || !contacto || !categoria || !ubicacionTexto) {
            Swal.fire('Atención', 'Por favor llena los campos obligatorios', 'warning');
            return;
        }

        // Armamos el objeto final que va a Firebase
        const nuevaPublicacion = {
            veterinarioId: this.veterinarioActual.id || auth.currentUser?.uid,
            nombreVeterinario: this.veterinarioActual.nombre,
            clinica: this.veterinarioActual.clinica,
            tipo: tipoEstandar, //AHORA GUARDA "adopcion" o "perdido" limpiamente
            titulo: titulo,
            descripcion: descripcion,
            contacto: contacto,
            categoria: categoria,
            ubicacionTexto: ubicacionTexto,
            estado: 'activo',
            fotos: fotos,
            foto: fotos[0] || ''
        };

        // Campos condicionales (mascotas perdidas / adopciones)
        const recompensaInput = document.getElementById('pubRecompensa');
        if (recompensaInput && tipoEstandar === 'perdido') {
            nuevaPublicacion.recompensa = recompensaInput.value.trim();
        }

        const fechaInput = document.getElementById('pubFechaEvento');
        if (fechaInput && fechaInput.value) {
            nuevaPublicacion.fechaEvento = fechaInput.value;
        }
        const publicacionId = document.getElementById("publicacionId").value;
        if (publicacionId) {

        await updateDoc(
            doc(db, "publicaciones", publicacionId),
            {
                ...nuevaPublicacion,
                fechaActualizacion: serverTimestamp()
            }
        );

        Swal.fire(
            "Actualizada",
            "La publicación fue actualizada correctamente.",
            "success"
        );

    } else {

        await addDoc(
            collection(db, "publicaciones"),
            {
                ...nuevaPublicacion,
                fechaCreacion: serverTimestamp(),
                fechaPublicacion: serverTimestamp(),
                vistas: 0,
                likes: 0,
                comentarios: 0,
                usuariosLike: []
            }
        );

        Swal.fire(
            "Publicada",
            "La publicación fue creada correctamente.",
            "success"
        );


    }

        Swal.fire({
            icon: 'success',
            title: '¡Publicado con éxito!',
            text: 'Tu publicación ya está disponible en la comunidad.'
        });

        document.getElementById('publicacionForm').reset();
        this.cerrarPublicacionModal();
        this.cargarPublicaciones(); // Recarga la lista real

    } catch (error) {
        console.error('Error al guardar publicación:', error);
        Swal.fire('Error', 'No se pudo guardar la publicación: ' + error.message, 'error');
    }
}

    convertirImagenABase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
    }

    setupPublicacionForm() {
        const tipoSelect = document.getElementById('pubTipo');
        const recompensaGroup = document.getElementById('pubRecompensaGroup');
        const fechaEventoGroup = document.getElementById('pubFechaEventoGroup');
        const fotosInput = document.getElementById('pubFotos');
        const fotosPreview = document.getElementById('pubFotosPreview');

        if (!tipoSelect || !fotosInput || !fotosPreview) return;
        
        tipoSelect.addEventListener('change', () => {
            const tipo = tipoSelect.value;
            if (recompensaGroup) recompensaGroup.style.display = tipo === 'perdido' ? 'block' : 'none';
            if (fechaEventoGroup) fechaEventoGroup.style.display = tipo === 'perdido' ? 'block' : 'none';
        });
        
        fotosInput.addEventListener('change', (e) => {
            fotosPreview.innerHTML = '';
            const files = Array.from(e.target.files);
            
            if (files.length > 5) {
                this.mostrarNotificacion('Máximo 5 fotos', 'warning');
                fotosInput.value = '';
                return;
            }

            const archivoGrande = files.find(file => file.size > 2 * 1024 * 1024);
            if (archivoGrande) {
                this.mostrarNotificacion('Cada foto debe pesar maximo 2MB', 'warning');
                fotosInput.value = '';
                return;
            }
            
            files.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.createElement('div');
                    preview.className = 'foto-preview';
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" class="remove-foto" data-index="${index}"><i class="fas fa-times"></i></button>
                    `;
                    fotosPreview.appendChild(preview);
                };
                reader.readAsDataURL(file);
            });
        });

        fotosPreview.addEventListener('click', (e) => {
            const btn = e.target.closest('.remove-foto');
            if (!btn) return;

            btn.closest('.foto-preview')?.remove();
            fotosInput.value = '';
        });
    }

    abrirModalEdicionPublicacion(publicacion) {
        const modal = document.getElementById('publicacionModal');
        if (!modal) return;

        const tipoNormalizado = (publicacion.tipo || '').toLowerCase();

        document.getElementById('publicacionId').value = publicacion.id;
        document.getElementById('pubTipo').value = tipoNormalizado.includes('perd')
            ? 'perdido'
            : tipoNormalizado.includes('encontr')
                ? 'encontrado'
                : 'adopcion';
        document.getElementById('pubTitulo').value = publicacion.titulo || '';
        document.getElementById('pubCategoria').value = publicacion.categoria || '';
        document.getElementById('pubDescripcion').value = publicacion.descripcion || '';
        document.getElementById('pubContacto').value = publicacion.contacto || '';
        document.getElementById('pubUbicacion').value = publicacion.ubicacionTexto || '';
        

        if (publicacion.recompensa) {
            document.getElementById('pubRecompensa').value = publicacion.recompensa;
        }
        if (publicacion.fechaEvento) {
            document.getElementById('pubFechaEvento').value = publicacion.fechaEvento;
        }
        
        // Mostrar fotos existentes
        const fotosPreview = document.getElementById('pubFotosPreview');
        const fotos = this.normalizarFotosPublicacion(publicacion);
        if (fotosPreview) {
            fotosPreview.innerHTML = '';
            fotos.forEach((foto, index) => {
                const preview = document.createElement('div');
                preview.className = 'foto-preview';
                preview.innerHTML = `
                    <img src="${foto}" alt="Foto">
                    <button type="button" class="remove-foto" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                fotosPreview.appendChild(preview);
            });
        }
        
        // Mostrar campos condicionales según tipo
        const recompensaGroup = document.getElementById('pubRecompensaGroup');
        const fechaEventoGroup = document.getElementById('pubFechaEventoGroup');
        if (tipoNormalizado.includes('perd')) {
            if (recompensaGroup) recompensaGroup.style.display = 'block';
            if (fechaEventoGroup) fechaEventoGroup.style.display = 'block';
        } else {
            if (recompensaGroup) recompensaGroup.style.display = 'none';
            if (fechaEventoGroup) fechaEventoGroup.style.display = 'none';
        }
        
        // Cambiar texto del botón
        const modalTitulo = document.querySelector('#publicacionModal .modal-header h3');
        if (modalTitulo) modalTitulo.textContent = 'Editar publicacion';

        const btnGuardar = document.querySelector('#publicacionForm button[type="submit"]');
        if (btnGuardar) btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar';
        
        // Abrir modal
        modal.style.display = 'flex';
    }

    editarPublicacion(id) {

        const publicacion = this.publicaciones.find(p => p.id === id);

        if (!publicacion) {
            console.error("No se encontró la publicación");
            return;
        }

        this.abrirModalEdicionPublicacion(publicacion);
    }

    async eliminarPublicacion(id) {
        if (!id) {
            this.mostrarNotificacion('ID de publicación no válido', 'error');
            return;
        }

        const result = await Swal.fire({
            title: '¿Eliminar publicación?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                // Mostrar loading
                Swal.fire({
                    title: 'Eliminando...',
                    text: 'Por favor espera',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                const publicacionRef = doc(db, 'publicaciones', id);
                await deleteDoc(publicacionRef);
                
                Swal.close();
                this.mostrarNotificacion('Publicación eliminada correctamente', 'success');
                
                // Recargar la lista
                await this.cargarPublicaciones();
                
            } catch (error) {
                console.error('Error al eliminar publicación:', error);
                Swal.close();
                this.mostrarNotificacion('Error al eliminar la publicación', 'error');
            }
        }
    }


    async actualizarEstadoSolicitudAdopcion(id, nuevoEstado, notas) {
        try {
            const solicitudRef = doc(db, 'solicitudesAdopcion', id);
            await updateDoc(solicitudRef, {
                estado: nuevoEstado,
                fechaRespuesta: serverTimestamp(),
                notasVeterinario: notas || ''
            });
            
            this.mostrarNotificacion(`Solicitud ${nuevoEstado} correctamente`, 'success');
            await this.cargarSolicitudesAdopcion();
            
        } catch (error) {
            console.error('Error:', error);
            this.mostrarNotificacion('Error al actualizar', 'error');
        }
    }

    async actualizarEstadoReclamo(id, nuevoEstado, notas) {
        try {
            
            const reclamoRef = doc(db, 'reclamosMascotas', id);
            
            const datosActualizar = {
                estado: nuevoEstado,
                fechaRespuesta: serverTimestamp()
            };
            
            if (notas && notas.trim() !== '') {
                datosActualizar.notasVeterinario = notas;
            }
            
            await updateDoc(reclamoRef, datosActualizar);
            
            this.mostrarNotificacion(`Reclamo ${nuevoEstado} correctamente`, 'success');
            
            // Recargar la lista de reclamos
            await this.cargarReclamos();
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error al actualizar reclamo:', error);
            this.mostrarNotificacion('Error al actualizar el reclamo', 'error');
            return { success: false, error: error.message };
        }
    }

    cerrarModal() {
        document.getElementById('detalleModal').style.display = 'none';
    }

    cerrarEstadoModal() {
        document.getElementById('estadoModal').style.display = 'none';
        document.getElementById('estadoForm').reset();
    }

    cerrarPublicacionModal() {
        document.getElementById('publicacionModal').style.display = 'none';
        document.getElementById('publicacionForm').reset();
        document.getElementById('pubFotosPreview').innerHTML = '';
        document.getElementById('pubFotos').value = '';
        document.getElementById('publicacionId').value = '';
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;
        notificacion.textContent = mensaje;
        notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 4px;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;

        document.body.appendChild(notificacion);

        setTimeout(() => {
            notificacion.remove();
        }, 3000);
    }
    setupEventListeners() {
        // nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const seccion = e.currentTarget.dataset.section;
                this.cambiarSeccion(seccion);
            });
        });

        document.querySelectorAll('#citas-section .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filtro = e.currentTarget.dataset.filter;
                this.aplicarFiltroCitas(filtro);
            });
        });

        document.querySelectorAll('#adopciones-section .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filtro = e.currentTarget.dataset.filter;
                this.aplicarFiltroAdopciones(filtro);
            });
        });

        document.querySelectorAll('#reclamos-section .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filtro = e.currentTarget.dataset.filter;
                this.aplicarFiltroReclamos(filtro);
            });
        });

        document.querySelectorAll('.pub-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tipo = e.currentTarget.dataset.pubType;
                this.aplicarFiltroPublicaciones(tipo);
            });
        });

        document.getElementById('horarioForm').addEventListener('submit', (e) => this.guardarHorario(e));

        document.getElementById('estadoForm').addEventListener('submit', (e) => this.guardarCambioEstado(e));

        //document.getElementById('publicacionForm').addEventListener('submit', (e) => this.guardarPublicacion(e));

        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            //imp
        });

        document.getElementById('publicacionForm')?.addEventListener('submit', (e) => this.guardarPublicacion(e));
        this.setupPublicacionForm();

    }

    async logout() {
        try {
            await auth.signOut();
            window.location.href = '../../../index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }
}

const vetController = new VetController();

window.vetController = vetController;

export default vetController;
