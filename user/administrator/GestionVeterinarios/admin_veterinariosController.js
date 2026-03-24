import { db } from '/config/firebase-config.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc,
    deleteDoc,
    writeBatch,
    query, 
    where
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { auth } from '/config/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

class Admin_veterinariosController {
    constructor() {
        console.log("🏗️ Inicializando Admin_veterinariosController");
        this.inicializar();
    }

    inicializar() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.cargarVeterinarios();
                this.configurarBuscador();
            });
        } else {
            this.cargarVeterinarios();
            this.configurarBuscador();
        }
    }

    // ============ UTILIDADES ============
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    obtenerIniciales(nombre) {
        if (!nombre) return 'V';
        return nombre.split(' ')
            .map(p => p[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    mostrarLoading(mostrar) {
        let loadingEl = document.getElementById('loadingOverlay');
        if (!loadingEl && mostrar) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'loadingOverlay';
            loadingEl.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                            background: rgba(0,0,0,0.5); z-index: 9999; 
                            display: flex; justify-content: center; align-items: center;">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                </div>
            `;
            document.body.appendChild(loadingEl);
        } else if (loadingEl && !mostrar) {
            loadingEl.remove();
        }
    }

    mostrarNotificacion(mensaje, tipo) {
        const texto = mensaje || (tipo === 'success' ? 'Operación exitosa' : 'Error en la operación');
        
        let container = document.getElementById('notificacionContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificacionContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
            `;
            document.body.appendChild(container);
        }

        const notificacion = document.createElement('div');
        notificacion.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        notificacion.innerHTML = `
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${texto}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.appendChild(notificacion);
        setTimeout(() => notificacion.remove(), 3000);
    }

    // ============ CARGAR VETERINARIOS ============
    async cargarVeterinarios() {
        try {
            console.log("🔄 Cargando veterinarios desde colección VETERINARIOS...");
            
            const veterinariosSnapshot = await getDocs(collection(db, 'veterinarios'));
            const veterinarios = [];
            
            veterinariosSnapshot.forEach(doc => {
                const data = doc.data();
                
                veterinarios.push({
                    id: doc.id,
                    nombreCompleto: data.nombreCompleto || 
                        `${data.primerNombre || ''} ${data.segundoNombre || ''} ${data.apellidoPat || ''} ${data.apellidoMat || ''}`.trim() || 
                        'Nombre no disponible',
                    email: data.email || '',
                    telefono: data.telefono || '',
                    cedula: data.cedula || '',
                    especialidades: data.especialidades || [],
                    nombreClinica: data.nombreClinica || '',
                    direccion: data.direccion || '',
                    fotoPerfil: data.fotoPerfil || null,
                    suspendido: data.suspendido || false,
                    verificado: data.verificado || false
                });
            });
            
            console.log(`✅ ${veterinarios.length} veterinarios cargados`);
            this.renderizarTarjetas(veterinarios);
            
        } catch (error) {
            console.error("❌ Error cargando veterinarios:", error);
            this.mostrarNotificacion("Error al cargar veterinarios", "error");
        }
    }

    // ============ RENDERIZAR TARJETAS ============
    renderizarTarjetas(veterinarios) {
        const contenedor = document.getElementById("contenedorVeterinarios");
        if (!contenedor) return;

        contenedor.innerHTML = '';

        if (!veterinarios || veterinarios.length === 0) {
            contenedor.innerHTML = '<div class="no-veterinarios">No hay veterinarios registrados</div>';
            return;
        }

        veterinarios.forEach(vet => {
            const estaSuspendido = vet.suspendido === true;
            
            const tarjeta = document.createElement('div');
            tarjeta.className = `vet-card ${estaSuspendido ? 'suspendido' : ''}`;
            
            const estadoTexto = estaSuspendido ? 'Suspendido' : 'Activo';
            const estadoClase = estaSuspendido ? 'estado-suspendido' : 'estado-activo';
            const estadoIcono = estaSuspendido ? 'fa-ban' : 'fa-check-circle';
            
            const verificadoTexto = vet.verificado ? 'Verificado' : 'Pendiente';
            const verificadoClase = vet.verificado ? 'verificado' : 'no-verificado';
            const verificadoIcono = vet.verificado ? 'fa-check-circle' : 'fa-clock';
            
            const especialidadesTexto = vet.especialidades?.length > 0
                ? vet.especialidades.join(' • ')
                : 'No especificadas';
            
            const nombreMostrar = vet.nombreCompleto || 'Nombre no disponible';
            
            tarjeta.innerHTML = `
                <div class="vet-card-header">
                    <div class="vet-foto" onclick="adminVeterinariosController.verDetalle('${vet.id}')">
                        ${vet.fotoPerfil ?
                            `<img src="${vet.fotoPerfil}" alt="${nombreMostrar}">` :
                            `<div class="avatar-placeholder">${this.obtenerIniciales(nombreMostrar)}</div>`
                        }
                    </div>
                    <div class="vet-info-header">
                        <h3 class="vet-nombre">${this.escapeHtml(nombreMostrar)}</h3>
                        <div class="vet-badges">
                            <span class="vet-badge ${estadoClase}">
                                <i class="fas ${estadoIcono}"></i> ${estadoTexto}
                            </span>
                            <span class="vet-badge ${verificadoClase}">
                                <i class="fas ${verificadoIcono}"></i> ${verificadoTexto}
                            </span>
                        </div>
                        <span class="vet-cedula" onclick="adminVeterinariosController.verCedula('${vet.id}')">
                            <i class="fas fa-id-card"></i> 
                            ${vet.cedula ? 'Ver cédula profesional' : 'Sin cédula registrada'}
                        </span>
                    </div>
                </div>
                
                <div class="vet-card-body">
                    ${vet.nombreClinica ? `
                        <div class="vet-clinica">
                            <i class="fas fa-clinic-medical"></i> 
                            <strong>${this.escapeHtml(vet.nombreClinica)}</strong>
                        </div>
                    ` : ''}
                    
                    <div class="vet-especialidades">
                        <i class="fas fa-stethoscope"></i>
                        <span>${this.escapeHtml(especialidadesTexto)}</span>
                    </div>
                    
                    <div class="vet-contacto">
                        <div class="contacto-item">
                            <i class="fas fa-envelope"></i>
                            <span>${this.escapeHtml(vet.email || '')}</span>
                        </div>
                        <div class="contacto-item">
                            <i class="fas fa-phone"></i>
                            <span>${this.escapeHtml(vet.telefono || 'Teléfono no disponible')}</span>
                        </div>
                        ${vet.direccion ? `
                            <div class="contacto-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${this.escapeHtml(vet.direccion)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="vet-card-footer">
                    <button class="btn-ver" onclick="adminVeterinariosController.verDetalle('${vet.id}')">
                        <i class="fas fa-eye"></i> Ver perfil
                    </button>
                    <button class="${estaSuspendido ? 'btn-reactivar' : 'btn-suspender'}" 
                            onclick="adminVeterinariosController.suspenderVeterinario('${vet.id}')">
                        <i class="fas ${estaSuspendido ? 'fa-check-circle' : 'fa-ban'}"></i> 
                        ${estaSuspendido ? 'Reactivar' : 'Suspender'}
                    </button>
                    <button class="btn-eliminar" 
                            onclick="adminVeterinariosController.eliminarVeterinario('${vet.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            
            contenedor.appendChild(tarjeta);
        });
    }

    // ============ SUSPENDER VETERINARIO ============
    async suspenderVeterinario(id) {
        try {
            console.log(`🔒 Preparando suspensión/activación de veterinario: ${id}`);
            
            // Obtener datos del veterinario
            const vetRef = doc(db, 'veterinarios', id);
            const vetSnap = await getDoc(vetRef);
            
            if (!vetSnap.exists()) {
                this.mostrarNotificacion('Veterinario no encontrado', 'error');
                return;
            }
            
            const data = vetSnap.data();
            const nombreVeterinario = data.nombreCompleto || 
                `${data.primerNombre || ''} ${data.segundoNombre || ''} ${data.apellidoPat || ''} ${data.apellidoMat || ''}`.trim() || 
                'el veterinario';
            
            const estaSuspendido = data.suspendido === true;
            const esSuspender = !estaSuspendido;
            
            // Confirmar con SweetAlert
            const confirmar = await Swal.fire({
                title: esSuspender ? '¿Suspender veterinario?' : '¿Reactivar veterinario?',
                text: `¿Estás seguro de ${esSuspender ? 'suspender' : 'reactivar'} a ${nombreVeterinario}?`,
                icon: esSuspender ? 'warning' : 'info',
                showCancelButton: true,
                confirmButtonColor: esSuspender ? '#ffc107' : '#28a745',
                confirmButtonText: esSuspender ? 'Sí, suspender' : 'Sí, reactivar'
            });
            
            if (!confirmar.isConfirmed) return;
            
            this.mostrarLoading(true);
            
            // Actualizar en VETERINARIOS
            const datosVet = {
                suspendido: esSuspender,
                activo: !esSuspender,
                estado: esSuspender ? 'suspendido' : 'activo',
                fecha_actualizacion: new Date()
            };
            
            if (esSuspender) {
                datosVet.fecha_suspension = new Date();
            } else {
                datosVet.fecha_reactivacion = new Date();
            }
            
            await updateDoc(vetRef, datosVet);
            
            // También actualizar en USUARIOS si existe
            try {
                const userRef = doc(db, 'usuarios', id);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    await updateDoc(userRef, {
                        suspendido: esSuspender,
                        estado: esSuspender ? 'suspendido' : 'activo',
                        fecha_actualizacion: new Date()
                    });
                    console.log('✅ Usuario actualizado');
                }
            } catch (e) {
                console.log('⚠️ No se pudo actualizar usuario');
            }
            
            this.mostrarLoading(false);
            
            await Swal.fire({
                title: esSuspender ? '¡Suspendido!' : '¡Reactivado!',
                text: `El veterinario ${nombreVeterinario} ha sido ${esSuspender ? 'suspendido' : 'reactivado'}.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            
            this.cargarVeterinarios();
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.mostrarLoading(false);
            this.mostrarNotificacion('Error al cambiar estado', 'error');
        }
    }

    // ============ ELIMINAR VETERINARIO ============
    async eliminarVeterinario(id) {
        try {
            console.log(`🗑️ Preparando eliminación de veterinario: ${id}`);
            
            // Obtener datos del veterinario
            const vetRef = doc(db, 'veterinarios', id);
            const vetSnap = await getDoc(vetRef);
            
            if (!vetSnap.exists()) {
                this.mostrarNotificacion('Veterinario no encontrado', 'error');
                return;
            }
            
            const data = vetSnap.data();
            const nombreVeterinario = data.nombreCompleto || 
                `${data.primerNombre || ''} ${data.segundoNombre || ''} ${data.apellidoPat || ''} ${data.apellidoMat || ''}`.trim() || 
                'el veterinario';
            
            // Confirmar eliminación
            const confirmar = await Swal.fire({
                title: '¿Eliminar veterinario?',
                html: `
                    <p>¿Estás seguro de eliminar a <strong>${nombreVeterinario}</strong>?</p>
                    <p class="text-danger">Esta acción no se puede deshacer.</p>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: '<i class="fas fa-trash"></i> Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });
            
            if (!confirmar.isConfirmed) return;
            
            this.mostrarLoading(true);
            
            // 1️⃣ Eliminar de VETERINARIOS
            await deleteDoc(vetRef);
            console.log('✅ Veterinario eliminado de veterinarios');
            
            // 2️⃣ Actualizar rol en USUARIOS (cambiar a usuario normal)
            try {
                const userRef = doc(db, 'usuarios', id);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    await updateDoc(userRef, {
                        rol: 'usuario',
                        suspendido: false,
                        estado: 'activo',
                        fecha_actualizacion: new Date()
                    });
                    console.log('✅ Rol del usuario actualizado a "usuario"');
                }
            } catch (e) {
                console.log('⚠️ No se pudo actualizar usuario');
            }
            
            this.mostrarLoading(false);
            
            await Swal.fire({
                title: '¡Eliminado!',
                text: `El veterinario ${nombreVeterinario} ha sido eliminado.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            
            this.cargarVeterinarios();
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.mostrarLoading(false);
            this.mostrarNotificacion('Error al eliminar', 'error');
        }
    }

    // ============ VER DETALLE ============
    async verDetalle(id) {
        try {
            const vetRef = doc(db, 'veterinarios', id);
            const vetSnap = await getDoc(vetRef);
            
            if (!vetSnap.exists()) {
                Swal.fire('Error', 'Veterinario no encontrado', 'error');
                return;
            }
            
            const data = vetSnap.data();
            
            const nombreCompleto = data.nombreCompleto || 
                `${data.primerNombre || ''} ${data.segundoNombre || ''} ${data.apellidoPat || ''} ${data.apellidoMat || ''}`.trim() || 
                'Nombre no disponible';
            
            const especialidades = data.especialidades || [];
            const cedula = data.cedula || 'No registrada';
            const nombreClinica = data.nombreClinica || 'Clínica no especificada';
            const direccion = data.direccion || 'No especificada';
            const fotoPerfil = data.fotoPerfil || null;
            const telefono = data.telefono || 'No especificado';
            const email = data.email || 'No especificado';
            const suspendido = data.suspendido === true;
            const verificado = data.verificado || false;
            
            Swal.fire({
                title: 'Detalles del Veterinario',
                width: '600px',
                html: `
                    <div style="text-align: left;">
                        <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                            ${fotoPerfil ? 
                                `<img src="${fotoPerfil}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">` : 
                                `<div style="width: 100px; height: 100px; border-radius: 50%; background: #667eea; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem;">${this.obtenerIniciales(nombreCompleto)}</div>`
                            }
                            <div>
                                <h3>${this.escapeHtml(nombreCompleto)}</h3>
                                <p><i class="fas fa-clinic-medical"></i> ${this.escapeHtml(nombreClinica)}</p>
                                <p><i class="fas fa-id-card"></i> Cédula: ${this.escapeHtml(cedula)}</p>
                            </div>
                        </div>
                        <hr>
                        <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${this.escapeHtml(email)}</p>
                        <p><strong><i class="fas fa-phone"></i> Teléfono:</strong> ${this.escapeHtml(telefono)}</p>
                        <p><strong><i class="fas fa-map-marker-alt"></i> Dirección:</strong> ${this.escapeHtml(direccion)}</p>
                        <hr>
                        <p><strong><i class="fas fa-stethoscope"></i> Especialidades:</strong> ${especialidades.length ? especialidades.join(', ') : 'No especificadas'}</p>
                        <hr>
                        <div style="display: flex; gap: 10px;">
                            <span class="vet-badge ${suspendido ? 'estado-suspendido' : 'estado-activo'}">
                                <i class="fas ${suspendido ? 'fa-ban' : 'fa-check-circle'}"></i> 
                                ${suspendido ? 'Suspendido' : 'Activo'}
                            </span>
                            <span class="vet-badge ${verificado ? 'verificado' : 'no-verificado'}">
                                <i class="fas ${verificado ? 'fa-check-circle' : 'fa-clock'}"></i> 
                                ${verificado ? 'Verificado' : 'Pendiente'}
                            </span>
                        </div>
                    </div>
                `,
                confirmButtonColor: '#667eea',
                confirmButtonText: 'Cerrar'
            });
            
        } catch (error) {
            console.error('❌ Error:', error);
            Swal.fire('Error', 'No se pudo cargar el detalle', 'error');
        }
    }

    // ============ VER CÉDULA ============
    async verCedula(id) {
        try {
            const vetRef = doc(db, 'veterinarios', id);
            const vetSnap = await getDoc(vetRef);
            
            if (!vetSnap.exists()) {
                Swal.fire('Sin datos', 'Este veterinario no tiene perfil registrado', 'info');
                return;
            }
            
            const data = vetSnap.data();
            const cedula = data.cedula;
            const nombreCompleto = data.nombreCompleto || 'Veterinario';
            
            if (!cedula) {
                Swal.fire('Sin cédula', 'Este veterinario no tiene cédula registrada', 'info');
                return;
            }
            
            Swal.fire({
                title: 'Cédula Profesional',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Nombre:</strong> ${this.escapeHtml(nombreCompleto)}</p>
                        <p><strong>Cédula:</strong> ${this.escapeHtml(cedula)}</p>
                        <hr>
                        <p class="text-muted">Documento validado por el sistema</p>
                    </div>
                `,
                icon: 'success',
                confirmButtonColor: '#667eea'
            });
            
        } catch (error) {
            console.error('❌ Error:', error);
            Swal.fire('Error', 'No se pudo cargar la cédula', 'error');
        }
    }

    // ============ BUSCADOR ============
    configurarBuscador() {
        const input = document.getElementById('buscarVeterinario');
        if (!input) return;
        
        let timeoutId;
        input.addEventListener('input', (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.buscarVeterinario(e.target.value);
            }, 300);
        });
    }
    
    async buscarVeterinario(termino) {
        try {
            if (!termino || termino.trim() === '') {
                this.cargarVeterinarios();
                return;
            }
            
            const veterinariosSnapshot = await getDocs(collection(db, 'veterinarios'));
            const terminoLower = termino.toLowerCase().trim();
            const veterinarios = [];
            
            veterinariosSnapshot.forEach(doc => {
                const data = doc.data();
                const nombreCompleto = data.nombreCompleto || 
                    `${data.primerNombre || ''} ${data.segundoNombre || ''} ${data.apellidoPat || ''} ${data.apellidoMat || ''}`.trim();
                
                const coincide = 
                    nombreCompleto.toLowerCase().includes(terminoLower) ||
                    (data.email && data.email.toLowerCase().includes(terminoLower)) ||
                    (data.especialidades && data.especialidades.some(e => e.toLowerCase().includes(terminoLower))) ||
                    (data.nombreClinica && data.nombreClinica.toLowerCase().includes(terminoLower)) ||
                    (data.cedula && data.cedula.toLowerCase().includes(terminoLower));
                
                if (coincide) {
                    veterinarios.push({
                        id: doc.id,
                        nombreCompleto: nombreCompleto || 'Nombre no disponible',
                        email: data.email || '',
                        telefono: data.telefono || '',
                        cedula: data.cedula || '',
                        especialidades: data.especialidades || [],
                        nombreClinica: data.nombreClinica || '',
                        direccion: data.direccion || '',
                        fotoPerfil: data.fotoPerfil || null,
                        suspendido: data.suspendido || false,
                        verificado: data.verificado || false
                    });
                }
            });
            
            this.renderizarTarjetas(veterinarios);
            
        } catch (error) {
            console.error('❌ Error buscando:', error);
            this.mostrarNotificacion('Error al buscar', 'error');
        }
    }
}

// Inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.adminVeterinariosController = new Admin_veterinariosController();
    });
} else {
    window.adminVeterinariosController = new Admin_veterinariosController();
}