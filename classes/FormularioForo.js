// /classes/FormularioForo.js
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
  orderBy,
  limit,
  startAfter
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class FormularioForo {
  constructor(
    titulo = '',
    tipo = '',
    descripcion = '',
    categoria = '',
    ubicacionTexto = '',
    coordenadas = null,
    contacto = '',
    recompensa = '',
    fotos = [],
    fechaEvento = null,
    usuarioId = '',
    usuarioNombre = '',
    id = ''
  ) {
    this.titulo = titulo;
    this.tipo = tipo;
    this.descripcion = descripcion;
    this.categoria = categoria;
    this.ubicacionTexto = ubicacionTexto;
    this.coordenadas = coordenadas;
    this.contacto = contacto;
    this.recompensa = recompensa;
    this.fotos = fotos;
    this.fechaEvento = fechaEvento;
    this.usuarioId = usuarioId;
    this.usuarioNombre = usuarioNombre;
    this.fechaPublicacion = new Date().toISOString();
    this.fechaActualizacion = new Date().toISOString();
    this.estado = 'activo';
    this.vistas = 0;
    this.likes = 0;
    this.comentarios = 0;
    this.id = id;
    this.collectionName = "publicacionesForo";
  }

  validar() {
    const errores = [];

    if (!this.titulo) errores.push('El título es requerido');
    if (!this.tipo) errores.push('El tipo de publicación es requerido');
    if (!this.descripcion) errores.push('La descripción es requerida');
    if ((this.tipo === 'Mascota Perdida' || this.tipo === 'En Adopción')) {
      if (!this.ubicacionTexto) errores.push('La ubicación es requerida');
      if (!this.coordenadas) errores.push('Debes seleccionar un punto en el mapa');
    }
    if (!this.contacto) errores.push('El contacto es requerido');
    if (!this.usuarioId) errores.push('Usuario no identificado');

    return {
      valido: errores.length === 0,
      errores
    };
  }

  async guardar() {
    try {
      const data = this.toFirestoreData();
      
      if (this.id) {
        const docRef = doc(db, this.collectionName, this.id);
        this.fechaActualizacion = new Date().toISOString();
        await updateDoc(docRef, {
          ...data,
          fechaActualizacion: this.fechaActualizacion
        });
        return { success: true, id: this.id, message: 'Publicación actualizada correctamente' };
      } else {
        const docRef = await addDoc(collection(db, this.collectionName), data);
        this.id = docRef.id;
        return { success: true, id: docRef.id, message: 'Publicación creada correctamente' };
      }
    } catch (error) {
      console.error('❌ Error guardando publicación:', error);
      return { success: false, error: error.message };
    }
  }

  async eliminar() {
    try {
      if (!this.id) throw new Error('ID de publicación requerido');
      
      const docRef = doc(db, this.collectionName, this.id);
      await updateDoc(docRef, { estado: 'eliminado' });
      return { success: true, message: 'Publicación eliminada correctamente' };
    } catch (error) {
      console.error('❌ Error eliminando publicación:', error);
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
        this.titulo = data.titulo || '';
        this.tipo = data.tipo || '';
        this.descripcion = data.descripcion || '';
        this.categoria = data.categoria || '';
        this.ubicacionTexto = data.ubicacionTexto || '';
        this.coordenadas = data.coordenadas || null;
        this.contacto = data.contacto || '';
        this.recompensa = data.recompensa || '';
        this.fotos = data.fotos || [];
        this.fechaEvento = data.fechaEvento || null;
        this.usuarioId = data.usuarioId || '';
        this.usuarioNombre = data.usuarioNombre || '';
        this.fechaPublicacion = data.fechaPublicacion || new Date().toISOString();
        this.fechaActualizacion = data.fechaActualizacion || new Date().toISOString();
        this.estado = data.estado || 'activo';
        this.vistas = data.vistas || 0;
        this.likes = data.likes || 0;
        this.comentarios = data.comentarios || 0;
        
        return { success: true };
      } else {
        return { success: false, error: 'Publicación no encontrada' };
      }
    } catch (error) {
      console.error('❌ Error cargando publicación:', error);
      return { success: false, error: error.message };
    }
  }

  static async obtenerTodas(ultimoDoc = null, limite = 10) {
    try {
      let q;
      if (ultimoDoc) {
        q = query(
          collection(db, 'publicacionesForo'),
          where('estado', '==', 'activo'),
          orderBy('fechaPublicacion', 'desc'),
          startAfter(ultimoDoc),
          limit(limite)
        );
      } else {
        q = query(
          collection(db, 'publicacionesForo'),
          where('estado', '==', 'activo'),
          orderBy('fechaPublicacion', 'desc'),
          limit(limite)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const publicaciones = [];
      let ultimoDocumento = null;
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        publicaciones.push({ 
          id: doc.id, 
          ...data
        });
        ultimoDocumento = doc;
      });
      
      return { 
        success: true, 
        publicaciones: publicaciones,
        ultimoDoc: ultimoDocumento
      };
    } catch (error) {
      console.error('❌ Error obteniendo publicaciones:', error);
      return { success: false, error: error.message };
    }
  }

  static async obtenerPorTipo(tipo, ultimoDoc = null, limite = 10) {
    try {
      let q;
      if (ultimoDoc) {
        q = query(
          collection(db, 'publicacionesForo'),
          where('tipo', '==', tipo),
          where('estado', '==', 'activo'),
          orderBy('fechaPublicacion', 'desc'),
          startAfter(ultimoDoc),
          limit(limite)
        );
      } else {
        q = query(
          collection(db, 'publicacionesForo'),
          where('tipo', '==', tipo),
          where('estado', '==', 'activo'),
          orderBy('fechaPublicacion', 'desc'),
          limit(limite)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const publicaciones = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        publicaciones.push({ 
          id: doc.id, 
          ...data
        });
      });
      
      return { success: true, publicaciones: publicaciones };
    } catch (error) {
      console.error('❌ Error obteniendo publicaciones por tipo:', error);
      return { success: false, error: error.message };
    }
  }

  static async obtenerPorUsuario(usuarioId) {
    try {
      const q = query(
        collection(db, 'publicacionesForo'),
        where('usuarioId', '==', usuarioId),
        where('estado', '==', 'activo'),
        orderBy('fechaPublicacion', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const publicaciones = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        publicaciones.push({ 
          id: doc.id, 
          ...data
        });
      });
      
      return { success: true, publicaciones: publicaciones };
    } catch (error) {
      console.error('❌ Error obteniendo publicaciones por usuario:', error);
      return { success: false, error: error.message };
    }
  }

  static async obtenerCercanos(lat, lng, radioKm = 5) {
    try {
      const todas = await this.obtenerTodas();
      if (!todas.success) return todas;
      
      const cercanos = todas.publicaciones.filter(pub => {
        if (!pub.coordenadas) return false;
        
        const R = 6371;
        const dLat = (pub.coordenadas.lat - lat) * Math.PI / 180;
        const dLon = (pub.coordenadas.lng - lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat * Math.PI / 180) * Math.cos(pub.coordenadas.lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distancia = R * c;
        
        return distancia <= radioKm;
      });
      
      return { success: true, publicaciones: cercanos };
    } catch (error) {
      console.error('❌ Error obteniendo publicaciones cercanas:', error);
      return { success: false, error: error.message };
    }
  }

  toFirestoreData() {
    return {
      titulo: this.titulo,
      tipo: this.tipo,
      descripcion: this.descripcion,
      categoria: this.categoria,
      ubicacionTexto: this.ubicacionTexto,
      coordenadas: this.coordenadas,
      contacto: this.contacto,
      recompensa: this.recompensa,
      fotos: this.fotos,
      fechaEvento: this.fechaEvento,
      usuarioId: this.usuarioId,
      usuarioNombre: this.usuarioNombre,
      fechaPublicacion: this.fechaPublicacion,
      estado: this.estado,
      vistas: this.vistas,
      likes: this.likes,
      comentarios: this.comentarios
    };
  }

  toObject() {
    return {
      id: this.id,
      ...this.toFirestoreData(),
      fechaActualizacion: this.fechaActualizacion
    };
  }

  incrementarVistas() {
    this.vistas += 1;
  }

  darLike() {
    this.likes += 1;
  }

  getTipoIcono() {
    const iconos = {
      'Mascota Perdida': '🔍',
      'En Adopción': '🏠',
      'Consejo de Cuidado': '💡',
      'Galería de Fotos': '📷'
    };
    return iconos[this.tipo] || '📌';
  }

  getCategoriaIcono() {
    const iconos = {
      'Perros': '🐕',
      'Gatos': '🐈',
      'Aves': '🦜',
      'Roedores': '🐭',
      'Reptiles': '🦎',
      'Otros': '🐾'
    };
    return iconos[this.categoria] || '🐾';
  }

  getTiempoTranscurrido() {
    const ahora = new Date();
    const publicacion = new Date(this.fechaPublicacion);
    const diferencia = ahora - publicacion;
    
    const segundos = Math.floor(diferencia / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    const meses = Math.floor(dias / 30);
    const años = Math.floor(meses / 12);
    
    if (años > 0) return `hace ${años} ${años === 1 ? 'año' : 'años'}`;
    if (meses > 0) return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    if (dias > 0) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
    if (horas > 0) return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    if (minutos > 0) return `hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    return 'hace unos segundos';
  }

  getMapUrl() {
    if (!this.coordenadas) return null;
    return `https://www.openstreetmap.org/?mlat=${this.coordenadas.lat}&mlon=${this.coordenadas.lng}#map=15/${this.coordenadas.lat}/${this.coordenadas.lng}`;
  }
}

export default FormularioForo;