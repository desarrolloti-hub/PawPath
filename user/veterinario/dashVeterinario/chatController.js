import { db } from '/config/firebase-config.js';
import { collection, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { ChatService } from './chatservice.js';

export class ChatController {
    constructor() {
        // IDs reales mapeados desde tu veterinario.html
        this.listaChats = document.getElementById("listaChats");
        this.chatMessages = document.getElementById("chatMessages");
        this.inputMensaje = document.getElementById("mensajeInput");
        this.btnEnviar = document.getElementById("btnEnviar");
        
        this.chatActual = null;
        this.init();
    }

    init() {
        this.cargarChatsRealtime(); // Aquí conectarás tu escucha activa de chats

        if (this.btnEnviar) {
            this.btnEnviar.addEventListener("click", () => this.enviarMensaje());
        }
        if (this.inputMensaje) {
            this.inputMensaje.addEventListener("keydown", (e) => {
                if (e.key === "Enter") this.enviarMensaje();
            });
        }
    }
    
    cargarChatsRealtime() {
        // 1. Apuntamos a la colección de chats en tu Firebase
        const chatsRef = collection(db, "chats");
        
        // 2. Traemos los chats ordenados por la última actualización
        const q = query(chatsRef, orderBy("ultimaActualizacion", "desc"));

        // 3. Oímos en tiempo real (onSnapshot) cada vez que la base de datos cambie
        onSnapshot(q, (snapshot) => {
            this.listaChats.innerHTML = ""; // Limpiamos la barra lateral para no duplicar

            if (snapshot.empty) {
                this.listaChats.innerHTML = '<p class="no-chats">No hay conversaciones activas</p>';
                return;
            }

            snapshot.forEach((doc) => {
                const chatData = doc.data();
                const chatId = doc.id;

                // Creamos el elemento visual en la lista lateral
                const item = document.createElement("div");
                item.className = `chat-item ${this.chatActual?.id === chatId ? 'active' : ''}`;
                
                // Usamos los datos reales traídos desde Firebase Firestore
                item.innerHTML = `
                    <div class="chat-item-info">
                        <h4>🐶 ${chatData.nombreMascota || 'Mascota'}</h4>
                        <span>Owner: ${chatData.usuarioEmail || 'Cliente'}</span>
                        <small class="last-msg">${chatData.ultimoMensaje || 'Sin mensajes aún'}</small>
                    </div>
                `;

                // Al hacerle clic, abrimos la conversación pasándole los datos y el ID de Firebase
                item.onclick = () => this.abrirChat({ id: chatId, ...chatData });

                this.listaChats.appendChild(item);
            });
        });
    }

    // Método que llamará vetController para enfocar el chat recién creado
    async enfocarChatAutomatico(usuarioId, veterinarioId) {
        console.log("Enfocando chat automático para el usuario:", usuarioId);
        
        // Le damos un pequeño tiempo (500ms) a Firebase para que registre el chat nuevo
        setTimeout(() => {
            // Buscamos en la lista lateral el chat que coincida con el ID del usuario que agendó
            const items = this.listaChats.querySelectorAll('.chat-item');
            let chatEncontrado = false;

            items.forEach(item => {
                // Buscamos si este elemento visual pertenece al cliente actual
                if (item.innerHTML.includes(usuarioId) || item.innerText.includes(usuarioId)) {
                    item.click(); // ¡Simulamos un click automático para abrirlo!
                    chatEncontrado = true;
                }
            });

            // Si es un chat totalmente nuevo y aún no se dibuja en la lista lateral, 
            // forzamos a la pantalla principal a poner los datos del cliente temporalmente
            if (!chatEncontrado) {
                this.chatActual = { id: `chat_${usuarioId}`, usuarioId: usuarioId, veterinarioId: veterinarioId };
                if (this.chatNombre) this.chatNombre.textContent = "Nuevo Cliente (Cita Agendada)";
                if (this.chatMascota) this.chatMascota.textContent = "Cargando canal de mensajes...";
                if (this.chatMessages) this.chatMessages.innerHTML = '<div class="empty-chat">¡Canal listo! Escribe un mensaje para iniciar la conversación.</div>';
            }
        }, 600);
    }
    
    abrirChat(chat) {

        this.chatActual = chat;

        document.getElementById("chatNombre").textContent = chat.propietario;

        document.getElementById("chatMascota").textContent =
            "Mascota: " + chat.mascota;

        this.chatMessages.innerHTML = "";

        this.agregarMensaje("Hola doctor.", "received");

        this.agregarMensaje("Hola, ¿cómo está tu mascota?", "sent");

    }

    agregarMensaje(texto, tipo) {

        const div = document.createElement("div");

        div.className = `message ${tipo}`;

        div.innerHTML = `

            ${texto}

            <div class="message-time">

                ${new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                })}

            </div>

        `;

        this.chatMessages.appendChild(div);

        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    }

    enviarMensaje() {

        if (!this.chatActual) return;

        const texto = this.inputMensaje.value.trim();

        if (texto === "") return;

        this.agregarMensaje(texto, "sent");

        this.inputMensaje.value = "";

    }

}