import { MERCADOPAGO_API_IKEY } from "/config/mercadopago-config.js";

class MercadoPagoServie {
    constructor() {
        this.accesToken = MERCADOPAGO_API_IKEY;
        this.baseUrl = 'https://api.mercadopago.com';
    }
    async crearPlan({ razon, monto, frecuencia = 1, tipoFrecuencia = 'meses', backUrl }) {
        try {
            const response = await fetch(`${this.baseUrl}/preapproval_plan`, {
                method='POST',
                headers: {
                    'content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accesToken}`
                },
                body: JSON.stringify({
                    razon,
                    auto_recurring: {
                        frecuencia,
                        frecuency_type: tipoFrecuencia,
                        transaction_mount: monto,
                        currency_id: 'MXN'
                    },
                    back_url: backUrl
                })
            });
            if (response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error${response.status} de Mercado pago`);
            }
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('Error al crear plan', error);
            return { success: false, error: error.message };
        }
    }
    async crearSuscipcion({ planId, payerEmail, backUrl }) {
        try {
            const response = await fetch(`${this.baseUrl}/preapproval_plan`, {
                method='POST',
                headers: {
                    'content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accesToken}`
                },
                body: JSON.stringify({
                    preapproval_plan_id: planId,
                    payer_email: payerEmail,
                    back_url: backUrl,
                    status: 'pendiente'
                })
            });
            if (response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error${response.status} de Mercado pago`);
            }
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            console.error('Error al crear suscripción:', error);
            return { success: false, error: error.message };
        }
    }
    async obtenerSuuscripcion(id) {
        try {
            const response = await fetch(`${this, this.baseUrl}/preapproval/${id}`, {
                method='GET',
                headers: {
                    'Auhtoriztion': `Bearer${this.accesToken}`
                }
            });
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    async cancelarSuscripcion(id) {
        try {
            const response = await fetch(`${this.baseUrl}/preapproval/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({ status: 'cancelled' })
            });
            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}
export default MercadoPagoServie;