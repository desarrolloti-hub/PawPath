// ============================================================
// dashboard.js - Panel de Administrador con datos REALES
// ============================================================

// Importar las clases existentes
import Admin_usuarios from '/classes/admin_usuarios.js';
import Mascota from '/classes/mascotas.js';
import Veterinario from '/classes/veterinario.js';
import { db } from '/config/firebase-config.js';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ============================================================
// RELOJ EN TIEMPO REAL
// ============================================================
function actualizarReloj() {
    const clockElement = document.getElementById('clock');
    if (!clockElement) return;
    const ahora = new Date();
    const opciones = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    clockElement.textContent = ahora.toLocaleDateString('es-ES', opciones);
}
setInterval(actualizarReloj, 1000);
actualizarReloj();

// ============================================================
// DOMContentLoaded
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    // El sidebar se carga como componente, pero el toggle lo manejamos desde el componente mismo
    // Solo necesitamos asegurarnos de que el botón existe
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        console.log('✅ Botón hamburguesa encontrado');
    } else {
        console.warn('⚠️ No se encontró #menuToggle');
    }

    // Cargar datos reales
    await cargarDatosReales();
});

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================
async function cargarDatosReales() {
    try {
        // 1. Usuarios
        const resultadoUsuarios = await Admin_usuarios.obtenerUsuarios();
        const usuarios = resultadoUsuarios.success ? resultadoUsuarios.usuarios : [];
        const totalUsuarios = usuarios.length;

        // 2. Mascotas
        const resultadoMascotas = await Mascota.obtenerTodas();
        const mascotas = resultadoMascotas.success ? resultadoMascotas.mascotas : [];
        const totalMascotas = mascotas.length;

        // 3. Veterinarios
        const veterinarioInstance = new Veterinario();
        const resultadoVets = await veterinarioInstance.obtenerVeterinarios();
        const veterinarios = resultadoVets.success ? resultadoVets.data : [];
        const totalVets = veterinarios.length;

        // 4. Citas
        const citasSnapshot = await getDocs(collection(db, 'citas'));
        const citas = [];
        citasSnapshot.forEach(doc => citas.push({ id: doc.id, ...doc.data() }));
        const totalCitas = citas.length;
        const pendientes = citas.filter(c => c.estado === 'pendiente').length;
        const concluidas = citas.filter(c => c.estado === 'concluida').length;

        // 5. Publicaciones foro
        const publicacionesSnapshot = await getDocs(collection(db, 'publicaciones'));
        const totalPublicaciones = publicacionesSnapshot.size;

        // 6. Mascotas perdidas (suponiendo campo 'estado' = 'perdida')
        const perdidasQuery = query(collection(db, 'mascotas'), where('estado', '==', 'perdida'));
        const perdidasSnapshot = await getDocs(perdidasQuery);
        const totalPerdidas = perdidasSnapshot.size;

        // ===== ACTUALIZAR ESTADÍSTICAS (con verificación de existencia) =====
        setTextContent('totalUsers', totalUsuarios);
        setTextContent('totalPets', totalMascotas);
        setTextContent('totalVets', totalVets);
        setTextContent('totalCitas', totalCitas);
        setTextContent('totalPublicaciones', totalPublicaciones);
        setTextContent('totalPerdidas', totalPerdidas);
        setTextContent('totalPendientes', pendientes);
        setTextContent('totalConcluidas', concluidas);

        // Welcome box
        setTextContent('welcomeUsers', totalUsuarios);
        setTextContent('welcomePets', totalMascotas);
        setTextContent('welcomeCitas', totalCitas);

        // ===== GRÁFICO DE BARRAS =====
        const meses = obtenerUltimos6Meses();
        const citasPorMes = contarCitasPorMes(citas, meses);
        renderChart(meses, citasPorMes);

        // ===== GRÁFICO DE DONA (Especies) =====
        const especies = contarEspecies(mascotas);
        renderDonut(especies);

        // ===== TABLA DE ÚLTIMOS USUARIOS (ordenados por fecha) =====
        const usuariosOrdenados = [...usuarios].sort((a, b) => {
            const fechaA = a.fecha_registro ? new Date(a.fecha_registro) : new Date(0);
            const fechaB = b.fecha_registro ? new Date(b.fecha_registro) : new Date(0);
            return fechaB - fechaA;
        });
        const ultimosUsuarios = usuariosOrdenados.slice(0, 5);
        renderTablaUsuarios(ultimosUsuarios);

        // ===== ACTIVIDAD RECIENTE =====
        const actividad = await obtenerActividadReciente(usuarios, citas, publicacionesSnapshot);
        renderActividad(actividad);

        // ===== TOP ESPECIES =====
        renderTopEspecies(especies);

        console.log('✅ Dashboard actualizado con datos reales');
    } catch (error) {
        console.error('❌ Error al cargar datos reales:', error);
        // Mostrar mensaje en la interfaz
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML += `
                <div style="grid-column: 1/-1; color: red; text-align:center; padding:1rem; background: #fee2e2; border-radius: 12px;">
                    ⚠️ No se pudieron cargar los datos. Revisa la consola.
                </div>
            `;
        }
    }
}

// ===== UTILIDAD PARA SETEAR TEXTO DE FORMA SEGURA =====
function setTextContent(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value !== undefined && value !== null ? value.toLocaleString() : '0';
    } else {
        console.warn(`⚠️ Elemento con ID "${id}" no encontrado`);
    }
}

// ============================================================
// GRÁFICO DE BARRAS
// ============================================================
function obtenerUltimos6Meses() {
    const meses = [];
    const ahora = new Date();
    for (let i = 5; i >= 0; i--) {
        const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const nombre = fecha.toLocaleString('es-ES', { month: 'short' });
        meses.push({ año: fecha.getFullYear(), mes: fecha.getMonth(), nombre });
    }
    return meses;
}

function contarCitasPorMes(citas, meses) {
    const conteo = meses.map(() => 0);
    citas.forEach(cita => {
        if (!cita.fecha) return;
        let fechaCita;
        if (cita.fecha.seconds) {
            fechaCita = new Date(cita.fecha.seconds * 1000);
        } else if (cita.fecha instanceof Date) {
            fechaCita = cita.fecha;
        } else {
            fechaCita = new Date(cita.fecha);
        }
        if (isNaN(fechaCita.getTime())) return;
        const mesCita = fechaCita.getMonth();
        const añoCita = fechaCita.getFullYear();
        meses.forEach((m, index) => {
            if (m.mes === mesCita && m.año === añoCita) {
                conteo[index]++;
            }
        });
    });
    return conteo;
}

function renderChart(meses, conteo) {
    const container = document.getElementById('chartBars');
    if (!container) return;
    const max = Math.max(...conteo, 1);
    container.innerHTML = '';
    meses.forEach((m, index) => {
        const height = (conteo[index] / max) * 100;
        const barItem = document.createElement('div');
        barItem.className = 'bar-item';
        barItem.innerHTML = `
            <div class="bar" style="height: ${Math.max(height, 5)}%; background: ${getColor(index)};"></div>
            <span class="bar-label">${m.nombre}</span>
        `;
        container.appendChild(barItem);
    });
}

function getColor(index) {
    const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#3b82f6', '#2563eb'];
    return colors[index % colors.length];
}

// ============================================================
// GRÁFICO DE DONA (Especies)
// ============================================================
function contarEspecies(mascotas) {
    const conteo = {};
    mascotas.forEach(m => {
        const especie = m.especie || 'Otro';
        conteo[especie] = (conteo[especie] || 0) + 1;
    });
    return conteo;
}

function renderDonut(especies) {
    const container = document.getElementById('donutContainer');
    if (!container) return;
    const total = Object.values(especies).reduce((a, b) => a + b, 0);
    if (total === 0) {
        container.innerHTML = '<p style="color:#94a3b8;">Sin datos de especies</p>';
        return;
    }
    const colores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    let acumulado = 0;
    const segments = [];
    Object.entries(especies).forEach(([nombre, cantidad], i) => {
        const porcentaje = (cantidad / total) * 100;
        segments.push({
            nombre,
            cantidad,
            porcentaje,
            color: colores[i % colores.length],
            inicio: acumulado,
            fin: acumulado + porcentaje
        });
        acumulado += porcentaje;
    });

    const gradiente = segments.map(s => `${s.color} ${s.inicio}% ${s.fin}%`).join(', ');
    const donutHTML = `
        <div class="donut" style="background: conic-gradient(${gradiente});">
            <div class="donut-center">${total}</div>
        </div>
        <div class="donut-legend">
            ${segments.map(s => `
                <div class="legend-item">
                    <span class="legend-color" style="background:${s.color}"></span>
                    ${s.nombre} (${s.cantidad})
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = donutHTML;
}

// ============================================================
// TABLA DE USUARIOS
// ============================================================
function renderTablaUsuarios(usuarios) {
    const tbody = document.getElementById('lastUsersBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">No hay usuarios registrados</td></tr>';
        return;
    }
    usuarios.forEach(user => {
        const tr = document.createElement('tr');
        const estadoClass = user.estado === 'activo' ? 'activo' : 'suspendido';
        let fechaMostrar = 'No disponible';
        if (user.fecha_registro && user.fecha_registro !== 'No disponible') {
            const fecha = new Date(user.fecha_registro);
            if (!isNaN(fecha.getTime())) {
                fechaMostrar = fecha.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }
        tr.innerHTML = `
            <td><strong>${user.nombre} ${user.apellidos}</strong></td>
            <td>${user.email}</td>
            <td>${fechaMostrar}</td>
            <td><span class="status-badge ${estadoClass}">${user.estado}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================
// ACTIVIDAD RECIENTE
// ============================================================
async function obtenerActividadReciente(usuarios, citas, publicacionesSnapshot) {
    const eventos = [];

    // Usuarios nuevos
    usuarios.forEach(user => {
        let fecha = new Date();
        if (user.fecha_registro && user.fecha_registro !== 'No disponible') {
            const f = new Date(user.fecha_registro);
            if (!isNaN(f.getTime())) fecha = f;
        }
        eventos.push({
            tipo: 'usuario',
            fecha: fecha,
            texto: `<strong>${user.nombre} ${user.apellidos}</strong> se registró`,
            icono: 'fa-user-plus'
        });
    });

    // Citas
    citas.forEach(cita => {
        let fecha = new Date();
        if (cita.fechaCreacion) {
            if (cita.fechaCreacion.seconds) fecha = new Date(cita.fechaCreacion.seconds * 1000);
            else if (cita.fechaCreacion instanceof Date) fecha = cita.fechaCreacion;
            else fecha = new Date(cita.fechaCreacion);
        }
        const estado = cita.estado || 'creada';
        const icono = estado === 'pendiente' ? 'fa-clock' :
                      estado === 'aceptada' ? 'fa-check-circle' :
                      estado === 'concluida' ? 'fa-flag-checkered' : 'fa-calendar';
        eventos.push({
            tipo: 'cita',
            fecha: fecha,
            texto: `Cita <strong>${estado}</strong> para ${cita.nombreMascota || 'mascota'}`,
            icono: icono
        });
    });

    // Publicaciones foro
    publicacionesSnapshot.forEach(doc => {
        const data = doc.data();
        let fecha = new Date();
        if (data.fechaPublicacion) {
            if (data.fechaPublicacion.seconds) fecha = new Date(data.fechaPublicacion.seconds * 1000);
            else fecha = new Date(data.fechaPublicacion);
        }
        eventos.push({
            tipo: 'foro',
            fecha: fecha,
            texto: `Nueva publicación: <strong>${data.titulo || 'sin título'}</strong>`,
            icono: 'fa-comment'
        });
    });

    eventos.sort((a, b) => b.fecha - a.fecha);
    return eventos.slice(0, 5);
}

function renderActividad(eventos) {
    const container = document.getElementById('activityList');
    if (!container) return;
    container.innerHTML = '';
    if (eventos.length === 0) {
        container.innerHTML = '<li class="activity-item">No hay actividad reciente</li>';
        return;
    }
    eventos.forEach(evento => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        const tiempo = tiempoDesde(evento.fecha);
        li.innerHTML = `
            <div class="activity-icon"><i class="fas ${evento.icono}"></i></div>
            <span class="activity-text">${evento.texto}</span>
            <span class="activity-time">${tiempo}</span>
        `;
        container.appendChild(li);
    });
}

function tiempoDesde(fecha) {
    const ahora = new Date();
    const diffMs = ahora - fecha;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias < 7) return `Hace ${diffDias} d`;
    return fecha.toLocaleDateString('es-ES');
}

// ============================================================
// TOP ESPECIES
// ============================================================
function renderTopEspecies(especies) {
    const container = document.getElementById('topPetsList');
    if (!container) return;
    const entries = Object.entries(especies).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;">Sin datos</p>';
        return;
    }
    const max = entries[0][1];
    const iconos = {
        'Perro': '🐕',
        'Gato': '🐈',
        'Ave': '🦜',
        'Roedor': '🐭',
        'Reptil': '🦎',
        'Otro': '🐾'
    };
    container.innerHTML = entries.slice(0, 5).map(([nombre, cantidad]) => {
        const porcentaje = (cantidad / max) * 100;
        const icon = iconos[nombre] || '🐾';
        return `
            <div class="pet-item">
                <span class="pet-icon">${icon}</span>
                <span class="pet-name">${nombre}</span>
                <span class="pet-count">${cantidad}</span>
                <div class="pet-bar-bg">
                    <div class="pet-bar" style="width:${porcentaje}%; background: ${getColorForName(nombre)};"></div>
                </div>
            </div>
        `;
    }).join('');
}

function getColorForName(nombre) {
    const colores = {
        'Perro': '#3b82f6',
        'Gato': '#10b981',
        'Ave': '#f59e0b',
        'Roedor': '#8b5cf6',
        'Reptil': '#ef4444',
        'Otro': '#94a3b8'
    };
    return colores[nombre] || '#3b82f6';
}

// ============================================================
// LOGOUT (se mantiene global)
// ============================================================
window.logout = function() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/user/visitor/login/login.html";
};