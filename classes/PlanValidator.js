class PlanValidator {

    obtenerPlanActual() {
        try {
            const fulData = localStorage.getItem('userFullData');
            if (fulData) {
                const userData = JSON.parse(fulData);
                return userData.plan || 'free';
            }

        } catch (error) {
            console.log("Error al obtener el plan: ", error);
        }
        return 'free';
    }

    mostrarAlertaBloqueo(planRequerido, beneficio) {
        // @ts-ignore
        Swal.fire({
            title: 'Función Exclusiva',
            text: `El beneficio "${beneficio}" está disponible a partir del Plan ${planRequerido.toUpperCase()}. Mejora tu plan para acceder a esta y otras funciones.`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Ver Planes / Perfil',
            cancelButtonText: 'Entendido',
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                // Redirige al perfil donde se gestionan los planes
                window.location.href = '/user/visitor/perfilUser/perfil.html';
            }
        });
    }
    accederAexpediente() {
        const plan = this.obtenerPlanActual();
        if (plan == 'plus' || plan == 'multi') {
            return true;
        }
        this.mostrarAlertaBloqueo('Plus', 'Expediente Dogital de Mascotas');
        return false;
    }
    accederAlChat() {
        const plan = this.obtenerPlanActual();
        if (plan == 'plus' || plan == 'multi') {
            return true;
        }
        this.mostrarAlertaBloqueo('Plus', 'Chat directo con Veterinarios');
        return false;
    }
    accederRecetas() {
        const plan = this.obtenerPlanActual();
        if (plan === 'multi') {
            return true;
        }
        this.mostrarAlertaBloqueo('Multi', 'Recetas Electrónicas y Medicación');
        return false;
    }
    accederAgendaPremium() {
        const plan = this.obtenerPlanActual();
        if (plan === 'multi') {
            return true;
        }
        this.mostrarAlertaBloqueo('Multi', 'Agenda Premium de Citas');
        return false;
    }

    puedeRegistrarMascota(totalMascotasExistentes) {
        const plan = this.obtenerPlanActual();
        
        if (plan === 'free' && totalMascotasExistentes >= 1) {
            Swal.fire({
                title: 'Límite de Mascotas Alcanzado',
                text: 'El Plan Base gratuito solo te permite registrar 1 mascota. Mejora tu plan para agregar más.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ver Planes',
                cancelButtonText: 'Entendido',
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#6b7280'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/user/visitor/perfilUser/perfil.html';
                }
            });
            return false;
        }

        if (plan === 'plus' && totalMascotasExistentes >= 2) {
            Swal.fire({
                title: 'Límite de Mascotas Alcanzado',
                text: 'El Plan Plus te permite registrar hasta 2 mascotas. Mejora al Plan Multi para agregar ilimitadas.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ver Planes',
                cancelButtonText: 'Entendido',
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#6b7280'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/user/visitor/perfilUser/perfil.html';
                }
            });
            return false;
        }

        return true;
    }
}
export const planValidator = new PlanValidator();