import { db, auth } from '/config/firebase-config.js';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { ChatService } from './../user/veterinario/dashVeterinario/chatservice.js';

class Citas {
    constructor() {
        this.db = db;
        this.auth = auth;
        this.citasCollection = 'citas';
    }


    async obtenerCitasVeterinario(veterinarioId, filtros = {}) {
        try {
            let q = query(
                collection(this.db, this.citasCollection),
                where('veterinarioId', '==', veterinarioId),
                orderBy('fecha', 'desc'),
                orderBy('hora', 'desc')
            );

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


    convertirImagenABase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }



    async verificarDisponibilidadHorario(veterinarioId, fecha, hora) {
        try {

            const q = query(
                collection(this.db, this.citasCollection),
                where('veterinarioId', '==', veterinarioId),
                where('fecha', '==', fecha),
                where('hora', '==', hora),
                where('estado', 'in', ['pendiente', 'aceptada'])
            );

            const querySnapshot = await getDocs(q);
            const disponible = querySnapshot.empty;

            return disponible;
        } catch (error) {
            console.error('Error al verificar disponibilidad:', error);
            return false;
        }
    }

    async obtenerHorariosOcupados(veterinarioId, fecha) {
        try {
            const q = query(
                collection(this.db, this.citasCollection),
                where('veterinarioId', '==', veterinarioId),
                where('fecha', '==', fecha),
                where('estado', 'in', ['pendiente', 'aceptada'])
            );

            const querySnapshot = await getDocs(q);
            const horariosOcupados = [];

            querySnapshot.forEach(doc => {
                horariosOcupados.push(doc.data().hora);
            });

            return horariosOcupados;
        } catch (error) {
            console.error('Error al obtener horarios ocupados:', error);
            return [];
        }
    }


    async crearCitaConTransaccion(datosCita, imagenFile) {
        try {
            const user = this.auth.currentUser;
            if (!user) throw new Error('Usuario no autenticado');

            const disponible = await this.verificarDisponibilidadHorario(
                datosCita.veterinarioId,
                datosCita.fecha,
                datosCita.hora
            );

            if (!disponible) {
                throw new Error('El horario ya no está disponible');
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
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            const docRef = await addDoc(collection(this.db, this.citasCollection), citaData);
            const citaId = docRef.id;
            //NUEVO: Creamos el chat automáticamente en Firebase vinculando esta cita
            try {
                const datosParaChat = {
                    id: citaId,
                    usuarioId: citaData.usuarioId,
                    veterinarioId: citaData.veterinarioId,
                    mascotaId: citaData.mascotaId || 'sin_id',
                    nombreMascota: citaData.nombreMascota || 'Mascota',
                    veterinarioNombre: citaData.veterinarioNombre || 'Veterinario',
                    usuarioEmail: citaData.usuarioEmail
                };
                // Llamamos al servicio de Firebase que ya analiza si existe o no
                await ChatService.crearChatSiNoExiste(datosParaChat);
            } catch (chatError) {
                console.error("Error automático al crear sala de chat:", chatError);
                // No bloqueamos el retorno de la cita si el chat falla por red
            }
            return { success: true, id: citaId, data: citaData };
            return { success: true, id: docRef.id, data: citaData };
        } catch (error) {
            console.error('Error al crear cita:', error);
            return { success: false, error: error.message };
        }
    }



    async obtenerCitasUsuario() {
        try {
            const user = this.auth.currentUser;

            if (!user) throw new Error('Usuario no autenticado');

            const q = query(
                collection(this.db, this.citasCollection),
                where('usuarioId', '==', user.uid),
                orderBy('fechaCreacion', 'desc')
            );

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