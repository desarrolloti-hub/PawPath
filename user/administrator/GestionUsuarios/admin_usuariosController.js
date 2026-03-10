import Admin_usuarios from "/classes/admin_usuarios.js";

console.log("📦 Módulo controlador cargado");
console.log("📦 Admin_usuarios importado:", Admin_usuarios);

class Admin_usuariosController {
    constructor() {
        console.log("🏗️ Constructor del controlador");
        this.inicializar();
    }

    inicializar() {
        console.log("⚙️ Inicializando controlador...");
        console.log("📊 Estado del DOM:", document.readyState);

        if (document.readyState === 'loading') {
            console.log("⏳ DOM cargando, esperando evento...");
            document.addEventListener('DOMContentLoaded', () => {
                console.log("✅ Evento DOMContentLoaded recibido");
                this.cargarUsuarios();
                this.configurarBuscador(); // ← Agregado
            });
        } else {
            console.log("✅ DOM ya cargado, ejecutando inmediatamente");
            this.cargarUsuarios();
            this.configurarBuscador(); // ← Agregado
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async cargarUsuarios() {
        console.log("🔄 Método cargarUsuarios() ejecutándose");
        try {
            console.log("🔄 Llamando a Admin_usuarios.obtenerUsuarios()...")
            const resultado = await Admin_usuarios.obtenerUsuarios();
            console.log("📦 Resultado recibido:", resultado);

            if (resultado.success) {
                console.log('Usuarios cargados:', resultado.usuarios);
                this.renderizarTabla(resultado.usuarios);
            } else {
                this.mostrarAlerta('Error', resultado.error, 'error');
            }
        } catch (error) {
            console.error("Error cargando usuarios:", error);
            this.mostrarAlerta('Error', 'No se pudieron cargar los usuarios', 'error');
        }
    }

    renderizarTabla(usuarios) {
        console.log("🎨 Renderizando tabla...");

        const tbody = document.getElementById("tabla-usuarios");
        console.log("📌 Elemento tbody:", tbody);

        if (!tbody) {
            console.error("❌ No se encontró elemento con ID 'tabla-usuarios'");
            return;
        }

        tbody.innerHTML = '';

        if (!usuarios || usuarios.length === 0) {
            console.log("📌 No hay usuarios para mostrar");
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay usuarios registrados</td></tr>';
            return;
        }

        console.log(`📌 Renderizando ${usuarios.length} usuarios`);

        usuarios.forEach(usuario => {
            console.log("📌 Usuario:", usuario);

            const row = tbody.insertRow();

            // ✅ TUS BOTONES ORIGINALES - SIN MODIFICAR
            row.innerHTML = `
                <td>${this.escapeHtml(usuario.nombre || '')}</td>
                <td>${this.escapeHtml(usuario.apellidos || '')}</td>
                <td>${this.escapeHtml(usuario.email || '')}</td>
                <td>${this.escapeHtml(usuario.fecha_registro || 'N/A')}</td>
                <td>${this.escapeHtml(usuario.rol || '')}</td>
                <td class="acciones">
                    <button class="btn-eliminar" onclick="admin_usuariosController.eliminarUsuario('${usuario.id}')" title="Eliminar usuario">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-editar" onclick="admin_usuariosController.suspenderUsuario('${usuario.id}')" title="Suspender usuario">
                        <i class="fas fa-person"></i>
                    </button>
                </td>
            `;
        });

        console.log("✅ Renderizado completado");
    }

    // ============ NUEVOS MÉTODOS AGREGADOS ============

    configurarBuscador() {
        const inputBuscar = document.getElementById('buscarNombre');
        if (!inputBuscar) {
            console.warn('⚠️ No se encontró el input de búsqueda');
            return;
        }
        let timeoutId;
        inputBuscar.addEventListener('input', (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.buscarUsuario(e.target.value);
            }, 300);
        });
        inputBuscar.addEventListener('keypress', (e) => {
            if (e.key == 'Enter') {
                clearTimeout(timeoutId);
                this.buscarUsuario(e.target.value);
            }
        });
    }

    async buscarUsuario(termino) {
        console.log('🔍 Buscando usuarios con término:', termino);
        try {
            if (!termino || termino.trim() == '') {
                this.cargarUsuarios();
                return;
            }
            // Usar el método correcto del modelo: buscarUsuarios (con 's')
            const resultado = await Admin_usuarios.buscarUsuarios(termino);
            if (!resultado.success) {
                this.mostrarNotificacion("Error al buscar", "error");
                return;
            }
            console.log(`📊 ${resultado.usuarios.length} usuarios encontrados`);

            if (resultado.usuarios.length == 0) {
                const tbody = document.getElementById("tabla-usuarios");
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No se encontraron usuarios</td></tr>';
                }
                return;
            }
            this.renderizarTabla(resultado.usuarios);
        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            this.mostrarNotificacion('Error al buscar usuarios', 'error');
        }
    }

    async suspenderUsuario(id) {
        try {
            console.log('🔒 Preparando suspensión/activación de usuario:', id);

            // Obtener información del usuario
            const admin_usuarios = new Admin_usuarios();
            admin_usuarios.id = id;

            const resultado = await admin_usuarios.listarUsuarios(id);
            let nombreUsuario = 'este usuario';
            let estadoActual = 'activo';

            if (resultado.success) {
                const usuario = resultado.usuario;
                nombreUsuario = `${usuario.nombre} ${usuario.apellidos}`.trim();
                estadoActual = usuario.suspendido ? 'suspendido' : 'activo';
            }

            const esSuspender = estadoActual === 'activo';
            const titulo = esSuspender ? '¿Suspender usuario?' : '¿Reactivar usuario?';
            const mensaje = esSuspender
                ? `¿Estás seguro de que deseas suspender a <strong>${nombreUsuario}</strong>?`
                : `¿Estás seguro de que deseas reactivar a <strong>${nombreUsuario}</strong>?`;
            const subtitulo = esSuspender
                ? 'El usuario no podrá acceder al sistema hasta que sea reactivado.'
                : 'El usuario podrá acceder nuevamente al sistema.';
            const icono = esSuspender ? 'warning' : 'info';
            const botonColor = esSuspender ? '#ffc107' : '#28a745';
            const botonTexto = esSuspender ? '<i class="fas fa-ban"></i> Sí, suspender' : '<i class="fas fa-check-circle"></i> Sí, reactivar';

            // Confirmar con SweetAlert
            const confirmar = await Swal.fire({
                title: titulo,
                html: `
                    <p>${mensaje}</p>
                    <p class="text-${esSuspender ? 'warning' : 'success'}"><small>${subtitulo}</small></p>
                `,
                icon: icono,
                showCancelButton: true,
                confirmButtonColor: botonColor,
                cancelButtonColor: '#6c757d',
                confirmButtonText: botonTexto,
                cancelButtonText: 'Cancelar',
                reverseButtons: true
            });

            if (!confirmar.isConfirmed) return;

            this.mostrarLoading(true);

            // Ejecutar suspensión/activación
            const admin_usuarios2 = new Admin_usuarios();
            admin_usuarios2.id = id;

            const resultadoOperacion = esSuspender
                ? await admin_usuarios2.suspenderUsuario('suspendido')
                : await admin_usuarios2.reactivarUsuario();

            this.mostrarLoading(false);

            if (resultadoOperacion.success) {
                await Swal.fire({
                    title: '¡Éxito!',
                    text: resultadoOperacion.message,
                    icon: 'success',
                    confirmButtonColor: '#667eea',
                    timer: 2000,
                    showConfirmButton: false
                });

                this.cargarUsuarios();
            } else {
                this.mostrarNotificacion(resultadoOperacion.error, 'error');
            }

        } catch (error) {
            console.error('❌ Error:', error);
            this.mostrarLoading(false);
            this.mostrarNotificacion('Error al procesar la solicitud', 'error');
        }
    }

    async eliminarUsuario(id) {
        try {
            console.log('🗑️ Preparando eliminación de usuario:', id);

            // Obtener información del usuario para mostrar en el modal
            const admin_usuarios = new Admin_usuarios();
            admin_usuarios.id = id;

            // Opcional: cargar datos del usuario para mostrarlos en el modal
            const resultado = await admin_usuarios.listarUsuarios(id);
            if (resultado.success) {
                const usuario = resultado.usuario;
                document.getElementById('nombreUsuarioEliminar').textContent =
                    `${usuario.nombre} ${usuario.apellidos}`;
                document.getElementById('infoUsuarioEliminar').style.display = 'block';
            }

            // Configurar el botón de confirmación
            const btnConfirmar = document.getElementById('btnConfirmarEliminar');

            // Remover event listeners anteriores para evitar duplicados
            btnConfirmar.replaceWith(btnConfirmar.cloneNode(true));
            const nuevoBtnConfirmar = document.getElementById('btnConfirmarEliminar');

            // Agregar event listener para la eliminación
            nuevoBtnConfirmar.addEventListener('click', async () => {
                // Cerrar el modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar'));
                modal.hide();

                // Mostrar indicador de carga
                this.mostrarLoading(true);

                try {
                    console.log('🔄 Ejecutando eliminación en Firebase...');
                    const admin_usuarios = new Admin_usuarios();
                    admin_usuarios.id = id;

                    const resultadoEliminacion = await admin_usuarios.eliminarUsuario();
                    console.log('📦 Resultado:', resultadoEliminacion);

                    this.mostrarLoading(false);

                    if (resultadoEliminacion.success) {
                        // Mostrar mensaje de éxito
                        this.mostrarNotificacion('Usuario eliminado correctamente', 'success');

                        // Recargar la tabla
                        setTimeout(() => {
                            this.cargarUsuarios();
                        }, 500);
                    } else {
                        this.mostrarNotificacion(resultadoEliminacion.error || 'Error al eliminar', 'error');
                    }
                } catch (error) {
                    console.error('❌ Error:', error);
                    this.mostrarLoading(false);
                    this.mostrarNotificacion('Error al eliminar usuario', 'error');
                }
            });

            // Mostrar el modal
            const modal = new bootstrap.Modal(document.getElementById('modalConfirmarEliminar'));
            modal.show();

        } catch (error) {
            console.error('❌ Error preparando eliminación:', error);
            this.mostrarNotificacion('Error al preparar eliminación', 'error');
        }
    }

    // Método para mostrar/ocultar loading
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

    // Método para mostrar notificaciones
    mostrarNotificacion(mensaje, tipo) {
        // Crear contenedor de notificaciones si no existe
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

        // Crear notificación
        const notificacion = document.createElement('div');
        notificacion.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        notificacion.role = 'alert';
        notificacion.innerHTML = `
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        container.appendChild(notificacion);

        // Auto-cerrar después de 3 segundos
        setTimeout(() => {
            notificacion.remove();
        }, 3000);
    }

    mostrarAlerta(titulo, mensaje, tipo) {
        if (typeof Swal === 'undefined') {
            alert(`${titulo}: ${mensaje}`);
            return;
        }

        const config = {
            title: titulo,
            text: mensaje,
            icon: tipo,
            confirmButtonColor: '#667eea'
        };

        if (tipo === 'success') {
            config.timer = 2000;
            config.showConfirmButton = false;
        }

        Swal.fire(config);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.admin_usuariosController = new Admin_usuariosController();
});