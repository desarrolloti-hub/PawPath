import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import { db } from "../../../config/firebase-config.js";

export class ChatService {

    static async crearChatSiNoExiste(cita) {

        const chatsRef = collection(db, "chats");

        const q = query(
            chatsRef,
            where("usuarioId", "==", cita.usuarioId),
            where("veterinarioId", "==", cita.veterinarioId)
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

}