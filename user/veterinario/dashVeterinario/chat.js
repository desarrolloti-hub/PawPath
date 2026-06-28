
class ChatController {

    constructor(){

        this.chatActual = null;

        this.listaChats = document.getElementById("listaChats");

        this.chatMessages = document.getElementById("chatMessages");

        this.input = document.getElementById("mensajeInput");

        this.btnEnviar = document.getElementById("btnEnviar");

        this.inicializar();

    }

    inicializar(){

        this.cargarChatsPrueba();

        this.btnEnviar.addEventListener("click",()=>{

            this.enviarMensaje();

        });

        this.input.addEventListener("keypress",(e)=>{

            if(e.key==="Enter"){

                this.enviarMensaje();

            }

        });

    }

}