// views/veterinario/vetController.js
import { auth } from '/config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from '/config/firebase-config.js';
import Veterinario from '/classes/Veterinario.js';

class VetController {
    constructor() {
        this.vetModel = new Veterinario();
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
            await this.checkAuth();
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
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    window.location.href = '/login';
                    reject();
                } else {
                    resolve(user);
                }
            });
        });
    }

    async cargarDatosVeterinario() {
        const result = await this.vetModel.obtenerVeterinarioActual();

        if (result.success) {
            this.veterinarioActual = result.data;

            // Elementos que SÍ existen en tu HTML
            const vetNameElement = document.getElementById('vetName');
            const vetSpecialtyElement = document.getElementById('vetSpecialty');

            if (vetNameElement) {
                vetNameElement.textContent = this.veterinarioActual.nombre || 'Veterinario';
            }

            if (vetSpecialtyElement) {
                vetSpecialtyElement.textContent = this.veterinarioActual.especialidades?.join(', ') || 'Veterinario General';
            }

            // El elemento vetNameHeader NO existe en tu HTML, lo eliminamos
            // document.getElementById('vetNameHeader').textContent = this.veterinarioActual.nombre || 'Veterinario';

        } else {
            console.log('Perfil no encontrado, usando datos temporales...');
            // Crear un perfil temporal para pruebas
            this.veterinarioActual = {
                id: 'temp-id',
                nombre: 'Veterinario de Prueba',
                email: auth.currentUser?.email,
                especialidades: ['General'],
                horarioSemanal: [],
                duracionCita: 30,
                diasAnticipacion: 30
            };

            const vetNameElement = document.getElementById('vetName');
            const vetSpecialtyElement = document.getElementById('vetSpecialty');

            if (vetNameElement) {
                vetNameElement.textContent = this.veterinarioActual.nombre;
            }

            if (vetSpecialtyElement) {
                vetSpecialtyElement.textContent = 'Veterinario General';
            }

            this.mostrarNotificacion('Usando perfil de prueba - Crea un perfil en Firestore', 'warning');
        }
    }

    actualizarFecha() {
        const fecha = new Date();
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = fecha.toLocaleDateString('es-ES', opciones);
    }

    async cargarTodo() {
        await Promise.all([
            this.cargarCitas(),
            this.cargarPublicaciones(),
            this.cargarSolicitudesAdopcion(),
            this.cargarReclamos()
        ]);
        this.actualizarEstadisticas();
        this.actualizarBadges();
    }

    async cargarCitas() {
        if (!this.veterinarioActual) return;

        const result = await this.vetModel.obtenerCitasVeterinario(
            this.veterinarioActual.id,
            { estado: this.filtros.citas !== 'todos' ? this.filtros.citas : null }
        );

        if (result.success) {
            this.citas = result.data;
            this.renderizarCitas();
            this.renderizarProximasCitas();
        }
    }

    async cargarPublicaciones() {
        // Simulación - Aquí iría la lógica real de Firestore
        this.publicaciones = [
            {
                id: '1',
                titulo: 'Gatitos en adopción',
                tipo: 'adopcion',
                especie: 'gato',
                ubicacion: 'Colonia Centro',
                fecha: '2026-03-08',
                estado: 'activa',
                descripcion: 'Tres gatitos de 2 meses en adopción'
            },
            {
                id: '2',
                titulo: 'Perro perdido - Labrador',
                tipo: 'perdido',
                especie: 'perro',
                ubicacion: 'Colonia Roma',
                fecha: '2026-03-07',
                estado: 'activa',
                descripcion: 'Se perdió labrador color dorado'
            }
        ];
        this.renderizarPublicaciones();
    }

    async cargarSolicitudesAdopcion() {
        // Simulación
        this.solicitudesAdopcion = [
            {
                id: '1',
                solicitante: 'Juan Pérez',
                email: 'juan@email.com',
                mascota: 'Max (Labrador)',
                fecha: '2026-03-08',
                estado: 'pendiente',
                mensaje: 'Me gustaría adoptar a Max'
            },
            {
                id: '2',
                solicitante: 'María García',
                email: 'maria@email.com',
                mascota: 'Luna (Gata)',
                fecha: '2026-03-07',
                estado: 'aprobada',
                mensaje: 'Tengo experiencia con gatos'
            }
        ];
        this.renderizarSolicitudesAdopcion();
    }

    async cargarReclamos() {
        // Simulación
        this.reclamos = [
            {
                id: '1',
                reclamante: 'Carlos López',
                email: 'carlos@email.com',
                mascota: 'Rocky (Perro)',
                fecha: '2026-03-08',
                estado: 'pendiente',
                descripcion: 'Creo que Rocky es mi perro perdido'
            },
            {
                id: '2',
                reclamante: 'Ana Martínez',
                email: 'ana@email.com',
                mascota: 'Michi (Gato)',
                fecha: '2026-03-06',
                estado: 'verificados',
                descripcion: 'Tiene una mancha en la oreja'
            }
        ];
        this.renderizarReclamos();
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
            this.solicitudesAdopcion.filter(s => s.estado === 'pendiente').length;
        document.getElementById('notificaciones').textContent =
            this.citas.filter(c => c.estado === 'pendiente').length +
            this.solicitudesAdopcion.filter(s => s.estado === 'pendiente').length;
    }

    renderizarCitas() {
        const container = document.getElementById('citasGrid');

        if (this.citas.length === 0) {
            container.innerHTML = '<p class="loading">No hay citas para mostrar</p>';
            return;
        }

        let html = '';
        this.citas.forEach(cita => {
            html += this.generarCardCita(cita);
        });

        container.innerHTML = html;
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
                        <p><strong>Motivo:</strong> ${cita.problemaSalud?.substring(0, 50)}${cita.problemaSalud?.length > 50 ? '...' : ''}</p>
                    </div>
                </div>
                <div class="cita-footer">
                    <button class="btn-icon ver" onclick="vetController.verDetalle('cita', '${cita.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-icon aceptar" onclick="vetController.abrirModalEstado('cita', '${cita.id}', '${cita.estado}')">
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
        const container = document.getElementById('publicacionesGrid');
        const filtradas = this.publicaciones.filter(p => p.tipo === this.filtros.publicaciones);

        if (filtradas.length === 0) {
            container.innerHTML = '<p class="loading">No hay publicaciones para mostrar</p>';
            return;
        }

        let html = '';
        filtradas.forEach(pub => {
            html += this.generarCardPublicacion(pub);
        });

        container.innerHTML = html;
    }

    generarCardPublicacion(pub) {
        return `
            <div class="publicacion-card">
                <div class="cita-header">
                    <span class="cita-estado estado-${pub.estado === 'activa' ? 'pendiente' : 'concluida'}">${pub.estado}</span>
                    <span class="cita-fecha">${pub.fecha}</span>
                </div>
                <div class="cita-body">
                    <div class="cita-mascota">
                        <i class="fas fa-${pub.especie === 'perro' ? 'dog' : 'cat'}"></i> ${pub.titulo}
                    </div>
                    <div class="cita-detalle">
                        <p><strong>Ubicación:</strong> ${pub.ubicacion}</p>
                        <p><strong>Descripción:</strong> ${pub.descripcion.substring(0, 50)}...</p>
                    </div>
                </div>
                <div class="cita-footer">
                    <button class="btn-icon ver" onclick="vetController.verDetalle('publicacion', '${pub.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-icon edit" onclick="vetController.editarPublicacion('${pub.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-icon delete" onclick="vetController.eliminarPublicacion('${pub.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderizarSolicitudesAdopcion() {
        const container = document.getElementById('solicitudesGrid');
        const filtradas = this.solicitudesAdopcion.filter(s => {
            if (this.filtros.adopciones === 'pendientes') return s.estado === 'pendiente';
            if (this.filtros.adopciones === 'aprobadas') return s.estado === 'aprobada';
            if (this.filtros.adopciones === 'rechazadas') return s.estado === 'rechazada';
            return true;
        });

        if (filtradas.length === 0) {
            container.innerHTML = '<p class="loading">No hay solicitudes para mostrar</p>';
            return;
        }

        let html = '';
        filtradas.forEach(sol => {
            html += this.generarCardSolicitud(sol, 'adopcion');
        });

        container.innerHTML = html;

        // Actualizar también las recientes en dashboard
        this.renderizarSolicitudesRecientes();
    }

    renderizarReclamos() {
        const container = document.getElementById('reclamosGrid');
        const filtradas = this.reclamos.filter(r => {
            if (this.filtros.reclamos === 'pendientes') return r.estado === 'pendiente';
            if (this.filtros.reclamos === 'verificados') return r.estado === 'verificados';
            if (this.filtros.reclamos === 'aprobados') return r.estado === 'aprobados';
            if (this.filtros.reclamos === 'rechazados') return r.estado === 'rechazados';
            return true;
        });

        if (filtradas.length === 0) {
            container.innerHTML = '<p class="loading">No hay reclamos para mostrar</p>';
            return;
        }

        let html = '';
        filtradas.forEach(rec => {
            html += this.generarCardSolicitud(rec, 'reclamo');
        });

        container.innerHTML = html;

        // Actualizar también los recientes en dashboard
        this.renderizarReclamosRecientes();
    }

    generarCardSolicitud(item, tipo) {
        const esAdopcion = tipo === 'adopcion';
        const titulo = esAdopcion ? 'Solicitud de adopción' : 'Reclamo de mascota';
        const persona = esAdopcion ? item.solicitante : item.reclamante;
        const email = item.email;

        return `
            <div class="solicitud-card">
                <div class="cita-header">
                    <span class="cita-estado estado-${item.estado}">${item.estado}</span>
                    <span class="cita-fecha">${item.fecha}</span>
                </div>
                <div class="cita-body">
                    <div class="cita-mascota">
                        <i class="fas fa-user"></i> ${persona}
                    </div>
                    <div class="cita-detalle">
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Mascota:</strong> ${item.mascota}</p>
                        <p><strong>Mensaje:</strong> ${(item.mensaje || item.descripcion || '').substring(0, 50)}...</p>
                    </div>
                </div>
                <div class="cita-footer">
                    <button class="btn-icon ver" onclick="vetController.verDetalle('${tipo}', '${item.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn-icon aceptar" onclick="vetController.abrirModalEstado('${tipo}', '${item.id}', '${item.estado}')">
                        <i class="fas fa-check-circle"></i> Estado
                    </button>
                </div>
            </div>
        `;
    }

    renderizarSolicitudesRecientes() {
        const container = document.getElementById('solicitudesRecientes');
        const recientes = this.solicitudesAdopcion.slice(0, 3);

        if (recientes.length === 0) {
            container.innerHTML = '<p class="loading">No hay solicitudes recientes</p>';
            return;
        }

        let html = '';
        recientes.forEach(sol => {
            html += `
                <div class="cita-card" style="margin-bottom: 10px;">
                    <div class="cita-header">
                        <span class="cita-estado estado-${sol.estado}">${sol.estado}</span>
                        <span class="cita-fecha">${sol.fecha}</span>
                    </div>
                    <div class="cita-body">
                        <strong>${sol.solicitante}</strong> - ${sol.mascota}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderizarReclamosRecientes() {
        const container = document.getElementById('reclamosRecientes');
        const recientes = this.reclamos.slice(0, 3);

        if (recientes.length === 0) {
            container.innerHTML = '<p class="loading">No hay reclamos recientes</p>';
            return;
        }

        let html = '';
        recientes.forEach(rec => {
            html += `
                <div class="cita-card" style="margin-bottom: 10px;">
                    <div class="cita-header">
                        <span class="cita-estado estado-${rec.estado}">${rec.estado}</span>
                        <span class="cita-fecha">${rec.fecha}</span>
                    </div>
                    <div class="cita-body">
                        <strong>${rec.reclamante}</strong> - ${rec.mascota}
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

        // Configurar listeners para checkboxes
        dias.forEach(dia => {
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

        // Establecer valores guardados
        if (this.veterinarioActual?.duracionCita) {
            document.getElementById('duracionCita').value = this.veterinarioActual.duracionCita;
        }
        if (this.veterinarioActual?.diasAnticipacion) {
            document.getElementById('diasAnticipacion').value = this.veterinarioActual.diasAnticipacion;
        }
    }

    async guardarHorario(e) {
        e.preventDefault();

        const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
        const horarioConfig = [];

        dias.forEach(dia => {
            const activo = document.getElementById(`${dia}_activo`)?.checked || false;
            const apertura = document.getElementById(`${dia}_apertura`)?.value || '09:00';
            const cierre = document.getElementById(`${dia}_cierre`)?.value || '18:00';

            horarioConfig.push({
                dia,
                activo,
                apertura,
                cierre
            });
        });

        const duracionCita = parseInt(document.getElementById('duracionCita').value);
        const diasAnticipacion = parseInt(document.getElementById('diasAnticipacion').value);

        const result = await this.vetModel.guardarConfiguracionHorario(
            this.veterinarioActual.id,
            horarioConfig,
            duracionCita,
            diasAnticipacion
        );

        if (result.success) {
            this.mostrarNotificacion('Horario guardado correctamente', 'success');
            this.veterinarioActual.horarioSemanal = horarioConfig;
            this.veterinarioActual.duracionCita = duracionCita;
            this.veterinarioActual.diasAnticipacion = diasAnticipacion;
        } else {
            this.mostrarNotificacion('Error: ' + result.error, 'error');
        }
    }

    // ========== MÉTODOS DE NAVEGACIÓN ==========
    cambiarSeccion(seccion) {
        // Actualizar active en sidebar
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.dataset.section === seccion) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Actualizar sección visible
        document.querySelectorAll('.content-section').forEach(section => {
            if (section.id === `${seccion}-section`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Actualizar título
        const titulos = {
            dashboard: 'Dashboard',
            citas: 'Gestión de Citas',
            publicaciones: 'Gestionar Publicaciones',
            adopciones: 'Solicitudes de Adopción',
            reclamos: 'Reclamos de Mascotas',
            horarios: 'Configuración de Horarios'
        };
        document.getElementById('currentSection').textContent = titulos[seccion] || seccion;

        // Configuraciones específicas por sección
        if (seccion === 'horarios') {
            this.configurarFormularioHorarios();
        }
    }

    // ========== MÉTODOS DE FILTROS ==========
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

    // ========== MÉTODOS DE MODALES ==========
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

        let contenido = '';
        for (let [key, value] of Object.entries(item)) {
            if (key !== 'id' && typeof value !== 'object') {
                contenido += `<p><strong>${key}:</strong> ${value}</p>`;
            }
        }

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

        // Aquí iría la lógica para guardar en Firestore
        this.mostrarNotificacion(`Estado actualizado a ${nuevoEstado}`, 'success');

        this.cerrarEstadoModal();
        await this.cargarTodo();
    }

    nuevaPublicacion() {
        document.getElementById('publicacionModal').style.display = 'flex';
    }

    async guardarPublicacion(e) {
        e.preventDefault();

        // Aquí iría la lógica para guardar en Firestore
        this.mostrarNotificacion('Publicación creada exitosamente', 'success');

        this.cerrarPublicacionModal();
        await this.cargarPublicaciones();
    }

    editarPublicacion(id) {
        this.mostrarNotificacion('Función en desarrollo', 'info');
    }

    eliminarPublicacion(id) {
        if (confirm('¿Estás seguro de eliminar esta publicación?')) {
            this.mostrarNotificacion('Publicación eliminada', 'success');
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
    }

    // ========== MÉTODOS UTILITARIOS ==========
    mostrarNotificacion(mensaje, tipo = 'info') {
        // Crear un elemento temporal de notificación
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
        // Navegación del sidebar
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const seccion = e.currentTarget.dataset.section;
                this.cambiarSeccion(seccion);
            });
        });

        // Filtros de citas
        document.querySelectorAll('#citas-section .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filtro = e.currentTarget.dataset.filter;
                this.aplicarFiltroCitas(filtro);
            });
        });

        // Filtros de adopciones
        document.querySelectorAll('#adopciones-section .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filtro = e.currentTarget.dataset.filter;
                this.aplicarFiltroAdopciones(filtro);
            });
        });

        // Filtros de reclamos
        document.querySelectorAll('#reclamos-section .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filtro = e.currentTarget.dataset.filter;
                this.aplicarFiltroReclamos(filtro);
            });
        });

        // Tabs de publicaciones
        document.querySelectorAll('.pub-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tipo = e.currentTarget.dataset.pubType;
                this.aplicarFiltroPublicaciones(tipo);
            });
        });

        // Formulario de horarios
        document.getElementById('horarioForm').addEventListener('submit', (e) => this.guardarHorario(e));

        // Formulario de estado
        document.getElementById('estadoForm').addEventListener('submit', (e) => this.guardarCambioEstado(e));

        // Formulario de publicación
        document.getElementById('publicacionForm').addEventListener('submit', (e) => this.guardarPublicacion(e));

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Búsqueda (placeholder)
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            // Implementar búsqueda
        });
    }

    async logout() {
        try {
            await auth.signOut();
            window.location.href = '/login';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }
}

// Inicializar
const vetController = new VetController();

// Hacer disponible globalmente para los onclick
window.vetController = vetController;

export default vetController;