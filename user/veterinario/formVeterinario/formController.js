// views/veterinario/formVeterinario/formController.js
import { auth, db } from '/config/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
    collection,
    addDoc,
    setDoc,
    serverTimestamp,
    doc,
    getDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";


class FormVeterinarioController {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.veterinariosCollection = 'veterinarios';
        this.userEmail = null;
        this.userName = null;

        this.initialize();
    }

    async initialize() {
        try {
            await this.checkAuth();

            setTimeout(() => {
                this.setupEventListeners();
                this.generarHorariosPorDefecto();
                this.mostrarDatosUsuario();
                this.setupImagePreview();
            }, 200);

        } catch (error) {
            console.error('Error al inicializar:', error);
            this.mostrarNotificacion('Error al cargar el formulario', 'error');
        }
    }

    checkAuth() {
        return new Promise((resolve, reject) => {
            onAuthStateChanged(auth, (user) => {
                if (!user) {
                    window.location.href = '/user/visitor/login/login.html';
                    reject();
                } else {
                    this.userName = user.nombre_completo;
                    this.userEmail = user.email;
                    resolve(user);
                }
            });
        });
    }


    async mostrarDatosUsuario() {
        const user = auth.currentUser;
        if (!user) {
            return;
        }

        const userEmailSpan = document.getElementById('userEmail');
        if (userEmailSpan) {
            userEmailSpan.textContent = user.email;
        }

        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = user.email;
        }

        try {
            //por UID
            const userDocRef = doc(db, 'usarios', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();

                const nombresInput = document.getElementById('nombres');
                if (nombresInput && userData.nombre_completo) {
                    nombresInput.value = userData.nombre_completo;
                }

                const apellidoPatInput = document.getElementById('apellidoPat');
                if (apellidoPatInput && userData.apellido_paterno) {
                    apellidoPatInput.value = userData.apellido_paterno;
                }

                const apellidoMatInput = document.getElementById('apellidoMat');
                if (apellidoMatInput && userData.apellido_materno) {
                    apellidoMatInput.value = userData.apellido_materno;
                }

                const telefonoInput = document.getElementById('telefono');
                if (telefonoInput && userData.telefono) {
                    telefonoInput.value = userData.telefono;
                }

            } else {
                //intentar por email
                await this.buscarUsuarioPorEmail(user.email);
            }
        } catch (error) {
            this.mostrarNotificacion('Error al cargar datos del perfil', 'error');
        }
    }

    async buscarUsuarioPorEmail(email) {
        if (!email) return;

        try {

            const q = query(collection(db, 'usarios'), where('email', '==', email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                // Mapear los campos
                const nombresInput = document.getElementById('nombres');
                if (nombresInput && userData.nombre_completo) {
                    nombresInput.value = userData.nombre_completo;
                }

                const apellidoPatInput = document.getElementById('apellidoPat');
                if (apellidoPatInput && userData.apellido_paterno) {
                    apellidoPatInput.value = userData.apellido_paterno;
                }

                const apellidoMatInput = document.getElementById('apellidoMat');
                if (apellidoMatInput && userData.apellido_materno) {
                    apellidoMatInput.value = userData.apellido_materno;
                }

                const telefonoInput = document.getElementById('telefono');
                if (telefonoInput && userData.telefono) {
                    telefonoInput.value = userData.telefono;
                }

                this.mostrarNotificacion('Datos cargados correctamente', 'success');
            } else {
               }
        } catch (error) {
            console.error(error);
        }
    }

    capitalizarPrimeraLetra(texto) {
        if (!texto) return '';
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    }

    generarHorariosPorDefecto() {
        const container = document.getElementById('horariosContainer');
        const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

        const horariosDefault = {
            lunes: { activo: true, apertura: '09:00', cierre: '18:00' },
            martes: { activo: true, apertura: '09:00', cierre: '18:00' },
            miércoles: { activo: true, apertura: '09:00', cierre: '18:00' },
            jueves: { activo: true, apertura: '09:00', cierre: '18:00' },
            viernes: { activo: true, apertura: '09:00', cierre: '18:00' },
            sábado: { activo: true, apertura: '10:00', cierre: '14:00' },
            domingo: { activo: false, apertura: '09:00', cierre: '18:00' }
        };

        let html = '';
        dias.forEach(dia => {
            const config = horariosDefault[dia];
            html += `
                <div class="dia-config">
                    <h4>${dia}</h4>
                    <div class="dia-activo">
                        <input type="checkbox" id="${dia}_activo" ${config.activo ? 'checked' : ''}>
                        <label for="${dia}_activo">Atendemos este día</label>
                    </div>
                    <div class="horario-inputs">
                        <input type="time" id="${dia}_apertura" value="${config.apertura}" ${!config.activo ? 'disabled' : ''}>
                        <input type="time" id="${dia}_cierre" value="${config.cierre}" ${!config.activo ? 'disabled' : ''}>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        dias.forEach(dia => {
            const checkbox = document.getElementById(`${dia}_activo`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    const apertura = document.getElementById(`${dia}_apertura`);
                    const cierre = document.getElementById(`${dia}_cierre`);
                    apertura.disabled = !e.target.checked;
                    cierre.disabled = !e.target.checked;
                });
            }
        });
    }

    cambiarPaso(direccion) {
        const nuevoPaso = direccion === 'next' ? this.currentStep + 1 : this.currentStep - 1;

        if (nuevoPaso < 1 || nuevoPaso > this.totalSteps) return;

        if (direccion === 'next' && !this.validarPasoActual()) {
            return;
        }

        document.getElementById(`step${this.currentStep}`).classList.remove('active');

        document.getElementById(`step${nuevoPaso}`).classList.add('active');

        document.querySelectorAll('.progress-step').forEach((step, index) => {
            if (index + 1 <= nuevoPaso) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        this.currentStep = nuevoPaso;
    }

    validarPasoActual() {
        switch (this.currentStep) {
            case 1:
                return this.validarPaso1();
            case 2:
                return this.validarPaso2();
            default:
                return true;
        }
    }

    validarPaso1() {
        // const primerNombre = document.getElementById('primerNombre').value;
        const apellidoPat = document.getElementById('apellidoPat').value;
        const telefono = document.getElementById('telefono').value;
        const cedula = document.getElementById("cedula").value.trim();
            if (!/^\d{7,8}$/.test(cedula)) {
                alert("La cédula profesional debe contener únicamente 7 u 8 números.");
                return;
            } // NUEVO

        // if (!primerNombre) {
        //     this.mostrarNotificacion('Por favor ingresa tu primer nombre', 'error');
        //     return false;
        // }
        if (!apellidoPat) {
            this.mostrarNotificacion('Por favor ingresa tu apellido paterno', 'error');
            return false;
        }
        if (!telefono) {
            this.mostrarNotificacion('Por favor ingresa tu teléfono', 'error');
            return false;
        }
        if (telefono.length < 10) {
            this.mostrarNotificacion('El teléfono debe tener al menos 10 dígitos', 'error');
            return false;
        }
        if (!cedula) {
            this.mostrarNotificacion('Por favor ingresa tu cédula profesional', 'error');
            return false;
        }

        return true;
    }

    validarPaso2() {
        const nombreClinica = document.getElementById('nombreClinica').value;
        const direccion = document.getElementById('direccion').value;
        const especialidades = document.querySelectorAll('input[name="especialidades"]:checked');

        if (!nombreClinica) {
            this.mostrarNotificacion('Por favor ingresa el nombre de la clínica', 'error');
            return false;
        }
        if (!direccion) {
            this.mostrarNotificacion('Por favor ingresa la dirección', 'error');
            return false;
        }
        if (especialidades.length === 0) {
            this.mostrarNotificacion('Selecciona al menos una especialidad', 'error');
            return false;
        }

        return true;
    }

    convertirImagenABase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    setupImagePreview() {
        // foto de perfil
        const fotoPerfil = document.getElementById('fotoPerfil');
        if (fotoPerfil) {
            fotoPerfil.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // (2MB máx)
                    if (file.size > 2 * 1024 * 1024) {
                        this.mostrarNotificacion('La imagen no debe superar los 2MB', 'error');
                        e.target.value = '';
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const preview = document.getElementById('fotoPerfilPreview');
                        const label = document.getElementById('fotoPerfilLabel');
                        if (preview) {
                            preview.innerHTML = `<img src="${e.target.result}" alt="Foto de perfil">`;
                        }
                        if (label) {
                            label.style.display = 'none';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        //foto de clínica
        const fotoClinica = document.getElementById('fotoClinica');
        if (fotoClinica) {
            fotoClinica.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // (5MB máx)
                    if (file.size > 5 * 1024 * 1024) {
                        this.mostrarNotificacion('La imagen no debe superar los 5MB', 'error');
                        e.target.value = '';
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const preview = document.getElementById('fotoClinicaPreview');
                        const label = document.getElementById('fotoClinicaLabel');
                        if (preview) {
                            preview.innerHTML = `<img src="${e.target.result}" alt="Foto de clínica">`;
                        }
                        if (label) {
                            label.style.display = 'none';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validarPasoActual()) {
            return;
        }

        const submitBtn = document.getElementById('btnSubmit');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');

        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("No hay un usuario autenticado.");
            }

            // Procesar imágenes
            let fotoPerfilBase64 = null;
            let fotoClinicaBase64 = null;

            const fotoPerfilInput = document.getElementById('fotoPerfil');
            const fotoClinicaInput = document.getElementById('fotoClinica');

            if (fotoPerfilInput.files[0]) {
                fotoPerfilBase64 = await this.convertirImagenABase64(fotoPerfilInput.files[0]);
            }

            if (fotoClinicaInput.files[0]) {
                fotoClinicaBase64 = await this.convertirImagenABase64(fotoClinicaInput.files[0]);
            }
            //recoleccion de inf
            const especialidades = [];
            document.querySelectorAll('input[name="especialidades"]:checked').forEach(cb => {
                especialidades.push(cb.value);
            });

            const horarioSemanal = [];
            const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

            dias.forEach(dia => {
                const activo = document.getElementById(`${dia}_activo`)?.checked || false;
                const apertura = document.getElementById(`${dia}_apertura`)?.value || '09:00';
                const cierre = document.getElementById(`${dia}_cierre`)?.value || '18:00';

                horarioSemanal.push({
                    dia,
                    activo,
                    apertura,
                    cierre
                });
            });

            const veterinarioData = {
                primerNombre: document.getElementById('primerNombre').value,
                segundoNombre: document.getElementById('segundoNombre').value || null,
                apellidoPat: document.getElementById('apellidoPat').value,
                apellidoMat: document.getElementById('apellidoMat').value || null,
                nombreCompleto: `${document.getElementById('primerNombre').value} ${document.getElementById('segundoNombre').value || ''} ${document.getElementById('apellidoPat').value} ${document.getElementById('apellidoMat').value || ''}`.trim(),
                cedula: document.getElementById('cedula').value, // NUEVO CAMPO
                fotoPerfil: fotoPerfilBase64, // NUEVO CAMPO
                email: this.userEmail,
                telefono: document.getElementById('telefono').value,
                nombreClinica: document.getElementById('nombreClinica').value,
                direccion: document.getElementById('direccion').value,
                fotoClinica: fotoClinicaBase64, // NUEVO CAMPO
                especialidades: especialidades,
                horarioSemanal: horarioSemanal,
                duracionCita: parseInt(document.getElementById('duracionCita').value),
                diasAnticipacion: parseInt(document.getElementById('diasAnticipacion').value),
                verificado: false,
                activo: true,
                fechaRegistro: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            await setDoc(doc(db, this.veterinariosCollection, user.uid), veterinarioData);
            
            this.mostrarModalExito();

        } catch (error) {
            console.error('Error al registrar veterinario:', error);
            this.mostrarNotificacion('Error al registrar. Por favor intenta de nuevo.', 'error');
        } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    mostrarModalExito() {
        document.getElementById('modalConfirmacion').style.display = 'flex';

        setTimeout(() => {
            this.cerrarModal();
        }, 5000);
    }

    cerrarModal() {
        document.getElementById('modalConfirmacion').style.display = 'none';
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion notificacion-${tipo}`;
        notificacion.textContent = mensaje;
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${tipo === 'success' ? '#48bb78' : tipo === 'error' ? '#f56565' : '#4a90e2'};
            color: white;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notificacion);

        setTimeout(() => {
            notificacion.remove();
        }, 3000);
    }

    setupEventListeners() {
        //btn sig
        const nextButtons = document.querySelectorAll('.next-step');
        if (nextButtons.length > 0) {
            nextButtons.forEach(btn => {
                btn.addEventListener('click', () => this.cambiarPaso('next'));
            });
        }

        //btn ant
        const prevButtons = document.querySelectorAll('.prev-step');
        if (prevButtons.length > 0) {
            prevButtons.forEach(btn => {
                btn.addEventListener('click', () => this.cambiarPaso('prev'));
            });
        }

        const registroForm = document.getElementById('registroVetForm');
        if (registroForm) {
            registroForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        this.setupImagePreview();
    }


}

const formController = new FormVeterinarioController();

window.cerrarModal = () => formController.cerrarModal();

export default formController;