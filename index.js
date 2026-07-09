// index.js - Lógica principal de la página de inicio
import { db, auth } from '/config/firebase-config.js';
import { collection, query, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import Veterinario from '/classes/veterinario.js';

class InicioController {
    constructor() {
        this.vetModel = new Veterinario();
        this.init();
    }

    async init() {
        await this.cargarVeterinariosDestacados();
        await this.cargarUltimasPublicaciones();
        this.setupEventListeners();
    }

    async cargarVeterinariosDestacados() {
        const container = document.getElementById('vets-container');
        if (!container) return;

        try {
            const result = await this.vetModel.obtenerVeterinarios();

            if (!result.success) {
                console.error('Error al cargar veterinarios');
                return;
            }

            const vets = result.data.slice(0, 3);
            container.innerHTML = '';

            vets.forEach(vet => {
                const vetCard = this.crearVetCard(vet);
                container.appendChild(vetCard);
            });

        } catch (error) {
            console.error('Error:', error);
        }
    }

    async cargarUltimasPublicaciones() {
        const container = document.getElementById('forum-container');
        if (!container) return;

        try {
            // Mostrar loading
            container.innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <div style="width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div>
                    <p style="margin-top:12px;color:#64748b;">Cargando publicaciones...</p>
                </div>
                <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            `;

            // Obtener las últimas 3 publicaciones de Firebase
            const pubsRef = collection(db, 'publicaciones');
            const q = query(pubsRef, orderBy('fechaPublicacion', 'desc'), limit(3));
            const querySnapshot = await getDocs(q);
            
            const publicaciones = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                publicaciones.push({ 
                    id: doc.id, 
                    ...data 
                });
            });

            console.log('📊 Publicaciones encontradas:', publicaciones.length);
            
            if (publicaciones.length > 0) {
                console.log('📝 Primera publicación:', publicaciones[0].titulo);
            }

            if (publicaciones.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:40px; background:white; border-radius:16px;">
                        <i class="fas fa-paw" style="font-size:48px; color:#94a3b8;"></i>
                        <h3 style="margin-top:16px; color:#0f172a;">No hay publicaciones aún</h3>
                        <p style="color:#64748b;">Sé el primero en compartir algo con la comunidad</p>
                        <a href="/user/visitor/FormualrioForo/FormularioForo.html" class="btn btn-primary" style="display:inline-block; margin-top:16px; padding:10px 24px; background:#3b82f6; color:white; border-radius:8px; text-decoration:none;">
                            <i class="fas fa-plus"></i> Crear publicación
                        </a>
                    </div>
                `;
                return;
            }

            // Renderizar las publicaciones manualmente (sin usar el componente)
            container.innerHTML = '';
            
            for (let i = 0; i < publicaciones.length; i++) {
                const pub = publicaciones[i];
                const cardHtml = this.crearCardManual(pub);
                container.innerHTML += cardHtml;
            }

        } catch (error) {
            console.error('Error cargando publicaciones:', error);
            container.innerHTML = `
                <div style="text-align:center; padding:40px; background:white; border-radius:16px;">
                    <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#ef4444;"></i>
                    <h3 style="margin-top:16px; color:#0f172a;">Error al cargar publicaciones</h3>
                    <p style="color:#64748b;">${error.message}</p>
                    <button onclick="location.reload()" style="margin-top:16px; padding:8px 20px; background:#3b82f6; color:white; border:none; border-radius:8px; cursor:pointer;">
                        Reintentar
                    </button>
                </div>
            `;
        }
    }

    // Función para crear la card manualmente (sin componente)
    crearCardManual(pub) {
        // Formatear fecha
        let fechaTexto = 'Reciente';
        if (pub.fechaPublicacion) {
            let fechaObj;
            if (pub.fechaPublicacion.toDate) {
                fechaObj = pub.fechaPublicacion.toDate();
            } else if (pub.fechaPublicacion.seconds) {
                fechaObj = new Date(pub.fechaPublicacion.seconds * 1000);
            } else {
                fechaObj = new Date(pub.fechaPublicacion);
            }
            
            const ahora = new Date();
            const diffHoras = Math.floor((ahora - fechaObj) / (1000 * 60 * 60));
            
            if (diffHoras < 1) fechaTexto = 'Hace unos minutos';
            else if (diffHoras < 24) fechaTexto = `Hace ${diffHoras} horas`;
            else if (diffHoras < 48) fechaTexto = 'Ayer';
            else fechaTexto = `Hace ${Math.floor(diffHoras / 24)} días`;
        }
        
        // Obtener imagen
        const foto = (pub.fotos && pub.fotos[0]) ? pub.fotos[0] : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'250\' viewBox=\'0 0 400 250\'%3E%3Crect width=\'400\' height=\'250\' fill=\'%23f1f5f9\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'Arial\' font-size=\'14\' fill=\'%2394a3b8\'%3EPawPath%3C/text%3E%3C/svg%3E';
        
        // Tipo y colores
        let tipoLabel = 'Publicación';
        let tipoBg = '#64748b';
        let tipoIcon = 'fa-paw';
        
        if (pub.tipo === 'Mascota Perdida') {
            tipoLabel = 'Perdido';
            tipoBg = '#ef4444';
            tipoIcon = 'fa-search';
        } else if (pub.tipo === 'Mascota Encontrada') {
            tipoLabel = 'Encontrado';
            tipoBg = '#10b981';
            tipoIcon = 'fa-check-circle';
        } else if (pub.tipo === 'En Adopción') {
            tipoLabel = 'En Adopción';
            tipoBg = '#f59e0b';
            tipoIcon = 'fa-home';
        } else if (pub.tipo === 'Consejo de Cuidado') {
            tipoLabel = 'Consejo';
            tipoBg = '#3b82f6';
            tipoIcon = 'fa-lightbulb';
        } else if (pub.tipo === 'Galería de Fotos') {
            tipoLabel = 'Galería';
            tipoBg = '#8b5cf6';
            tipoIcon = 'fa-images';
        }
        
        // Categoría icono
        let categoriaIcon = 'fa-paw';
        if (pub.categoria === 'Perros') categoriaIcon = 'fa-dog';
        else if (pub.categoria === 'Gatos') categoriaIcon = 'fa-cat';
        else if (pub.categoria === 'Aves') categoriaIcon = 'fa-dove';
        else if (pub.categoria === 'Roedores') categoriaIcon = 'fa-mouse';
        else if (pub.categoria === 'Reptiles') categoriaIcon = 'fa-lizard';
        
        // Nombre del usuario
        let nombreUsuario = pub.usuarioNombre || 'Anónimo';
        
        // Descripción corta
        let descripcion = pub.descripcion || '';
        if (descripcion.length > 120) {
            descripcion = descripcion.substring(0, 120) + '...';
        }
        
        return `
            <div class="publicacion-card" onclick="window.location.href='/user/visitor/foro/detallesforo.html?id=${pub.id}'" style="background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); transition:all 0.3s ease; cursor:pointer; border:1px solid #e2e8f0; margin-bottom:20px;">
                <div class="publicacion-imagen" style="position:relative; height:200px; overflow:hidden;">
                    <img src="${foto}" alt="${this.escapeHtml(pub.titulo)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'250\' viewBox=\'0 0 400 250\'%3E%3Crect width=\'400\' height=\'250\' fill=\'%23f1f5f9\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'Arial\' font-size=\'14\' fill=\'%2394a3b8\'%3EPawPath%3C/text%3E%3C/svg%3E'">
                    <span class="publicacion-tipo" style="position:absolute; top:12px; right:12px; background:${tipoBg}; color:white; padding:6px 12px; border-radius:20px; font-size:11px; font-weight:600; z-index:1;">
                        <i class="fas ${tipoIcon}"></i> ${tipoLabel}
                    </span>
                </div>
                <div class="publicacion-contenido" style="padding:20px;">
                    <div class="publicacion-metadata" style="display:flex; justify-content:space-between; margin-bottom:12px;">
                        <span class="publicacion-categoria" style="background:#f1f5f9; padding:4px 12px; border-radius:20px; font-size:12px;">
                            <i class="fas ${categoriaIcon}"></i> ${pub.categoria || 'Mascota'}
                        </span>
                        <span class="publicacion-tiempo" style="color:#64748b; font-size:12px;">
                            <i class="far fa-clock"></i> ${fechaTexto}
                        </span>
                    </div>
                    <h3 class="publicacion-titulo" style="font-size:18px; font-weight:700; margin-bottom:8px; color:#0f172a;">${this.escapeHtml(pub.titulo)}</h3>
                    <p class="publicacion-descripcion" style="color:#475569; font-size:14px; line-height:1.5; margin-bottom:16px;">${this.escapeHtml(descripcion)}</p>
                    <div class="publicacion-footer" style="display:flex; justify-content:space-between; align-items:center; padding-top:16px; border-top:1px solid #e2e8f0;">
                        <div class="publicacion-estadisticas" style="display:flex; gap:16px; color:#64748b; font-size:13px;">
                            <span><i class="far fa-eye"></i> ${pub.vistas || 0}</span>
                            <span><i class="far fa-heart"></i> ${pub.likes || 0}</span>
                            <span><i class="far fa-comment"></i> ${pub.comentarios || 0}</span>
                        </div>
                        <div class="publicacion-usuario" style="color:#3b82f6; font-size:12px;">
                            <i class="fas fa-user-circle"></i> ${this.escapeHtml(nombreUsuario)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    crearVetCard(vet) {
        const card = document.createElement('div');
        card.className = 'vet-card';

        const inicial = vet.nombre?.charAt(0) || 'V';
        const fotoUrl = vet.foto || null;

        const estrellas = this.vetModel.generarEstrellasHTML(vet.rating);

        card.innerHTML = `
            <div class="vet-card-inner">
                <div class="vet-avatar" style="${fotoUrl ? `background-image: url(${fotoUrl}); background-size: cover; background-position: center;` : ''}">
                    ${!fotoUrl ? inicial : ''}
                </div>
                <div class="vet-info">
                    <h4>${vet.nombre}</h4>
                    <span class="vet-specialty">${vet.specialty}</span>
                    <div class="vet-rating">
                        ${estrellas} 
                        <span class="rating-number">${vet.rating.toFixed(1)}</span>
                        <span class="reviews-count">(${vet.totalReseñas} reseñas)</span>
                    </div>
                    <p class="vet-location">
                        <i class="fas fa-map-marker-alt"></i> 
                        ${vet.location}
                    </p>
                    <p class="vet-clinic">
                        <i class="fas fa-clinic-medical"></i> 
                        ${vet.nombreClinica}
                    </p>
                    <span class="vet-status ${vet.available ? 'available' : 'busy'}">
                        ${vet.available ? 'Disponible hoy' : 'Completo hoy'}
                    </span>
                </div>
                <button class="btn-vet" onclick="inicioController.contactarVet('${vet.id}')">
                    ${vet.available ? 'Agendar Cita' : 'Ver disponibilidad'}
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;

        return card;
    }

    contactarVet(vetId) {
        sessionStorage.setItem('vetSeleccionado', vetId);
        window.location.href = '/user/visitor/citas/citas.html';
    }

    setupEventListeners() {
        // Event listeners adicionales
    }
}

// Función para verificar si el usuario está logueado
function checkUserAuthentication() {
    const sessionData = localStorage.getItem('userSession');
    const authButtons = document.getElementById('auth-buttons-container');
    const userProfile = document.getElementById('user-profile-container');
    const userNameDisplay = document.getElementById('user-name-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    const userAvatar = document.getElementById('user-avatar');

    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            const sessionAge = Date.now() - session.timestamp;
            const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

            if (sessionAge < SESSION_DURATION) {
                if (authButtons) authButtons.style.display = 'none';
                if (userProfile) userProfile.style.display = 'block';

                if (userNameDisplay) {
                    const primerNombre = localStorage.getItem('user_primer_nombre') || '';
                    const apellidoPaterno = localStorage.getItem('user_apellido_paterno') || '';
                    const nombreCompleto = localStorage.getItem('user_nombre_completo') || '';
                    
                    let nombreMostrar = '';
                    
                    if (primerNombre && apellidoPaterno) {
                        nombreMostrar = `${primerNombre} ${apellidoPaterno}`;
                    } else if (primerNombre) {
                        nombreMostrar = primerNombre;
                    } else if (nombreCompleto) {
                        const partes = nombreCompleto.split(' ');
                        if (partes.length >= 2) {
                            nombreMostrar = `${partes[0]} ${partes[1]}`;
                        } else {
                            nombreMostrar = partes[0];
                        }
                    } else if (session.displayName) {
                        const partes = session.displayName.split(' ');
                        if (partes.length >= 2) {
                            nombreMostrar = `${partes[0]} ${partes[1]}`;
                        } else {
                            nombreMostrar = partes[0];
                        }
                    } else {
                        const email = localStorage.getItem('userEmail') || session.email || '';
                        if (email) {
                            nombreMostrar = email.split('@')[0];
                        } else {
                            nombreMostrar = 'Usuario';
                        }
                    }
                    
                    userNameDisplay.textContent = nombreMostrar;
                }

                if (userRoleDisplay) {
                    const rol = localStorage.getItem('user_rol') || session.userRole || 'usuario';
                    const rolesDisplay = {
                        'administrador': 'Administrador',
                        'veterinario': 'Veterinario',
                        'usuario': 'Usuario'
                    };
                    userRoleDisplay.textContent = rolesDisplay[rol] || rol;
                }

                if (userAvatar) {
                    const primerNombre = localStorage.getItem('user_primer_nombre') || 
                                        userNameDisplay?.textContent?.split(' ')[0] || 
                                        'U';
                    const inicial = primerNombre.charAt(0).toUpperCase();
                    userAvatar.textContent = inicial;
                }

                return true;
            } else {
                localStorage.clear();
            }
        } catch (error) {
            console.error('Error:', error);
            localStorage.clear();
        }
    }

    if (authButtons) authButtons.style.display = 'flex';
    if (userProfile) userProfile.style.display = 'none';
    return false;
}

// Inicializar
const inicioController = new InicioController();
window.inicioController = inicioController;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado');
    checkUserAuthentication();

    const btnRegister = document.getElementById('btn-register');
    const btnLogin = document.getElementById('btn-login');
    const btnRegisterCta = document.getElementById('btn-register-cta');
<<<<<<< HEAD
=======

    // 🚀 Ruta relativa sin barra "/" inicial para producción
>>>>>>> 563cb76648ee05c32205c9bb4ce56f8c5b9db7ca
    const urlRedireccionLogin = '/user/visitor/login/login.html';

    if (btnRegister) btnRegister.addEventListener('click', () => window.location.href = urlRedireccionLogin);
    if (btnLogin) btnLogin.addEventListener('click', () => window.location.href = urlRedireccionLogin);
    if (btnRegisterCta) btnRegisterCta.addEventListener('click', () => window.location.href = urlRedireccionLogin);

    window.addEventListener('storage', (e) => {
        if (e.key === 'userSession') checkUserAuthentication();
    });
});

window.selectPlan = function (plan) {
    alert(`Has seleccionado el plan ${plan.toUpperCase()}`);
};

window.contactVet = function (vetName) {
    alert(`Iniciando chat con ${vetName}...`);
};