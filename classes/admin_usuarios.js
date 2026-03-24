// Import ONLY the initialized services from config
import { db } from '/config/firebase-config.js';
import {
    collection,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Admin_usuarios {
    constructor(
        nombre = "",
        apellidos = "",
        email = "",
        fecha_registro = "",
        id = ''
    ) {
        this.nombre = nombre;
        this.apellidos = apellidos;
        this.email = email;
        this.fecha_registro = fecha_registro;
        this.id = id;
        this.suspendido = false;
        this.estado = 'activo';
        this.collectionName = 'usarios';
    }

    // ============ MÉTODOS DE INSTANCIA ============

    async listarUsuarios(id) {
        try {
            const docRef = doc(db, this.collectionName, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.id = docSnap.id;
                this.nombre = `${data.primer_nombre || ''} ${data.segundo_nombre || ''}`.trim();
                this.apellidos = `${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim();
                this.email = data.email || '';
                
                // Formatear fecha
                if (data.fecha_registro) {
                    if (data.fecha_registro.seconds) {
                        const fecha = new Date(data.fecha_registro.seconds * 1000);
                        this.fecha_registro = fecha.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } else {
                        this.fecha_registro = data.fecha_registro;
                    }
                } else {
                    this.fecha_registro = 'N/A';
                }

                // ✅ IMPORTANTE: Incluir estado de suspensión
                this.suspendido = data.suspendido === true;
                this.estado = data.estado || (this.suspendido ? 'suspendido' : 'activo');

                return { success: true, usuario: this };
            } else {
                return { success: false, error: 'Usuario no registrado' };
            }
        } catch (error) {
            console.error('❌ Error cargando usuario:', error);
            return { success: false, error: error.message };
        }
    }

    async eliminarUsuario() {
        try {
            if (!this.id) throw new Error("Se requiere el ID del usuario");

            const docRef = doc(db, this.collectionName, this.id);
            await deleteDoc(docRef);
            return { success: true, message: 'El usuario se eliminó con éxito' };
        } catch (error) {
            console.error('❌ Error eliminando al usuario:', error);
            return { success: false, error: error.message };
        }
    }

    // ============ MÉTODOS DE SUSPENSIÓN ============

    async suspenderUsuario(estado = 'suspendido') {
        try {
            if (!this.id) throw new Error("Se requiere el ID del usuario");

            console.log(`🔒 Ejecutando acción en usuario ${this.id}:`, estado);
            
            const docRef = doc(db, this.collectionName, this.id);
            
            // Preparar datos de actualización
            const esSuspender = estado === 'suspendido';
            
            const datosActualizar = {
                suspendido: esSuspender,
                estado: estado,
                fecha_actualizacion: new Date()
            };
            
            // Si es suspensión, agregar fecha_suspension
            if (esSuspender) {
                datosActualizar.fecha_suspension = new Date();
                // Limpiar fecha de reactivación si existe
                datosActualizar.fecha_reactivacion = null;
            } 
            // Si es reactivación, agregar fecha_reactivacion y limpiar suspensión
            else if (estado === 'activo') {
                datosActualizar.fecha_suspension = null;
                datosActualizar.fecha_reactivacion = new Date();
            }
            
            await updateDoc(docRef, datosActualizar);
            
            // Actualizar propiedades locales
            this.suspendido = esSuspender;
            this.estado = estado;
            
            const mensaje = esSuspender 
                ? 'Usuario suspendido correctamente' 
                : 'Usuario reactivado correctamente';
            
            console.log(`✅ ${mensaje}`);
            
            return { 
                success: true, 
                message: mensaje
            };
            
        } catch (error) {
            console.error('❌ Error en operación:', error);
            return { success: false, error: error.message };
        }
    }

    async reactivarUsuario() {
        return this.suspenderUsuario('activo');
    }

    // ============ MÉTODOS ESTÁTICOS ============

    static async obtenerUsuarios() {
        try {
            const consulta = await getDocs(collection(db, 'usarios'));
            const usuarios = [];

            consulta.forEach(doc => {
                const data = doc.data();
                
                // Formatear fecha
                let fechaFormateada = 'No disponible';
                if (data.fecha_registro) {
                    if (data.fecha_registro.seconds) {
                        const fecha = new Date(data.fecha_registro.seconds * 1000);
                        fechaFormateada = fecha.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    } else if (data.fecha_registro instanceof Date) {
                        fechaFormateada = data.fecha_registro.toLocaleDateString('es-ES');
                    } else if (typeof data.fecha_registro === 'string') {
                        fechaFormateada = new Date(data.fecha_registro).toLocaleDateString('es-ES');
                    }
                }

                usuarios.push({
                    id: doc.id,
                    nombre: `${data.primer_nombre || ''} ${data.segundo_nombre || ''}`.trim(),
                    apellidos: `${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim(),
                    email: data.email || '',
                    fecha_registro: fechaFormateada,
                    rol: data.rol || 'visitante',
                    // ✅ Incluir estado de suspensión
                    suspendido: data.suspendido === true,
                    estado: data.estado || (data.suspendido ? 'suspendido' : 'activo')
                });
            });

            console.log(`✅ ${usuarios.length} usuarios obtenidos`);
            return { success: true, usuarios };
        } catch (error) {
            console.error('❌ Error:', error);
            return { success: false, error: error.message };
        }
    }

    static async buscarUsuarios(termino) {
        try {
            const resultado = await this.obtenerUsuarios();
            
            if (!resultado.success) return resultado;

            const terminoLower = termino.toLowerCase().trim();
            const filtrados = resultado.usuarios.filter(usuario => {
                return (
                    usuario.nombre.toLowerCase().includes(terminoLower) ||
                    usuario.apellidos.toLowerCase().includes(terminoLower) ||
                    usuario.email.toLowerCase().includes(terminoLower)
                );
            });

            return { success: true, usuarios: filtrados };
        } catch (error) {
            console.error('❌ Error buscando usuarios:', error);
            return { success: false, error: error.message };
        }
    }
}

export default Admin_usuarios;