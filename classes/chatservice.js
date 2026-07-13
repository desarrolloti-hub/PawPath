import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { db } from "../config/firebase-config.js";

export class ChatService {

    static async crearChatSiNoExiste(cita) {
        console.log(cita);
        const chatsRef = collection(db, "chats");

        const q = query(
            chatsRef,
            where("citaId", "==", cita.id)
        );

        const resultado = await getDocs(q);

        if (!resultado.empty) {

            return resultado.docs[0].id;

        }


        const nuevoChat = {

            usuarioId: cita.usuarioId,

            veterinarioId: cita.veterinarioId,

            mascotaId: cita.mascotaId,

            citaId: cita.id,

            nombreMascota: cita.nombreMascota,

            veterinarioNombre: cita.veterinarioNombre,

            usuarioEmail: cita.usuarioEmail,

            ultimoMensaje: "",

            ultimaActualizacion: serverTimestamp(),

            activo: true

        };


        const chatCreado = await addDoc(chatsRef, nuevoChat);

        return chatCreado.id;

    }
    static async enviarMensaje(chatId, mensaje) {

        const mensajesRef = collection(
            db,
            "chats",
            chatId,
            "mensajes"
        );

        await addDoc(mensajesRef, {
            texto: mensaje.texto,
            emisorId: mensaje.emisorId,
            emisorTipo: mensaje.emisorTipo,
            fecha: serverTimestamp()
        });

        await updateDoc(
            doc(db, "chats", chatId),
            {
                ultimoMensaje: mensaje.texto,
                ultimaActualizacion: serverTimestamp()
            }
        );

    }
    static escucharMensajes(chatId, callback) {

        const mensajesRef = collection(
            db,
            "chats",
            chatId,
            "mensajes"
        );

        const q = query(
            mensajesRef,
            orderBy("fecha", "asc")
        );

        return onSnapshot(q, (snapshot) => {

            const mensajes = [];

            snapshot.forEach(doc => {

                mensajes.push({
                    id: doc.id,
                    ...doc.data()
                });

            });

            callback(mensajes);

        });

    }

}
