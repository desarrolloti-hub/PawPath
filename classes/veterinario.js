import { db, auth } from '/config/firebase-config.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Veterinario {
    constructor() {
        this.db = db;
        this.auth = auth;
        this.veterinariosCollection = 'veterinarios';
        this.citasCollection = 'citas';
    }
    async obtenerVeterinarioPorId(veterinarioId) {
        try {
            const docRef = doc(this.db, this.veterinariosCollection, veterinarioId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                return { success: false, error: 'Veterinario no encontrado' };
            }
            
            const data = docSnap.data();
            return {
                success: true,
                data: {
                    id: docSnap.id,
                    nombre: data.nombreCompleto || 'Veterinario',
                    horarioSemanal: data.horarioSemanal || [],
                    duracionCita: data.duracionCita || 30,
                    ...data
                }
            };
        } catch (error) {
            console.error('Error al obtener veterinario por ID:', error);
            return { success: false, error: error.message };
        }
    }

    async obtenerVeterinarios(filtros = {}) {
        try {

            let q = query(
                collection(this.db, this.veterinariosCollection)
                // where('activo', '==', true) // no me detecta el fokin campo
            );

            const querySnapshot = await getDocs(q);
            const veterinarios = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();

                if (data.activo === true) {
                    const nombreMostrar = data.nombreCompleto ||
                        `${data.primerNombre || ''} ${data.segundoNombre || ''} ${data.apellidoPat || ''} ${data.apellidoMat || ''}`.trim();

                    const especialidadPrincipal = data.especialidades?.length > 0
                        ? data.especialidades[0]
                        : 'Veterinario General';

                    veterinarios.push({
                        id: doc.id,
                        nombre: nombreMostrar || 'Veterinario',
                        nombreClinica: data.nombreClinica || 'Clínica sin nombre',
                        specialty: this.formatearEspecialidad(especialidadPrincipal),
                        especialidades: data.especialidades || [],
                        horarioSemanal: data.horarioSemanal || [],
                        duracionCita: data.duracionCita || 30,
                        rating: data.rating || 0,
                        totalReseñas: data.totalReseñas || 0,
                        location: data.direccion || 'Ubicación no disponible',
                        available: this.verificarDisponibilidad(data.horarioSemanal),
                        foto: data.fotoPerfil || null,
                        fotoClinica: data.fotoClinica || null,
                        telefono: data.telefono
                    });
                }
            });

            return { success: true, data: veterinarios };

        } catch (error) {
            console.error('error al obtener',error);
            return { success: false, error: error.message };
        }
    }

    formatearEspecialidad(esp) {
        const especialidades = {
            'perros': '🐕 Especialista en Perros',
            'gatos': '🐈 Especialista en Gatos',
            'aves': '🦜 Especialista en Aves',
            'roedores': '🐹 Especialista en Roedores',
            'reptiles': '🦎 Especialista en Reptiles',
            'emergencias': '🚑 Emergencias 24/7',
            'cirugias': '🔬 Cirugía Veterinaria',
            'hospitalizacion': '🏥 Hospitalización'
        };
        return especialidades[esp] || esp;
    }


    verificarDisponibilidad(horarioSemanal) {
        if (!horarioSemanal || !Array.isArray(horarioSemanal)) {
            return false;
        }

        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const hoy = new Date();
        const diaSemana = dias[hoy.getDay()];

        const horarioHoy = horarioSemanal.find(h => h.dia === diaSemana);

        if (!horarioHoy || !horarioHoy.activo) {
            return false;
        }

        const horaActual = hoy.getHours();
        const minutosActual = hoy.getMinutes();
        const horaActualStr = `${horaActual.toString().padStart(2, '0')}:${minutosActual.toString().padStart(2, '0')}`;

        const [horaApertura, minApertura] = horarioHoy.apertura.split(':');
        const [horaCierre, minCierre] = horarioHoy.cierre.split(':');

        const aperturaMinutos = parseInt(horaApertura) * 60 + parseInt(minApertura);
        const cierreMinutos = parseInt(horaCierre) * 60 + parseInt(minCierre);
        const actualMinutos = horaActual * 60 + minutosActual;

        return actualMinutos < cierreMinutos;
    }

    formatearEspecialidad(esp) {
        if (!esp) return 'Veterinario General';

        const especialidades = {
            'perros': '🐕 Especialista en Perros',
            'gatos': '🐈 Especialista en Gatos',
            'aves': '🦜 Especialista en Aves',
            'roedores': '🐹 Especialista en Roedores',
            'reptiles': '🦎 Especialista en Reptiles',
            'emergencias': '🚑 Emergencias 24/7',
            'cirugias': '🔬 Cirugía Veterinaria',
            'hospitalizacion': '🏥 Hospitalización'
        };
        return especialidades[esp] || esp;
    }
    //falta meterlo
    generarEstrellasHTML(rating) {
        if (!rating) return '<i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i>';

        let estrellas = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                estrellas += '<i class="fas fa-star"></i>';
            } else if (i - rating < 1 && i - rating > 0) {
                estrellas += '<i class="fas fa-star-half-alt"></i>';
            } else {
                estrellas += '<i class="far fa-star"></i>';
            }
        }
        return estrellas;
    }

    async obtenerVeterinarioActual() {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Usuario no autenticado');

            const q = query(
                collection(this.db, this.veterinariosCollection),
                where('email', '==', user.email)
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return { success: false, error: 'Veterinario no encontrado' };
            }

            const vetData = querySnapshot.docs[0];
            return {
                success: true,
                data: { id: vetData.id, ...vetData.data() }
            };
        } catch (error) {
            console.error('Error al obtener veterinario:', error);
            return { success: false, error: error.message };
        }
    }



    async obtenerCitasVeterinario(veterinarioId, filtros = {}) {
        try {
            let q = query(
                collection(this.db, this.citasCollection),
                where('veterinarioId', '==', veterinarioId),
                orderBy('fecha', 'desc'),
                orderBy('hora', 'desc')
            );

            if (filtros.estado && filtros.estado !== 'todos') {
                q = query(q, where('estado', '==', filtros.estado));
            }

            const querySnapshot = await getDocs(q);
            const citas = [];

            querySnapshot.forEach((doc) => {
                citas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return { success: true, data: citas };
        } catch (error) {
            console.error('Error al obtener citas:', error);
            return { success: false, error: error.message };
        }
    }

    async actualizarEstadoCita(citaId, nuevoEstado, notas = '') {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Usuario no autenticado');

            const citaRef = doc(this.db, this.citasCollection, citaId);
            const citaSnap = await getDoc(citaRef);

            if (!citaSnap.exists()) {
                return { success: false, error: 'Cita no encontrada' };
            }

            const citaData = citaSnap.data();
            const historialCambios = citaData.historialCambios || [];

            historialCambios.push({
                estado: nuevoEstado,
                fecha: new Date().toISOString(),
                por: user.uid,
                notas: notas
            });

            await updateDoc(citaRef, {
                estado: nuevoEstado,
                notasVeterinario: notas || citaData.notasVeterinario,
                historialCambios: historialCambios,
                fechaActualizacion: serverTimestamp()
            });

            return { success: true, message: 'Estado actualizado correctamente' };
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            return { success: false, error: error.message };
        }
    }


    async obtenerEstadisticas(veterinarioId) {
        try {
            const citas = await this.obtenerCitasVeterinario(veterinarioId);

            if (!citas.success) {
                return { success: false, error: citas.error };
            }

            const hoy = new Date().toISOString().split('T')[0];

            const estadisticas = {
                totalCitas: citas.data.length,
                citasPendientes: citas.data.filter(c => c.estado === 'pendiente').length,
                citasAceptadas: citas.data.filter(c => c.estado === 'aceptada').length,
                citasRechazadas: citas.data.filter(c => c.estado === 'rechazada').length,
                citasConcluidas: citas.data.filter(c => c.estado === 'concluida').length,
                citasHoy: citas.data.filter(c => c.fecha === hoy).length,
            };

            return { success: true, data: estadisticas };
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return { success: false, error: error.message };
        }
    }

async guardarConfiguracionHorario(veterinarioId, horarioSemanal, duracionCita, diasAnticipacion) {
    try {
        // En lugar de forzar un updateDoc que se cae si el perfil no existe en la nube,
        const { setDoc } = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js");
        
        const vetRef = doc(this.db, this.veterinariosCollection, veterinarioId);

        await setDoc(vetRef, {
            horarioSemanal: horarioSemanal,
            duracionCita: duracionCita,
            diasAnticipacion: diasAnticipacion,
            fechaActualizacion: serverTimestamp(),
            // Agregamos estos datos de respaldo por si es la primera vez que se crea el documento en la bd
            nombreCompleto: "Dr. Veterinario Real",
            nombreClinica: "Clínica Veterinaria PawPath Principal"
        },);

        console.log('¡Agenda e información de horarios guardada exitosamente en Firestore!');
        return { success: true, message: 'Horario actualizado correctamente' };
    } catch (error) {
        console.error('Error al guardar horario:', error);
        return { success: false, error: error.message };
    }
}
}

export default Veterinario;