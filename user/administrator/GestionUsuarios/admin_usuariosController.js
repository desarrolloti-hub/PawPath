import Admin_usuarios from "/classes/admin_usuarios.js";
// 👇 IMPORTAR AuthManager
import { auth } from '/config/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

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
            document.addEventListener('DOMContentLoaded', () => {
                console.log("✅ Evento DOMContentLoaded recibido");
                this.cargarUsuarios();
                this.configurarBuscador();
            });
        } else {
            console.log("✅ DOM ya cargado, ejecutando inmediatamente");
            this.cargarUsuarios();
            this.configurarBuscador();
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
            
            // ✅ AGREGADO: Clase para usuarios suspendidos (fondo transparente)
            if (usuario.suspendido) {
                row.classList.add('usuario-suspendido');
            }

            // Determinar texto del botón según estado
            const botonTexto = usuario.suspendido ? 'Reactivar' : 'Suspender';
            const botonIcono = usuario.suspendido ? 'fa-check-circle' : 'fa-ban';
            const botonTitulo = usuario.suspendido ? 'Reactivar usuario' : 'Suspender usuario';

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
                    <button class="btn-${usuario.suspendido ? 'reactivar' : 'suspender'}" 
                            onclick="admin_usuariosController.suspenderUsuario('${usuario.id}')" 
                            title="${botonTitulo}">
                        <i class="fas ${botonIcono}"></i> ${botonTexto}
                    </button>
                </td>
            `;
        });

        console.log("✅ Renderizado completado");
    }

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

    // ============ MÉTODO SUSPENDER USUARIO MEJORADO ============
    async suspenderUsuario(id) {
        try {
            console.log('🔒 Preparando suspensión/activación de usuario:', id);

            // Obtener información del usuario
            const admin_usuarios = new Admin_usuarios();
            admin_usuarios.id = id;

            const resultado = await admin_usuarios.listarUsuarios(id);
            
            if (!resultado.success) {
                this.mostrarNotificacion('No se pudo obtener información del usuario', 'error');
                return;
            }

            const usuario = resultado.usuario;
            const nombreUsuario = `${usuario.nombre} ${usuario.apellidos}`.trim() || 'este usuario';
            const suspendido = usuario.suspendido === true;

            console.log('📊 Estado actual del usuario:', suspendido ? 'SUSPENDIDO' : 'ACTIVO');

            const esSuspender = !suspendido;
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

            // 1️⃣ PRIMERO: Actualizar en Firestore
            const admin_usuarios2 = new Admin_usuarios();
            admin_usuarios2.id = id;

            let resultadoOperacion;
            
            if (esSuspender) {
                console.log('🔒 Ejecutando suspensión...');
                resultadoOperacion = await admin_usuarios2.suspenderUsuario('suspendido');
            } else {
                console.log('🔄 Ejecutando reactivación...');
                resultadoOperacion = await admin_usuarios2.reactivarUsuario();
            }

            // 2️⃣ SEGUNDO: Si se suspendió y ES EL MISMO ADMIN, forzar logout
            if (esSuspender && resultadoOperacion.success) {
                try {
                    // Verificar si el usuario suspendido es el mismo que está logueado
                    const currentUser = auth.currentUser;
                    
                    if (currentUser && currentUser.uid === id) {
                        console.log('⚠️ El admin se está suspendiendo a sí mismo. Cerrando sesión...');
                        
                        // Mostrar mensaje especial
                        Swal.fire({
                            title: 'Te has suspendido',
                            text: 'Has suspendido tu propia cuenta. Cerrando sesión...',
                            icon: 'info',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        
                        // Forzar logout
                        await signOut(auth);
                        
                        // Redirigir al login después de 2 segundos
                        setTimeout(() => {
                            window.location.href = '/user/visitor/login/login.html';
                        }, 2000);
                    }
                } catch (logoutError) {
                    console.error('Error al cerrar sesión del admin:', logoutError);
                }
            }

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

                // Recargar la tabla
                this.cargarUsuarios();
            } else {
                this.mostrarNotificacion(resultadoOperacion.error || 'Error al procesar', 'error');
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

            // Obtener información del usuario
            const admin_usuarios = new Admin_usuarios();
            admin_usuarios.id = id;

            const resultado = await admin_usuarios.listarUsuarios(id);
            if (resultado.success) {
                const usuario = resultado.usuario;
                document.getElementById('nombreUsuarioEliminar').textContent =
                    `${usuario.nombre} ${usuario.apellidos}`;
                document.getElementById('infoUsuarioEliminar').style.display = 'block';
            }

            const btnConfirmar = document.getElementById('btnConfirmarEliminar');
            btnConfirmar.replaceWith(btnConfirmar.cloneNode(true));
            const nuevoBtnConfirmar = document.getElementById('btnConfirmarEliminar');

            nuevoBtnConfirmar.addEventListener('click', async () => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarEliminar'));
                modal.hide();

                this.mostrarLoading(true);

                try {
                    const admin_usuarios = new Admin_usuarios();
                    admin_usuarios.id = id;

                    const resultadoEliminacion = await admin_usuarios.eliminarUsuario();

                    this.mostrarLoading(false);

                    if (resultadoEliminacion.success) {
                        // Si el usuario eliminado es el admin actual, cerrar sesión
                        const currentUser = auth.currentUser;
                        if (currentUser && currentUser.uid === id) {
                            await signOut(auth);
                            setTimeout(() => {
                                window.location.href = '/user/visitor/login/login.html';
                            }, 2000);
                        } else {
                            this.mostrarNotificacion('Usuario eliminado correctamente', 'success');
                            setTimeout(() => this.cargarUsuarios(), 500);
                        }
                    } else {
                        this.mostrarNotificacion(resultadoEliminacion.error || 'Error al eliminar', 'error');
                    }
                } catch (error) {
                    console.error('❌ Error:', error);
                    this.mostrarLoading(false);
                    this.mostrarNotificacion('Error al eliminar usuario', 'error');
                }
            });

            const modal = new bootstrap.Modal(document.getElementById('modalConfirmarEliminar'));
            modal.show();

        } catch (error) {
            console.error('❌ Error preparando eliminación:', error);
            this.mostrarNotificacion('Error al preparar eliminación', 'error');
        }
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
        notificacion.role = 'alert';
        notificacion.innerHTML = `
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${texto}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        container.appendChild(notificacion);

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