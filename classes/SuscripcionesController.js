import { auth, db } from '/config/firebase-config.js';
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class SuscripcionesController {
    constructor() {
        this.planLinks = {
            plus: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=5ef8450317ab4c2ca59fbe85f4a08c27", // Link del plan Plus
            multi: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=2745b2c355a14670990f13e0e02755f8" // Link del plan Multi
        };
    }

    async seleccionarPlan(tipoPlan) {
        try {
            // 1. Caso de plan gratuito básico
            if (tipoPlan === "free") {
                await this.procesarPlanGratuito();
                return;
            }

            // 2. Verificar que esté logueado
            const user = auth.currentUser;
            if (!user) {
                alert("Debes estar logueado para suscribirte a un plan de pago");
                window.location.href = "/user/visitor/login/login.html";
                return; 
            }

            // 3. Obtener el link de pago directo
            const checkoutUrl = this.planLinks[tipoPlan];
            if (!checkoutUrl) {
                throw new Error("El link del plan seleccionado no está configurado");
            }

            console.log(`Redirigiendo a Mercado Pago para el plan: ${tipoPlan}`);

            // 4. Redirigir al usuario al portal de pago de Mercado Pago
            window.location.href = checkoutUrl;

        } catch (error) {
            console.error("Error en SuscripcionesController:", error);
            alert("No se pudo iniciar el proceso de cobro: " + error.message);
        }
    }

    async procesarPlanGratuito() {
        const user = auth.currentUser;
        if (!user) {
            alert("¡Te has suscrito al plan Base siempre gratis!");
            return;
        }

        try {
            const userRef = doc(db, 'usarios', user.uid);
            await updateDoc(userRef, {
                plan: 'free',
                fechaActualizacionPlan: serverTimestamp()
            });

            alert("¡Tu plan se ha actualizado a Base (siempre gratis) con éxito!");
            window.location.reload();
        } catch (error) {
            console.error("Error al actualizar plan gratuito en Firebase:", error);
            alert("Suscrito al plan Base localmente. Error al guardar en base de datos: " + error.message);
        }
    }
}

export const suscripcionesController = new SuscripcionesController();