// /user/visitor/mascotas/mascotas.js
import Mascota from '/classes/mascotas.js';

// const UID_USUARIO_ESTATICO = 'MmAkbYF2gdeXGJaX41bEI8ZeCEw1'; // Solo para pruebas. Reemplazar con sesión real en producción.

class MascotasController {
    constructor() {
        // Referencias a elementos del DOM (IDs actualizados del nuevo HTML)
        this.btnAgregarMascota = document.getElementById('btnAgregarMascota');
        this.btnGuardar = document.getElementById('btnGuardar');
        this.btnCerrarModal = document.getElementById('btnCerrarModal');
        this.modalMascota = document.getElementById('modalMascota');
        this.modalTitle = document.getElementById('modalTitle');

        // Inputs del formulario dentro del modal
        this.mascotaId = document.getElementById('mascotaId');
        this.nombreMascota = document.getElementById('nombreMascota');
        this.razaMascota = document.getElementById('razaMascota');
        this.especieMascota = document.getElementById('especieMascota');
        this.generoMascota = document.getElementById('generoMascota');
        this.coloresMascota = document.getElementById('coloresMascota');
        this.edadMascota = document.getElementById('edadMascota');
        this.pesoMascota = document.getElementById('pesoMascota');
        this.microchipMascota = document.getElementById('microchipMascota');
        this.historialMedico = document.getElementById('historialMedico');
        this.fotoMascota = document.getElementById('fotoMascota');
        this.fotoPreview = document.getElementById('fotoPreview');
        this.fotoPreviewImg = document.getElementById('fotoPreviewImg');
        this.placeholderIcon = document.getElementById('placeholderIcon');
        this.esterilizadoRadios = document.getElementsByName('esterilizado');

        // will hold images as DataURL array for saving
        this.fotoDataUrl = [];
        this.uidUsuarioActual = null;

        this.modoEdicion = false;
        this.initEvents();
        this.inicializarSesion();
    }

    inicializarSesion() {
        // this.uidUsuarioActual = UID_USUARIO_ESTATICO;
        // Para usar el usuario dinámico, COMENTA la línea anterior y DESCOMENTA esta:
        this.uidUsuarioActual = localStorage.getItem('currentUserId') || null;

        if (this.uidUsuarioActual) {
            this.cargarMascotas();
        } else {
            this.redirigirALogin();
            return;
        }

        // if (this.uidUsuarioActual === UID_USUARIO_ESTATICO) {
        //     return;
        // }

        window.addEventListener('userSessionStored', (event) => {
            this.uidUsuarioActual = event?.detail?.uid || localStorage.getItem('currentUserId') || null;
            this.cargarMascotas();
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'currentUserId') {
                this.uidUsuarioActual = event.newValue || null;
                if (this.uidUsuarioActual) {
                    this.cargarMascotas();
                } else {
                    this.redirigirALogin();
                }
            }
        });
    }

    redirigirALogin() {
        // Mantiene el comportamiento consistente con la sesión guardada en login.js
        window.location.href = '/user/visitor/login/login.html';
    }

    initEvents() {
        // Abrir modal para nueva mascota
        this.btnAgregarMascota.onclick = () => this.abrirModal();

        // Cerrar modal
        this.btnCerrarModal.onclick = () => this.cerrarModal();

        // Guardar o Actualizar
        this.btnGuardar.onclick = () => this.guardarMascota();

        // Vista previa de las imagenes al seleccionar archivos
        this.fotoMascota.onchange = (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
            if (totalBytes > 1000000) {
                this.mostrarAlerta('Límite excedido', `El peso total de las imágenes (${(totalBytes / 1024).toFixed(0)} KB) supera el límite de 1,000,000 bytes.`, 'warning');
                this.fotoMascota.value = '';
                return;
            }

            this.fotoDataUrl = [];
            let cargadas = 0;
            files.forEach((file, i) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.fotoDataUrl[i] = ev.target.result;
                    cargadas++;
                    if (cargadas === files.length) {
                        this.fotoPreviewImg.src = this.fotoDataUrl[0];
                        this.fotoPreviewImg.style.display = 'block';
                        if (this.placeholderIcon) this.placeholderIcon.style.display = 'none';
                    }
                };
                reader.readAsDataURL(file);
            });
        };

        // Cerrar modal si se hace clic fuera del recuadro blanco
        window.addEventListener('click', (event) => {
            if (event.target == this.modalMascota) {
                this.cerrarModal();
            }
        });
    }

    abrirModal(id = null) {
    if (id) {
        this.modoEdicion = true;
        this.modalTitle.innerText = "Editar Mascota";
        this.cargarDatosMascota(id); // Esta función debe existir en tu clase
    } else {
        this.modoEdicion = false;
        this.modalTitle.innerText = "Registrar Mascota";
        this.limpiarFormulario();
    }
    
    // ESTA ES LA LÍNEA CLAVE:
    this.modalMascota.style.display = 'flex'; 
}
    cerrarModal() {
        this.modalMascota.style.display = 'none';
        this.limpiarFormulario();
    }

    async cargarMascotas() {
        try {
            if (!this.uidUsuarioActual) {
                this.renderizarCards([]);
                return;
            }

            const { success, mascotas } = await Mascota.obtenerPorUsuario(this.uidUsuarioActual);
            if (success) {
                this.renderizarCards(mascotas);
            } else {
                this.mostrarAlerta('Error', 'No se pudieron cargar las mascotas', 'error');
            }
        } catch (error) {
            console.error("Error al cargar mascotas:", error);
            this.mostrarAlerta('Error', 'No se pudieron cargar las mascotas', 'error');
        }
    }

    renderizarCards(mascotas) {
        const contenedor = document.getElementById('contenedorMascotas');
        contenedor.innerHTML = '';

        if (mascotas.length === 0) {
            contenedor.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <p>No tienes mascotas registradas todavía.</p>
                </div>`;
            return;
        }

        mascotas.forEach(m => {
            const card = document.createElement('div');
            card.className = 'pet-card';
            card.onclick = () => this.irADetalle(m.id);
            card.innerHTML = `
                <button class="btn-delete-card" onclick="event.stopPropagation(); mascotasController.eliminarMascota('${m.id}')">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="pet-img-container">
                    <img src="${(Array.isArray(m.foto) ? m.foto[0] : m.foto) || 'https://via.placeholder.com/300x200?text=Sin+Foto'}" alt="${m.nombre}">
                </div>

                <div class="pet-info">
                    <span class="badge">${m.especie}</span>
                    <h3>${m.nombre}</h3>
                    <p>${m.raza || 'Raza no especificada'}</p>
                    <div style="margin-top: 10px; display: flex; justify-content: center; gap: 15px; font-size: 0.85rem; color: #718096;">
                        <span><i class="fas fa-calendar-alt"></i> ${m.edad || '?'} años</span>
                        <span><i class="fas fa-weight"></i> ${m.peso || '?'} kg</span>
                    </div>
                </div>
            `;
            contenedor.appendChild(card);
        });
    }

    irADetalle(idMascota) {
        if (!idMascota) return;
        window.location.href = `/user/visitor/mascotas/mascota-detalle.html?id=${encodeURIComponent(idMascota)}`;
    }

    async cargarDatosMascota(id) {
        try {
            const m = new Mascota();
            const resultado = await m.cargar(id);
            
            if (resultado.success) {
                this.mascotaId.value = m.id;
                this.nombreMascota.value = m.nombre;
                this.especieMascota.value = m.especie;
                this.generoMascota.value = m.genero;
                this.razaMascota.value = m.raza;
                this.coloresMascota.value = m.colores;
                this.edadMascota.value = m.edad;
                this.pesoMascota.value = m.peso;
                this.microchipMascota.value = m.microchip || '';
                this.historialMedico.value = m.historialMedico;
                
                // Setear radio de esterilizado
                this.esterilizadoRadios.forEach(r => {
                    if (r.value === m.esterilizado) r.checked = true;
                });

                if (m.foto) {
                    this.fotoDataUrl = Array.isArray(m.foto) ? m.foto : [m.foto];
                    this.fotoPreviewImg.src = this.fotoDataUrl[0];
                    this.fotoPreviewImg.style.display = 'block';
                    if (this.placeholderIcon) this.placeholderIcon.style.display = 'none';
                }
            }
        } catch (error) {
            this.mostrarAlerta('Error', 'No se pudieron cargar los datos', 'error');
        }
    }

    async guardarMascota() {
        if (!this.uidUsuarioActual) {
            this.mostrarAlerta('Sesión requerida', 'Debes iniciar sesión para registrar una mascota.', 'warning');
            return;
        }

        // Validar tamaño total de imágenes al guardar
        const archivos = Array.from(this.fotoMascota.files || []);
        if (archivos.length > 0) {
            const totalBytes = archivos.reduce((sum, f) => sum + f.size, 0);
            if (totalBytes > 1000000) {
                this.mostrarAlerta(
                    'Imágenes demasiado pesadas',
                    `El total de las imágenes seleccionadas es ${(totalBytes / 1024).toFixed(0)} KB. El límite permitido es 1,000,000 bytes (≈ 976 KB). Por favor elige imágenes más pequeñas.`,
                    'warning'
                );
                return;
            }
        }

        const esterilizadoValue = Array.from(this.esterilizadoRadios).find(r => r.checked)?.value;

        // Crear instancia de mascota con los datos del formulario
        const mascota = new Mascota(
            this.nombreMascota.value,
            this.razaMascota.value,
            this.especieMascota.value,
            this.generoMascota.value,
            this.coloresMascota.value,
            this.edadMascota.value,
            this.pesoMascota.value,
            this.microchipMascota.value,
            esterilizadoValue,
            this.historialMedico.value,
            this.uidUsuarioActual,
            this.fotoDataUrl.length ? this.fotoDataUrl : null,
            this.mascotaId.value || null // id
        );

        try {
            const resultado = await mascota.guardar();
            if (resultado.success) {
                this.mostrarAlerta('Éxito', resultado.message, 'success');
                this.cerrarModal();
                this.cargarMascotas();

                // DISPARAR EVENTO PARA NOTIFICAR AL FORMULARIO DE CITAS
                const event = new CustomEvent('mascotaCreada', {
                    detail: { mascota: mascota.toObject() }
                });
                window.dispatchEvent(event);
            } else {
                this.mostrarAlerta('Error', resultado.error || 'No se pudo guardar', 'error');
            }
        } catch (error) {
            console.error('Error al guardar mascota:', error);
            this.mostrarAlerta('Error', 'No se pudo guardar la información', 'error');
        }

    }

    async eliminarMascota(id) {
        const confirmacion = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4d4d',
            cancelButtonColor: '#718096',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirmacion.isConfirmed) {
            try {
                // Crear instancia de mascota solo con el ID
                const mascota = new Mascota();
                mascota.id = id;
                
                const resultado = await mascota.eliminar();
                if (resultado.success) {
                    this.mostrarAlerta('Eliminado', 'La mascota ha sido eliminada', 'success');
                    this.cargarMascotas();
                } else {
                    this.mostrarAlerta('Error', resultado.error || 'No se pudo eliminar', 'error');
                }
            } catch (error) {
                console.error('Error al eliminar mascota:', error);
                this.mostrarAlerta('Error', 'No se pudo eliminar', 'error');
            }
        }
    }

    limpiarFormulario() {
        this.mascotaId.value = '';
        this.nombreMascota.value = '';
        this.razaMascota.value = '';
        this.coloresMascota.value = '';
        this.edadMascota.value = '';
        this.pesoMascota.value = '';
        this.microchipMascota.value = '';
        this.historialMedico.value = '';
        this.fotoMascota.value = '';
        this.fotoDataUrl = [];
        this.fotoPreviewImg.src = '';
        this.fotoPreviewImg.style.display = 'none';
        if (this.placeholderIcon) this.placeholderIcon.style.display = 'block';
        
        this.esterilizadoRadios.forEach(r => {
            if (r.value === 'No') r.checked = true;
        });
    }

    mostrarAlerta(titulo, mensaje, tipo) {
        Swal.fire({
            title: titulo,
            text: mensaje,
            icon: tipo,
            confirmButtonColor: '#667eea'
        });
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    window.mascotasController = new MascotasController();
});
export default MascotasController