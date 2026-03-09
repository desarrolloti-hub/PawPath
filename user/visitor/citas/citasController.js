// citasController.js
import { auth } from '/config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import Citas from '/classes/Citas.js';

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

        this.initialize();
    }

    async initialize() {
        try {
            // Verificar autenticación primero
            await this.checkAuth();

            // Inicializar el modelo después de verificar auth
            this.citasModel = new Citas();

            // Obtener referencias del DOM
            this.getDOMElements();

            // Configurar event listeners
            this.setupEventListeners();

            // Establecer fecha mínima
            this.setMinDate();

            // Cargar citas próximas
            await this.cargarProximasCitas();

            // Mostrar email del usuario
            this.mostrarUsuario();

            this.initialized = true;

        } catch (error) {
            console.error('Error al inicializar el controlador:', error);
            this.mostrarError('Error al cargar la página. Por favor recarga.');
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
            onAuthStateChanged(auth, (user) => {
                if (!user) {
                    window.location.href = '/user/visitor/login/login.html';
                    reject(new Error('Usuario no autenticado'));
                } else {
                    resolve(user);
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

        if (this.imageInput) {
            this.imageInput.addEventListener('change', (e) => this.previewImage(e));
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        const fechaInput = document.getElementById('fecha');
        const horaSelect = document.getElementById('hora');

        if (fechaInput) {
            fechaInput.addEventListener('change', () => this.verificarDisponibilidad());
        }

        if (horaSelect) {
            horaSelect.addEventListener('change', () => this.verificarDisponibilidad());
        }
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

    mostrarUsuario() {
        const userEmailSpan = document.getElementById('userEmail');
        if (userEmailSpan && auth.currentUser) {
            userEmailSpan.textContent = auth.currentUser.email;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.initialized || !this.citasModel) {
            this.mostrarError('El sistema no está inicializado. Por favor recarga la página.');
            return;
        }

        if (!this.validarFormulario()) {
            return;
        }

        this.setSubmitButtonState(true);

        try {
            const datosCita = {
                nombreMascota: document.getElementById('nombreMascota').value,
                especie: document.getElementById('especie').value,
                raza: document.getElementById('raza').value,
                genero: document.getElementById('genero').value,
                edad: document.getElementById('edad').value,
                enfermedades: document.getElementById('enfermedades').value,
                problemaSalud: document.getElementById('problemaSalud').value,
                fecha: document.getElementById('fecha').value,
                hora: document.getElementById('hora').value
            };

            const imagenFile = this.imageInput.files[0];

            // Verificar disponibilidad
            const disponibilidad = await this.citasModel.verificarDisponibilidad(
                datosCita.fecha,
                datosCita.hora
            );

            if (!disponibilidad.disponible) {
                alert('Lo sentimos, este horario no está disponible. Por favor selecciona otro.');
                this.setSubmitButtonState(false);
                return;
            }

            // Crear la cita
            const resultado = await this.citasModel.crearCita(datosCita, imagenFile);

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
            console.error('Error al procesar el formulario:', error);
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
            console.log('No se pueden cargar citas: modelo o div no disponible');
            return;
        }

        try {
            console.log('Obteniendo citas del usuario...');
            const resultado = await this.citasModel.obtenerCitasUsuario();
            console.log('Resultado de citas:', resultado);

            if (resultado.success) {
                const citas = resultado.data;
                console.log(`Se encontraron ${citas.length} citas totales`);

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

                console.log('Fecha actual (local):', fechaActualStr);
                console.log('Hora actual (local):', horaActualStr);

                const citasFuturas = citas.filter(cita => {
                    if (cita.estado === 'cancelada') {
                        return false;
                    }

                    if (!cita.fecha || !cita.hora) {
                        return false;
                    }

                    // Comparar fechas como strings en formato YYYY-MM-DD
                    if (cita.fecha > fechaActualStr) {
                        // Fecha futura
                        return true;
                    } else if (cita.fecha === fechaActualStr) {
                        // Misma fecha, comparar hora
                        return cita.hora > horaActualStr;
                    } else {
                        // Fecha pasada
                        return false;
                    }
                });

                console.log(`Citas futuras encontradas: ${citasFuturas.length}`);

                // Ordenar citas por fecha y hora
                const citasOrdenadas = citasFuturas.sort((a, b) => {
                    if (a.fecha !== b.fecha) {
                        return a.fecha.localeCompare(b.fecha);
                    }
                    return a.hora.localeCompare(b.hora);
                }).slice(0, 3);

                console.log('Citas a mostrar:', citasOrdenadas);

                if (citasOrdenadas.length === 0) {
                    this.proximasCitasDiv.innerHTML = '<p class="loading-citas">No tienes citas próximas</p>';
                    return;
                }

                let html = '';
                citasOrdenadas.forEach(cita => {
                    try {
                        // Formatear fecha para mostrar
                        const [año, mes, dia] = cita.fecha.split('-');
                        const fechaObj = new Date(año, mes - 1, dia);
                        const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });

                        // Formatear hora para mostrar (quitar minutos si son :00)
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
                console.log('HTML generado correctamente');
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

    async logout() {
        try {
            await auth.signOut();
            window.location.href = '/user/visitor/login/login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    }
}

// Inicializar el controlador cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.citasController = new CitasController();
});

// Funciones globales
window.cerrarModal = () => {
    if (window.citasController) {
        window.citasController.cerrarModal();
    }
};


