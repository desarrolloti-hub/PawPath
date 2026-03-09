// models/Citas.js
import { db, auth } from '../config/firebase-config.js';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Citas {
    constructor() {
        this.db = db;
        this.auth = auth;
        this.citasCollection = 'citas';
    }

    // Crear una nueva cita (ahora con veterinarioId)
    async crearCita(datosCita, imagenFile) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Usuario no autenticado');

            // Verificar que el horario sigue disponible
            const horarioDisponible = await this.verificarHorarioDisponible(
                datosCita.veterinarioId,
                datosCita.fecha,
                datosCita.hora
            );

            if (!horarioDisponible) {
                return { success: false, error: 'Horario no disponible' };
            }

            let imagenBase64 = null;
            
            if (imagenFile) {
                imagenBase64 = await this.convertirImagenABase64(imagenFile);
            }

            const citaData = {
                ...datosCita,
                usuarioId: user.uid,
                usuarioEmail: user.email,
                imagenMascota: imagenBase64,
                estado: 'pendiente',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
                historialCambios: [{
                    estado: 'pendiente',
                    fecha: new Date().toISOString(),
                    por: user.uid
                }]
            };

            const docRef = await addDoc(collection(this.db, this.citasCollection), citaData);
            
            // Marcar el horario como no disponible
            await this.marcarHorarioNoDisponible(datosCita.veterinarioId, datosCita.fecha, datosCita.hora);
            
            return { success: true, id: docRef.id, data: citaData };
        } catch (error) {
            console.error('Error al crear cita:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener citas de un veterinario específico
    async obtenerCitasVeterinario(veterinarioId, filtros = {}) {
        try {
            let q = query(
                collection(this.db, this.citasCollection),
                where('veterinarioId', '==', veterinarioId),
                orderBy('fecha', 'desc'),
                orderBy('hora', 'desc')
            );

            // Aplicar filtros adicionales
            if (filtros.estado) {
                q = query(q, where('estado', '==', filtros.estado));
            }
            
            if (filtros.fecha) {
                q = query(q, where('fecha', '==', filtros.fecha));
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

    // Actualizar estado de una cita (veterinario)
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
                notasVeterinario: notas,
                historialCambios: historialCambios,
                fechaActualizacion: serverTimestamp()
            });

            return { success: true, message: 'Estado actualizado correctamente' };
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            return { success: false, error: error.message };
        }
    }

    // Verificar disponibilidad de horario para un veterinario
    async verificarHorarioDisponible(veterinarioId, fecha, hora) {
        try {
            const q = query(
                collection(this.db, this.citasCollection),
                where('veterinarioId', '==', veterinarioId),
                where('fecha', '==', fecha),
                where('hora', '==', hora),
                where('estado', 'in', ['pendiente', 'aceptada'])
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.empty;
        } catch (error) {
            console.error('Error al verificar disponibilidad:', error);
            return false;
        }
    }

    // Marcar horario como no disponible
    async marcarHorarioNoDisponible(veterinarioId, fecha, hora) {
        // Implementaremos después con la colección de horarios
    }

    convertirImagenABase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Crear una nueva cita
    async crearCita(datosCita, imagenFile) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Usuario no autenticado');

            let imagenBase64 = null;

            // Convertir imagen a base64 si existe
            if (imagenFile) {
                imagenBase64 = await this.convertirImagenABase64(imagenFile);
            }

            const citaData = {
                ...datosCita,
                usuarioId: user.uid,
                usuarioEmail: user.email,
                imagenMascota: imagenBase64,
                estado: 'pendiente', // pendiente, confirmada, cancelada, completada
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            const docRef = await addDoc(collection(this.db, this.citasCollection), citaData);
            return { success: true, id: docRef.id, data: citaData };
        } catch (error) {
            console.error('Error al crear cita:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener citas del usuario actual
    // En models/Citas.js, modifica temporalmente para más logs:
    async obtenerCitasUsuario() {
        try {
            const user = this.auth.currentUser;
            console.log('Usuario actual:', user?.uid, user?.email);

            if (!user) throw new Error('Usuario no autenticado');

            console.log('Consultando Firestore...');
            const q = query(
                collection(this.db, this.citasCollection),
                where('usuarioId', '==', user.uid),
                orderBy('fechaCreacion', 'desc')
            );

            const querySnapshot = await getDocs(q);
            console.log('Documentos encontrados:', querySnapshot.size);

            const citas = [];
            querySnapshot.forEach((doc) => {
                console.log('Documento:', doc.id, doc.data());
                citas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return { success: true, data: citas };
        } catch (error) {
            console.error('Error detallado en obtenerCitasUsuario:', error);
            return { success: false, error: error.message };
        }
    }

    async obtenerCita(citaId) {
        try {
            const docRef = doc(this.db, this.citasCollection, citaId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                return { success: false, error: 'Cita no encontrada' };
            }
            return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
        } catch (error) {
            console.error('Error al obtener cita:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar una cita
    async actualizarCita(citaId, datosActualizados) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Usuario no autenticado');

            const docRef = doc(this.db, this.citasCollection, citaId);

            datosActualizados.fechaActualizacion = serverTimestamp();

            await updateDoc(docRef, datosActualizados);
            return { success: true, message: 'Cita actualizada correctamente' };
        } catch (error) {
            console.error('Error al actualizar cita:', error);
            return { success: false, error: error.message };
        }
    }

    // Cancelar una cita
    async cancelarCita(citaId) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Usuario no autenticado');

            const docRef = doc(this.db, this.citasCollection, citaId);

            await updateDoc(docRef, {
                estado: 'cancelada',
                fechaActualizacion: serverTimestamp()
            });
            return { success: true, message: 'Cita cancelada correctamente' };
        } catch (error) {
            console.error('Error al cancelar cita:', error);
            return { success: false, error: error.message };
        }
    }

    // Verificar disponibilidad de horario
    async verificarDisponibilidad(fecha, hora) {
        try {
            const q = query(
                collection(this.db, this.citasCollection),
                where('fecha', '==', fecha),
                where('hora', '==', hora),
                where('estado', 'in', ['pendiente', 'confirmada'])
            );

            const querySnapshot = await getDocs(q);

            return {
                success: true,
                disponible: querySnapshot.empty,
                message: querySnapshot.empty ? 'Horario disponible' : 'Horario no disponible'
            };
        } catch (error) {
            console.error('Error al verificar disponibilidad:', error);
            return { success: false, error: error.message };
        }
    }

    // Convertir imagen a base64
    convertirImagenABase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
}

export default Citas;