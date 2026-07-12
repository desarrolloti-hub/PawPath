// /user/visitor/perfil.js
import { auth, db } from '/config/firebase-config.js';
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

class PerfilController {
    constructor() {
        this.uidUsuarioActual = null;
        this.init();
    }

    async init() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.uidUsuarioActual = user.uid;
                
                // 1. Verificar si viene regresando de un pago de Mercado Pago
                await this.procesarRetornoPago(user);

                // 2. Cargar los datos del perfil
                await this.cargarDatosPerfil(user);
            } else {
                // Redirigir al login si no está logueado
                window.location.href = "/user/visitor/login/login.html";
            }
        });
    }

    /**
     * Carga y renderiza los datos del usuario desde Firestore (soporta colecciones 'usarios' y 'usuarios').
     */
    async cargarDatosPerfil(user) {
        try {
            let userData = null;
            let collectionName = 'usarios';

            // Intentar cargar de 'usarios' (con typo, usado en registro normal)
            let userDoc = await getDoc(doc(db, 'usarios', user.uid));
            
            if (userDoc.exists()) {
                userData = userDoc.data();
            } else {
                // Intentar cargar de 'usuarios' (usado en registro Google)
                userDoc = await getDoc(doc(db, 'usuarios', user.uid));
                if (userDoc.exists()) {
                    userData = userDoc.data();
                    collectionName = 'usuarios';
                }
            }

            if (!userData) {
                console.error("No se encontró el documento del usuario.");
                return;
            }

            // Guardar los datos actualizados en localStorage para que el Navbar los lea
            localStorage.setItem('userFullData', JSON.stringify({
                uid: user.uid,
                ...userData
            }));

            // Renderizar datos del perfil
            const nombreCompleto = userData.nombre_completo || `${userData.primer_nombre || ''} ${userData.apellido_paterno || ''}`.trim() || 'Usuario';
            
            document.getElementById('userNameTitle').textContent = nombreCompleto;
            document.getElementById('profileFullName').textContent = nombreCompleto;
            document.getElementById('profileEmail').textContent = userData.email || user.email;
            document.getElementById('userEmailSub').textContent = userData.email || user.email;
            document.getElementById('userRoleBadge').textContent = (userData.rol || 'visitante').toUpperCase();

            // Poner la inicial del nombre en el círculo del avatar grande
            const avatarLarge = document.getElementById('avatarLarge');
            if (avatarLarge) {
                avatarLarge.textContent = nombreCompleto.charAt(0).toUpperCase();
            }

            // Formatear fecha de registro
            if (userData.fecha_registro) {
                const date = userData.fecha_registro.toDate ? userData.fecha_registro.toDate() : new Date(userData.fecha_registro);
                document.getElementById('profileRegisterDate').textContent = date.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            } else {
                document.getElementById('profileRegisterDate').textContent = 'No disponible';
            }

            // Renderizar el plan
            this.renderizarPlan(userData.plan || 'free', collectionName);

        } catch (error) {
            console.error("Error al cargar datos del perfil:", error);
        }
    }

    /**
     * Renderiza el estado del plan e ilumina la card del plan correspondiente.
     */
    renderizarPlan(plan, collectionName) {
        const planBadge = document.getElementById('planBadge');
        const planDescription = document.getElementById('planDescription');
        const planActionsContainer = document.getElementById('planActionsContainer');

        // Limpiar clases activas de las tarjetas de comparación
        document.getElementById('comp-card-free').classList.remove('active-plan');
        document.getElementById('comp-card-plus').classList.remove('active-plan');
        document.getElementById('comp-card-multi').classList.remove('active-plan');

        if (plan === 'plus') {
            planBadge.textContent = "NIVEL PLUS";
            planBadge.className = "plan-badge-large plan-plus";
            planDescription.textContent = "Plan Plus activo. Tienes soporte para hasta 2 mascotas, expediente digital y chat con veterinarios.";
            document.getElementById('comp-card-plus').classList.add('active-plan');
            
            planActionsContainer.innerHTML = `
                <button class="btn-cancel-plan" id="btnCancelPlan">Cancelar Suscripción</button>
            `;
        } else if (plan === 'multi') {
            planBadge.textContent = "NIVEL MULTI";
            planBadge.className = "plan-badge-large plan-multi";
            planDescription.textContent = "Plan Multi activo. Tienes soporte para 3+ mascotas (ilimitadas), recetas electrónicas y agenda premium.";
            document.getElementById('comp-card-multi').classList.add('active-plan');
            
            planActionsContainer.innerHTML = `
                <button class="btn-cancel-plan" id="btnCancelPlan">Cancelar Suscripción</button>
            `;
        } else {
            // Plan Base (Free)
            planBadge.textContent = "PLAN BASE (GRATIS)";
            planBadge.className = "plan-badge-large plan-free";
            planDescription.textContent = "Plan Base activo. Tienes acceso al registro de 1 mascota, foro comunitario y alertas básicas.";
            document.getElementById('comp-card-free').classList.add('active-plan');
            
            planActionsContainer.innerHTML = `
                <a href="/index.html#planes" class="btn-upgrade-plan">Mejorar Plan</a>
            `;
        }

        // Listener para cancelar plan
        const btnCancel = document.getElementById('btnCancelPlan');
        if (btnCancel) {
            btnCancel.onclick = () => this.cancelarSuscripcion(collectionName);
        }
    }

    /**
     * Cancela la suscripción del usuario devolviéndolo al plan gratuito.
     */
    async cancelarSuscripcion(collectionName) {
        const confirm = await Swal.fire({
            title: '¿Confirmas la cancelación?',
            text: "Volverás al plan Base gratuito y se aplicarán los límites correspondientes.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Sí, cancelar plan',
            cancelButtonText: 'Mantener plan'
        });

        if (confirm.isConfirmed) {
            try {
                Swal.showLoading();
                const docRef = doc(db, collectionName, this.uidUsuarioActual);
                await updateDoc(docRef, {
                    plan: 'free',
                    fechaActualizacionPlan: serverTimestamp()
                });

                // Actualizar localStorage
                const fullData = JSON.parse(localStorage.getItem('userFullData') || '{}');
                fullData.plan = 'free';
                localStorage.setItem('userFullData', JSON.stringify(fullData));

                await Swal.fire('Cancelado', 'Tu suscripción se ha cancelado con éxito y has vuelto al plan gratuito.', 'success');
                window.location.reload();
            } catch (error) {
                console.error("Error al cancelar suscripción:", error);
                Swal.fire('Error', 'No se pudo cancelar el plan: ' + error.message, 'error');
            }
        }
    }

    /**
     * Revisa si el usuario viene de un redireccionamiento exitoso de Mercado Pago
     * y actualiza el plan en Firestore de forma automática.
     */
    async procesarRetornoPago(user) {
        const urlParams = new URLSearchParams(window.location.search);
        const planAdquirido = urlParams.get('plan'); // 'plus' o 'multi'
        const status = urlParams.get('status'); // 'authorized' o 'approved'

        if (planAdquirido && (status === 'authorized' || status === 'approved')) {
            try {
                // Evitar reprocesamientos infinitos limpiando la URL
                window.history.replaceState({}, document.title, window.location.pathname);

                Swal.fire({
                    title: '¡Procesando tu pago!',
                    text: 'Espera un momento mientras actualizamos tu cuenta...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                // Intentar guardar en ambas colecciones por seguridad
                const docRefTypo = doc(db, 'usarios', user.uid);
                const docRefNormal = doc(db, 'usuarios', user.uid);

                let guardado = false;

                try {
                    await updateDoc(docRefTypo, {
                        plan: planAdquirido,
                        fechaActualizacionPlan: serverTimestamp()
                    });
                    guardado = true;
                } catch (e) {
                    console.log("No se pudo actualizar en 'usarios', intentando en 'usuarios'...");
                }

                if (!guardado) {
                    await updateDoc(docRefNormal, {
                        plan: planAdquirido,
                        fechaActualizacionPlan: serverTimestamp()
                    });
                }

                await Swal.fire({
                    title: '¡Suscripción Activada!',
                    text: `Gracias por tu pago. Tu cuenta ha sido actualizada al plan: ${planAdquirido.toUpperCase()}`,
                    icon: 'success',
                    confirmButtonText: 'Ir a mi perfil'
                });

            } catch (error) {
                console.error("Error al actualizar plan tras el retorno de pago:", error);
                Swal.fire('Error de sincronización', 'No pudimos registrar tu plan automáticamente. Por favor contacta a soporte.', 'error');
            }
        }
    }
}

// Inicializar el controlador
new PerfilController();
