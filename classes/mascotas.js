// /classes/mascotas.js
import { db } from '/config/firebase-config.js';
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Mascota {
    constructor(
        nombre = '',
        raza = '',
        especie = '',
        genero = '',
        colores = '',
        edad = 0,
        peso = 0,
        microchip = '',
        esterilizado = 'No',
        historialMedico = '',
        uidUsuario = '',
        foto = null,
        id = ''
    ) {
        this.nombre = nombre;
        this.raza = raza;
        this.especie = especie;
        this.genero = genero;
        this.colores = colores;
        this.edad = edad;
        this.peso = peso;
        this.microchip = microchip;
        this.esterilizado = esterilizado;
        this.historialMedico = historialMedico;
        this.uidUsuario = uidUsuario;
        this.foto = foto;
        this.fechaRegistro = new Date().toISOString();
        this.id = id;
        this.collectionName = "mascotas";
    }

    // ============ VALIDACIONES ============
    validar() {
        const errores = [];

        if (!this.nombre) errores.push('El nombre es requerido');
        if (!this.raza) errores.push('La raza es requerida');
        if (!this.especie) errores.push('La especie es requerida');
        if (!this.genero) errores.push('El género es requerido');
        if (!this.colores) errores.push('Los colores son requeridos');
        if (!this.edad || this.edad <= 0) errores.push('La edad debe ser mayor a 0');
        if (!this.peso || this.peso <= 0) errores.push('El peso debe ser mayor a 0');
        if (!this.historialMedico) errores.push('El historial médico es requerido');

        return {
            valido: errores.length === 0,
            errores
        };
    }

    // ============ MÉTODOS CRUD ============
    async guardar() {
        try {
            const data = this.toFirestoreData();

            if (this.id) {
                // Actualizar
                const docRef = doc(db, this.collectionName, this.id);
                await updateDoc(docRef, data);
                return { success: true, id: this.id, message: 'Mascota actualizada correctamente' };
            } else {
                // Crear nueva
                const docRef = await addDoc(collection(db, this.collectionName), data);
                this.id = docRef.id;
                return { success: true, id: docRef.id, message: 'Mascota registrada correctamente' };
            }
        } catch (error) {
            console.error('❌ Error guardando mascota:', error);
            return { success: false, error: error.message };
        }
    }

    async eliminar() {
        try {
            if (!this.id) throw new Error('ID de mascota requerido');

            const docRef = doc(db, this.collectionName, this.id);
            await deleteDoc(docRef);
            return { success: true, message: 'Mascota eliminada correctamente' };
        } catch (error) {
            console.error('❌ Error eliminando mascota:', error);
            return { success: false, error: error.message };
        }
    }

    async cargar(id) {
        try {
            const docRef = doc(db, this.collectionName, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.id = docSnap.id;
                this.nombre = data.nombre || '';
                this.raza = data.raza || '';
                this.especie = data.especie || '';
                this.genero = data.genero || '';
                this.colores = data.colores || '';
                this.edad = data.edad || 0;
                this.peso = data.peso || 0;
                this.microchip = data.microchip || '';
                this.esterilizado = data.esterilizado || 'No';
                this.historialMedico = data.historialMedico || '';
                this.uidUsuario = data.uidUsuario || '';
                this.foto = data.foto || null;
                this.fechaRegistro = data.fechaRegistro || new Date().toISOString();

                return { success: true };
            } else {
                return { success: false, error: 'Mascota no encontrada' };
            }
        } catch (error) {
            console.error('❌ Error cargando mascota:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ MÉTODOS ESTÁTICOS ============
    static async obtenerTodas() {
        try {
            const querySnapshot = await getDocs(collection(db, 'mascotas'));
            const mascotas = [];

            querySnapshot.forEach(doc => {
                const data = doc.data();
                mascotas.push({
                    id: doc.id,
                    ...data
                });
            });

            return { success: true, mascotas: mascotas };
        } catch (error) {
            console.error('❌ Error obteniendo mascotas:', error);
            return { success: false, error: error.message };
        }
    }

    static async obtenerPorEspecie(especie) {
        try {
            const q = query(collection(db, 'mascotas'), where('especie', '==', especie));
            const querySnapshot = await getDocs(q);

            const mascotas = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                mascotas.push({
                    id: doc.id,
                    ...data
                });
            });

            return { success: true, mascotas: mascotas };
        } catch (error) {
            console.error('❌ Error obteniendo mascotas por especie:', error);
            return { success: false, error: error.message };
        }
    }

    static async obtenerPorUsuario(uidUsuario) {
        try {
            const q = query(
                collection(db, 'mascotas'),
                where('uidUsuario', '==', uidUsuario)
            );
            const querySnapshot = await getDocs(q);

            const mascotas = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                mascotas.push({
                    id: doc.id,
                    ...data
                });
            });

            return { success: true, mascotas };
        } catch (error) {
            console.error('❌ Error obteniendo mascotas por usuario:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ MÉTODOS DE UTILIDAD ============
    toFirestoreData() {
        return {
            nombre: this.nombre,
            raza: this.raza,
            especie: this.especie,
            genero: this.genero,
            colores: this.colores,
            edad: this.edad,
            peso: this.peso,
            microchip: this.microchip,
            esterilizado: this.esterilizado,
            historialMedico: this.historialMedico,
            uidUsuario: this.uidUsuario,
            foto: this.foto,
            fechaRegistro: this.fechaRegistro
        };
    }

    toObject() {
        return {
            id: this.id,
            ...this.toFirestoreData()
        };
    }

    getEdadFormateada() {
        if (this.edad < 1) {
            const meses = Math.round(this.edad * 12);
            return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
        }
        return `${this.edad} ${this.edad === 1 ? 'año' : 'años'}`;
    }

    getPesoFormateado() {
        return `${this.peso} kg`;
    }

    tieneMicrochip() {
        return this.microchip && this.microchip.trim() !== '';
    }

    getGeneroIcono() {
        return this.genero === 'Macho' ? '♂' : '♀';
    }

    getEspecieIcono() {
        const iconos = {
            'Perro': '🐕',
            'Gato': '🐈',
            'Ave': '🦜',
            'Roedor': '🐭',
            'Reptil': '🦎',
            'Otro': '🐾'
        };
        return iconos[this.especie] || '🐾';
    }
}

export default Mascota;