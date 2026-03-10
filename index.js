// index.js - Lógica principal de la página de inicio

// views/inicio/inicioController.js
import { auth } from '/config/firebase-config.js';
import Veterinario from '/classes/Veterinario.js';

class InicioController {
    constructor() {
        this.vetModel = new Veterinario();
        this.init();
    }

    async init() {
        await this.cargarVeterinariosDestacados();
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

            const vets = result.data.slice(0, 3); // Mostrar solo 3 destacados

            container.innerHTML = '';

            vets.forEach(vet => {
                const vetCard = this.crearVetCard(vet);
                container.appendChild(vetCard);
            });

        } catch (error) {
            console.error('Error:', error);
        }
    }

    crearVetCard(vet) {
        const card = document.createElement('div');
        card.className = 'vet-card';

        const inicial = vet.nombre?.charAt(0) || 'V';
        const fotoUrl = vet.foto || null;

        // Usar el método del modelo para generar estrellas
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

    generarEstrellas(rating) {
        const estrellas = [];
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                estrellas.push('<i class="fas fa-star"></i>');
            } else if (i - rating < 1 && i - rating > 0) {
                estrellas.push('<i class="fas fa-star-half-alt"></i>');
            } else {
                estrellas.push('<i class="far fa-star"></i>');
            }
        }
        return estrellas.join('');
    }

    contactarVet(vetId) {
        // Guardar el veterinario seleccionado en sessionStorage
        sessionStorage.setItem('vetSeleccionado', vetId);
        // Redirigir al formulario de citas
        window.location.href = '/user/visitor/citas/citas.html';
    }

    setupEventListeners() {
        // Aquí puedes agregar más event listeners si es necesario
    }
}

// Inicializar
const inicioController = new InicioController();
window.inicioController = inicioController;


// Función para simular datos del foro
function loadForumPosts() {
    const posts = [
        {
            type: 'lost',
            animal: 'Perro',
            breed: 'Golden Retriever',
            location: 'Centro, Ciudad',
            date: 'Hoy 10:30 AM',
            image: 'assets/images/lindo-perro-feliz-jugando-con-un-palo.webp',
            description: 'Se perdió mi perro cerca del parque central. Por favor, cualquier info es urgente.'
        },
        {
            type: 'found',
            animal: 'Gato',
            breed: 'Callejero',
            location: 'Barrio Norte',
            date: 'Ayer 15:45 PM',
            image: 'assets/images/102507751-vista-de-cerca-del-gato-o-gatito-abisinio-sentado-en-la-ventana.webp',
            description: 'Encontré este gato cerca del supermercado. Es muy cariñoso y parece perdido.'
        },
        {
            type: 'rescue',
            animal: 'Pájaro',
            breed: 'Loro',
            location: 'Zona Sur',
            date: '27/01 09:20 AM',
            image: 'assets/images/parrot-4132823_640.webp',
            description: 'Loro herido necesita atención veterinaria urgente. Lo encontré en el parque.'
        }
    ];

    const container = document.getElementById('forum-container');
    if (!container) return;

    container.innerHTML = '';
    posts.forEach(post => {
        const card = document.createElement('forum-card');
        card.setAttribute('data-post', JSON.stringify(post));
        container.appendChild(card);
    });
}





// Función auxiliar para generar estrellas
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Funciones globales (para ser llamadas desde HTML)
window.selectPlan = function (plan) {
    alert(`Has seleccionado el plan ${plan.toUpperCase()}. Serás redirigido a MercadoPago para completar el pago.`);
    // Aquí iría la integración real con MercadoPago
};

window.contactVet = function (vetName) {
    alert(`Iniciando chat con ${vetName}...`);
};

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
            const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días

            // Verificar si la sesión es válida
            if (sessionAge < SESSION_DURATION) {
                // Usuario logueado - mostrar perfil, ocultar botones
                if (authButtons) authButtons.style.display = 'none';
                if (userProfile) userProfile.style.display = 'block';

                // Actualizar información del usuario - NOMBRE Y APELLIDO
                if (userNameDisplay) {
<<<<<<< HEAD
                    // Intentar obtener el nombre del usuario
                    const nombre = session.displayName ||
                        localStorage.getItem('userEmail')?.split('@')[0] ||
                        'Usuario';
                    userNameDisplay.textContent = nombre;
=======
                    // Obtener los datos del localStorage
                    const primerNombre = localStorage.getItem('user_primer_nombre') || '';
                    const segundoNombre = localStorage.getItem('user_segundo_nombre') || '';
                    const apellidoPaterno = localStorage.getItem('user_apellido_paterno') || '';
                    const apellidoMaterno = localStorage.getItem('user_apellido_materno') || '';
                    const nombreCompleto = localStorage.getItem('user_nombre_completo') || '';
                    
                    // Variable para el nombre a mostrar
                    let nombreMostrar = '';
                    
                    // ESTRATEGIA 1: Usar primer nombre + apellido paterno (lo que pediste)
                    if (primerNombre && apellidoPaterno) {
                        nombreMostrar = `${primerNombre} ${apellidoPaterno}`;
                    } 
                    // ESTRATEGIA 2: Si no hay apellido paterno, solo el primer nombre
                    else if (primerNombre) {
                        nombreMostrar = primerNombre;
                    }
                    // ESTRATEGIA 3: Usar el nombre completo guardado
                    else if (nombreCompleto) {
                        const partes = nombreCompleto.split(' ');
                        if (partes.length >= 2) {
                            // Mostrar primer nombre + primer apellido
                            nombreMostrar = `${partes[0]} ${partes[1]}`;
                        } else {
                            nombreMostrar = partes[0];
                        }
                    }
                    // ESTRATEGIA 4: Usar el displayName de la sesión
                    else if (session.displayName) {
                        const partes = session.displayName.split(' ');
                        if (partes.length >= 2) {
                            nombreMostrar = `${partes[0]} ${partes[1]}`;
                        } else {
                            nombreMostrar = partes[0];
                        }
                    }
                    // ESTRATEGIA 5: Usar el email (solo la parte antes del @) como último recurso
                    else {
                        const email = localStorage.getItem('userEmail') || session.email || '';
                        if (email) {
                            nombreMostrar = email.split('@')[0];
                        } else {
                            nombreMostrar = 'Usuario';
                        }
                    }
                    
                    userNameDisplay.textContent = nombreMostrar;
                    console.log('✅ Nombre mostrado:', nombreMostrar); // Para debugging
>>>>>>> b4a62304dc376c9d488e49bac321e9c72824f79f
                }

                // Mostrar el rol del usuario
                if (userRoleDisplay) {
                    const rol = localStorage.getItem('user_rol') || session.userRole || 'usuario';
                    // Traducir rol a español más amigable
                    const rolesDisplay = {
                        'administrador': 'Administrador',
                        'veterinario': 'Veterinario',
                        'usuario': 'Usuario'
                    };
                    userRoleDisplay.textContent = rolesDisplay[rol] || rol;
                }

                // Actualizar el avatar con la inicial del primer nombre
                if (userAvatar) {
                    const primerNombre = localStorage.getItem('user_primer_nombre') || 
                                        userNameDisplay?.textContent?.split(' ')[0] || 
                                        'U';
                    const inicial = primerNombre.charAt(0).toUpperCase();
                    userAvatar.textContent = inicial;
                }

                console.log('✅ Usuario autenticado:', session);
                return true;
            } else {
                // Sesión expirada
                console.log('❌ Sesión expirada');
                localStorage.clear(); // Limpiar todo el localStorage
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            localStorage.clear();
        }
    }

    // Usuario NO logueado - mostrar botones, ocultar perfil
    if (authButtons) authButtons.style.display = 'flex';
    if (userProfile) userProfile.style.display = 'none';
    return false;
}

<<<<<<< HEAD
// Función para cerrar sesión
function handleLogout() {
    // Limpiar localStorage
    localStorage.removeItem('userSession');
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('currentUserRole');

    // Actualizar UI
    checkUserAuthentication();

    // Mostrar mensaje
    alert('Sesión cerrada correctamente');

    // Opcional: recargar la página para resetear todo
    // window.location.reload();
}

=======
>>>>>>> b4a62304dc376c9d488e49bac321e9c72824f79f
// Event Listeners principales
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Inicializando index.js');

    // Verificar autenticación al cargar la página
    checkUserAuthentication();

    // Botones de registro y login
    const btnRegister = document.getElementById('btn-register');
    const btnLogin = document.getElementById('btn-login');
    const btnRegisterCta = document.getElementById('btn-register-cta');

    const urlRedireccionLogin = '/user/visitor/login/login.html';

    if (btnRegister) {
        btnRegister.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = urlRedireccionLogin;
        });
    }

    if (btnLogin) {
        btnLogin.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = urlRedireccionLogin;
        });
    }

    if (btnRegisterCta) {
        btnRegisterCta.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = urlRedireccionLogin;
        });
    }

    // Cargar datos simulados
    setTimeout(() => {
        loadForumPosts();
        // loadVeterinarians();
    }, 100);

    // Escuchar cambios en localStorage (útil si se abre otra pestaña)
    window.addEventListener('storage', (e) => {
        if (e.key === 'userSession' || e.key === null) {
            console.log('🔄 Cambio en localStorage detectado');
            checkUserAuthentication();
        }
    });

    // Evento personalizado para cuando se guarda la sesión
    window.addEventListener('userSessionStored', (event) => {
        console.log('🎯 Evento userSessionStored recibido');
        checkUserAuthentication();
    });
});

// También verificar cuando la página se muestra (por si viene de atrás/adelante)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        console.log('📄 Página cargada desde caché - verificando autenticación');
        checkUserAuthentication();
    }
});

// Debug: Mostrar todos los datos del localStorage (opcional, para desarrollo)
window.debugLocalStorage = function() {
    console.log('📦 Contenido del localStorage:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        console.log(`${key}: ${value}`);
    }
};