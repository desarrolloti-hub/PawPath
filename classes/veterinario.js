// models/Veterinario.js
import { db, auth } from '/config/firebase-config.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Veterinario {
    constructor() {
        this.db = db;
        this.auth = auth;
        this.veterinariosCollection = 'veterinarios';
        this.citasCollection = 'citas';
    }


    // Obtener datos del veterinario actual
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

    // Obtener citas del veterinario
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

    // Actualizar estado de una cita
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

    // Guardar/Actualizar configuración de horario
    async guardarConfiguracionHorario(veterinarioId, horarioConfig) {
        try {
            const vetRef = doc(this.db, this.veterinariosCollection, veterinarioId);

            await updateDoc(vetRef, {
                horarioSemanal: horarioConfig,
                fechaActualizacion: serverTimestamp()
            });

            return { success: true, message: 'Horario actualizado correctamente' };
        } catch (error) {
            console.error('Error al guardar horario:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener estadísticas del veterinario
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
            const vetRef = doc(this.db, this.veterinariosCollection, veterinarioId);

            await updateDoc(vetRef, {
                horarioSemanal: horarioSemanal,
                duracionCita: duracionCita,
                diasAnticipacion: diasAnticipacion,
                fechaActualizacion: serverTimestamp()
            });

            return { success: true, message: 'Horario actualizado correctamente' };
        } catch (error) {
            console.error('Error al guardar horario:', error);
            return { success: false, error: error.message };
        }
    }
}

export default Veterinario;