import MercadoPagoServie from "/config/mercadopago-services";
import {auth, db} from '/config/firebase-config.js';
import { doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class SuscripcionesController{
    constructor(){
        this.mpService = new MercadoPagoServie();
    }
}