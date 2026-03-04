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
class Usuarios {
    constructor(
        nombre = "",
        apellidos = "",
        email = "",
        nombreMascota="",
        id=''
    ) {
        this.nombre=nombre;
        this.apellidos=apellidos;
        this.email=email;
        this.nombreMascota=nombreMascota;
        this.id=id;
    }
    async listarUsuarios(id){
        try{
            const docRef= doc(db, this.collectionName, id);
            const docSnap=await getDoc(docRef);

            if(docSnap.exists()){
                const data = docSnap.data();
                this.id=docSnap.id;
                this.nombre=data.nombre || '';
                this.apellidos=data.apellidos || '';
                this.email=this.email || '';
                this.nombreMascota=this.nombreMascota || '';

                return {succes: true};
            }else{
                return {succes: false, error: 'Usuario no registrado'};
            }
        }catch(error){
            console.error('❌ Error cargando usuario:', error)
            return {succes: false, error: error.message};
        }
    }
    async eliminarUsuario(){
        try{
            if(!this.id) throw new Error("Se requiere el ID del usuario");

            const docRef = doc(db, this.collectionName, this.id);
            await deleteDoc(docRef);
            return {succes: true, message: 'El usuario se elimino con exito'};
        }catch(error){
            console.error('❌ Error eliminando al usuario:', error);
            return {succes: false, error: error.message};
        }
    }
    static async obtenerUsuarioNombre(nombre){
        try{
            const consulta = query(collection(db, 'usuarios'),where('nombre_completo','==',nombre));
            const querySnapshot = await getDocs(consulta);

            const usuarios=[];
            querySnapshot.array.forEach(doc => {
                const data = doc.data();
                usuarios.push({
                    id: doc.id,
                    ...data
                })
            });
        }catch(error){
            console.error('❌ Error al intentar encontrar el usuario:', error)
            return { success: false, error: error.message };
        }
    } 
}