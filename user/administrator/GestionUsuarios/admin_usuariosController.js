import Usuarios from '/classes/admin_usuarios.js';
class UsuariosController {
    constructor() {
        this.tablaUsuarios = document.querySelector("#tablaUsuarios tbody");

        this.inicalizar();
    }
    inicalizar() {
        this.cargarUsuarios();
    }

    async cargarUsuarios() {
        try {
            const resultado = await Usuarios.obtenerUsuarios();
            if (resultado.succes) {
                this.renderizarTabla(resultado.usuarios);
            } else {
                this.mostrarAlerta('Error', resultado.error, 'error');
            }
        } catch (error) {
            console.error("Error cargando usuarios", error);
            this.mostrarAlerta('Error', 'No se pudieron cargar los usuarios', 'error');
        }
    }
    renderizarTabla(usuarios) {
        this.tablaUsuarios.innerHTML = '';
        if (usuarios.length == 0) {
            this.tablaUsuarios.innerHTML = '<tr><td colspan="4" class="text-center">No hay usuarios registrados</td></tr>';

            return;
        }
        usuarios.forEach(usuariosData => {
            const usuario = new Usuarios(
                usuariosData.nombre,
                usuariosData.apellidos,
                usuariosData.email,
                usuariosData.fotoMascota,
                usuariosData.id
            );
            const row = this.tablaUsuarios.insertRow();
            row.innerHTML = `
            <td>${usuario.nombre}</td>
            <td>${usuario.apellidos}</td>
            <td>${usuario.email}</td>
            <td>
                <img src="${usuario.fotoMascota || 'https://via.placeholder.com/50'}" 
                    alt="Foto" class="foto-miniatura">
            </td>
            <td> 
                <button class="btn-eliminar" onclick="admin_usuariosController.eliminarUsuario('${usuario.id}')">
                        <i class="fas fa-trash"></i>
                </button>
                <button class="btn-suspender" onclick="admin_usuariosController.suspenderUsuario('${usuario.id}')">
                        <i class="fas fa-person"></i>
                </button>
            </td>`;
        });
    }
    async eliminarUsuario(id) {
        const respuesta = await Swal.fire({
            title: '¿Eliminar usuario?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-trash"></i> Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (confirmacion.isConfirmed) {
            const usuario = new Usuarios();
            usuario.id = id;

            Swal.fire({
                title: 'Eliminando...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const resultado = await usuario.eliminarUsuario();
            Swal.close();

            if (resultado.success) {
                this.mostrarAlerta('Éxito', resultado.message, 'success');
                this.cargarMascotas();
            } else {
                this.mostrarAlerta('Error', resultado.error, 'error');
            }
        }
    }
    mostrarAlerta(titulo, mensaje, tipo = 'info') {
        const config = {
            icon: tipo,
            title: titulo,
            html: mensaje,
            confirmButtonColor: '#667eea'
        };

        if (tipo === 'success') {
            config.timer = 2000;
            config.showConfirmButton = false;
        }

        Swal.fire(config);
    }
}
