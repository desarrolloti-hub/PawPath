import Mascota from '/classes/mascotas.js';
import { planValidator } from '/classes/PlanValidator.js';
class MascotaDetalleController {
    constructor() {
        this.uidUsuarioActual = localStorage.getItem('currentUserId') || null;
        this.idMascota = new URLSearchParams(window.location.search).get('id');
        this.fotoDataUrl = '';
        this.mascotaActual = null;
        this.fotosCarrusel = [];
        this.indiceFotoActual = 0;
        this.intervaloCarrusel = null;

        this.cacheDom();
        this.initEvents();
        this.init();
    }

    cacheDom() {
        this.btnVolver = document.getElementById('btnVolver');
        this.btnEditarMascota = document.getElementById('btnEditarMascota');
        this.btnDescargarPDF = document.getElementById('btnDescargarPDF');
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
        this.btnDescargarPDF.onclick = () => this.generarPDF();
        this.btnCerrarModal.onclick = () => this.cerrarModal();
        this.btnCancelar.onclick = () => this.cerrarModal();
        this.btnGuardar.onclick = () => this.guardarCambios();

        this.petFoto.style.cursor = 'pointer';
        this.petFoto.onclick = () => {
            if (this.fotosCarrusel.length > 1) {
                this.siguienteFoto();
                this.iniciarCarrusel();
            }
        };

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

    normalizarFotos(foto) {
        if (Array.isArray(foto)) return foto.filter((f) => typeof f === 'string' && f.trim() !== '');
        if (typeof foto === 'string' && foto.trim() !== '') return [foto];
        return [];
    }

    mostrarFotoActual() {
        if (!this.fotosCarrusel.length) {
            this.petFoto.src = 'https://via.placeholder.com/320x320?text=Sin+Foto';
            return;
        }
        this.petFoto.src = this.fotosCarrusel[this.indiceFotoActual];
    }

    siguienteFoto() {
        if (this.fotosCarrusel.length <= 1) return;
        this.indiceFotoActual = (this.indiceFotoActual + 1) % this.fotosCarrusel.length;
        this.mostrarFotoActual();
    }

    iniciarCarrusel() {
        this.detenerCarrusel();
        if (this.fotosCarrusel.length <= 1) return;
        this.intervaloCarrusel = setInterval(() => this.siguienteFoto(), 3500);
    }

    detenerCarrusel() {
        if (this.intervaloCarrusel) {
            clearInterval(this.intervaloCarrusel);
            this.intervaloCarrusel = null;
        }
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
        if(!planValidator.accederAexpediente()){
            alert('No puedes acceder al expediente de tu mascota');
            window.location.href='/user/visitor/mascotas/mascotas.html';
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
        this.fotosCarrusel = this.normalizarFotos(m.foto);
        this.indiceFotoActual = 0;
        this.mostrarFotoActual();
        this.iniciarCarrusel();
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

        this.fotoDataUrl = this.normalizarFotos(m.foto);
        if (this.fotoDataUrl.length > 0) {
            this.fotoPreviewImg.src = this.fotoDataUrl[0];
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
        const fotos = this.normalizarFotos(this.fotoDataUrl);

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
            fotos.length ? fotos : null,
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

    async convertirImagenABase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();

    return await new Promise((resolve) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            resolve(reader.result);
        };

        reader.readAsDataURL(blob);
    });
}

    async generarPDF() {
    const logoPath = "/assets/images/PawPahtLogo.png";

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    const m = this.mascotaActual;

    const fechaGeneracion = new Date().toLocaleString();

    const expedienteId = `PP-${m.id.substring(0,8).toUpperCase()}`;

    let qrText = `
PawPath Expediente
ID:${expedienteId}
Mascota:${m.nombre}
Especie:${m.especie}
Fecha:${fechaGeneracion}
    `;

    let qrDiv = document.createElement("div");

    new QRCode(qrDiv,{
        text: qrText,
        width:100,
        height:100
    });

    await new Promise(resolve=>setTimeout(resolve,500));

    let qrImg = qrDiv.querySelector("img");

    doc.setFontSize(20);
    doc.text("PAWPATH",105,20,{align:"center"});

    doc.setFontSize(12);
    doc.text("Expediente Digital Veterinario",105,28,{align:"center"});

    doc.line(20,35,190,35);

    doc.setFontSize(10);
    doc.text(`Expediente: ${expedienteId}`,20,45);
    doc.text(`Fecha de generacion: ${fechaGeneracion}`,20,52);
    

    if(m.foto){

        let fotoMascota = Array.isArray(m.foto)
            ? m.foto[0]
            : m.foto;

        doc.addImage(
            fotoMascota,
            'JPEG',
            140,
            40,
            50,
            50
        );
    }
    let y = 70;
    doc.setFontSize(14);
    doc.text("Informacion General",20,y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Nombre: ${m.nombre || '-'}`,20,y); y += 8;
    doc.text(`Especie: ${m.especie || '-'}`,20,y); y += 8;
    doc.text(`Genero: ${m.genero || '-'}`,20,y); y += 8;
    doc.text(`Raza: ${m.raza || '-'}`,20,y); y += 8;
    doc.text(`Color: ${m.colores || '-'}`,20,y); y += 8;
    doc.text(`Edad: ${m.edad || '-'} años`,20,y); y += 8;
    doc.text(`Peso: ${m.peso || '-'} Kg`,20,y); y += 8;
    doc.text(`Microchip: ${m.microchip || 'No registrado'}`,20,y); y += 8;
    doc.text(`Esterilizado: ${m.esterilizado || '-'}`,20,y); y += 15;

    doc.setFontSize(14);
    doc.text("Historial Medico",20,y);
    y += 10;
    const historialTexto =
        doc.splitTextToSize(
            m.historialMedico || 'Sin informacion registrada',
            170
        );
    doc.setFontSize(11);
    doc.text(historialTexto,20,y);
    if(qrImg){
        doc.addImage(
            qrImg.src,
            'PNG',
            150,
            230,
            40,
            40
        );
    }
    doc.setFontSize(9);
    doc.text(
        "Documento generado automaticamente por PawPath",
        20,
        280
    );
    doc.text(
        "https://pawpath.com",
        20,
        286
    );
    doc.save(
        `Expediente_${m.nombre}_${expedienteId}.pdf`
    );
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

window.addEventListener('beforeunload', () => {
    if (window.mascotaDetalleController) {
        window.mascotaDetalleController.detenerCarrusel();
    }
});
