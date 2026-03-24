import { auth, db  } from '/config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
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
                    window.location.href = '../../visitor/login/login.html';
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

            const vetNameElement = document.getElementById('vetName');
            const vetSpecialtyElement = document.getElementById('vetSpecialty');
            const vetFotoElement = document.getElementById('vetFoto');
            if (vetNameElement) {
                vetNameElement.textContent = this.veterinarioActual.primerNombre || 'Veterinario';
            }

            if (vetSpecialtyElement) {
                vetSpecialtyElement.textContent = this.veterinarioActual.especialidades?.join(', ') || 'Veterinario General';
            }
            if (vetFotoElement) {
                if (this.veterinarioActual.fotoPerfil) {
                    vetFotoElement.innerHTML = `<img class="vet-avatar" src="${this.veterinarioActual.fotoPerfil}" alt="Foto de ${this.veterinarioActual.primerNombre}">`;
                } else {
                    vetFotoElement.innerHTML = `<i class="fas fa-user-md"></i>`;
                }
            }


        } else {
            console.log('Perfil no encontrado, usando datos temporales...');
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
        if (!this.veterinarioActual) return;

        try {
            const publicacionesRef = collection(db, 'publicaciones');
            const q = query(
                publicacionesRef,
                where('veterinarioId', '==', this.veterinarioActual.id),
                orderBy('fechaPublicacion', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            this.publicaciones = [];
            
            querySnapshot.forEach(doc => {
                this.publicaciones.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.renderizarPublicaciones();
        } catch (error) {
            console.error('Error cargando publicaciones:', error);
            this.mostrarNotificacion('Error al cargar publicaciones', 'error');
        }
    }

    contarSolicitudesAdopcion(publicacionId) {
        // Temporal: retorna 0 hasta que implementemos las solicitudes
        return 0;
    }

    // Método para contar reclamos de una publicación
    contarReclamos(publicacionId) {
        // Temporal: retorna 0 hasta que implementemos los reclamos
        return 0;
    }

    async cargarSolicitudesAdopcion() {
        // estatico
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
        // estatitco
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

    // renderizarPublicaciones() {
    //     const container = document.getElementById('publicacionesGrid');
    //     const filtradas = this.publicaciones.filter(p => {
    //         if (this.filtros.publicaciones === 'adopcion') return p.tipo === 'En Adopción';
    //         if (this.filtros.publicaciones === 'perdidos') return p.tipo === 'Mascota Perdida';
    //         if (this.filtros.publicaciones === 'encontrados') return p.tipo === 'Mascota Encontrada';
    //         return true;
    //     });

    //     if (filtradas.length === 0) {
    //         container.innerHTML = '<p class="loading">No tienes publicaciones</p>';
    //         return;
    //     }

    //     let html = '';
    //     filtradas.forEach(pub => {
    //         html += this.generarCardPublicacion(pub);
    //     });

    //     container.innerHTML = html;
    // }

    renderizarPublicaciones() {
        const container = document.getElementById('publicacionesGrid');
        if (!container) return;
        
        let filtradas = this.publicaciones;
        
        // Aplicar filtro según la pestaña activa
        if (this.filtros.publicaciones === 'adopcion') {
            filtradas = this.publicaciones.filter(p => p.tipo === 'En Adopción');
        } else if (this.filtros.publicaciones === 'perdidos') {
            filtradas = this.publicaciones.filter(p => p.tipo === 'Mascota Perdida');
        } else if (this.filtros.publicaciones === 'encontrados') {
            filtradas = this.publicaciones.filter(p => p.tipo === 'Mascota Encontrada');
        }

        if (filtradas.length === 0) {
            container.innerHTML = '<p class="loading">No tienes publicaciones en esta categoría</p>';
            return;
        }

        let html = '';
        filtradas.forEach(pub => {
            html += this.generarCardPublicacion(pub);
        });

        container.innerHTML = html;
    }

    // generarCardPublicacion(pub) {
    //     const fecha = pub.fechaPublicacion?.toDate?.() || new Date(pub.fechaPublicacion);
    //     const fechaFormateada = fecha.toLocaleDateString('es-ES');
        
    //     let botonesAdicionales = '';
        
    //     // Botón para ver solicitudes según tipo
    //     if (pub.tipo === 'En Adopción') {
    //         botonesAdicionales = `
    //             <button class="btn-icon" onclick="vetController.verSolicitudes('adopcion', '${pub.id}')">
    //                 <i class="fas fa-users"></i> Solicitudes (${this.contarSolicitudesAdopcion(pub.id)})
    //             </button>
    //         `;
    //     } else if (pub.tipo === 'Mascota Encontrada') {
    //         botonesAdicionales = `
    //             <button class="btn-icon" onclick="vetController.verSolicitudes('reclamo', '${pub.id}')">
    //                 <i class="fas fa-clipboard-list"></i> Reclamos (${this.contarReclamos(pub.id)})
    //             </button>
    //         `;
    //     }
        
    //     // Mostrar imagen principal si existe
    //     const fotoPrincipal = pub.fotos?.[0] || 'https://via.placeholder.com/300x200?text=Sin+imagen';
        
    //     return `
    //         <div class="publicacion-card">
    //             <div class="publicacion-imagen" onclick="vetController.verDetalle('publicacion', '${pub.id}')">
    //                 <img src="${fotoPrincipal}" alt="${pub.titulo}">
    //                 <span class="publicacion-tipo">${pub.tipo}</span>
    //             </div>
    //             <div class="publicacion-contenido">
    //                 <h3 class="publicacion-titulo">${pub.titulo}</h3>
    //                 <div class="publicacion-metadata">
    //                     <span class="publicacion-categoria"><i class="fas fa-tag"></i> ${pub.categoria || 'Sin categoría'}</span>
    //                     <span class="publicacion-tiempo"><i class="far fa-clock"></i> ${fechaFormateada}</span>
    //                 </div>
    //                 <p class="publicacion-descripcion">${pub.descripcion?.substring(0, 100)}${pub.descripcion?.length > 100 ? '...' : ''}</p>
    //                 ${pub.ubicacionTexto ? `
    //                     <div class="publicacion-ubicacion">
    //                         <i class="fas fa-map-marker-alt"></i> ${pub.ubicacionTexto}
    //                     </div>
    //                 ` : ''}
    //                 <div class="publicacion-footer">
    //                     <div class="publicacion-estadisticas">
    //                         <span><i class="far fa-eye"></i> ${pub.vistas || 0}</span>
    //                         <span><i class="far fa-heart"></i> ${pub.likes || 0}</span>
    //                         <span><i class="far fa-comment"></i> ${pub.comentarios || 0}</span>
    //                     </div>
    //                     <div class="publicacion-acciones">
    //                         ${botonesAdicionales}
    //                         <button class="btn-icon" onclick="vetController.editarPublicacion('${pub.id}')">
    //                             <i class="fas fa-edit"></i>
    //                         </button>
    //                         <button class="btn-icon btn-danger" onclick="vetController.eliminarPublicacion('${pub.id}')">
    //                             <i class="fas fa-trash"></i>
    //                         </button>
    //                     </div>
    //                 </div>
    //             </div>
    //         </div>
    //     `;
    // }

    generarCardPublicacion(pub) {
        const fecha = pub.fechaPublicacion?.toDate?.() || new Date(pub.fechaPublicacion);
        const fechaFormateada = fecha.toLocaleDateString('es-ES');
        
        const fotoPrincipal = pub.fotos?.[0] || 'https://via.placeholder.com/300x200?text=Sin+imagen';
        
        // Botones según tipo
        let botonesAdicionales = '';
        if (pub.tipo === 'En Adopción') {
            botonesAdicionales = `
                <button class="btn-icon" onclick="vetController.verSolicitudesAdopcion('${pub.id}')">
                    <i class="fas fa-users"></i> Solicitudes (0)
                </button>
            `;
        } else if (pub.tipo === 'Mascota Encontrada') {
            botonesAdicionales = `
                <button class="btn-icon" onclick="vetController.verReclamos('${pub.id}')">
                    <i class="fas fa-clipboard-list"></i> Reclamos (0)
                </button>
            `;
        }
        
        return `
            <div class="publicacion-card">
                <div class="publicacion-imagen" onclick="vetController.verDetalle('publicacion', '${pub.id}')">
                    <img src="${fotoPrincipal}" alt="${pub.titulo}">
                    <span class="publicacion-tipo">${pub.tipo}</span>
                </div>
                <div class="publicacion-contenido">
                    <h3 class="publicacion-titulo">${this.escapeHtml(pub.titulo)}</h3>
                    <div class="publicacion-metadata">
                        <span class="publicacion-categoria"><i class="fas fa-tag"></i> ${pub.categoria || 'Sin categoría'}</span>
                        <span class="publicacion-tiempo"><i class="far fa-clock"></i> ${fechaFormateada}</span>
                    </div>
                    <p class="publicacion-descripcion">${this.escapeHtml(pub.descripcion?.substring(0, 100))}${pub.descripcion?.length > 100 ? '...' : ''}</p>
                    ${pub.ubicacionTexto ? `
                        <div class="publicacion-ubicacion">
                            <i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(pub.ubicacionTexto)}
                        </div>
                    ` : ''}
                    <div class="publicacion-footer">
                        <div class="publicacion-estadisticas">
                            <span><i class="far fa-eye"></i> ${pub.vistas || 0}</span>
                            <span><i class="far fa-heart"></i> ${pub.likes || 0}</span>
                            <span><i class="far fa-comment"></i> ${pub.comentarios || 0}</span>
                        </div>
                        <div class="publicacion-acciones">
                            ${botonesAdicionales}
                            <button class="btn-icon" onclick="vetController.editarPublicacion('${pub.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-danger" onclick="vetController.eliminarPublicacion('${pub.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Método auxiliar para escapar HTML y evitar XSS
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async verSolicitudesAdopcion(publicacionId) {
        this.mostrarNotificacion('Funcionalidad en desarrollo', 'info');
    }

    async verReclamos(publicacionId) {
        this.mostrarNotificacion('Funcionalidad en desarrollo', 'info');
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

+        this.renderizarSolicitudesRecientes();
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
                    <button style="background-color: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;" onclick="vetController.verDetalle('${tipo}', '${item.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;" onclick="vetController.abrirModalEstado('${tipo}', '${item.id}', '${item.estado}')">
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

        // for (let [key, value] of Object.entries(item)) {
        //     if (key !== 'id' && typeof value !== 'object') {
                
        //         contenido += `
        //         <p><strong>${key}:</strong> ${value}</p>
        //         `
        //         ;
        //     }
        // }

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

        // Solo procesar si es una cita (por ahora)
        if (tipo !== 'cita') {
            this.mostrarNotificacion(`Estado actualizado a ${nuevoEstado}`, 'success');
            this.cerrarEstadoModal();
            await this.cargarTodo();
            return;
        }

        // Mostrar loading
        const btnSubmit = document.querySelector('#estadoForm button[type="submit"]');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnSubmit.disabled = true;

        try {
            // Llamar al modelo para actualizar en Firestore
            const result = await this.vetModel.actualizarEstadoCita(id, nuevoEstado, notas);

            if (result.success) {
                this.mostrarNotificacion(`Cita ${result.message || 'actualizada correctamente'}`, 'success');
                this.cerrarEstadoModal();
                await this.cargarTodo(); // Recargar todas las citas
            } else {
                this.mostrarNotificacion(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            this.mostrarNotificacion('Error al actualizar el estado', 'error');
        } finally {
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        }
    }

    nuevaPublicacion() {
        document.getElementById('publicacionModal').style.display = 'flex';
    }

    // async guardarPublicacion(e) {
    //     e.preventDefault();
        
    //     const tipo = document.getElementById('pubTipo').value;
    //     const titulo = document.getElementById('pubTitulo').value;
    //     const categoria = document.getElementById('pubCategoria').value;
    //     const descripcion = document.getElementById('pubDescripcion').value;
    //     const contacto = document.getElementById('pubContacto').value;
    //     const ubicacionTexto = document.getElementById('pubUbicacion').value;
    //     const recompensa = document.getElementById('pubRecompensa').value;
    //     const fechaEvento = document.getElementById('pubFechaEvento').value;
        
    //     // Procesar fotos
    //     const fotosInput = document.getElementById('pubFotos');
    //     const fotos = [];
        
    //     for (const file of fotosInput.files) {
    //         if (file.size > 2 * 1024 * 1024) {
    //             this.mostrarNotificacion('Una imagen supera los 2MB', 'error');
    //             return;
    //         }
    //         const base64 = await this.convertirImagenABase64(file);
    //         fotos.push(base64);
    //     }
        
    //     const publicacion = {
    //         titulo,
    //         tipo,
    //         categoria,
    //         descripcion,
    //         contacto,
    //         ubicacionTexto,
    //         recompensa: tipo === 'Mascota Perdida' ? recompensa : '',
    //         fechaEvento: tipo === 'Mascota Perdida' ? fechaEvento : null,
    //         fotos,
    //         usuarioId: auth.currentUser.uid,
    //         usuarioNombre: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
    //         veterinarioId: this.veterinarioActual.id,
    //         fechaPublicacion: serverTimestamp(),
    //         fechaActualizacion: serverTimestamp(),
    //         vistas: 0,
    //         likes: 0,
    //         comentarios: 0,
    //         usuariosLike: []
    //     };
        
    //     try {
    //         const docRef = await addDoc(collection(db, 'publicaciones'), publicacion);
    //         this.mostrarNotificacion('Publicación creada exitosamente', 'success');
    //         this.cerrarPublicacionModal();
    //         await this.cargarPublicaciones();
    //     } catch (error) {
    //         console.error('Error:', error);
    //         this.mostrarNotificacion('Error al publicar', 'error');
    //     }
    // }

    async guardarPublicacion(e) {
        e.preventDefault();
        
        const publicacionId = document.getElementById('publicacionId')?.value;
        const tipo = document.getElementById('pubTipo').value;
        const titulo = document.getElementById('pubTitulo').value;
        const categoria = document.getElementById('pubCategoria').value;
        const descripcion = document.getElementById('pubDescripcion').value;
        const contacto = document.getElementById('pubContacto').value;
        const ubicacionTexto = document.getElementById('pubUbicacion').value;
        const recompensa = document.getElementById('pubRecompensa').value;
        const fechaEvento = document.getElementById('pubFechaEvento').value;
        
        // Validar campos requeridos
        if (!tipo || !titulo || !descripcion) {
            this.mostrarNotificacion('Completa los campos requeridos', 'warning');
            return;
        }
        
        // Procesar fotos nuevas
        const fotosInput = document.getElementById('pubFotos');
        const fotos = [];
        
        for (const file of fotosInput.files) {
            if (file.size > 2 * 1024 * 1024) {
                this.mostrarNotificacion('Una imagen supera los 2MB', 'error');
                return;
            }
            const base64 = await this.convertirImagenABase64(file);
            fotos.push(base64);
        }
        
        // Si hay fotos existentes en el preview, conservarlas
        const fotosExistentes = [];
        const fotosPreview = document.getElementById('pubFotosPreview');
        if (fotosPreview) {
            const imagenes = fotosPreview.querySelectorAll('img');
            imagenes.forEach(img => {
                if (img.src && !img.src.includes('blob:')) {
                    fotosExistentes.push(img.src);
                }
            });
        }
        
        const todasFotos = [...fotosExistentes, ...fotos];
        
        // Preparar datos
        const publicacionData = {
            titulo,
            tipo,
            categoria,
            descripcion,
            contacto,
            ubicacionTexto,
            recompensa: tipo === 'Mascota Perdida' ? recompensa : '',
            fechaEvento: tipo === 'Mascota Perdida' ? fechaEvento : null,
            fotos: todasFotos,
            fechaActualizacion: serverTimestamp()
        };
        
        try {
            if (publicacionId) {
                // Actualizar publicación existente
                const publicacionRef = doc(db, 'publicaciones', publicacionId);
                await updateDoc(publicacionRef, publicacionData);
                this.mostrarNotificacion('Publicación actualizada correctamente', 'success');
            } else {
                // Crear nueva publicación
                publicacionData.usuarioId = auth.currentUser.uid;
                publicacionData.usuarioNombre = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
                publicacionData.veterinarioId = this.veterinarioActual.id;
                publicacionData.fechaPublicacion = serverTimestamp();
                publicacionData.vistas = 0;
                publicacionData.likes = 0;
                publicacionData.comentarios = 0;
                publicacionData.usuariosLike = [];
                
                await addDoc(collection(db, 'publicaciones'), publicacionData);
                this.mostrarNotificacion('Publicación creada exitosamente', 'success');
            }
            
            // Limpiar formulario
            document.getElementById('publicacionId').value = '';
            document.getElementById('pubFotos').value = '';
            document.getElementById('pubFotosPreview').innerHTML = '';
            
            // Restaurar texto del botón
            const btnGuardar = document.querySelector('#publicacionForm button[type="submit"]');
            if (btnGuardar) {
                btnGuardar.innerHTML = '<i class="fas fa-save"></i> Publicar';
            }
            
            this.cerrarPublicacionModal();
            await this.cargarPublicaciones();
            
        } catch (error) {
            console.error('Error al guardar publicación:', error);
            this.mostrarNotificacion('Error al guardar la publicación', 'error');
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
        
        tipoSelect.addEventListener('change', () => {
            const tipo = tipoSelect.value;
            recompensaGroup.style.display = tipo === 'Mascota Perdida' ? 'block' : 'none';
            fechaEventoGroup.style.display = tipo === 'Mascota Perdida' ? 'block' : 'none';
        });
        
        // Evento de fotos
        const fotosInput = document.getElementById('pubFotos');
        const fotosPreview = document.getElementById('pubFotosPreview');
        
        fotosInput.addEventListener('change', (e) => {
            fotosPreview.innerHTML = '';
            const files = Array.from(e.target.files);
            
            if (files.length > 5) {
                this.mostrarNotificacion('Máximo 5 fotos', 'warning');
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
    }

async editarPublicacion(id) {
    if (!id) {
        this.mostrarNotificacion('ID de publicación no válido', 'error');
        return;
    }

    // Buscar la publicación
    const publicacion = this.publicaciones.find(p => p.id === id);
    if (!publicacion) {
        this.mostrarNotificacion('Publicación no encontrada', 'error');
        return;
    }

    this.abrirModalEdicionPublicacion(publicacion);
}

    abrirModalEdicionPublicacion(publicacion) {
        const modal = document.getElementById('publicacionModal');
        if (!modal) return;

        // Limpiar campos y cargar datos
        document.getElementById('publicacionId').value = publicacion.id;
        document.getElementById('pubTipo').value = publicacion.tipo;
        document.getElementById('pubTitulo').value = publicacion.titulo;
        document.getElementById('pubCategoria').value = publicacion.categoria || '';
        document.getElementById('pubDescripcion').value = publicacion.descripcion;
        document.getElementById('pubContacto').value = publicacion.contacto || '';
        document.getElementById('pubUbicacion').value = publicacion.ubicacionTexto || '';
        
        // Campos condicionales
        if (publicacion.recompensa) {
            document.getElementById('pubRecompensa').value = publicacion.recompensa;
        }
        if (publicacion.fechaEvento) {
            document.getElementById('pubFechaEvento').value = publicacion.fechaEvento;
        }
        
        // Mostrar fotos existentes
        const fotosPreview = document.getElementById('pubFotosPreview');
        if (fotosPreview && publicacion.fotos) {
            fotosPreview.innerHTML = '';
            publicacion.fotos.forEach((foto, index) => {
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
        if (publicacion.tipo === 'Mascota Perdida') {
            if (recompensaGroup) recompensaGroup.style.display = 'block';
            if (fechaEventoGroup) fechaEventoGroup.style.display = 'block';
        } else {
            if (recompensaGroup) recompensaGroup.style.display = 'none';
            if (fechaEventoGroup) fechaEventoGroup.style.display = 'none';
        }
        
        // Cambiar texto del botón
        const btnGuardar = document.querySelector('#publicacionForm button[type="submit"]');
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Actualizar';
        }
        
        // Abrir modal
        modal.style.display = 'flex';
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

        // document.getElementById('publicacionForm').addEventListener('submit', (e) => this.guardarPublicacion(e));

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