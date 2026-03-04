// index.js - Lógica principal de la página de inicio

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

// Función para simular veterinarios
function loadVeterinarians() {
    const vets = [
        {
            name: 'Dr. Carlos Méndez',
            specialty: 'Cirugía Veterinaria',
            rating: 4.9,
            location: 'Clínica Central',
            available: true,
        },
        {
            name: 'Dra. Ana López',
            specialty: 'Animales Exóticos',
            rating: 4.8,
            location: 'Hospital Veterinario Norte',
            available: true,
        },
        {
            name: 'Dr. Pedro Sánchez',
            specialty: 'Emergencias 24/7',
            rating: 4.7,
            location: 'Urgencias 24h',
            available: false,
        }
    ];

    const container = document.getElementById('vets-container');
    if (!container) return;
    
    container.innerHTML = '';
    vets.forEach(vet => {
        const vetCard = document.createElement('div');
        vetCard.className = 'vet-card';
        vetCard.innerHTML = `
            <div class="vet-card-inner">
                <div class="vet-avatar">
                    ${vet.name.charAt(0)}
                </div>
                <div class="vet-info">
                    <h4>${vet.name}</h4>
                    <span class="vet-specialty">${vet.specialty}</span>
                    <div class="vet-rating">
                        ${generateStars(vet.rating)} <span class="rating-number">${vet.rating}</span>
                    </div>
                    <p class="vet-location"><i class="fas fa-map-marker-alt"></i> ${vet.location}</p>
                    <span class="vet-status ${vet.available ? 'available' : 'busy'}">
                        ${vet.available ? 'Disponible hoy' : 'Completo hoy'}
                    </span>
                </div>
                <button class="btn-vet" onclick="contactVet('${vet.name}')">
                    ${vet.available ? 'Agendar Cita' : 'Ver disponibilidad'}
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
        container.appendChild(vetCard);
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
window.selectPlan = function(plan) {
    alert(`Has seleccionado el plan ${plan.toUpperCase()}. Serás redirigido a MercadoPago para completar el pago.`);
    // Aquí iría la integración real con MercadoPago
};

window.contactVet = function(vetName) {
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

                // Actualizar información del usuario
                if (userNameDisplay) {
                    // Intentar obtener el nombre del usuario
                    const nombre = session.displayName || 
                                  localStorage.getItem('userEmail')?.split('@')[0] || 
                                  'Usuario';
                    userNameDisplay.textContent = nombre;
                }

                if (userRoleDisplay) {
                    const rol = session.userRole || 'usuario';
                    // Traducir rol a español más amigable
                    const rolesDisplay = {
                        'administrador': 'Administrador',
                        'veterinario': 'Veterinario',
                        'usuario': 'Usuario'
                    };
                    userRoleDisplay.textContent = rolesDisplay[rol] || rol;
                }

                if (userAvatar) {
                    // Mostrar inicial del nombre
                    const inicial = (userNameDisplay?.textContent?.charAt(0) || 'U').toUpperCase();
                    userAvatar.textContent = inicial;
                }

                console.log('✅ Usuario autenticado:', session);
                return true;
            } else {
                // Sesión expirada
                console.log('❌ Sesión expirada');
                localStorage.removeItem('userSession');
                localStorage.removeItem('currentUserId');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('currentUserRole');
            }
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            localStorage.removeItem('userSession');
        }
    }

    // Usuario NO logueado - mostrar botones, ocultar perfil
    if (authButtons) authButtons.style.display = 'flex';
    if (userProfile) userProfile.style.display = 'none';
    return false;
}

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

// Event Listeners principales
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Inicializando index.js');
    
    // Verificar autenticación al cargar la página
    checkUserAuthentication();

    // Botones de registro y login
    const btnRegister = document.getElementById('btn-register');
    const btnLogin = document.getElementById('btn-login');
    const btnRegisterCta = document.getElementById('btn-register-cta');
    const logoutBtn = document.getElementById('logout-btn');

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

    // Botón de cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Cargar datos simulados
    setTimeout(() => {
        loadForumPosts();
        loadVeterinarians();
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