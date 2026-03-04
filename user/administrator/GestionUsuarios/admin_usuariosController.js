import Usuarios from '/classes/admin_usuarios.js';
class UsuariosController{
    constructor(){
        this.tablaUsuarios=document.querySelector("#tablaUsuarios tbody");

        this.inicializar();
    }
}