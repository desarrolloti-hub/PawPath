// /user/visitor/mascotas/mascotas.js
import Mascota from '/classes/mascotas.js';

class MascotasController {
    constructor() {
        // Referencias a elementos del DOM
        this.btnAgregarMascota = document.getElementById('btnAgregarMascota');
        this.btnGuardar = document.getElementById('btnGuardar');
        this.btnCerrarModal = document.getElementById('btnCerrarModal');
        this.modalMascota = document.getElementById('modalMascota');
        this.modalTitle = document.getElementById('modalTitle');

        // Inputs del formulario
        this.mascotaId = document.getElementById('mascotaId');
        this.nombreMascota = document.getElementById('nombreMascota');
        this.razaMascota = document.getElementById('razaMascota');
        this.especieMascota = document.getElementById('especieMascota');
        this.coloresMascota = document.getElementById('coloresMascota');
        this.edadMascota = document.getElementById('edadMascota');
        this.pesoMascota = document.getElementById('pesoMascota');
        this.microchipMascota = document.getElementById('microchipMascota');
        this.historialMedico = document.getElementById('historialMedico');
        this.fotoMascota = document.getElementById('fotoMascota');
        this.fotoPreview = document.getElementById('fotoPreview');

        // Radio buttons
        this.generoRadios = document.querySelectorAll('input[name="genero"]');
        this.esterilizadoRadios = document.querySelectorAll('input[name="esterilizado"]');

        // Tabla
        this.tablaMascotas = document.querySelector('#tablaMascotas tbody');

        // Estado
        this.mascotaActual = null;
        this.modoEdicion = false;

        this.inicializar();
    }

    inicializar() {
        this.configurarEventos();
        this.cargarMascotas();
    }

    configurarEventos() {
        this.btnAgregarMascota.addEventListener('click', () => this.abrirModal());
        this.btnGuardar.addEventListener('click', () => this.guardarMascota());
        this.btnCerrarModal.addEventListener('click', () => this.cerrarModal());
        this.fotoMascota.addEventListener('change', (e) => this.previewImage(e));

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target === this.modalMascota) {
                this.cerrarModal();
            }
        });

        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalMascota.style.display === 'block') {
                this.cerrarModal();
            }
        });
    }

    abrirModal(mascotaId = null) {
        if (mascotaId) {
            this.modalTitle.textContent = 'Editar Mascota';
            this.cargarDatosMascota(mascotaId);
        } else {
            this.modalTitle.textContent = 'Nueva Mascota';
            this.limpiarFormulario();
        }

        this.modalMascota.style.display = 'block';
    }

    cerrarModal() {
        this.modalMascota.style.display = 'none';
        this.mascotaActual = null;
        this.modoEdicion = false;
        this.limpiarFormulario();
    }

    async cargarDatosMascota(id) {
        try {
            this.mascotaActual = new Mascota();
            const resultado = await this.mascotaActual.cargar(id);

            if (resultado.success) {
                // Llenar formulario con datos de la mascota
                this.mascotaId.value = this.mascotaActual.id;
                this.nombreMascota.value = this.mascotaActual.nombre;
                this.razaMascota.value = this.mascotaActual.raza;
                this.especieMascota.value = this.mascotaActual.especie;

                // Seleccionar género
                this.generoRadios.forEach(radio => {
                    if (radio.value === this.mascotaActual.genero) {
                        radio.checked = true;
                    }
                });

                this.coloresMascota.value = this.mascotaActual.colores;
                this.edadMascota.value = this.mascotaActual.edad;
                this.pesoMascota.value = this.mascotaActual.peso;
                this.microchipMascota.value = this.mascotaActual.microchip;

                // Seleccionar esterilizado
                this.esterilizadoRadios.forEach(radio => {
                    if (radio.value === this.mascotaActual.esterilizado) {
                        radio.checked = true;
                    }
                });

                this.historialMedico.value = this.mascotaActual.historialMedico;

                if (this.mascotaActual.foto) {
                    this.fotoPreview.src = this.mascotaActual.foto;
                }

                this.modoEdicion = true;
                this.btnGuardar.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
            } else {
                this.mostrarAlerta('Error', resultado.error, 'error');
            }
        } catch (error) {
            console.error('Error cargando mascota:', error);
            this.mostrarAlerta('Error', 'No se pudo cargar la información de la mascota', 'error');
        }
    }

    async cargarMascotas() {
        try {
            const resultado = await Mascota.obtenerTodas();

            if (resultado.success) {
                this.renderizarTabla(resultado.mascotas);
            } else {
                this.mostrarAlerta('Error', resultado.error, 'error');
            }
        } catch (error) {
            console.error('Error cargando mascotas:', error);
            this.mostrarAlerta('Error', 'No se pudieron cargar las mascotas', 'error');
        }
    }

    renderizarTabla(mascotas) {
        this.tablaMascotas.innerHTML = '';

        if (mascotas.length === 0) {
            this.tablaMascotas.innerHTML = '<tr><td colspan="11" class="text-center">No hay mascotas registradas</td></tr>';
            return;
        }

        mascotas.forEach(mascotaData => {
            const mascota = new Mascota(
                mascotaData.nombre,
                mascotaData.raza,
                mascotaData.especie,
                mascotaData.genero,
                mascotaData.colores,
                mascotaData.edad,
                mascotaData.peso,
                mascotaData.microchip,
                mascotaData.esterilizado,
                mascotaData.historialMedico,
                mascotaData.foto,
                mascotaData.id
            );

            const row = this.tablaMascotas.insertRow();

            row.innerHTML = `
                <td>${mascota.nombre}</td>
                <td>${mascota.raza}</td>
                <td>${mascota.getEspecieIcono()} ${mascota.especie}</td>
                <td>${mascota.getGeneroIcono()} ${mascota.genero}</td>
                <td>${mascota.colores}</td>
                <td>${mascota.getEdadFormateada()}</td>
                <td>${mascota.getPesoFormateado()}</td>
                <td>${mascota.tieneMicrochip() ? mascota.microchip : 'N/A'}</td>
                <td>${mascota.esterilizado}</td>
                <td>
                    <img src="${mascota.foto || 'https://via.placeholder.com/50'}" 
                         alt="Foto" class="foto-miniatura" 
                         onclick="mascotasController.verFotoGrande('${mascota.foto}')">
                </td>
                <td>
                    <button class="btn-editar" onclick="mascotasController.abrirModal('${mascota.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-eliminar" onclick="mascotasController.eliminarMascota('${mascota.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-ver" onclick="mascotasController.verDetalle('${mascota.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
        });
    }

    async guardarMascota() {
        // Crear instancia de mascota con datos del formulario
        const mascota = new Mascota(
            this.nombreMascota.value,
            this.razaMascota.value,
            this.especieMascota.value,
            this.getGeneroSeleccionado(),
            this.coloresMascota.value,
            parseFloat(this.edadMascota.value) || 0,
            parseFloat(this.pesoMascota.value) || 0,
            this.microchipMascota.value,
            this.getEsterilizadoSeleccionado(),
            this.historialMedico.value,
            this.fotoPreview.src || null,
            this.mascotaId.value || null
        );

        // Validar
        const validacion = mascota.validar();
        if (!validacion.valido) {
            this.mostrarAlerta('Campos requeridos', validacion.errores.join('<br>'), 'warning');
            return;
        }

        // Mostrar loading
        Swal.fire({
            title: 'Guardando...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // Guardar
        const resultado = await mascota.guardar();
        Swal.close();

        if (resultado.success) {
            this.mostrarAlerta('Éxito', resultado.message, 'success');
            this.cerrarModal();
            this.cargarMascotas();
        } else {
            this.mostrarAlerta('Error', resultado.error, 'error');
        }
    }

    async eliminarMascota(id) {
        const confirmacion = await Swal.fire({
            title: '¿Eliminar mascota?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="fas fa-trash"></i> Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirmacion.isConfirmed) {
            const mascota = new Mascota();
            mascota.id = id;

            Swal.fire({
                title: 'Eliminando...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const resultado = await mascota.eliminar();
            Swal.close();

            if (resultado.success) {
                this.mostrarAlerta('Éxito', resultado.message, 'success');
                this.cargarMascotas();
            } else {
                this.mostrarAlerta('Error', resultado.error, 'error');
            }
        }
    }

    async verDetalle(id) {
        const mascota = new Mascota();
        const resultado = await mascota.cargar(id);

        if (resultado.success) {
            Swal.fire({
                title: `${mascota.getEspecieIcono()} ${mascota.nombre}`,
                html: `
                    <div style="text-align: left;">
                        <p><strong>Raza:</strong> ${mascota.raza}</p>
                        <p><strong>Especie:</strong> ${mascota.especie}</p>
                        <p><strong>Género:</strong> ${mascota.getGeneroIcono()} ${mascota.genero}</p>
                        <p><strong>Colores:</strong> ${mascota.colores}</p>
                        <p><strong>Edad:</strong> ${mascota.getEdadFormateada()}</p>
                        <p><strong>Peso:</strong> ${mascota.getPesoFormateado()}</p>
                        <p><strong>Microchip:</strong> ${mascota.tieneMicrochip() ? mascota.microchip : 'No registrado'}</p>
                        <p><strong>Esterilizado:</strong> ${mascota.esterilizado}</p>
                        <p><strong>Historial Médico:</strong> ${mascota.historialMedico}</p>
                        <p><strong>Fecha Registro:</strong> ${new Date(mascota.fechaRegistro).toLocaleDateString()}</p>
                    </div>
                `,
                imageUrl: mascota.foto || 'https://via.placeholder.com/150',
                imageWidth: 200,
                imageHeight: 200,
                imageAlt: 'Foto de la mascota',
                confirmButtonColor: '#667eea'
            });
        } else {
            this.mostrarAlerta('Error', resultado.error, 'error');
        }
    }

    verFotoGrande(fotoUrl) {
        if (!fotoUrl) {
            this.mostrarAlerta('Sin foto', 'Esta mascota no tiene foto registrada', 'info');
            return;
        }

        Swal.fire({
            imageUrl: fotoUrl,
            imageAlt: 'Foto de la mascota',
            showConfirmButton: false,
            showCloseButton: true
        });
    }

    previewImage(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                this.mostrarAlerta('Archivo muy grande', 'La imagen no debe superar los 2MB', 'warning');
                event.target.value = '';
                return;
            }

            if (!file.type.startsWith('image/')) {
                this.mostrarAlerta('Tipo no válido', 'Por favor seleccione una imagen', 'warning');
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => this.fotoPreview.src = e.target.result;
            reader.readAsDataURL(file);
        }
    }

    getGeneroSeleccionado() {
        let genero = '';
        this.generoRadios.forEach(radio => {
            if (radio.checked) genero = radio.value;
        });
        return genero;
    }

    getEsterilizadoSeleccionado() {
        let esterilizado = 'No';
        this.esterilizadoRadios.forEach(radio => {
            if (radio.checked) esterilizado = radio.value;
        });
        return esterilizado;
    }

    limpiarFormulario() {
        this.mascotaId.value = '';
        this.nombreMascota.value = '';
        this.razaMascota.value = '';
        this.especieMascota.value = '';

        this.generoRadios.forEach(radio => radio.checked = false);

        this.coloresMascota.value = '';
        this.edadMascota.value = '';
        this.pesoMascota.value = '';
        this.microchipMascota.value = '';

        this.esterilizadoRadios.forEach(radio => {
            if (radio.value === 'No') radio.checked = true;
        });

        this.historialMedico.value = '';
        this.fotoMascota.value = '';
        this.fotoPreview.src = '';

        this.btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar';
        this.modoEdicion = false;
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.mascotasController = new MascotasController();
    } catch (error) {
        console.error('Error al inicializar MascotasController:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de inicialización',
            text: 'No se pudo cargar la página correctamente. Por favor, recarga.',
            confirmButtonText: 'Recargar',
            allowOutsideClick: false
        }).then(() => {
            window.location.reload();
        });
    }
});

export default MascotasController;