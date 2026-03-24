// admin_veterinariosController.js
import { db } from '/config/firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
            console.log("🔄 Cargando veterinarios...");
            
            const querySnapshot = await getDocs(collection(db, 'veterinarios'));
            const veterinarios = [];

            querySnapshot.forEach(doc => {
                const data = doc.data();
                
                // ✅ SOLO los campos que debe ver el administrador
                veterinarios.push({
                    id: doc.id,
                    // Datos personales
                    nombreCompleto: data.nombreCompleto || '',
                    primerNombre: data.primerNombre || '',
                    segundoNombre: data.segundoNombre || '',
                    apellidoPat: data.apellidoPat || '',
                    apellidoMat: data.apellidoMat || '',
                    
                    // Contacto
                    email: data.email || '',
                    telefono: data.telefono || '',
                    
                    // Profesional
                    cedula: data.cedula || '',
                    especialidades: data.especialidades || [],
                    
                    // Clínica
                    nombreClinica: data.nombreClinica || '',
                    direccion: data.direccion || '',
                    
                    // Fotos
                    fotoPerfil: data.fotoPerfil || null,
                    fotoClinica: data.fotoClinica || null,
                    
                    // Estado
                    activo: data.activo !== undefined ? data.activo : true,
                    verificado: data.verificado || false,
                    
                    // Configuración
                    duracionCita: data.duracionCita || 60,
                    diasAnticipacion: data.diasAnticipacion || 7
                });
            });

            console.log(`✅ ${veterinarios.length} veterinarios cargados`);
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
            const tarjeta = document.createElement('div');
            tarjeta.className = `vet-card ${!vet.activo ? 'suspendido' : ''}`;
            
            // Estado a mostrar
            const estadoTexto = vet.activo ? 'Activo' : 'Suspendido';
            const estadoClase = vet.activo ? 'estado-activo' : 'estado-suspendido';
            const estadoIcono = vet.activo ? 'fa-check-circle' : 'fa-ban';
            
            // Verificación de cuenta
            const verificadoTexto = vet.verificado ? 'Verificado' : 'Pendiente';
            const verificadoClase = vet.verificado ? 'verificado' : 'no-verificado';
            const verificadoIcono = vet.verificado ? 'fa-check-circle' : 'fa-clock';

            // Formatear especialidades
            const especialidadesTexto = vet.especialidades?.length > 0 
                ? vet.especialidades.join(' • ') 
                : 'No especificadas';

            // Nombre a mostrar (priorizar nombreCompleto)
            const nombreMostrar = vet.nombreCompleto || 
                `${vet.primerNombre || ''} ${vet.segundoNombre || ''} ${vet.apellidoPat || ''} ${vet.apellidoMat || ''}`.trim() || 
                'Nombre no disponible';

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
            const docRef = doc(db, 'veterinarios', id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                Swal.fire('Error', 'Veterinario no encontrado', 'error');
                return;
            }

            const data = docSnap.data();
            
            // Construir nombre completo
            const nombreCompleto = data.nombreCompleto || 
                `${data.primerNombre || ''} ${data.segundoNombre || ''} ${data.apellidoPat || ''} ${data.apellidoMat || ''}`.trim();

            // Formatear horario si existe
            let horarioTexto = 'No configurado';
            if (data.horarioSemanal) {
                const diasActivos = data.horarioSemanal.filter(d => d.activo).length;
                horarioTexto = `${diasActivos} días configurados`;
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
                        
                        <p><strong><i class="fas fa-stethoscope"></i> Especialidades:</strong> ${data.especialidades?.length ? data.especialidades.join(', ') : 'No especificadas'}</p>
                        <p><strong><i class="fas fa-clock"></i> Duración de cita:</strong> ${data.duracionCita || 60} minutos</p>
                        <p><strong><i class="fas fa-calendar-alt"></i> Anticipación:</strong> ${data.diasAnticipacion || 7} días</p>
                        <p><strong><i class="fas fa-clock"></i> Horario:</strong> ${horarioTexto}</p>
                        
                        <hr>
                        
                        <div style="display: flex; gap: 10px;">
                            <span class="vet-badge ${data.activo ? 'estado-activo' : 'estado-suspendido'}">
                                <i class="fas ${data.activo ? 'fa-check-circle' : 'fa-ban'}"></i> 
                                ${data.activo ? 'Activo' : 'Suspendido'}
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
            const docRef = doc(db, 'veterinarios', id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                Swal.fire('Error', 'Veterinario no encontrado', 'error');
                return;
            }

            const data = docSnap.data();
            
            if (!data.cedula) {
                Swal.fire('Sin cédula', 'Este veterinario no tiene cédula registrada', 'info');
                return;
            }

            Swal.fire({
                title: 'Cédula Profesional',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Nombre:</strong> ${this.escapeHtml(data.nombreCompleto || '')}</p>
                        <p><strong>Cédula:</strong> ${this.escapeHtml(data.cedula)}</p>
                        <p><strong>Especialidades:</strong> ${data.especialidades?.length ? data.especialidades.join(', ') : 'No especificadas'}</p>
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
            if (!termino || termino.trim() === '') {
                this.cargarVeterinarios();
                return;
            }

            const querySnapshot = await getDocs(collection(db, 'veterinarios'));
            const veterinarios = [];
            const terminoLower = termino.toLowerCase().trim();

            querySnapshot.forEach(doc => {
                const data = doc.data();
                
                const nombreCompleto = (data.nombreCompleto || '').toLowerCase();
                const primerNombre = (data.primerNombre || '').toLowerCase();
                const apellidoPat = (data.apellidoPat || '').toLowerCase();
                const email = (data.email || '').toLowerCase();
                const clinica = (data.nombreClinica || '').toLowerCase();
                const especialidades = (data.especialidades?.join(' ') || '').toLowerCase();
                
                if (nombreCompleto.includes(terminoLower) || 
                    primerNombre.includes(terminoLower) || 
                    apellidoPat.includes(terminoLower) || 
                    email.includes(terminoLower) || 
                    clinica.includes(terminoLower) || 
                    especialidades.includes(terminoLower)) {
                    
                    veterinarios.push({
                        id: doc.id,
                        nombreCompleto: data.nombreCompleto || '',
                        primerNombre: data.primerNombre || '',
                        segundoNombre: data.segundoNombre || '',
                        apellidoPat: data.apellidoPat || '',
                        apellidoMat: data.apellidoMat || '',
                        email: data.email || '',
                        telefono: data.telefono || '',
                        cedula: data.cedula || '',
                        especialidades: data.especialidades || [],
                        nombreClinica: data.nombreClinica || '',
                        direccion: data.direccion || '',
                        fotoPerfil: data.fotoPerfil || null,
                        fotoClinica: data.fotoClinica || null,
                        activo: data.activo !== undefined ? data.activo : true,
                        verificado: data.verificado || false,
                        duracionCita: data.duracionCita || 60,
                        diasAnticipacion: data.diasAnticipacion || 7
                    });
                }
            });

            this.renderizarTarjetas(veterinarios);

        } catch (error) {
            console.error('❌ Error buscando:', error);
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