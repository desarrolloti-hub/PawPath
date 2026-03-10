// /classes/FormularioForo.js

import { db } from '/config/firebase-config.js';

// Importación modular actualizada a la versión 11.6.0
import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

export default class FormularioForo {
    constructor(titulo = '', tipo = '', descripcion = '', categoria = '', ubicacionTexto = '', coordenadas = null, contacto = '', recompensa = '', fotos = [], fechaEvento = null, usuarioId = null, usuarioNombre = '', id = null) {
        this.id = id;
        this.titulo = titulo;
        this.tipo = tipo;
        this.descripcion = descripcion;
        this.categoria = categoria;
        this.ubicacionTexto = ubicacionTexto;
        this.coordenadas = coordenadas;
        this.contacto = contacto;
        this.recompensa = recompensa;
        this.fotos = fotos || [];
        this.fechaEvento = fechaEvento;
        this.usuarioId = usuarioId;
        this.usuarioNombre = usuarioNombre;
    }

    validar() {
        const errores = [];
        if (!this.titulo) errores.push('El título es obligatorio');
        if (!this.tipo) errores.push('El tipo es obligatorio');
        if (!this.descripcion) errores.push('La descripción es obligatoria');
        
        return {
            valido: errores.length === 0,
            errores: errores
        };
    }

    async guardar() {
        try {
            // Verificación de seguridad para la instancia db
            if (!db) throw new Error("La instancia de base de datos no está disponible.");

            const datos = {
                titulo: this.titulo,
                tipo: this.tipo,
                descripcion: this.descripcion,
                categoria: this.categoria || '',
                ubicacionTexto: this.ubicacionTexto || '',
                coordenadas: this.coordenadas,
                contacto: this.contacto || '',
                recompensa: this.recompensa || '',
                fotos: this.fotos,
                fechaEvento: this.fechaEvento || null,
                usuarioId: this.usuarioId,
                usuarioNombre: this.usuarioNombre,
                fechaActualizacion: serverTimestamp()
            };

            if (this.id) {
                // Actualizar documento existente usando la referencia de db modular
                const docRef = doc(db, 'publicaciones', this.id);
                await updateDoc(docRef, datos);
                return { success: true, message: 'Publicación actualizada correctamente' };
            } else {
                // Configuración de campos iniciales para nuevas publicaciones
                datos.fechaPublicacion = serverTimestamp();
                datos.vistas = 0;
                datos.likes = 0;
                datos.comentarios = 0;
                datos.usuariosLike = [];
                
                // Guardado en colección 'publicaciones'
                const docRef = await addDoc(collection(db, 'publicaciones'), datos);
                this.id = docRef.id;
                return { success: true, message: 'Publicación creada exitosamente', id: docRef.id };
            }
        } catch (error) {
            console.error('❌ Error guardando publicación:', error);
            return { success: false, error: error.message };
        }
    }

    async cargar(id) {
        try {
            const docRef = doc(db, 'publicaciones', id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                Object.assign(this, data);
                this.id = docSnap.id;
                return { success: true };
            } else {
                return { success: false, error: 'Documento no encontrado' };
            }
        } catch (error) {
            console.error('Error cargando documento:', error);
            return { success: false, error: error.message };
        }
    }

    static async obtenerTodas() {
        try {
            const q = query(collection(db, 'publicaciones'), orderBy('fechaPublicacion', 'desc'));
            const snapshot = await getDocs(q);
            const publicaciones = [];
            snapshot.forEach(doc => publicaciones.push({ id: doc.id, ...doc.data() }));
            return { success: true, publicaciones };
        } catch (error) {
            console.error('Error obteniendo todas:', error);
            return { success: false, publicaciones: [] };
        }
    }

    static async obtenerPorTipo(tipo) {
        try {
            const q = query(collection(db, 'publicaciones'), where('tipo', '==', tipo), orderBy('fechaPublicacion', 'desc'));
            const snapshot = await getDocs(q);
            const publicaciones = [];
            snapshot.forEach(doc => publicaciones.push({ id: doc.id, ...doc.data() }));
            return { success: true, publicaciones };
        } catch (error) {
            console.error('Error obteniendo por tipo:', error);
            return { success: false, publicaciones: [] };
        }
    }
}