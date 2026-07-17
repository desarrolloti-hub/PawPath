// config/chatbot-data-service.js
// Servicio de datos en tiempo real para el chatbot PawBot.
// Define las "herramientas" (function calling) disponibles por rol y las ejecuta
// contra Firestore, aplicando siempre las restricciones de acceso del usuario autenticado.

import { db } from '/config/firebase-config.js';
import { ChatService } from '/classes/chatservice.js';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ─── Utilidades ───────────────────────────────────────────────────────────────

function hoyISO() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function fechaISODesdeDate(date) {
    return date.toISOString().slice(0, 10);
}

function esFechaISO(texto) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(texto || ''));
}

function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function limpiarValor(value) {
    return typeof value === 'string' ? value.trim() : value;
}

function convertirHora24h(horaTexto) {
    const texto = normalizarTexto(horaTexto);
    if (!texto) return null;

    const match12h = texto.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (match12h) {
        let hora = Number(match12h[1]);
        const minutos = match12h[2] || '00';
        const periodo = match12h[3];
        if (hora === 12) hora = periodo === 'am' ? 0 : 12;
        else if (periodo === 'pm') hora += 12;
        return `${String(hora).padStart(2, '0')}:${minutos}`;
    }

    const match24h = texto.match(/^(\d{1,2})(?::(\d{2}))$/);
    if (match24h) {
        const hora = Number(match24h[1]);
        const minutos = Number(match24h[2]);
        if (hora >= 0 && hora <= 23 && minutos >= 0 && minutos <= 59) {
            return `${String(hora).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
        }
    }

    if (/^\d{1,2}$/.test(texto)) {
        const hora = Number(texto);
        if (hora >= 0 && hora <= 23) return `${String(hora).padStart(2, '0')}:00`;
    }

    return null;
}

function resolverFechaFlexible(fechaTexto) {
    if (!fechaTexto) return null;
    const texto = normalizarTexto(fechaTexto);
    if (!texto) return null;
    if (esFechaISO(texto)) return texto;

    const base = new Date();
    base.setHours(0, 0, 0, 0);

    if (texto === 'hoy') return fechaISODesdeDate(base);
    if (texto === 'manana') {
        const manana = new Date(base);
        manana.setDate(manana.getDate() + 1);
        return fechaISODesdeDate(manana);
    }
    if (texto === 'pasado manana') {
        const pasado = new Date(base);
        pasado.setDate(pasado.getDate() + 2);
        return fechaISODesdeDate(pasado);
    }

    const diasSemana = {
        domingo: 0,
        lunes: 1,
        martes: 2,
        miercoles: 3,
        jueves: 4,
        viernes: 5,
        sabado: 6,
    };

    if (texto in diasSemana) {
        const objetivo = diasSemana[texto];
        const actual = base.getDay();
        let diff = objetivo - actual;
        if (diff <= 0) diff += 7;
        const fecha = new Date(base);
        fecha.setDate(fecha.getDate() + diff);
        return fechaISODesdeDate(fecha);
    }

    return null;
}

function construirFaltanDatos(campos, mensaje) {
    return {
        faltanDatos: campos,
        mensaje: mensaje || `Faltan datos para completar la acción: ${campos.join(', ')}.`,
    };
}

function ordenarPorFechaHora(citas, direccion = 'asc') {
    return [...citas].sort((a, b) => {
        const claveA = `${a.fecha || ''} ${a.hora || ''}`;
        const claveB = `${b.fecha || ''} ${b.hora || ''}`;
        return direccion === 'asc' ? claveA.localeCompare(claveB) : claveB.localeCompare(claveA);
    });
}

function resumenCita(cita) {
    return {
        id: cita.id,
        fecha: cita.fecha || null,
        hora: cita.hora || null,
        estado: cita.estado || null,
        mascotaId: cita.mascotaId || null,
        nombreMascota: cita.nombreMascota || null,
        especie: cita.especie || null,
        veterinarioId: cita.veterinarioId || null,
        veterinarioNombre: cita.veterinarioNombre || null,
        usuarioId: cita.usuarioId || null,
        usuarioEmail: cita.usuarioEmail || null,
        problemaSalud: cita.problemaSalud || null,
        enfermedades: cita.enfermedades || null,
        notasVeterinario: cita.notasVeterinario || null,
    };
}

function resumenMascota(mascota) {
    return {
        id: mascota.id,
        nombre: mascota.nombre || null,
        especie: mascota.especie || null,
        raza: mascota.raza || null,
        genero: mascota.genero || null,
        edad: mascota.edad ?? null,
        peso: mascota.peso ?? null,
        esterilizado: mascota.esterilizado || null,
        microchip: mascota.microchip || null,
        historialMedico: mascota.historialMedico || null,
        estado: mascota.estado || null,
    };
}

async function obtenerCitasPorCampo(campo, valor) {
    const q = query(collection(db, 'citas'), where(campo, '==', valor));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function obtenerMascotaPorId(mascotaId) {
    const snap = await getDoc(doc(db, 'mascotas', mascotaId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

async function obtenerVeterinarioPorId(veterinarioId) {
    const snap = await getDoc(doc(db, 'veterinarios', veterinarioId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

async function obtenerUsuarioPorId(usuarioId) {
    const snap = await getDoc(doc(db, 'usarios', usuarioId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

async function obtenerMascotasUsuario(uid) {
    const q = query(collection(db, 'mascotas'), where('uidUsuario', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function buscarMascotaDelUsuario(uid, { mascotaId, nombreMascota }) {
    if (mascotaId) {
        const mascota = await obtenerMascotaPorId(mascotaId);
        return mascota?.uidUsuario === uid ? mascota : null;
    }

    if (!nombreMascota) return null;
    const nombreNormalizado = normalizarTexto(nombreMascota);
    const mascotas = await obtenerMascotasUsuario(uid);
    return mascotas.find(m => normalizarTexto(m.nombre) === nombreNormalizado) || null;
}

async function buscarCitaCliente(uid, { citaId, fecha, hora }) {
    const citas = await obtenerCitasPorCampo('usuarioId', uid);

    if (citaId) return citas.find(c => c.id === citaId) || null;

    const fechaResuelta = resolverFechaFlexible(fecha) || fecha;
    const horaResuelta = convertirHora24h(hora) || hora;
    const candidatas = citas.filter(c => {
        if (fechaResuelta && c.fecha !== fechaResuelta) return false;
        if (horaResuelta && c.hora !== horaResuelta) return false;
        return true;
    });

    return candidatas.length === 1 ? candidatas[0] : null;
}

async function buscarCitaVeterinario(uid, { citaId, fecha, hora, mascotaId }) {
    const citas = await obtenerCitasPorCampo('veterinarioId', uid);

    if (citaId) return citas.find(c => c.id === citaId) || null;

    const fechaResuelta = resolverFechaFlexible(fecha) || fecha;
    const horaResuelta = convertirHora24h(hora) || hora;
    const candidatas = citas.filter(c => {
        if (mascotaId && c.mascotaId !== mascotaId) return false;
        if (fechaResuelta && c.fecha !== fechaResuelta) return false;
        if (horaResuelta && c.hora !== horaResuelta) return false;
        return true;
    });

    return candidatas.length === 1 ? candidatas[0] : null;
}

async function horarioDisponible(veterinarioId, fecha, hora, excluirCitaId = null) {
    const q = query(
        collection(db, 'citas'),
        where('veterinarioId', '==', veterinarioId),
        where('fecha', '==', fecha),
        where('hora', '==', hora),
        where('estado', 'in', ['pendiente', 'aceptada'])
    );
    const snap = await getDocs(q);
    const citas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return !citas.some(c => c.id !== excluirCitaId);
}

function construirNotasClinicas({ observacion, diagnostico, tratamiento, receta, notasActuales }) {
    const bloques = [];
    if (notasActuales) bloques.push(String(notasActuales).trim());
    if (observacion) bloques.push(`Observación: ${observacion}`);
    if (diagnostico) bloques.push(`Diagnóstico: ${diagnostico}`);
    if (tratamiento) bloques.push(`Tratamiento: ${tratamiento}`);
    if (receta) bloques.push(`Receta: ${receta}`);
    return bloques.filter(Boolean).join('\n');
}

// ─── Definición de herramientas por rol (formato OpenAI/Groq function calling) ─

const HERRAMIENTAS_CLIENTE = [
    {
        type: 'function',
        function: {
            name: 'obtener_mis_mascotas',
            description: 'Obtiene la lista de mascotas registradas por el usuario autenticado, con su información básica.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'obtener_mis_citas',
            description: 'Obtiene las citas veterinarias del usuario autenticado. Úsala para preguntas sobre citas de hoy, próximas citas o historial de citas.',
            parameters: {
                type: 'object',
                properties: {
                    estado: {
                        type: 'string',
                        enum: ['pendiente', 'aceptada', 'concluida', 'rechazada', 'cancelada'],
                        description: 'Filtra por estado de la cita. Omitir para traer todas.',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'obtener_detalle_mascota',
            description: 'Obtiene el detalle completo (incluyendo historial médico) de una mascota específica del usuario autenticado.',
            parameters: {
                type: 'object',
                properties: {
                    mascotaId: { type: 'string', description: 'ID de la mascota a consultar.' },
                },
                required: ['mascotaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'obtener_historial_mascota',
            description: 'Obtiene el historial médico y el historial de citas concluidas (diagnósticos y tratamientos registrados por veterinarios) de una mascota del usuario autenticado.',
            parameters: {
                type: 'object',
                properties: {
                    mascotaId: { type: 'string', description: 'ID de la mascota a consultar.' },
                },
                required: ['mascotaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crear_cita',
            description: 'Crea una nueva cita del usuario autenticado. Si faltan datos, devuelve faltanDatos para pedir solo lo mínimo necesario.',
            parameters: {
                type: 'object',
                properties: {
                    mascotaId: { type: 'string' },
                    nombreMascota: { type: 'string' },
                    veterinarioId: { type: 'string' },
                    fecha: { type: 'string', description: 'Fecha ISO YYYY-MM-DD o texto como hoy, mañana, lunes, viernes.' },
                    hora: { type: 'string', description: 'Hora como 16:00, 4 pm, 4:30 pm.' },
                    problemaSalud: { type: 'string' },
                    enfermedades: { type: 'string' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'modificar_cita',
            description: 'Reagenda o modifica una cita del usuario autenticado. Puede identificar la cita por citaId o por fecha/hora actuales si es única.',
            parameters: {
                type: 'object',
                properties: {
                    citaId: { type: 'string' },
                    fecha: { type: 'string', description: 'Fecha actual de la cita si no se conoce el citaId.' },
                    hora: { type: 'string', description: 'Hora actual de la cita si no se conoce el citaId.' },
                    nuevaFecha: { type: 'string', description: 'Nueva fecha ISO o texto flexible.' },
                    nuevaHora: { type: 'string', description: 'Nueva hora en formato flexible.' },
                    problemaSalud: { type: 'string' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'cancelar_cita',
            description: 'Cancela una cita del usuario autenticado. Puede identificar la cita por citaId o por fecha/hora actuales si es única.',
            parameters: {
                type: 'object',
                properties: {
                    citaId: { type: 'string' },
                    fecha: { type: 'string', description: 'Fecha actual de la cita si no se conoce el citaId.' },
                    hora: { type: 'string', description: 'Hora actual de la cita si no se conoce el citaId.' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'registrar_mascota',
            description: 'Registra una mascota para el usuario autenticado. Si faltan datos obligatorios, devuelve faltanDatos.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string' },
                    raza: { type: 'string' },
                    especie: { type: 'string' },
                    genero: { type: 'string' },
                    colores: { type: 'string' },
                    edad: { type: 'number' },
                    peso: { type: 'number' },
                    microchip: { type: 'string' },
                    esterilizado: { type: 'string' },
                    historialMedico: { type: 'string' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'actualizar_mascota',
            description: 'Actualiza la información de una mascota del usuario autenticado.',
            parameters: {
                type: 'object',
                properties: {
                    mascotaId: { type: 'string' },
                    nombreMascota: { type: 'string' },
                    nombre: { type: 'string' },
                    raza: { type: 'string' },
                    especie: { type: 'string' },
                    genero: { type: 'string' },
                    colores: { type: 'string' },
                    edad: { type: 'number' },
                    peso: { type: 'number' },
                    microchip: { type: 'string' },
                    esterilizado: { type: 'string' },
                    historialMedico: { type: 'string' },
                },
                required: [],
            },
        },
    },
];

const HERRAMIENTAS_VETERINARIO = [
    {
        type: 'function',
        function: {
            name: 'obtener_mis_citas_veterinario',
            description: 'Obtiene las citas asignadas al veterinario autenticado. Úsala para preguntas sobre agenda, citas de hoy o próximas citas.',
            parameters: {
                type: 'object',
                properties: {
                    estado: {
                        type: 'string',
                        enum: ['pendiente', 'aceptada', 'concluida', 'rechazada', 'cancelada'],
                        description: 'Filtra por estado de la cita. Omitir para traer todas.',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'obtener_siguiente_paciente',
            description: 'Obtiene la próxima cita (paciente) pendiente o aceptada del veterinario autenticado, ordenada por fecha y hora más cercana.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'obtener_info_paciente',
            description: 'Obtiene la información de una mascota (paciente) que tiene o ha tenido una cita con el veterinario autenticado.',
            parameters: {
                type: 'object',
                properties: {
                    mascotaId: { type: 'string', description: 'ID de la mascota/paciente a consultar.' },
                },
                required: ['mascotaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'obtener_historial_clinico_paciente',
            description: 'Obtiene el historial clínico (citas, diagnósticos y tratamientos) de una mascota/paciente atendida por el veterinario autenticado.',
            parameters: {
                type: 'object',
                properties: {
                    mascotaId: { type: 'string', description: 'ID de la mascota/paciente a consultar.' },
                },
                required: ['mascotaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'actualizar_estado_cita_veterinario',
            description: 'Permite al veterinario aceptar, concluir o rechazar una cita asignada.',
            parameters: {
                type: 'object',
                properties: {
                    citaId: { type: 'string' },
                    fecha: { type: 'string' },
                    hora: { type: 'string' },
                    mascotaId: { type: 'string' },
                    estado: { type: 'string', enum: ['aceptada', 'concluida', 'rechazada', 'cancelada'] },
                    notas: { type: 'string' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'registrar_nota_clinica',
            description: 'Registra observaciones, diagnósticos, tratamientos o recetas en una cita/paciente del veterinario autenticado.',
            parameters: {
                type: 'object',
                properties: {
                    citaId: { type: 'string' },
                    fecha: { type: 'string' },
                    hora: { type: 'string' },
                    mascotaId: { type: 'string' },
                    observacion: { type: 'string' },
                    diagnostico: { type: 'string' },
                    tratamiento: { type: 'string' },
                    receta: { type: 'string' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'buscar_pacientes',
            description: 'Busca pacientes del veterinario autenticado por nombre de mascota o email del cliente.',
            parameters: {
                type: 'object',
                properties: {
                    termino: { type: 'string' },
                },
                required: ['termino'],
            },
        },
    },
];

const HERRAMIENTAS_ADMIN = [
    {
        type: 'function',
        function: {
            name: 'obtener_metricas_generales',
            description: 'Obtiene métricas y estadísticas generales del sistema: usuarios, mascotas, veterinarios, citas por estado, publicaciones del foro y mascotas perdidas.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'obtener_resumen_citas',
            description: 'Obtiene un resumen de las citas más recientes del sistema, opcionalmente filtradas por estado.',
            parameters: {
                type: 'object',
                properties: {
                    estado: {
                        type: 'string',
                        enum: ['pendiente', 'aceptada', 'concluida', 'rechazada', 'cancelada'],
                        description: 'Filtra por estado de la cita. Omitir para traer las más recientes de todos los estados.',
                    },
                    limite: { type: 'number', description: 'Cantidad máxima de citas a devolver (por defecto 10).' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'obtener_resumen_usuarios',
            description: 'Obtiene un resumen de los usuarios registrados en el sistema (nombre, email, rol, estado).',
            parameters: {
                type: 'object',
                properties: {
                    limite: { type: 'number', description: 'Cantidad máxima de usuarios a devolver (por defecto 15).' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'obtener_resumen_veterinarios',
            description: 'Obtiene un resumen de los veterinarios registrados en el sistema (nombre, especialidades, estado activo).',
            parameters: {
                type: 'object',
                properties: {
                    limite: { type: 'number', description: 'Cantidad máxima de veterinarios a devolver (por defecto 15).' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'buscar_en_sistema',
            description: 'Busca registros del sistema para administración. Permite buscar usuarios, veterinarios o mascotas por nombre, email o término relacionado.',
            parameters: {
                type: 'object',
                properties: {
                    tipo: { type: 'string', enum: ['usuarios', 'veterinarios', 'mascotas'] },
                    termino: { type: 'string' },
                },
                required: ['tipo', 'termino'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'actualizar_estado_usuario',
            description: 'Suspende o reactiva un usuario del sistema.',
            parameters: {
                type: 'object',
                properties: {
                    usuarioId: { type: 'string' },
                    estado: { type: 'string', enum: ['activo', 'suspendido'] },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'actualizar_estado_veterinario',
            description: 'Suspende o reactiva un veterinario del sistema.',
            parameters: {
                type: 'object',
                properties: {
                    veterinarioId: { type: 'string' },
                    estado: { type: 'string', enum: ['activo', 'suspendido'] },
                },
                required: [],
            },
        },
    },
];

export function obtenerHerramientasPorRol(rol) {
    if (rol === 'usuario') return HERRAMIENTAS_CLIENTE;
    if (rol === 'veterinario') return HERRAMIENTAS_VETERINARIO;
    if (rol === 'administrador') return HERRAMIENTAS_ADMIN;
    return [];
}

// ─── Ejecución de herramientas (con control de acceso por rol) ────────────────

async function ejecutarHerramientaCliente(uid, nombre, args) {
    switch (nombre) {
        case 'obtener_mis_mascotas': {
            const q = query(collection(db, 'mascotas'), where('uidUsuario', '==', uid));
            const snap = await getDocs(q);
            const mascotas = snap.docs.map(d => resumenMascota({ id: d.id, ...d.data() }));
            return { mascotas };
        }
        case 'obtener_mis_citas': {
            let citas = await obtenerCitasPorCampo('usuarioId', uid);
            if (args?.estado) citas = citas.filter(c => c.estado === args.estado);
            return { citas: ordenarPorFechaHora(citas, 'desc').map(resumenCita) };
        }
        case 'obtener_detalle_mascota': {
            const mascota = await obtenerMascotaPorId(args?.mascotaId);
            if (!mascota || mascota.uidUsuario !== uid) {
                return { error: 'No se encontró esa mascota entre las mascotas del usuario autenticado.' };
            }
            return { mascota: resumenMascota(mascota) };
        }
        case 'obtener_historial_mascota': {
            const mascota = await obtenerMascotaPorId(args?.mascotaId);
            if (!mascota || mascota.uidUsuario !== uid) {
                return { error: 'No se encontró esa mascota entre las mascotas del usuario autenticado.' };
            }
            const citas = (await obtenerCitasPorCampo('mascotaId', args.mascotaId))
                .filter(c => c.usuarioId === uid && c.estado === 'concluida');
            return {
                historialMedico: mascota.historialMedico || 'Sin historial médico registrado.',
                consultas: ordenarPorFechaHora(citas, 'desc').map(resumenCita),
            };
        }
        case 'crear_cita': {
            const faltan = [];
            if (!args?.mascotaId && !args?.nombreMascota) faltan.push('mascota');
            if (!args?.veterinarioId) faltan.push('veterinarioId');
            if (!args?.fecha) faltan.push('fecha');
            if (!args?.hora) faltan.push('hora');
            if (!args?.problemaSalud) faltan.push('problemaSalud');
            if (faltan.length) return construirFaltanDatos(faltan, 'Para agendar la cita necesito mascota, veterinario, fecha, hora y motivo/problema de salud.');

            const mascota = await buscarMascotaDelUsuario(uid, args);
            if (!mascota) return construirFaltanDatos(['mascota'], 'No pude identificar la mascota. Indica el nombre exacto o el ID de la mascota.');

            const fecha = resolverFechaFlexible(args.fecha);
            const hora = convertirHora24h(args.hora);
            if (!fecha) return construirFaltanDatos(['fecha'], 'Necesito una fecha válida, por ejemplo 2026-07-20, hoy, mañana o lunes.');
            if (!hora) return construirFaltanDatos(['hora'], 'Necesito una hora válida, por ejemplo 16:00 o 4 pm.');

            const veterinario = await obtenerVeterinarioPorId(args.veterinarioId);
            if (!veterinario) return { error: 'No se encontró el veterinario indicado.' };

            const disponible = await horarioDisponible(args.veterinarioId, fecha, hora);
            if (!disponible) return { error: 'Ese horario ya no está disponible. Pide otra hora o fecha.' };

            const citaData = {
                usuarioId: uid,
                usuarioEmail: localStorage.getItem('userEmail') || null,
                veterinarioId: args.veterinarioId,
                veterinarioNombre: veterinario.nombreCompleto || veterinario.nombre || 'Veterinario',
                mascotaId: mascota.id,
                nombreMascota: mascota.nombre || null,
                especie: mascota.especie || null,
                raza: mascota.raza || null,
                genero: mascota.genero || null,
                edad: mascota.edad || null,
                enfermedades: limpiarValor(args.enfermedades) || '',
                problemaSalud: limpiarValor(args.problemaSalud),
                mascotaSnapshot: {
                    nombre: mascota.nombre || null,
                    especie: mascota.especie || null,
                    raza: mascota.raza || null,
                    genero: mascota.genero || null,
                    edad: mascota.edad || null,
                    historialMedico: mascota.historialMedico || '',
                },
                fecha,
                hora,
                estado: 'pendiente',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'citas'), citaData);
            try {
                await ChatService.crearChatSiNoExiste({
                    id: docRef.id,
                    usuarioId: citaData.usuarioId,
                    veterinarioId: citaData.veterinarioId,
                    mascotaId: citaData.mascotaId,
                    nombreMascota: citaData.nombreMascota,
                    veterinarioNombre: citaData.veterinarioNombre,
                    usuarioEmail: citaData.usuarioEmail,
                });
            } catch (chatError) {
                console.error('Error automático al crear sala de chat desde el chatbot:', chatError);
            }
            invalidarCache();
            return {
                exito: true,
                accion: 'crear_cita',
                cita: resumenCita({ id: docRef.id, ...citaData }),
                mensaje: 'La cita fue agendada correctamente y quedó en estado pendiente.',
            };
        }
        case 'modificar_cita': {
            if (!args?.citaId && !args?.fecha) {
                return construirFaltanDatos(['cita'], 'Necesito identificar la cita a modificar. Indica el ID o al menos la fecha actual de la cita.');
            }
            if (!args?.nuevaFecha && !args?.nuevaHora && !args?.problemaSalud) {
                return construirFaltanDatos(['nuevaFecha o nuevaHora o problemaSalud'], 'Indica qué cambio quieres hacer: nueva fecha, nueva hora o nuevo motivo de consulta.');
            }

            const cita = await buscarCitaCliente(uid, args);
            if (!cita) return { error: 'No pude identificar una única cita para modificar. Indica el ID o una fecha/hora más específica.' };

            const nuevaFecha = args?.nuevaFecha ? resolverFechaFlexible(args.nuevaFecha) : cita.fecha;
            const nuevaHora = args?.nuevaHora ? convertirHora24h(args.nuevaHora) : cita.hora;
            if (args?.nuevaFecha && !nuevaFecha) return construirFaltanDatos(['nuevaFecha'], 'Necesito una nueva fecha válida.');
            if (args?.nuevaHora && !nuevaHora) return construirFaltanDatos(['nuevaHora'], 'Necesito una nueva hora válida.');

            if ((nuevaFecha !== cita.fecha || nuevaHora !== cita.hora) && !(await horarioDisponible(cita.veterinarioId, nuevaFecha, nuevaHora, cita.id))) {
                return { error: 'El nuevo horario no está disponible. Indica otra fecha u hora.' };
            }

            const datosActualizados = {
                fecha: nuevaFecha,
                hora: nuevaHora,
                fechaActualizacion: serverTimestamp(),
            };
            if (args?.problemaSalud) datosActualizados.problemaSalud = limpiarValor(args.problemaSalud);

            await updateDoc(doc(db, 'citas', cita.id), datosActualizados);
            invalidarCache();
            return {
                exito: true,
                accion: 'modificar_cita',
                cita: resumenCita({ ...cita, ...datosActualizados }),
                mensaje: 'La cita se actualizó correctamente.',
            };
        }
        case 'cancelar_cita': {
            if (!args?.citaId && !args?.fecha) {
                return construirFaltanDatos(['cita'], 'Necesito identificar la cita a cancelar. Indica el ID o al menos la fecha de la cita.');
            }

            const cita = await buscarCitaCliente(uid, args);
            if (!cita) return { error: 'No pude identificar una única cita para cancelar. Indica el ID o una fecha/hora más específica.' };

            await updateDoc(doc(db, 'citas', cita.id), {
                estado: 'cancelada',
                fechaActualizacion: serverTimestamp(),
            });
            invalidarCache();
            return {
                exito: true,
                accion: 'cancelar_cita',
                cita: resumenCita({ ...cita, estado: 'cancelada' }),
                mensaje: 'La cita fue cancelada correctamente.',
            };
        }
        case 'registrar_mascota': {
            const requeridos = ['nombre', 'raza', 'especie', 'genero', 'colores', 'edad', 'peso', 'historialMedico'];
            const faltan = requeridos.filter(campo => args?.[campo] === undefined || args?.[campo] === null || args?.[campo] === '');
            if (faltan.length) return construirFaltanDatos(faltan, 'Para registrar la mascota necesito nombre, raza, especie, género, colores, edad, peso e historial médico.');

            const data = {
                nombre: limpiarValor(args.nombre),
                raza: limpiarValor(args.raza),
                especie: limpiarValor(args.especie),
                genero: limpiarValor(args.genero),
                colores: limpiarValor(args.colores),
                edad: Number(args.edad),
                peso: Number(args.peso),
                microchip: limpiarValor(args.microchip) || '',
                esterilizado: limpiarValor(args.esterilizado) || 'No',
                historialMedico: limpiarValor(args.historialMedico),
                uidUsuario: uid,
                foto: null,
                fechaRegistro: new Date().toISOString(),
            };

            const docRef = await addDoc(collection(db, 'mascotas'), data);
            invalidarCache();
            return {
                exito: true,
                accion: 'registrar_mascota',
                mascota: resumenMascota({ id: docRef.id, ...data }),
                mensaje: 'La mascota fue registrada correctamente.',
            };
        }
        case 'actualizar_mascota': {
            if (!args?.mascotaId && !args?.nombreMascota) {
                return construirFaltanDatos(['mascota'], 'Necesito identificar qué mascota deseas actualizar.');
            }

            const mascota = await buscarMascotaDelUsuario(uid, args);
            if (!mascota) return { error: 'No pude identificar la mascota que deseas actualizar.' };

            const camposPermitidos = ['nombre', 'raza', 'especie', 'genero', 'colores', 'edad', 'peso', 'microchip', 'esterilizado', 'historialMedico'];
            const actualizacion = {};
            for (const campo of camposPermitidos) {
                if (args?.[campo] !== undefined) {
                    actualizacion[campo] = ['edad', 'peso'].includes(campo) ? Number(args[campo]) : limpiarValor(args[campo]);
                }
            }

            if (Object.keys(actualizacion).length === 0) {
                return construirFaltanDatos(['campos a actualizar'], 'Indica al menos un dato de la mascota que quieras actualizar.');
            }

            await updateDoc(doc(db, 'mascotas', mascota.id), actualizacion);
            invalidarCache();
            return {
                exito: true,
                accion: 'actualizar_mascota',
                mascota: resumenMascota({ ...mascota, ...actualizacion }),
                mensaje: 'La información de la mascota fue actualizada correctamente.',
            };
        }
        default:
            return { error: `Herramienta desconocida: ${nombre}` };
    }
}

async function ejecutarHerramientaVeterinario(uid, nombre, args) {
    switch (nombre) {
        case 'obtener_mis_citas_veterinario': {
            let citas = await obtenerCitasPorCampo('veterinarioId', uid);
            if (args?.estado) citas = citas.filter(c => c.estado === args.estado);
            return { citas: ordenarPorFechaHora(citas, 'desc').map(resumenCita) };
        }
        case 'obtener_siguiente_paciente': {
            const citas = await obtenerCitasPorCampo('veterinarioId', uid);
            const hoy = hoyISO();
            const proximas = citas
                .filter(c => ['pendiente', 'aceptada'].includes(c.estado) && (c.fecha || '') >= hoy);
            const siguiente = ordenarPorFechaHora(proximas, 'asc')[0];
            return siguiente ? { cita: resumenCita(siguiente) } : { mensaje: 'No hay próximos pacientes agendados.' };
        }
        case 'obtener_info_paciente': {
            const citasPaciente = (await obtenerCitasPorCampo('mascotaId', args?.mascotaId))
                .filter(c => c.veterinarioId === uid);
            if (citasPaciente.length === 0) {
                return { error: 'Ese paciente no tiene citas asignadas con el veterinario autenticado.' };
            }
            const mascota = await obtenerMascotaPorId(args.mascotaId);
            return { mascota: mascota ? resumenMascota(mascota) : null };
        }
        case 'obtener_historial_clinico_paciente': {
            const citasPaciente = (await obtenerCitasPorCampo('mascotaId', args?.mascotaId))
                .filter(c => c.veterinarioId === uid);
            if (citasPaciente.length === 0) {
                return { error: 'Ese paciente no tiene citas asignadas con el veterinario autenticado.' };
            }
            const mascota = await obtenerMascotaPorId(args.mascotaId);
            return {
                historialMedico: mascota?.historialMedico || 'Sin historial médico registrado.',
                consultas: ordenarPorFechaHora(citasPaciente, 'desc').map(resumenCita),
            };
        }
        case 'actualizar_estado_cita_veterinario': {
            if (!args?.estado) return construirFaltanDatos(['estado'], 'Indica el nuevo estado de la cita: aceptada, concluida, rechazada o cancelada.');
            if (!args?.citaId && !args?.fecha && !args?.mascotaId) {
                return construirFaltanDatos(['cita'], 'Necesito identificar la cita a actualizar. Indica el ID, la mascota o la fecha/hora.');
            }

            const cita = await buscarCitaVeterinario(uid, args);
            if (!cita) return { error: 'No pude identificar una única cita del veterinario para actualizar.' };

            await updateDoc(doc(db, 'citas', cita.id), {
                estado: args.estado,
                notasVeterinario: limpiarValor(args.notas) || cita.notasVeterinario || '',
                fechaActualizacion: serverTimestamp(),
            });
            invalidarCache();
            return {
                exito: true,
                accion: 'actualizar_estado_cita_veterinario',
                cita: resumenCita({ ...cita, estado: args.estado, notasVeterinario: limpiarValor(args.notas) || cita.notasVeterinario || '' }),
                mensaje: 'La cita fue actualizada correctamente.',
            };
        }
        case 'registrar_nota_clinica': {
            if (!args?.citaId && !args?.fecha && !args?.mascotaId) {
                return construirFaltanDatos(['cita o paciente'], 'Necesito identificar la cita o el paciente para registrar la nota clínica.');
            }
            if (!args?.observacion && !args?.diagnostico && !args?.tratamiento && !args?.receta) {
                return construirFaltanDatos(['observacion, diagnostico, tratamiento o receta'], 'Indica al menos una observación, diagnóstico, tratamiento o receta.');
            }

            const cita = await buscarCitaVeterinario(uid, args);
            if (!cita) return { error: 'No pude identificar una única cita/paciente del veterinario para registrar la nota clínica.' };

            const notasVeterinario = construirNotasClinicas({
                observacion: limpiarValor(args.observacion),
                diagnostico: limpiarValor(args.diagnostico),
                tratamiento: limpiarValor(args.tratamiento),
                receta: limpiarValor(args.receta),
                notasActuales: cita.notasVeterinario,
            });

            await updateDoc(doc(db, 'citas', cita.id), {
                notasVeterinario,
                fechaActualizacion: serverTimestamp(),
            });
            invalidarCache();
            return {
                exito: true,
                accion: 'registrar_nota_clinica',
                cita: resumenCita({ ...cita, notasVeterinario }),
                mensaje: 'La nota clínica fue registrada correctamente.',
            };
        }
        case 'buscar_pacientes': {
            const termino = normalizarTexto(args?.termino);
            if (!termino) return construirFaltanDatos(['termino'], 'Indica un nombre de mascota o email del cliente para buscar.');
            const citas = await obtenerCitasPorCampo('veterinarioId', uid);
            const resultados = citas.filter(c =>
                normalizarTexto(c.nombreMascota).includes(termino) ||
                normalizarTexto(c.usuarioEmail).includes(termino)
            );
            return { pacientes: resultados.slice(0, 10).map(resumenCita) };
        }
        default:
            return { error: `Herramienta desconocida: ${nombre}` };
    }
}

async function ejecutarHerramientaAdmin(nombre, args) {
    switch (nombre) {
        case 'obtener_metricas_generales': {
            const [usuariosSnap, mascotasSnap, vetsSnap, citasSnap, publicacionesSnap] = await Promise.all([
                getDocs(collection(db, 'usarios')),
                getDocs(collection(db, 'mascotas')),
                getDocs(collection(db, 'veterinarios')),
                getDocs(collection(db, 'citas')),
                getDocs(collection(db, 'publicaciones')).catch(() => ({ size: 0, docs: [] })),
            ]);

            const citas = citasSnap.docs.map(d => d.data());
            const mascotas = mascotasSnap.docs.map(d => d.data());

            return {
                totalUsuarios: usuariosSnap.size,
                totalMascotas: mascotasSnap.size,
                totalVeterinarios: vetsSnap.size,
                totalCitas: citasSnap.size,
                citasPendientes: citas.filter(c => c.estado === 'pendiente').length,
                citasAceptadas: citas.filter(c => c.estado === 'aceptada').length,
                citasConcluidas: citas.filter(c => c.estado === 'concluida').length,
                citasRechazadas: citas.filter(c => c.estado === 'rechazada').length,
                totalPublicaciones: publicacionesSnap.size,
                mascotasPerdidas: mascotas.filter(m => m.estado === 'perdida').length,
            };
        }
        case 'obtener_resumen_citas': {
            const limite = Number(args?.limite) > 0 ? Number(args.limite) : 10;
            const snap = await getDocs(collection(db, 'citas'));
            let citas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (args?.estado) citas = citas.filter(c => c.estado === args.estado);
            return { citas: ordenarPorFechaHora(citas, 'desc').slice(0, limite).map(resumenCita) };
        }
        case 'obtener_resumen_usuarios': {
            const limite = Number(args?.limite) > 0 ? Number(args.limite) : 15;
            const snap = await getDocs(collection(db, 'usarios'));
            const usuarios = snap.docs.slice(0, limite).map(d => {
                const u = d.data();
                return {
                    id: d.id,
                    nombre: u.nombre_completo || null,
                    email: u.email || null,
                    rol: u.rol || null,
                    estado: u.estado || (u.suspendido ? 'suspendido' : 'activo'),
                };
            });
            return { usuarios };
        }
        case 'obtener_resumen_veterinarios': {
            const limite = Number(args?.limite) > 0 ? Number(args.limite) : 15;
            const snap = await getDocs(collection(db, 'veterinarios'));
            const veterinarios = snap.docs.slice(0, limite).map(d => {
                const v = d.data();
                return {
                    id: d.id,
                    nombre: v.nombreCompleto || null,
                    especialidades: v.especialidades || [],
                    activo: v.activo ?? null,
                };
            });
            return { veterinarios };
        }
        case 'buscar_en_sistema': {
            const termino = normalizarTexto(args?.termino);
            if (!args?.tipo || !termino) {
                return construirFaltanDatos(['tipo', 'termino'], 'Indica qué tipo de registro deseas buscar (usuarios, veterinarios o mascotas) y un término de búsqueda.');
            }

            if (args.tipo === 'usuarios') {
                const snap = await getDocs(collection(db, 'usarios'));
                const usuarios = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(u => normalizarTexto(u.nombre_completo).includes(termino) || normalizarTexto(u.email).includes(termino))
                    .slice(0, 10)
                    .map(u => ({ id: u.id, nombre: u.nombre_completo || null, email: u.email || null, rol: u.rol || null, estado: u.estado || null }));
                return { usuarios };
            }

            if (args.tipo === 'veterinarios') {
                const snap = await getDocs(collection(db, 'veterinarios'));
                const veterinarios = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(v => normalizarTexto(v.nombreCompleto || v.nombre).includes(termino) || normalizarTexto(v.email).includes(termino))
                    .slice(0, 10)
                    .map(v => ({ id: v.id, nombre: v.nombreCompleto || v.nombre || null, email: v.email || null, especialidades: v.especialidades || [], activo: v.activo ?? null }));
                return { veterinarios };
            }

            const snap = await getDocs(collection(db, 'mascotas'));
            const mascotas = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(m => normalizarTexto(m.nombre).includes(termino) || normalizarTexto(m.raza).includes(termino) || normalizarTexto(m.especie).includes(termino))
                .slice(0, 10)
                .map(resumenMascota);
            return { mascotas };
        }
        case 'actualizar_estado_usuario': {
            if (!args?.usuarioId || !args?.estado) {
                return construirFaltanDatos(['usuarioId', 'estado'], 'Necesito el usuario y el estado objetivo (activo o suspendido).');
            }
            const usuario = await obtenerUsuarioPorId(args.usuarioId);
            if (!usuario) return { error: 'No se encontró el usuario indicado.' };

            const esSuspender = args.estado === 'suspendido';
            await updateDoc(doc(db, 'usarios', args.usuarioId), {
                suspendido: esSuspender,
                estado: args.estado,
                fecha_actualizacion: new Date(),
                fecha_suspension: esSuspender ? new Date() : null,
                fecha_reactivacion: esSuspender ? null : new Date(),
            });
            invalidarCache();
            return {
                exito: true,
                accion: 'actualizar_estado_usuario',
                usuario: { id: usuario.id, nombre: usuario.nombre_completo || null, email: usuario.email || null, estado: args.estado },
                mensaje: args.estado === 'suspendido' ? 'El usuario fue suspendido correctamente.' : 'El usuario fue reactivado correctamente.',
            };
        }
        case 'actualizar_estado_veterinario': {
            if (!args?.veterinarioId || !args?.estado) {
                return construirFaltanDatos(['veterinarioId', 'estado'], 'Necesito el veterinario y el estado objetivo (activo o suspendido).');
            }
            const veterinario = await obtenerVeterinarioPorId(args.veterinarioId);
            if (!veterinario) return { error: 'No se encontró el veterinario indicado.' };

            const esSuspender = args.estado === 'suspendido';
            await updateDoc(doc(db, 'veterinarios', args.veterinarioId), {
                suspendido: esSuspender,
                activo: !esSuspender,
                estado: args.estado,
                fechaActualizacion: serverTimestamp(),
            });
            invalidarCache();
            return {
                exito: true,
                accion: 'actualizar_estado_veterinario',
                veterinario: { id: veterinario.id, nombre: veterinario.nombreCompleto || null, estado: args.estado },
                mensaje: esSuspender ? 'El veterinario fue suspendido correctamente.' : 'El veterinario fue reactivado correctamente.',
            };
        }
        default:
            return { error: `Herramienta desconocida: ${nombre}` };
    }
}

// ─── Caché en memoria de resultados de herramientas ───────────────────────────
// Evita volver a consultar Firestore para la misma pregunta/argumentos mientras
// el dato siga siendo razonablemente "fresco" (TTL corto), reduciendo lecturas
// repetidas dentro de una misma conversación.

const TTL_CACHE_MS = 30_000; // 30s: suficiente para no repetir, sin desactualizar demasiado
const cacheHerramientas = new Map();

function claveCache(rol, uid, nombreHerramienta, args) {
    return `${rol}:${uid}:${nombreHerramienta}:${JSON.stringify(args || {})}`;
}

function obtenerDeCache(clave) {
    const entrada = cacheHerramientas.get(clave);
    if (!entrada) return undefined;
    if (Date.now() - entrada.timestamp > TTL_CACHE_MS) {
        cacheHerramientas.delete(clave);
        return undefined;
    }
    return entrada.data;
}

function guardarEnCache(clave, data) {
    cacheHerramientas.set(clave, { data, timestamp: Date.now() });
}

function invalidarCache() {
    cacheHerramientas.clear();
}

/**
 * Ejecuta una herramienta solicitada por el modelo, aplicando control de acceso
 * estricto según el rol y el uid del usuario autenticado. Nunca debe usarse un
 * uid distinto al de la sesión autenticada actual.
 *
 * Reutiliza resultados recientes (cache con TTL corto) para evitar lecturas
 * repetidas de Firestore cuando se pregunta por la misma información poco después.
 *
 * @param {'usuario'|'veterinario'|'administrador'} rol
 * @param {string} uid
 * @param {string} nombreHerramienta
 * @param {object} args
 * @returns {Promise<object>}
 */
export async function ejecutarHerramienta(rol, uid, nombreHerramienta, args = {}) {
    const clave = claveCache(rol, uid, nombreHerramienta, args);
    const cacheado = obtenerDeCache(clave);
    if (cacheado !== undefined) return cacheado;

    try {
        let resultado;
        if (rol === 'usuario') resultado = await ejecutarHerramientaCliente(uid, nombreHerramienta, args);
        else if (rol === 'veterinario') resultado = await ejecutarHerramientaVeterinario(uid, nombreHerramienta, args);
        else if (rol === 'administrador') resultado = await ejecutarHerramientaAdmin(nombreHerramienta, args);
        else resultado = { error: 'El rol actual no tiene herramientas disponibles.' };

        // Solo cachear resultados válidos (sin error), para no perpetuar fallos transitorios.
        if (!resultado?.error) guardarEnCache(clave, resultado);
        return resultado;
    } catch (error) {
        console.error(`Error ejecutando herramienta "${nombreHerramienta}":`, error);
        return { error: 'Ocurrió un error al consultar la base de datos.' };
    }
}

/**
 * Obtiene un resumen breve del contexto activo (mascota o cita seleccionada en la
 * página actual) para que el chatbot lo asuma automáticamente sin preguntar de más.
 *
 * @param {{ rol: string, uid: string, mascotaId?: string, citaId?: string }} opciones
 * @returns {Promise<string>} Texto breve para inyectar en el system prompt, o cadena vacía.
 */
export async function obtenerResumenContextoActivo({ rol, uid, mascotaId }) {
    if (!mascotaId) return '';
    try {
        const mascota = await obtenerMascotaPorId(mascotaId);
        if (!mascota) return '';

        if (rol === 'usuario' && mascota.uidUsuario !== uid) return '';
        if (rol === 'veterinario') {
            const citasPaciente = (await obtenerCitasPorCampo('mascotaId', mascotaId))
                .filter(c => c.veterinarioId === uid);
            if (citasPaciente.length === 0) return '';
        }

        return `El usuario está viendo actualmente a la mascota "${mascota.nombre}" (id: ${mascotaId}, especie: ${mascota.especie || 'no especificada'}). ` +
            `Si su pregunta no menciona otra mascota explícitamente, asume que se refiere a esta.`;
    } catch {
        return '';
    }
}
