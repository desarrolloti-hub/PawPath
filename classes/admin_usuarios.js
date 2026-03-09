// Import ONLY the initialized services from config
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

class Admin_usuarios {
    constructor(
        nombre = "",
        apellidos = "",
        email = "",
        fecha_registro = "",
        rol="",
        id = ''
    ) {
        this.nombre = nombre;
        this.apellidos = apellidos;
        this.email = email;
        this.fecha_registro = fecha_registro;
        this.rol=rol;
        this.id = id;
        this.collectionName = 'usarios';
    }

    async listarUsuarios(id) {
        try {
            const docRef = doc(db, this.collectionName, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.id = docSnap.id;
                this.nombre = `${data.primer_nombre || ''}${data.segundo_nombre || ''}`.trim();
                this.apellidos = `${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim();
                this.email = data.email || '';
                this.fecha_registro = data.fecha_registro || 'N/A';
                this.rol=data.rol || '';

                return { success: true, usuario: this };
            } else {
                return { success: false, error: 'Usuario no registrado' };
            }
        } catch (error) {
            console.error('❌ Error cargando usuario:', error)
            return { succes: false, error: error.message };
        }
    }
    async eliminarUsuario() {
        try {
            if (!this.id) throw new Error("Se requiere el ID del usuario");

            const docRef = doc(db, this.collectionName, this.id);
            await deleteDoc(docRef);
            return { success: true, message: 'El usuario se elimino con exito' };
        } catch (error) {
            console.error('❌ Error eliminando al usuario:', error);
            return { success: false, error: error.message };
        }
    }
    async suspenderUsuario(estado = 'suspendido') {
        try {
            if (!this.id) throw new Error("Se requiere el ID del usuario");

            const docRef = doc(db, this.collectionName, this.id);
            await updateDoc(docRef, {
                estado: estado,
                fecha_suspension: estado == 'suspendido' ? new Date() : null,
                suspendido: estado == 'suspendido'
            });

            return {
                succes: true,
                message: estado == 'suspendido' ?
                    'Usuario suspendido correctamente' :
                    'Usuario reactivado correctamente'
            };

        } catch (error) {
            console.error('❌ Error suspendiendo usuario:', error);
            return { success: false, error: error.message };
        }
    }
    async reactivarUsuario() {
        return this.suspenderUsuario('activo');
    }
    static async obtenerUsuarios() {
        try {
            const consulta = await getDocs(collection(db, 'usarios'));
            const usuarios = [];

            consulta.forEach(doc => {
                const data = doc.data();
                // ✅ FORMATO CORRECTO de fecha
                let fechaFormateada = 'No disponible';
                if (data.fecha_registro) {
                    // Si es Timestamp de Firebase
                    if (data.fecha_registro.seconds) {
                        const fecha = new Date(data.fecha_registro.seconds * 1000);
                        fechaFormateada = fecha.toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                    // Si ya es string o Date
                    else if (data.fecha_registro instanceof Date) {
                        fechaFormateada = data.fecha_registro.toLocaleDateString('es-ES');
                    }
                    // Si es string
                    else if (typeof data.fecha_registro === 'string') {
                        fechaFormateada = new Date(data.fecha_registro).toLocaleDateString('es-ES');
                    }
                }
                usuarios.push({
                    id: doc.id,
                    nombre: `${data.primer_nombre || ''} ${data.segundo_nombre || ''}`.trim(),  // ✅ Mapeo explícito
                    apellidos: `${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim(),
                    email: data.email || '',
                    fecha_registro: fechaFormateada,
                    rol: data.rol || ''
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