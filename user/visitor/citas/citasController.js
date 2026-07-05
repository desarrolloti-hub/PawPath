import { auth } from '/config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import Citas from '/classes/Citas.js';
import Veterinario from '/classes/Veterinario.js';
import Mascota from '/classes/mascotas.js';
import { obtenerRecomendacionIA } from '/config/gemini-service.js';

class CitasController {
    constructor() {
        this.initialized = false;
        this.citasModel = null;
        this.form = null;
        this.btnSubmit = null;
        this.imageInput = null;
        this.imagePreview = null;
        this.fileUploadLabel = null;
        this.modal = null;
        this.proximasCitasDiv = null;
        this.vetSeleccionado = sessionStorage.getItem('vetSeleccionado');
        this.vetModel = new Veterinario();
        this.veterinarios = [];
        this.mascotaModel = null; // para instanciar Mascota
        this.mascotasUsuario = [];
        this.mascotaSeleccionada = null;
        this.modalMascota = null; // referencia al modal de mascotas
        // this.modalMascota = null;
        this.fotoDataUrlModal = '';
        this.initialize();
    }


    async initialize() {
        try {
            await this.checkAuth();

            this.citasModel = new Citas();
            this.getDOMElements();

            // Inicializar modal de mascotas
            this.inicializarModalMascotas();

            if (this.btnGuardarModalMascota) {
                        this.btnGuardarModalMascota.onclick = () => this.guardarMascotaDesdeModal();
            }

            // PRIMERO: Cargar veterinarios
            await this.cargarVeterinarios();

            // SEGUNDO: Cargar mascotas del usuario
            await this.cargarMascotasUsuario();

            // await this.cargarVeterinarios();

            this.setupEventListeners();
            this.setMinDate();
            // this.mostrarUsuario();
            await this.cargarProximasCitas();

            if (this.vetSeleccionado && this.veterinarios.length > 0) {
                const select = document.getElementById('veterinario');
                if (select) {
                    select.value = this.vetSeleccionado;
                }
                await this.cargarHorariosDisponibles();
            }

            this.initialized = true;

        } catch (error) {
            console.error('Error al inicializar:', error);
            this.mostrarError('Error al cargar la página. Por favor recarga.');
        }
    }

    async cargarMascotasUsuario() {
        const select = document.getElementById('mascotaSelector');
        if (!select) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            const result = await Mascota.obtenerPorUsuario(user.uid);

            if (result.success) {
                this.mascotasUsuario = result.mascotas;

                // Limpiar opciones excepto las primeras
                let options = '<option value="">-- Selecciona una mascota --</option>';
                options += '<option value="nueva">+ Registrar nueva mascota</option>';

                this.mascotasUsuario.forEach(mascota => {
                    options += `<option value="${mascota.id}">${mascota.nombre} (${mascota.especie})</option>`;
                });

                select.innerHTML = options;
            }
        } catch (error) {
            console.error('Error cargando mascotas:', error);
        }
    }

    async autocompletarConMascota(mascotaId) {
        // Buscar en la lista de mascotas cargadas
        let mascota = this.mascotasUsuario.find(m => m.id === mascotaId);
        
        // Si no está en la lista, recargar mascotas
        if (!mascota) {
            await this.cargarMascotasUsuario();
            mascota = this.mascotasUsuario.find(m => m.id === mascotaId);
        }
        
        if (!mascota) return;
        
        this.mascotaSeleccionada = mascota;
        document.getElementById('mascotaId').value = mascota.id;
        
        // Autocompletar campos
        document.getElementById('nombreMascota').value = mascota.nombre || '';
        document.getElementById('especie').value = (mascota.especie || '').toLowerCase();
        document.getElementById('raza').value = mascota.raza || '';
        document.getElementById('genero').value = (mascota.genero || '').toLowerCase();
        document.getElementById('edad').value = this.formatearEdad(mascota.edad);
        document.getElementById('enfermedades').value = mascota.historialMedico || '';
        
        // Mostrar foto si existe
       /* if (mascota.foto) {
            const preview = document.getElementById('imagePreview');
            const label = document.getElementById('fileUploadLabel');
            if (preview) {
                preview.innerHTML = `<img src="${mascota.foto}" alt="Preview" style="max-width: 100%; border-radius: 8px;">`;
            }
            if (label) {
                label.style.display = 'none';
            }
            this.mascotaTieneFoto = true;
        } else {
            // Limpiar preview si no hay foto
            const preview = document.getElementById('imagePreview');
            const label = document.getElementById('fileUploadLabel');
            if (preview) preview.innerHTML = '';
            if (label) label.style.display = 'flex';
            this.mascotaTieneFoto = false;
        }*/
        
        // Ocultar mensaje de información
        const infoContainer = document.getElementById('mascotaInfoContainer');
        if (infoContainer) infoContainer.style.display = 'none';
    }


    formatearEdad(edad) {
        if (!edad) return '';
        if (edad < 1) {
            const meses = Math.round(edad * 12);
            return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
        }
        return `${edad} ${edad === 1 ? 'año' : 'años'}`;
    }
    
    async onMascotaSelectorChange() {
        const select = document.getElementById('mascotaSelector');
        const value = select.value;
        
        if (value === 'nueva') {
            // Abrir modal de registro de mascota
            this.abrirModalMascotas();
        } else if (value && value !== '') {
            // Autocompletar con mascota existente
            await this.autocompletarConMascota(value);
        } else {
            // Limpiar formulario
            this.limpiarFormularioMascota();
            document.getElementById('mascotaId').value = '';
            this.mascotaSeleccionada = null;
        }
    }


    limpiarFormularioMascota() {
        document.getElementById('nombreMascota').value = '';
        document.getElementById('especie').value = '';
        document.getElementById('raza').value = '';
        document.getElementById('genero').value = '';
        document.getElementById('edad').value = '';
        document.getElementById('enfermedades').value = '';

        // Limpiar preview de imagen
        const preview = document.getElementById('imagePreview');
        const label = document.getElementById('fileUploadLabel');
        if (preview) preview.innerHTML = '';
        if (label) label.style.display = 'flex';
        this.mascotaTieneFoto = false;
    }

    inicializarModalMascotas() {
        this.modalMascota = document.getElementById('modalMascota');

        if (!this.modalMascota) {
            console.warn('Modal de mascotas no encontrado');
            return;
        }

        // Elementos del modal
        this.btnCerrarModalMascota = document.getElementById('btnCerrarModal');
        this.btnCancelarModalMascota = document.getElementById('btnCancelarMascotaModal');
        this.btnGuardarModalMascota = document.getElementById('btnGuardarMascotaModal');
        this.fotoMascotaModal = document.getElementById('fotoMascotaModal');
        this.fotoPreviewImgModal = document.getElementById('fotoPreviewImgModal');
        this.placeholderIconModal = document.getElementById('placeholderIconModal');

        // Configurar eventos del modal
        if (this.btnCerrarModalMascota) {
            this.btnCerrarModalMascota.onclick = () => this.cerrarModalMascotas();
        }
        if (this.btnCancelarModalMascota) {
            this.btnCancelarModalMascota.onclick = () => this.cerrarModalMascotas();
        }

        // Evento para previsualizar imagen
        if (this.fotoMascotaModal) {
            this.fotoMascotaModal.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        this.fotoPreviewImgModal.src = e.target.result;
                        this.fotoPreviewImgModal.style.display = 'block';
                        if (this.placeholderIconModal) this.placeholderIconModal.style.display = 'none';
                        this.fotoDataUrlModal = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        // Cerrar modal al hacer clic fuera
        window.onclick = (event) => {
            if (event.target === this.modalMascota) {
                this.cerrarModalMascotas();
            }
        };
    }

    //modal de mascotas
    abrirModalMascotas() {
        if (!this.modalMascota) return;

        this.limpiarFormularioMascotaModal();

        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.innerText = 'Registrar Mascota';

        this.modalMascota.style.display = 'flex';
    }

    cerrarModalMascotas() {
        if (this.modalMascota) {
            this.modalMascota.style.display = 'none';
            this.limpiarFormularioMascotaModal();
        }
    }

    limpiarFormularioMascotaModal() {
        document.getElementById('mascotaId').value = '';
        document.getElementById('nombreMascotaModal').value = '';
        document.getElementById('especieMascotaModal').value = '';
        document.getElementById('generoMascotaModal').value = '';
        document.getElementById('razaMascotaModal').value = '';
        document.getElementById('coloresMascotaModal').value = '';
        document.getElementById('edadMascotaModal').value = '';
        document.getElementById('pesoMascotaModal').value = '';
        document.getElementById('microchipMascotaModal').value = '';
        document.getElementById('historialMedicoModal').value = '';

        // Resetear radio buttons
        const radios = document.getElementsByName('esterilizadoModal');
        radios.forEach(r => {
            if (r.value === 'No') r.checked = true;
        });

        // Limpiar foto
        this.fotoDataUrlModal = '';
        this.fotoPreviewImgModal.src = '';
        this.fotoPreviewImgModal.style.display = 'none';
        if (this.placeholderIconModal) this.placeholderIconModal.style.display = 'block';
        this.fotoMascotaModal.value = '';
    }

    async guardarMascotaDesdeModal() {
        const uidUsuario = auth.currentUser?.uid;
        if (!uidUsuario) {
            this.mostrarError('Debes iniciar sesión');
            return;
        }

        const nombre = document.getElementById('nombreMascotaModal').value;
        const especie = document.getElementById('especieMascotaModal').value;
        const genero = document.getElementById('generoMascotaModal').value;
        const raza = document.getElementById('razaMascotaModal').value;
        const colores = document.getElementById('coloresMascotaModal').value;
        const edad = parseFloat(document.getElementById('edadMascotaModal').value) || 0;
        const peso = parseFloat(document.getElementById('pesoMascotaModal').value) || 0;
        const microchip = document.getElementById('microchipMascotaModal').value;
        const historialMedico = document.getElementById('historialMedicoModal').value;
        const esterilizado = Array.from(document.getElementsByName('esterilizadoModal')).find(r => r.checked)?.value || 'No';

        if (!nombre) {
            this.mostrarError('El nombre de la mascota es requerido');
            return;
        }
        if (!especie) {
            this.mostrarError('La especie es requerida');
            return;
        }

        try {
            const mascota = new Mascota(
                nombre,
                raza,
                especie,
                genero,
                colores,
                edad,
                peso,
                microchip,
                esterilizado,
                historialMedico,
                uidUsuario,
                this.fotoDataUrlModal || null
            );

            const resultado = await mascota.guardar();

            if (resultado.success) {
                this.cerrarModalMascotas();

                await this.cargarMascotasUsuario();

                const select = document.getElementById('mascotaSelector');
                if (select) {
                    select.value = resultado.id;
                    await this.autocompletarConMascota(resultado.id);
                }

                this.mostrarNotificacion('Mascota registrada correctamente', 'success');
            } else {
                this.mostrarError(resultado.error || 'Error al guardar la mascota');
            }
        } catch (error) {
            console.error('Error al guardar mascota:', error);
            this.mostrarError('Error al guardar la mascota');
        }
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        // Puedes usar SweetAlert o un toast
        Swal.fire({
            title: tipo === 'success' ? 'Éxito' : 'Información',
            text: mensaje,
            icon: tipo,
            confirmButtonColor: '#667eea',
            timer: 2000,
            showConfirmButton: false
        });
    }


    async onMascotaCreada(nuevaMascota) {
        await this.cargarMascotasUsuario();

        const select = document.getElementById('mascotaSelector');
        if (select) {
            select.value = nuevaMascota.id;
            this.autocompletarConMascota(nuevaMascota.id);
        }
    }


    getDOMElements() {
        this.form = document.getElementById('citaForm');
        this.btnSubmit = document.getElementById('btnSubmit');
        this.imageInput = document.getElementById('imagenMascota');
        this.imagePreview = document.getElementById('imagePreview');
        this.fileUploadLabel = document.getElementById('fileUploadLabel');
        this.modal = document.getElementById('modalConfirmacion');
        this.proximasCitasDiv = document.getElementById('proximasCitas');
    }

    checkAuth() {
        return new Promise((resolve, reject) => {

            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();

                if (user) {
                    resolve(user);
                } else {
                    window.location.href = '/user/visitor/login/login.html';
                    reject(new Error('Usuario no autenticado'));
                }
            });
        });
    }

    mostrarError(mensaje) {
        let errorDiv = document.getElementById('error-mensaje');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error-mensaje';
            errorDiv.style.backgroundColor = '#fee';
            errorDiv.style.color = '#c00';
            errorDiv.style.padding = '10px';
            errorDiv.style.margin = '10px 0';
            errorDiv.style.borderRadius = '4px';
            errorDiv.style.textAlign = 'center';

            const container = document.querySelector('.main-container .container');
            if (container) {
                container.insertBefore(errorDiv, container.firstChild);
            }
        }

        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';

        setTimeout(() => {
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }, 5000);
    }


    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        const btnCancelar = document.getElementById('btnCancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.cancelarFormulario());
        }

        const imageInput = document.getElementById('imagenMascota');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.previewImage(e));
        }

        const veterinarioSelect = document.getElementById('veterinario');
        const fechaInput = document.getElementById('fecha');

        if (veterinarioSelect) {
            veterinarioSelect.addEventListener('change', () => {
                if (document.getElementById('fecha')?.value) {
                    this.cargarHorariosDisponibles();
                }
            });
        }

        if (fechaInput) {
            fechaInput.addEventListener('change', () => {
                if (document.getElementById('veterinario')?.value) {
                    this.cargarHorariosDisponibles();
                }
            });
        }

        const horaSelect = document.getElementById('hora');

        if (fechaInput) {
            fechaInput.addEventListener('change', () => this.verificarDisponibilidad());
        }

        if (horaSelect) {
            horaSelect.addEventListener('change', () => this.verificarDisponibilidad());
        }

        const mascotaSelector = document.getElementById('mascotaSelector');
        if (mascotaSelector) {
            mascotaSelector.addEventListener('change', () => this.onMascotaSelectorChange());
        }

        const problemaSaludInput = document.getElementById('problemaSalud');
        if (problemaSaludInput) {
            problemaSaludInput.addEventListener('input', () => this.onProblemaChange());
        }

        // Escuchar evento de mascota creada desde el modal
        window.addEventListener('mascotaCreada', (event) => {
            if (event.detail && event.detail.mascota) {
                this.onMascotaCreada(event.detail.mascota);
            }
        });


    }

    setMinDate() {
        const fechaInput = document.getElementById('fecha');
        if (fechaInput) {
            const hoy = new Date();
            const año = hoy.getFullYear();
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const dia = String(hoy.getDate()).padStart(2, '0');
            fechaInput.min = `${año}-${mes}-${dia}`;
        }
    }


    async cargarVeterinarios() {

        const select = document.getElementById('veterinario');
        if (!select) {
            return;
        }

        try {
            const result = await this.vetModel.obtenerVeterinarios();

            if (!result.success) {
                select.innerHTML = '<option value="">Error al cargar veterinarios</option>';
                return;
            }

            this.veterinarios = result.data;

            if (this.veterinarios.length === 0) {
                select.innerHTML = '<option value="">No hay veterinarios disponibles</option>';
                return;
            }

            let options = '<option value="">Selecciona un veterinario</option>';

            this.veterinarios.forEach(vet => {
                const selected = (vet.id === this.vetSeleccionado) ? 'selected' : '';
                const ratingText = vet.rating > 0 ? `★ ${vet.rating.toFixed(1)}` : '';
                options += `<option value="${vet.id}" ${selected}>${vet.nombre} - ${vet.nombreClinica} ${ratingText}</option>`;
            });

            select.innerHTML = options;

            if (this.vetSeleccionado) {
                sessionStorage.removeItem('vetSeleccionado');
            }

        } catch (error) {
            select.innerHTML = '<option value="">Error al cargar</option>';
        }
    }


    // mostrarUsuario() {
    //     const userEmailSpan = document.getElementById('userEmail');
    //     if (userEmailSpan && auth.currentUser) {
    //         userEmailSpan.textContent = auth.currentUser.email;
    //     }
    // }

    async handleSubmit(e) {
        e.preventDefault();


        if (!this.validarFormulario()) {
            return;
        }

        this.setSubmitButtonState(true);

        try {
            const veterinarioId = document.getElementById('veterinario')?.value;
            const fecha = document.getElementById('fecha')?.value;
            const hora = document.getElementById('hora')?.value;
            const nombreMascota = document.getElementById('nombreMascota')?.value;
            const especie = document.getElementById('especie')?.value;
            const raza = document.getElementById('raza')?.value;
            const genero = document.getElementById('genero')?.value;
            const edad = document.getElementById('edad')?.value;
            const enfermedades = document.getElementById('enfermedades')?.value;
            const problemaSalud = document.getElementById('problemaSalud')?.value;
            const imagenFile = document.getElementById('imagenMascota')?.files[0];

            if (!veterinarioId || !fecha || !hora) {
                alert('Por favor completa todos los campos requeridos');
                this.setSubmitButtonState(false);
                return;
            }


            const disponible = await this.citasModel.verificarDisponibilidadHorario(
                veterinarioId,
                fecha,
                hora
            );

            if (!disponible) {
                alert('Lo sentimos, el horario seleccionado ya no está disponible. Por favor elige otro.');
                this.cargarHorariosDisponibles();
                this.setSubmitButtonState(false);
                return;
            }

            const vetSeleccionado = this.veterinarios?.find(v => v.id === veterinarioId);
            const veterinarioNombre = vetSeleccionado ? vetSeleccionado.nombre : 'Veterinario';

            const datosCita = {
                veterinarioId: veterinarioId,
                veterinarioNombre: veterinarioNombre,
                mascotaId: document.getElementById('mascotaId').value || null,
                mascotaSnapshot: this.mascotaSeleccionada ? { // NUEVO: respaldo de datos
                    nombre: this.mascotaSeleccionada.nombre,
                    especie: this.mascotaSeleccionada.especie,
                    raza: this.mascotaSeleccionada.raza,
                    genero: this.mascotaSeleccionada.genero,
                    edad: this.mascotaSeleccionada.edad,
                    historialMedico: this.mascotaSeleccionada.historialMedico
                } : null,
                fecha: fecha,
                hora: hora,
                nombreMascota: nombreMascota,
                especie: especie,
                raza: raza,
                genero: genero,
                edad: edad,
                enfermedades: enfermedades || '',
                problemaSalud: problemaSalud,
                estado: 'pendiente'
            };


            const resultado = await this.citasModel.crearCitaConTransaccion(datosCita, imagenFile);

            if (resultado.success) {
                this.mostrarModalExito();
                this.form.reset();
                if (this.imagePreview) {
                    this.imagePreview.innerHTML = '';
                }
                if (this.fileUploadLabel) {
                    this.fileUploadLabel.style.display = 'flex';
                }
                await this.cargarProximasCitas();
            } else {
                alert('Error al agendar la cita: ' + resultado.error);
            }
        } catch (error) {
            alert('Ocurrió un error al procesar la solicitud. Por favor intenta de nuevo.');
        } finally {
            this.setSubmitButtonState(false);
        }
    }

    validarFormulario() {
        const camposRequeridos = [
            'nombreMascota', 'especie', 'raza', 'genero',
            'edad', 'problemaSalud', 'fecha', 'hora'
        ];

        for (const campo of camposRequeridos) {
            const input = document.getElementById(campo);
            if (!input || !input.value) {
                alert(`Por favor completa el campo ${this.getNombreCampo(campo)}`);
                if (input) input.focus();
                return false;
            }
        }

        if (!this.imageInput || !this.imageInput.files[0]) {
            alert('Por favor selecciona una foto de tu mascota');
            return false;
        }

        const imagenFile = this.imageInput.files[0];
        if (imagenFile.size > 5 * 1024 * 1024) {
            alert('La imagen no debe superar los 5MB');
            return false;
        }

        const terminos = document.getElementById('terminos');
        if (!terminos || !terminos.checked) {
            alert('Debes aceptar los términos y condiciones');
            return false;
        }

        return true;
    }

    getNombreCampo(campo) {
        const nombres = {
            nombreMascota: 'nombre de la mascota',
            especie: 'especie',
            raza: 'raza',
            genero: 'género',
            edad: 'edad',
            problemaSalud: 'problema de salud',
            fecha: 'fecha',
            hora: 'hora'
        };
        return nombres[campo] || campo;
    }

    setSubmitButtonState(disabled) {
        if (!this.btnSubmit) return;

        const btnText = this.btnSubmit.querySelector('.btn-text');
        const btnLoading = this.btnSubmit.querySelector('.btn-loading');

        this.btnSubmit.disabled = disabled;

        if (btnText && btnLoading) {
            if (disabled) {
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline';
            } else {
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
            }
        }
    }

    previewImage(e) {
        const file = e.target.files[0];
        if (file && this.imagePreview && this.fileUploadLabel) {
            const reader = new FileReader();

            reader.onload = (e) => {
                this.imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; border-radius: 8px;">`;
                this.fileUploadLabel.style.display = 'none';
            };

            reader.readAsDataURL(file);
        }
    }


    async cargarHorariosDisponibles() {

        const veterinarioId = document.getElementById('veterinario')?.value;
        const fecha = document.getElementById('fecha')?.value;
        const horaSelect = document.getElementById('hora');

        if (!horaSelect) {
            return;
        }

        // Validaciones
        if (!veterinarioId) {
            horaSelect.innerHTML = '<option value="">Primero selecciona un veterinario</option>';
            return;
        }

        if (!fecha) {
            horaSelect.innerHTML = '<option value="">Primero selecciona una fecha</option>';
            return;
        }

        if (!this.veterinarios || this.veterinarios.length === 0) {
            await this.cargarVeterinarios();

            if (!this.veterinarios || this.veterinarios.length === 0) {
                horaSelect.innerHTML = '<option value="">Error: No hay veterinarios disponibles</option>';
                return;
            }
        }

        try {
            horaSelect.innerHTML = '<option value="">Cargando horarios...</option>';
            horaSelect.disabled = true;

            const vetSeleccionado = this.veterinarios.find(v => v.id === veterinarioId);

            if (!vetSeleccionado) {
                horaSelect.innerHTML = '<option value="">Error: Veterinario no encontrado</option>';
                horaSelect.disabled = false;
                return;
            }


            if (!vetSeleccionado.horarioSemanal || vetSeleccionado.horarioSemanal.length === 0) {
                horaSelect.innerHTML = '<option value="">El veterinario no tiene horario configurado</option>';
                horaSelect.disabled = false;
                return;
            }

            const horariosOcupados = await this.citasModel.obtenerHorariosOcupados(veterinarioId, fecha);

            const horariosDisponibles = this.generarHorarios(vetSeleccionado, horariosOcupados);

            let options = '<option value="">Selecciona una hora</option>';

            if (horariosDisponibles.length === 0) {
                options = '<option value="">No hay horarios disponibles para esta fecha</option>';
            } else {
                horariosDisponibles.forEach(hora => {
                    options += `<option value="${hora}">${hora}</option>`;
                });
            }

            horaSelect.innerHTML = options;
            horaSelect.disabled = false;

        } catch (error) {
            console.error('Error al cargar horarios:', error);
            horaSelect.innerHTML = '<option value="">Error al cargar horarios</option>';
            horaSelect.disabled = false;
        }
    }

    generarHorarios(vet, horariosOcupados = []) {

        if (!vet || !vet.horarioSemanal) {
            return [];
        }

        const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
        const fechaInput = document.getElementById('fecha')?.value;

        if (!fechaInput) {
            return [];
        }

        const fecha = new Date(fechaInput);
        const diaSemana = dias[fecha.getDay()];


        const horarioDia = vet.horarioSemanal.find(h => h.dia === diaSemana);

        if (!horarioDia || !horarioDia.activo) {
            return [];
        }


        const duracion = vet.duracionCita || 30;
        const horarios = [];

        const [horaInicio, minInicio] = horarioDia.apertura.split(':').map(Number);
        const [horaFin, minFin] = horarioDia.cierre.split(':').map(Number);

        let horaActual = horaInicio;
        let minActual = minInicio;

        while (horaActual < horaFin || (horaActual === horaFin && minActual < minFin)) {
            const horaStr = `${horaActual.toString().padStart(2, '0')}:${minActual.toString().padStart(2, '0')}`;

            if (!horariosOcupados.includes(horaStr)) {
                horarios.push(horaStr);
            }

            minActual += duracion;
            if (minActual >= 60) {
                horaActual += Math.floor(minActual / 60);
                minActual = minActual % 60;
            }
        }

        return horarios;
    }


    async verificarDisponibilidad() {
        if (!this.citasModel) return;

        const fecha = document.getElementById('fecha')?.value;
        const hora = document.getElementById('hora')?.value;

        if (fecha && hora) {
            const disponibilidad = await this.citasModel.verificarDisponibilidad(fecha, hora);

            const horaSelect = document.getElementById('hora');
            if (horaSelect) {
                if (!disponibilidad.disponible) {
                    horaSelect.style.borderColor = '#e53e3e';
                } else {
                    horaSelect.style.borderColor = '#48bb78';
                }
            }
        }
    }

    async cargarProximasCitas() {
        if (!this.citasModel || !this.proximasCitasDiv) {
            return;
        }

        try {
            const resultado = await this.citasModel.obtenerCitasUsuario();

            if (resultado.success) {
                const citas = resultado.data;

                if (citas.length === 0) {
                    this.proximasCitasDiv.innerHTML = '<p class="loading-citas">No tienes citas agendadas</p>';
                    return;
                }

                const hoy = new Date();
                const añoActual = hoy.getFullYear();
                const mesActual = String(hoy.getMonth() + 1).padStart(2, '0');
                const diaActual = String(hoy.getDate()).padStart(2, '0');
                const fechaActualStr = `${añoActual}-${mesActual}-${diaActual}`;

                const horaActual = hoy.getHours().toString().padStart(2, '0');
                const minutosActual = hoy.getMinutes().toString().padStart(2, '0');
                const horaActualStr = `${horaActual}:${minutosActual}`;


                const citasFuturas = citas.filter(cita => {
                    if (cita.estado === 'cancelada') {
                        return false;
                    }

                    if (!cita.fecha || !cita.hora) {
                        return false;
                    }

                    if (cita.fecha > fechaActualStr) {
                        return true;
                    } else if (cita.fecha === fechaActualStr) {
                        return cita.hora > horaActualStr;
                    } else {
                        return false;
                    }
                });


                const citasOrdenadas = citasFuturas.sort((a, b) => {
                    if (a.fecha !== b.fecha) {
                        return a.fecha.localeCompare(b.fecha);
                    }
                    return a.hora.localeCompare(b.hora);
                }).slice(0, 3);


                if (citasOrdenadas.length === 0) {
                    this.proximasCitasDiv.innerHTML = '<p class="loading-citas">No tienes citas próximas</p>';
                    return;
                }

                let html = '';
                citasOrdenadas.forEach(cita => {
                    try {
                        const [año, mes, dia] = cita.fecha.split('-');
                        const fechaObj = new Date(año, mes - 1, dia);
                        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });

                        const horaMostrar = cita.hora.endsWith(':00') ? cita.hora.slice(0, -3) : cita.hora;

                        html += `
                        <div class="cita-item">
                            <div class="cita-fecha">${fechaFormateada} - ${horaMostrar}</div>
                            <div class="cita-mascota">${cita.nombreMascota || 'Mascota'} (${cita.especie || 'Mascota'})</div>
                            <span class="cita-estado estado-${cita.estado || 'pendiente'}">${cita.estado || 'pendiente'}</span>
                        </div>
                    `;
                    } catch (error) {
                        console.error('Error al formatear cita:', cita, error);
                    }
                });

                this.proximasCitasDiv.innerHTML = html;
            } else {
                console.error('Error al obtener citas:', resultado.error);
                this.proximasCitasDiv.innerHTML = '<p class="loading-citas">Error al cargar las citas</p>';
            }
        } catch (error) {
            console.error('Error en cargarProximasCitas:', error);
            if (this.proximasCitasDiv) {
                this.proximasCitasDiv.innerHTML = '<p class="loading-citas">Error al cargar citas</p>';
            }
        }
    }

    mostrarModalExito() {
        if (this.modal) {
            this.modal.style.display = 'flex';

            setTimeout(() => {
                this.cerrarModal();
            }, 5000);
        }
    }

    cerrarModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    onProblemaChange() {
        clearTimeout(this._aiDebounceTimer);
        const descripcion = document.getElementById('problemaSalud')?.value?.trim();
        const section = document.getElementById('ai-recomendacion-section');
        if (!section) return;

        if (!descripcion || descripcion.length < 15) {
            section.style.display = 'none';
            return;
        }

        const loading = document.getElementById('ai-loading');
        const result = document.getElementById('ai-result');
        section.style.display = 'block';
        if (loading) loading.style.display = 'flex';
        if (result) result.style.display = 'none';

        this._aiDebounceTimer = setTimeout(() => this.consultarIA(descripcion), 2000);
    }

    async consultarIA(descripcion) {
        try {
            const infoPet = {
                especie: document.getElementById('especie')?.value,
                raza: document.getElementById('raza')?.value,
                edad: document.getElementById('edad')?.value,
                enfermedades: document.getElementById('enfermedades')?.value,
            };

            // Extraer especialidades únicas de los veterinarios ya cargados desde Firestore
            const especialidadesDisponibles = [
                ...new Set(this.veterinarios.flatMap(v => v.especialidades || []))
            ];

            const { recomendacion, especialidades, urgente, fuera_de_tema } = await obtenerRecomendacionIA(descripcion, infoPet, especialidadesDisponibles);

            if (fuera_de_tema) {
                const section = document.getElementById('ai-recomendacion-section');
                const loading = document.getElementById('ai-loading');
                if (loading) loading.style.display = 'none';
                if (section) section.innerHTML = `<p class="ai-error-msg"><i class="fas fa-paw"></i> ${recomendacion}</p>`;
                return;
            }

            this.mostrarRecomendacionIA(recomendacion, especialidades || [], urgente);
        } catch (error) {
            console.error('Error consultando IA:', error);
            const loading = document.getElementById('ai-loading');
            if (loading) loading.style.display = 'none';

            const section = document.getElementById('ai-recomendacion-section');
            const msgs = {
                QUOTA_EXCEEDED: 'Límite de IA alcanzado. Intenta en unos segundos.',
                INVALID_KEY:    'API key de Gemini inválida. Revisa la configuración.',
                MODEL_NOT_FOUND:'Modelo de IA no disponible. Revisa tu API key.',
            };
            const texto = msgs[error.message] || 'No se pudo obtener recomendación de IA.';
            if (section) section.innerHTML = `<p class="ai-error-msg"><i class="fas fa-exclamation-circle"></i> ${texto}</p>`;
        }
    }

    mostrarRecomendacionIA(recomendacion, especialidades, urgente) {
        const loading = document.getElementById('ai-loading');
        const result = document.getElementById('ai-result');
        const texto = document.getElementById('ai-recomendacion-texto');
        const urgenteBadge = document.getElementById('ai-urgente-badge');
        const vetsList = document.getElementById('ai-vets-list');

        if (loading) loading.style.display = 'none';
        if (result) result.style.display = 'block';
        if (texto) texto.textContent = recomendacion;
        if (urgenteBadge) urgenteBadge.style.display = urgente ? 'inline-flex' : 'none';
        if (!vetsList) return;

        const vetsFiltrados = this.veterinarios.filter(vet => {
            const esps = vet.especialidades || [];
            return especialidades.some(e => esps.includes(e)) || esps.length === 0;
        });

        if (vetsFiltrados.length === 0) {
            vetsList.innerHTML = '<p class="ai-no-vets">No se encontraron veterinarios con esa especialidad.</p>';
            return;
        }

        vetsList.innerHTML = vetsFiltrados.map(vet => `
            <div class="ai-vet-card" onclick="document.getElementById('veterinario').value='${vet.id}'; document.querySelectorAll('.ai-vet-card').forEach(c=>c.classList.remove('selected')); this.classList.add('selected')">
                <div class="ai-vet-foto">
                    ${vet.foto ? `<img src="${vet.foto}" alt="${vet.nombre}">` : '<i class="fas fa-user-md"></i>'}
                </div>
                <div class="ai-vet-info">
                    <strong>${vet.nombre}</strong>
                    <span class="ai-vet-clinica">${vet.nombreClinica}</span>
                    <span class="ai-vet-esp">${vet.specialty}</span>
                    ${vet.rating > 0 ? `<span class="ai-vet-rating">★ ${vet.rating.toFixed(1)}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    cancelarFormulario() {
        if (confirm('¿Estás seguro de que quieres cancelar? Los datos no guardados se perderán.')) {
            if (this.form) {
                this.form.reset();
            }
            if (this.imagePreview) {
                this.imagePreview.innerHTML = '';
            }
            if (this.fileUploadLabel) {
                this.fileUploadLabel.style.display = 'flex';
            }
            window.location.href = '/user/visitor/citas/citas.html';
        }
    }

}

document.addEventListener('DOMContentLoaded', () => {
    window.citasController = new CitasController();
});

window.cerrarModal = () => {
    if (window.citasController) {
        window.citasController.cerrarModal();
    }
};