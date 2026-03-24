import Mascota from '/classes/mascotas.js';

class MascotaDetalleController {
    constructor() {
        this.uidUsuarioActual = localStorage.getItem('currentUserId') || null;
        this.idMascota = new URLSearchParams(window.location.search).get('id');
        this.fotoDataUrl = '';
        this.mascotaActual = null;

        this.cacheDom();
        this.initEvents();
        this.init();
    }

    cacheDom() {
        this.btnVolver = document.getElementById('btnVolver');
        this.btnEditarMascota = document.getElementById('btnEditarMascota');
        this.btnCerrarModal = document.getElementById('btnCerrarModal');
        this.btnCancelar = document.getElementById('btnCancelar');
        this.btnGuardar = document.getElementById('btnGuardar');
        this.modalMascota = document.getElementById('modalMascota');

        this.petFoto = document.getElementById('petFoto');
        this.petEspecie = document.getElementById('petEspecie');
        this.petNombre = document.getElementById('petNombre');
        this.petRaza = document.getElementById('petRaza');
        this.petEdad = document.getElementById('petEdad');
        this.petPeso = document.getElementById('petPeso');
        this.petGenero = document.getElementById('petGenero');
        this.petColores = document.getElementById('petColores');
        this.petMicrochip = document.getElementById('petMicrochip');
        this.petEsterilizado = document.getElementById('petEsterilizado');
        this.petHistorial = document.getElementById('petHistorial');

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
        this.fotoPreviewImg = document.getElementById('fotoPreviewImg');
        this.placeholderIcon = document.getElementById('placeholderIcon');
        this.esterilizadoRadios = document.getElementsByName('esterilizado');
    }

    initEvents() {
        this.btnVolver.onclick = () => {
            window.location.href = '/user/visitor/mascotas/mascotas.html';
        };

        this.btnEditarMascota.onclick = () => this.abrirModal();
        this.btnCerrarModal.onclick = () => this.cerrarModal();
        this.btnCancelar.onclick = () => this.cerrarModal();
        this.btnGuardar.onclick = () => this.guardarCambios();

        this.fotoMascota.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                this.fotoDataUrl = event.target.result;
                this.fotoPreviewImg.src = this.fotoDataUrl;
                this.fotoPreviewImg.style.display = 'block';
                if (this.placeholderIcon) this.placeholderIcon.style.display = 'none';
            };
            reader.readAsDataURL(file);
        };

        window.onclick = (event) => {
            if (event.target === this.modalMascota) {
                this.cerrarModal();
            }
        };
    }

    async init() {
        if (!this.uidUsuarioActual) {
            window.location.href = '/user/visitor/login/login.html';
            return;
        }

        if (!this.idMascota) {
            this.mostrarAlerta('Aviso', 'No se recibio una mascota para consultar.', 'warning');
            setTimeout(() => {
                window.location.href = '/user/visitor/mascotas/mascotas.html';
            }, 1200);
            return;
        }

        await this.cargarDetalle();
    }

    async cargarDetalle() {
        const mascota = new Mascota();
        const resultado = await mascota.cargar(this.idMascota);

        if (!resultado.success) {
            this.mostrarAlerta('Error', 'No se pudo cargar la mascota.', 'error');
            return;
        }

        if (mascota.uidUsuario !== this.uidUsuarioActual) {
            this.mostrarAlerta('Acceso denegado', 'Esta mascota no pertenece a tu cuenta.', 'error');
            setTimeout(() => {
                window.location.href = '/user/visitor/mascotas/mascotas.html';
            }, 1400);
            return;
        }

        this.mascotaActual = mascota;
        this.renderDetalle();
    }

    renderDetalle() {
        const m = this.mascotaActual;
        this.petFoto.src = m.foto || 'https://via.placeholder.com/320x320?text=Sin+Foto';
        this.petEspecie.textContent = m.especie || 'Sin especie';
        this.petNombre.textContent = m.nombre || 'Sin nombre';
        this.petRaza.textContent = m.raza || 'Raza no especificada';
        this.petEdad.textContent = m.edad ? `${m.edad} anos` : 'No registrada';
        this.petPeso.textContent = m.peso ? `${m.peso} kg` : 'No registrado';
        this.petGenero.textContent = m.genero || 'No registrado';
        this.petColores.textContent = m.colores || 'No registrado';
        this.petMicrochip.textContent = m.microchip || 'No registrado';
        this.petEsterilizado.textContent = m.esterilizado || 'No registrado';
        this.petHistorial.textContent = m.historialMedico || 'Sin informacion registrada.';
    }

    abrirModal() {
        if (!this.mascotaActual) return;

        const m = this.mascotaActual;
        this.mascotaId.value = m.id;
        this.nombreMascota.value = m.nombre || '';
        this.especieMascota.value = m.especie || '';
        this.generoMascota.value = m.genero || '';
        this.razaMascota.value = m.raza || '';
        this.coloresMascota.value = m.colores || '';
        this.edadMascota.value = m.edad || '';
        this.pesoMascota.value = m.peso || '';
        this.microchipMascota.value = m.microchip || '';
        this.historialMedico.value = m.historialMedico || '';

        this.fotoDataUrl = m.foto || '';
        if (this.fotoDataUrl) {
            this.fotoPreviewImg.src = this.fotoDataUrl;
            this.fotoPreviewImg.style.display = 'block';
            if (this.placeholderIcon) this.placeholderIcon.style.display = 'none';
        } else {
            this.fotoPreviewImg.src = '';
            this.fotoPreviewImg.style.display = 'none';
            if (this.placeholderIcon) this.placeholderIcon.style.display = 'block';
        }

        Array.from(this.esterilizadoRadios).forEach((radio) => {
            radio.checked = radio.value === this.normalizarEsterilizado(m.esterilizado);
        });

        this.modalMascota.style.display = 'flex';
    }

    cerrarModal() {
        this.modalMascota.style.display = 'none';
    }

    normalizarEsterilizado(valor) {
        if (!valor) return 'No';
        const limpio = String(valor).trim().toLowerCase();
        return limpio === 'si' || limpio === 'sí' ? 'Sí' : 'No';
    }

    async guardarCambios() {
        const esterilizadoValue = Array.from(this.esterilizadoRadios).find((r) => r.checked)?.value || 'No';

        const mascotaActualizada = new Mascota(
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
            this.fotoDataUrl || null,
            this.mascotaId.value
        );

        const resultado = await mascotaActualizada.guardar();
        if (!resultado.success) {
            this.mostrarAlerta('Error', resultado.error || 'No se pudo guardar la mascota.', 'error');
            return;
        }

        this.mostrarAlerta('Actualizada', 'La informacion de la mascota fue actualizada.', 'success');
        this.cerrarModal();
        this.mascotaActual = mascotaActualizada;
        this.renderDetalle();
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

document.addEventListener('DOMContentLoaded', () => {
    window.mascotaDetalleController = new MascotaDetalleController();
});
