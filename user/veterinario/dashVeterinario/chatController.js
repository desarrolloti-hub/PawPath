import { db } from '/config/firebase-config.js';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { ChatService } from './chatservice.js';

export class ChatController {
    constructor(veterinarioId) {
        this.veterinarioId = veterinarioId;
        this.listaChats = document.getElementById("listaChats");
        this.chatMessages = document.getElementById("chatMessages");
        this.inputMensaje = document.getElementById("mensajeInput");
        this.btnEnviar = document.getElementById("btnEnviar");
        this.chatNombre = document.getElementById("chatNombre");
        this.chatMascota = document.getElementById("chatMascota");
        this.buscarChat = document.getElementById("buscarChat");

        this.chats = [];
        this.chatActual = null;
        this.unsubscribeChats = null;
        this.unsubscribeMensajes = null;

        this.init();
    }

    init() {
        this.setComposerEnabled(false);
        this.cargarChatsRealtime();

        this.btnEnviar?.addEventListener("click", () => this.enviarMensaje());

        this.inputMensaje?.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                this.enviarMensaje();
            }
        });

        this.buscarChat?.addEventListener("input", () => this.renderizarListaChats());
    }

    cargarChatsRealtime() {
        if (!this.listaChats || !this.veterinarioId) return;

        if (this.unsubscribeChats) {
            this.unsubscribeChats();
        }

        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("veterinarioId", "==", this.veterinarioId));

        this.unsubscribeChats = onSnapshot(q, (snapshot) => {
            this.chats = snapshot.docs
                .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
                .sort((a, b) => this.timestampMs(b.ultimaActualizacion) - this.timestampMs(a.ultimaActualizacion));

            this.renderizarListaChats();

            if (!this.chatActual && this.chats.length > 0) {
                this.abrirChat(this.chats[0]);
            }
        }, (error) => {
            console.error("Error cargando chats:", error);
            this.listaChats.innerHTML = '<div class="empty-chat-sidebar">No se pudieron cargar los mensajes.</div>';
        });
    }

    renderizarListaChats() {
        if (!this.listaChats) return;

        const filtro = (this.buscarChat?.value || "").trim().toLowerCase();
        const chatsFiltrados = this.chats.filter(chat => {
            const texto = [
                chat.nombreMascota,
                chat.usuarioEmail,
                chat.ultimoMensaje
            ].join(" ").toLowerCase();

            return texto.includes(filtro);
        });

        this.listaChats.innerHTML = "";

        if (chatsFiltrados.length === 0) {
            this.listaChats.innerHTML = '<div class="empty-chat-sidebar">No hay conversaciones activas.</div>';
            return;
        }

        chatsFiltrados.forEach(chat => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = `chat-item ${this.chatActual?.id === chat.id ? "active" : ""}`;
            item.innerHTML = `
                <div class="chat-avatar">
                    <i class="fas fa-paw"></i>
                </div>
                <div class="chat-item-info">
                    <h4>${this.escapeHTML(chat.nombreMascota || "Mascota")}</h4>
                    <span>${this.escapeHTML(chat.usuarioEmail || "Cliente")}</span>
                    <small class="last-msg">${this.escapeHTML(chat.ultimoMensaje || "Sin mensajes aun")}</small>
                </div>
                <time>${this.formatearHora(chat.ultimaActualizacion)}</time>
            `;
            item.addEventListener("click", () => this.abrirChat(chat));
            this.listaChats.appendChild(item);
        });
    }

    enfocarChatAutomatico(usuarioId, veterinarioId) {
        setTimeout(() => {
            const chat = this.chats.find(item =>
                item.usuarioId === usuarioId && item.veterinarioId === veterinarioId
            );

            if (chat) {
                this.abrirChat(chat);
            }
        }, 600);
    }

    abrirChat(chat) {
        if (!chat?.id) return;

        this.chatActual = chat;
        this.setComposerEnabled(true);

        if (this.chatNombre) {
            this.chatNombre.textContent = chat.usuarioEmail || "Cliente";
        }

        if (this.chatMascota) {
            this.chatMascota.textContent = `Mascota: ${chat.nombreMascota || "No especificada"}`;
        }

        if (this.chatMessages) {
            this.chatMessages.innerHTML = "";
        }

        this.renderizarListaChats();

        if (this.unsubscribeMensajes) {
            this.unsubscribeMensajes();
        }

        this.unsubscribeMensajes = ChatService.escucharMensajes(chat.id, (mensajes) => {
            this.chatMessages.innerHTML = "";

            if (mensajes.length === 0) {
                this.chatMessages.innerHTML = `
                    <div class="empty-chat">
                        <i class="fas fa-comments"></i>
                        <p>Todavia no hay mensajes.</p>
                    </div>
                `;
                return;
            }

            mensajes.forEach(mensaje => {
                const tipo = mensaje.emisorTipo === "veterinario" ? "sent" : "received";
                this.agregarMensaje(mensaje, tipo);
            });
        });
    }

    agregarMensaje(mensaje, tipo) {
        const div = document.createElement("div");
        div.className = `message ${tipo}`;
        div.innerHTML = `
            <div class="message-text">${this.escapeHTML(mensaje.texto || "")}</div>
            <div class="message-time">${this.formatearHora(mensaje.fecha)}</div>
        `;

        this.chatMessages.appendChild(div);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    async enviarMensaje() {
        if (!this.chatActual || !this.inputMensaje || this.btnEnviar?.disabled) return;

        const texto = this.inputMensaje.value.trim();

        if (!texto) return;

        this.btnEnviar.disabled = true;

        try {
            await ChatService.enviarMensaje(this.chatActual.id, {
                texto,
                emisorId: this.veterinarioId,
                emisorTipo: "veterinario"
            });

            this.inputMensaje.value = "";
        } catch (error) {
            console.error("Error enviando mensaje:", error);
        } finally {
            this.btnEnviar.disabled = false;
            this.inputMensaje.focus();
        }
    }

    setComposerEnabled(enabled) {
        if (this.inputMensaje) {
            this.inputMensaje.disabled = !enabled;
            this.inputMensaje.placeholder = enabled ? "Escribe un mensaje..." : "Selecciona una conversacion";
        }

        if (this.btnEnviar) {
            this.btnEnviar.disabled = !enabled;
        }
    }

    timestampMs(timestamp) {
        if (!timestamp) return 0;
        if (timestamp.toDate) return timestamp.toDate().getTime();
        if (timestamp.seconds) return timestamp.seconds * 1000;
        return new Date(timestamp).getTime() || 0;
    }

    formatearHora(timestamp) {
        const ms = this.timestampMs(timestamp);

        if (!ms) return "";

        return new Date(ms).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    escapeHTML(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
