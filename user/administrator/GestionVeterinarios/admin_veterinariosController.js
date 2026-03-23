// admin_veterinariosController.js
import { db } from '/config/firebase-config.js';
import { collection, getDocs, doc, getDoc, query, where } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

class Admin_veterinariosController {
    constructor() {
        console.log("🏗️ Inicializando Admin_veterinariosController");
        this.inicializar();
    }

    inicializar() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.cargarVeterinarios();
                this.configurarBuscador();
            });
        } else {
            this.cargarVeterinarios();
            this.configurarBuscador();
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    obtenerIniciales(nombre) {
        if (!nombre) return 'V';
        return nombre.split(' ')
            .map(p => p[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    async cargarVeterinarios() {
        try {
            console.log("🔄 Cargando veterinarios combinando USUARIOS y VETERINARIOS...");

            // 1️⃣ Obtener datos de ESTADO desde usuarios (rol veterinario)
            const usuariosQuery = query(
                collection(db, 'usarios'),
                where('rol', '==', 'veterinario')
            );
            const usuariosSnapshot = await getDocs(usuariosQuery);

            // Crear mapa de usuarios por ID con su estado
            const usuariosMap = new Map();
            usuariosSnapshot.forEach(doc => {
                const data = doc.data();
                usuariosMap.set(doc.id, {
                    suspendido: data.suspendido === true,  // ← Estado de suspensión
                    verificado: data.verificado || false,
                    email: data.email || '',
                    telefono: data.telefono || '',
                    primerNombre: data.primer_nombre || '',
                    segundoNombre: data.segundo_nombre || '',
                    apellidoPat: data.apellido_paterno || '',
                    apellidoMat: data.apellido_materno || '',
                    nombreCompleto: data.nombre_completo || ''
                });
            });

            // 2️⃣ Obtener datos ESPECÍFICOS desde veterinarios
            const veterinariosSnapshot = await getDocs(collection(db, 'veterinarios'));

            // Crear mapa de veterinarios por ID
            const veterinariosMap = new Map();
            veterinariosSnapshot.forEach(doc => {
                const data = doc.data();
                veterinariosMap.set(doc.id, {
                    cedula: data.cedula || '',
                    especialidades: data.especialidades || [],
                    nombreClinica: data.nombreClinica || '',
                    direccion: data.direccion || '',
                    fotoPerfil: data.fotoPerfil || null,
                    fotoClinica: data.fotoClinica || null,
                    duracionCita: data.duracionCita || 60,
                    diasAnticipacion: data.diasAnticipacion || 7
                });
            });

            // 3️⃣ COMBINAR DATOS
            const veterinarios = [];

            usuariosMap.forEach((userData, id) => {
                const vetData = veterinariosMap.get(id) || {};

                veterinarios.push({
                    id: id,
                    // Nombre completo (priorizar de usuarios)
                    nombreCompleto: userData.nombreCompleto ||
                        `${userData.primerNombre} ${userData.segundoNombre} ${userData.apellidoPat} ${userData.apellidoMat}`.trim() ||
                        'Nombre no disponible',

                    // Datos de contacto (desde usuarios)
                    email: userData.email,
                    telefono: userData.telefono,

                    // ✅ ESTADO (desde usuarios)
                    suspendido: userData.suspendido,      // ← Para la clase CSS
                    verificado: userData.verificado,

                    // Datos específicos (desde veterinarios)
                    cedula: vetData.cedula,
                    especialidades: vetData.especialidades,
                    nombreClinica: vetData.nombreClinica,
                    direccion: vetData.direccion,
                    fotoPerfil: vetData.fotoPerfil,
                    fotoClinica: vetData.fotoClinica,
                    duracionCita: vetData.duracionCita,
                    diasAnticipacion: vetData.diasAnticipacion
                });
            });

            console.log(`✅ ${veterinarios.length} veterinarios cargados (estado desde usuarios)`);
            this.renderizarTarjetas(veterinarios);

        } catch (error) {
            console.error("❌ Error cargando veterinarios:", error);
            this.mostrarError("Error al cargar veterinarios");
        }
    }
    renderizarTarjetas(veterinarios) {
        const contenedor = document.getElementById("contenedorVeterinarios");
        if (!contenedor) {
            console.error("❌ No se encontró el elemento 'contenedorVeterinarios'");
            return;
        }

        contenedor.innerHTML = '';

        if (!veterinarios || veterinarios.length === 0) {
            contenedor.innerHTML = '<div class="no-veterinarios">No hay veterinarios registrados</div>';
            return;
        }

        veterinarios.forEach(vet => {
            // ✅ USAR vet.suspendido (desde usuarios)
            const estaSuspendido = vet.suspendido === true;

            const tarjeta = document.createElement('div');
            tarjeta.className = `vet-card ${estaSuspendido ? 'suspendido' : ''}`;

            // Estado a mostrar
            const estadoTexto = estaSuspendido ? 'Suspendido' : 'Activo';
            const estadoClase = estaSuspendido ? 'estado-suspendido' : 'estado-activo';
            const estadoIcono = estaSuspendido ? 'fa-ban' : 'fa-check-circle';

            // Verificación de cuenta
            const verificadoTexto = vet.verificado ? 'Verificado' : 'Pendiente';
            const verificadoClase = vet.verificado ? 'verificado' : 'no-verificado';
            const verificadoIcono = vet.verificado ? 'fa-check-circle' : 'fa-clock';

            // Formatear especialidades
            const especialidadesTexto = vet.especialidades?.length > 0
                ? vet.especialidades.join(' • ')
                : 'No especificadas';

            const nombreMostrar = vet.nombreCompleto || 'Nombre no disponible';

            tarjeta.innerHTML = `
            <div class="vet-card-header">
                <div class="vet-foto" onclick="adminVeterinariosController.verDetalle('${vet.id}')">
                    ${vet.fotoPerfil ?
                    `<img src="${vet.fotoPerfil}" alt="${nombreMostrar}">` :
                    `<div class="avatar-placeholder">${this.obtenerIniciales(nombreMostrar)}</div>`
                }
                </div>
                <div class="vet-info-header">
                    <h3 class="vet-nombre">${this.escapeHtml(nombreMostrar)}</h3>
                    <div class="vet-badges">
                        <span class="vet-badge ${estadoClase}">
                            <i class="fas ${estadoIcono}"></i> ${estadoTexto}
                        </span>
                        <span class="vet-badge ${verificadoClase}">
                            <i class="fas ${verificadoIcono}"></i> ${verificadoTexto}
                        </span>
                    </div>
                    <span class="vet-cedula" onclick="adminVeterinariosController.verCedula('${vet.id}')">
                        <i class="fas fa-id-card"></i> 
                        ${vet.cedula ? 'Ver cédula profesional' : 'Sin cédula registrada'}
                    </span>
                </div>
            </div>
            
            <div class="vet-card-body">
                ${vet.nombreClinica ? `
                    <div class="vet-clinica">
                        <i class="fas fa-clinic-medical"></i> 
                        <strong>${this.escapeHtml(vet.nombreClinica)}</strong>
                    </div>
                ` : ''}
                
                <div class="vet-especialidades">
                    <i class="fas fa-stethoscope"></i>
                    <span>${this.escapeHtml(especialidadesTexto)}</span>
                </div>
                
                <div class="vet-contacto">
                    <div class="contacto-item">
                        <i class="fas fa-envelope"></i>
                        <span>${this.escapeHtml(vet.email || '')}</span>
                    </div>
                    <div class="contacto-item">
                        <i class="fas fa-phone"></i>
                        <span>${this.escapeHtml(vet.telefono || 'Teléfono no disponible')}</span>
                    </div>
                    ${vet.direccion ? `
                        <div class="contacto-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${this.escapeHtml(vet.direccion)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="vet-card-footer">
                <button class="btn-ver" onclick="adminVeterinariosController.verDetalle('${vet.id}')">
                    <i class="fas fa-eye"></i> Ver perfil
                </button>
                <button class="btn-cedula" onclick="adminVeterinariosController.verCedula('${vet.id}')">
                    <i class="fas fa-id-card"></i> Cédula
                </button>
            </div>
        `;

            contenedor.appendChild(tarjeta);
        });
    }

    async verDetalle(id) {
        try {

            // ✅ Consultar en la colección 'usuarios' (NO en veterinarios)
            const docRef = doc(db, 'usarios', id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                Swal.fire('Error', 'Veterinario no encontrado', 'error');
                return;
            }

            const data = docSnap.data();

            // Verificar que realmente sea veterinario
            if (data.rol !== 'veterinario') {
                Swal.fire('Error', 'Este usuario no es veterinario', 'error');
                return;
            }

            // Construir nombre completo
            const nombreCompleto = data.nombre_completo ||
                `${data.primer_nombre || ''} ${data.segundo_nombre || ''} ${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim();

            // Obtener especialidades (pueden estar en usuarios o en veterinarios)
            let especialidades = data.especialidades || [];

            // Si hay datos adicionales en veterinarios, los obtenemos
            try {
                const vetRef = doc(db, 'veterinarios', id);
                const vetSnap = await getDoc(vetRef);
                if (vetSnap.exists()) {
                    const vetData = vetSnap.data();
                    especialidades = vetData.especialidades || especialidades;
                }
            } catch (e) {
                console.log('No hay datos adicionales en veterinarios');
            }

            Swal.fire({
                title: 'Detalles del Veterinario',
                width: '600px',
                html: `
                <div style="text-align: left;">
                    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                        ${data.fotoPerfil ?
                        `<img src="${data.fotoPerfil}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">` :
                        `<div style="width: 100px; height: 100px; border-radius: 50%; background: #667eea; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem;">${this.obtenerIniciales(nombreCompleto)}</div>`
                    }
                        <div>
                            <h3>${this.escapeHtml(nombreCompleto)}</h3>
                            <p><i class="fas fa-clinic-medical"></i> ${this.escapeHtml(data.nombreClinica || 'Clínica no especificada')}</p>
                            <p><i class="fas fa-id-card"></i> Cédula: ${data.cedula || 'No registrada'}</p>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${this.escapeHtml(data.email || 'No especificado')}</p>
                    <p><strong><i class="fas fa-phone"></i> Teléfono:</strong> ${this.escapeHtml(data.telefono || 'No especificado')}</p>
                    <p><strong><i class="fas fa-map-marker-alt"></i> Dirección:</strong> ${this.escapeHtml(data.direccion || 'No especificada')}</p>
                    
                    <hr>
                    
                    <p><strong><i class="fas fa-stethoscope"></i> Especialidades:</strong> ${especialidades.length ? especialidades.join(', ') : 'No especificadas'}</p>
                    <p><strong><i class="fas fa-clock"></i> Duración de cita:</strong> ${data.duracionCita || 60} minutos</p>
                    <p><strong><i class="fas fa-calendar-alt"></i> Anticipación:</strong> ${data.diasAnticipacion || 7} días</p>
                    
                    <hr>
                    
                    <div style="display: flex; gap: 10px;">
                        <span class="vet-badge ${data.suspendido ? 'estado-suspendido' : 'estado-activo'}">
                            <i class="fas ${data.suspendido ? 'fa-ban' : 'fa-check-circle'}"></i> 
                            ${data.suspendido ? 'Suspendido' : 'Activo'}
                        </span>
                        <span class="vet-badge ${data.verificado ? 'verificado' : 'no-verificado'}">
                            <i class="fas ${data.verificado ? 'fa-check-circle' : 'fa-clock'}"></i> 
                            ${data.verificado ? 'Verificado' : 'Pendiente'}
                        </span>
                    </div>
                </div>
            `,
                confirmButtonColor: '#667eea',
                confirmButtonText: 'Cerrar'
            });

        } catch (error) {
            console.error('❌ Error:', error);
            Swal.fire('Error', 'No se pudo cargar el detalle', 'error');
        }
    }
    async verCedula(id) {
        try {

            // 1️⃣ Primero buscar en VETERINARIOS
            const vetRef = doc(db, 'veterinarios', id);
            const vetSnap = await getDoc(vetRef);

            let cedula = null;
            let nombreCompleto = '';

            if (vetSnap.exists()) {
                const vetData = vetSnap.data();
                cedula = vetData.cedula;
                nombreCompleto = vetData.nombreCompleto || '';
                console.log('✅ Cédula encontrada en veterinarios');
            }

            // 2️⃣ Si no está en veterinarios, buscar en USUARIOS
            if (!cedula) {
                const userRef = doc(db, 'usuarios', id);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    cedula = userData.cedula;
                    nombreCompleto = userData.nombre_completo ||
                        `${userData.primer_nombre || ''} ${userData.segundo_nombre || ''} ${userData.apellido_paterno || ''} ${userData.apellido_materno || ''}`.trim();
                    console.log('✅ Cédula encontrada en usuarios');
                }
            }

            if (!cedula) {
                Swal.fire('Sin cédula', 'Este veterinario no tiene cédula registrada', 'info');
                return;
            }

            Swal.fire({
                title: 'Cédula Profesional',
                html: `
                <div style="text-align: left;">
                    <p><strong>Nombre:</strong> ${this.escapeHtml(nombreCompleto)}</p>
                    <p><strong>Cédula:</strong> ${this.escapeHtml(cedula)}</p>
                    <hr>
                    <p class="text-muted">Documento validado por el sistema</p>
                </div>
            `,
                icon: 'success',
                confirmButtonColor: '#667eea'
            });

        } catch (error) {
            console.error('❌ Error:', error);
            Swal.fire('Error', 'No se pudo cargar la cédula', 'error');
        }
    }

    configurarBuscador() {
        const input = document.getElementById('buscarVeterinario');
        if (!input) return;

        let timeoutId;
        input.addEventListener('input', (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.buscarVeterinario(e.target.value);
            }, 300);
        });
    }

    async buscarVeterinario(termino) {
        try {
            console.log('🔍 Buscando veterinarios con término:', termino);

            if (!termino || termino.trim() === '') {
                this.cargarVeterinarios();
                return;
            }

            // 1️⃣ Buscar en la colección USUARIOS con rol veterinario
            const usuariosQuery = query(
                collection(db, 'usarios'),
                where('rol', '==', 'veterinario')
            );
            const usuariosSnapshot = await getDocs(usuariosQuery);

            // 2️⃣ Obtener datos de VETERINARIOS para combinarlos
            const veterinariosSnapshot = await getDocs(collection(db, 'veterinarios'));
            const veterinariosMap = new Map();
            veterinariosSnapshot.forEach(doc => {
                veterinariosMap.set(doc.id, doc.data());
            });

            // 3️⃣ Filtrar y combinar datos
            const terminoLower = termino.toLowerCase().trim();
            const veterinarios = [];

            usuariosSnapshot.forEach(doc => {
                const userData = doc.data();
                const vetData = veterinariosMap.get(doc.id) || {};

                // Construir nombre completo
                const nombreCompleto = userData.nombre_completo ||
                    `${userData.primer_nombre || ''} ${userData.segundo_nombre || ''} ${userData.apellido_paterno || ''} ${userData.apellido_materno || ''}`.trim();

                // Verificar si coincide con el término de búsqueda
                const coincide =
                    nombreCompleto.toLowerCase().includes(terminoLower) ||
                    (userData.email && userData.email.toLowerCase().includes(terminoLower)) ||
                    (vetData.especialidades && vetData.especialidades.some(e => e.toLowerCase().includes(terminoLower))) ||
                    (vetData.nombreClinica && vetData.nombreClinica.toLowerCase().includes(terminoLower)) ||
                    (vetData.cedula && vetData.cedula.toLowerCase().includes(terminoLower));

                if (coincide) {
                    veterinarios.push({
                        id: doc.id,
                        // Datos personales
                        nombreCompleto: nombreCompleto,
                        primerNombre: userData.primer_nombre || '',
                        segundoNombre: userData.segundo_nombre || '',
                        apellidoPat: userData.apellido_paterno || '',
                        apellidoMat: userData.apellido_materno || '',

                        // Contacto
                        email: userData.email || '',
                        telefono: userData.telefono || '',

                        // Estado
                        suspendido: userData.suspendido === true,
                        verificado: userData.verificado || false,

                        // Datos específicos de veterinarios
                        cedula: vetData.cedula || '',
                        especialidades: vetData.especialidades || [],
                        nombreClinica: vetData.nombreClinica || '',
                        direccion: vetData.direccion || '',
                        fotoPerfil: vetData.fotoPerfil || userData.fotoPerfil || null,
                        fotoClinica: vetData.fotoClinica || null,
                        duracionCita: vetData.duracionCita || 60,
                        diasAnticipacion: vetData.diasAnticipacion || 7
                    });
                }
            });

            console.log(`📊 ${veterinarios.length} veterinarios encontrados`);
            this.renderizarTarjetas(veterinarios);

        } catch (error) {
            console.error('❌ Error buscando veterinarios:', error);
            this.mostrarError('Error al buscar veterinarios');
        }
    }

    mostrarError(mensaje) {
        const contenedor = document.getElementById("contenedorVeterinarios");
        if (contenedor) {
            contenedor.innerHTML = `<div class="no-veterinarios error">${mensaje}</div>`;
        }
    }
}

// Inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.adminVeterinariosController = new Admin_veterinariosController();
    });
} else {
    window.adminVeterinariosController = new Admin_veterinariosController();
}