// Datos simulados (en una app real vendrían de una API)
let comentarios = [
    {
        id: 1,
        publicacionId: 1,
        publicacionTitulo: 'Perro perdido en Centro',
        autor: 'María González',
        texto: '¡Qué triste! Espero que aparezca pronto. Compartiré en mis redes.',
        fecha: '2025-02-28 15:30',
        estado: 'activo'
    },
    {
        id: 2,
        publicacionId: 1,
        publicacionTitulo: 'Perro perdido en Centro',
        autor: 'Carlos Ruiz',
        texto: 'Vi un perro similar en el parque ayer. ¿Tiene collar?',
        fecha: '2025-02-28 16:45',
        estado: 'destacado'
    },
    {
        id: 3,
        publicacionId: 2,
        publicacionTitulo: 'Gato encontrado en Norte',
        autor: 'Laura Méndez',
        texto: 'Qué lindo gato. Ojalá encuentre a su dueño.',
        fecha: '2025-02-27 10:20',
        estado: 'activo'
    },
    {
        id: 4,
        publicacionId: 3,
        publicacionTitulo: 'Mascota extraviada',
        autor: 'Pedro Soto',
        texto: '¿Tiene alguna seña particular?',
        fecha: '2025-02-26 09:15',
        estado: 'editado'
    },
    {
        id: 5,
        publicacionId: 2,
        publicacionTitulo: 'Gato encontrado en Norte',
        autor: 'Ana Flores',
        texto: 'Yo lo vi cerca de la plaza. Le daré de comer mientras.',
        fecha: '2025-02-27 18:00',
        estado: 'activo'
    }
];

// Elementos del DOM
const tablaBody = document.getElementById('tabla-comentarios');
const modalComentario = document.getElementById('modalComentario');
const modalEliminar = document.getElementById('modalEliminar');
const formComentario = document.getElementById('formComentario');
const nuevoBtn = document.getElementById('nuevoComentarioBtn');
const cancelarModal = document.getElementById('cancelarModal');
const closeModal = document.querySelectorAll('.close');
const cancelarEliminar = document.getElementById('cancelarEliminar');
const confirmarEliminar = document.getElementById('confirmarEliminar');
const filtroPublicacion = document.getElementById('filtro-publicacion');
const filtroEstado = document.getElementById('filtro-estado');
const aplicarFiltros = document.getElementById('aplicarFiltros');
const limpiarFiltros = document.getElementById('limpiarFiltros');

let comentarioAEliminar = null; // Guardar el id del comentario a eliminar
let comentarioEditando = null; // Guardar el comentario en edición

// Función para renderizar la tabla
function renderTabla(comentariosFiltrados = comentarios) {
    if (!tablaBody) return;
    
    tablaBody.innerHTML = '';
    
    if (comentariosFiltrados.length === 0) {
        tablaBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No hay comentarios para mostrar</td></tr>';
        return;
    }
    
    comentariosFiltrados.forEach(c => {
        const fila = document.createElement('tr');
        
        // Determinar clase de estado
        let claseEstado = '';
        if (c.estado === 'activo') claseEstado = 'estado-activo';
        else if (c.estado === 'editado') claseEstado = 'estado-editado';
        else if (c.estado === 'destacado') claseEstado = 'estado-destacado';
        
        fila.innerHTML = `
            <td>${c.id}</td>
            <td>${c.publicacionTitulo}</td>
            <td>${c.autor}</td>
            <td>${c.texto.substring(0, 50)}${c.texto.length > 50 ? '...' : ''}</td>
            <td>${c.fecha}</td>
            <td><span class="${claseEstado}">${c.estado}</span></td>
            <td>
                <div class="acciones">
                    <button class="btn-icon edit" data-id="${c.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete" data-id="${c.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
                    <button class="btn-icon star" data-id="${c.id}" title="Destacar"><i class="fas fa-star"></i></button>
                </div>
            </td>
        `;
        tablaBody.appendChild(fila);
    });
    
    // Agregar eventos a los botones de la tabla
    document.querySelectorAll('.edit').forEach(btn => {
        btn.addEventListener('click', () => editarComentario(btn.dataset.id));
    });
    document.querySelectorAll('.delete').forEach(btn => {
        btn.addEventListener('click', () => mostrarModalEliminar(btn.dataset.id));
    });
    document.querySelectorAll('.star').forEach(btn => {
        btn.addEventListener('click', () => destacarComentario(btn.dataset.id));
    });
}

// Función para abrir modal de nuevo/editar
function abrirModal(comentario = null) {
    comentarioEditando = comentario;
    const tituloModal = document.getElementById('modal-titulo');
    const idInput = document.getElementById('comentario-id');
    const publicacionSelect = document.getElementById('comentario-publicacion');
    const autorInput = document.getElementById('comentario-autor');
    const textoTextarea = document.getElementById('comentario-texto');
    const estadoSelect = document.getElementById('comentario-estado');
    
    if (comentario) {
        // Editar
        tituloModal.textContent = 'Editar Comentario';
        idInput.value = comentario.id;
        publicacionSelect.value = comentario.publicacionId;
        autorInput.value = comentario.autor;
        textoTextarea.value = comentario.texto;
        estadoSelect.value = comentario.estado;
    } else {
        // Nuevo
        tituloModal.textContent = 'Nuevo Comentario';
        idInput.value = '';
        publicacionSelect.value = '';
        autorInput.value = '';
        textoTextarea.value = '';
        estadoSelect.value = 'activo';
    }
    
    modalComentario.style.display = 'flex';
}

// Cerrar modal
function cerrarModal() {
    modalComentario.style.display = 'none';
    modalEliminar.style.display = 'none';
    comentarioAEliminar = null;
    comentarioEditando = null;
}

// Guardar comentario (crear o actualizar)
formComentario.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id = document.getElementById('comentario-id').value;
    const publicacionId = document.getElementById('comentario-publicacion').value;
    const autor = document.getElementById('comentario-autor').value.trim();
    const texto = document.getElementById('comentario-texto').value.trim();
    const estado = document.getElementById('comentario-estado').value;
    
    if (!publicacionId || !autor || !texto) {
        alert('Todos los campos son obligatorios');
        return;
    }
    
    // Obtener título de la publicación
    const publicacionSelect = document.getElementById('comentario-publicacion');
    const publicacionTitulo = publicacionSelect.options[publicacionSelect.selectedIndex]?.text || '';
    
    if (id) {
        // Actualizar
        const index = comentarios.findIndex(c => c.id == id);
        if (index !== -1) {
            comentarios[index] = {
                ...comentarios[index],
                publicacionId: parseInt(publicacionId),
                publicacionTitulo,
                autor,
                texto,
                estado
            };
        }
    } else {
        // Crear nuevo
        const nuevoId = comentarios.length > 0 ? Math.max(...comentarios.map(c => c.id)) + 1 : 1;
        const fecha = new Date().toLocaleString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-');
        comentarios.push({
            id: nuevoId,
            publicacionId: parseInt(publicacionId),
            publicacionTitulo,
            autor,
            texto,
            fecha,
            estado
        });
    }
    
    cerrarModal();
    aplicarFiltrosHandler(); // Actualizar tabla con filtros actuales
});

// Editar comentario
function editarComentario(id) {
    const comentario = comentarios.find(c => c.id == id);
    if (comentario) {
        abrirModal(comentario);
    }
}

// Mostrar modal de confirmación para eliminar
function mostrarModalEliminar(id) {
    comentarioAEliminar = id;
    modalEliminar.style.display = 'flex';
}

// Confirmar eliminación
confirmarEliminar.addEventListener('click', () => {
    if (comentarioAEliminar) {
        comentarios = comentarios.filter(c => c.id != comentarioAEliminar);
        cerrarModal();
        aplicarFiltrosHandler();
    }
});

// Destacar comentario
function destacarComentario(id) {
    const index = comentarios.findIndex(c => c.id == id);
    if (index !== -1) {
        comentarios[index].estado = comentarios[index].estado === 'destacado' ? 'activo' : 'destacado';
        aplicarFiltrosHandler();
    }
}

// Filtrar comentarios
function filtrarComentarios() {
    const publicacion = filtroPublicacion.value;
    const estado = filtroEstado.value;
    
    return comentarios.filter(c => {
        let coincidePublicacion = true;
        let coincideEstado = true;
        
        if (publicacion) {
            coincidePublicacion = c.publicacionId == publicacion;
        }
        if (estado) {
            coincideEstado = c.estado === estado;
        }
        
        return coincidePublicacion && coincideEstado;
    });
}

// Aplicar filtros
function aplicarFiltrosHandler() {
    const filtrados = filtrarComentarios();
    renderTabla(filtrados);
}

// Limpiar filtros
function limpiarFiltrosHandler() {
    filtroPublicacion.value = '';
    filtroEstado.value = '';
    renderTabla(comentarios);
}

// Eventos
nuevoBtn.addEventListener('click', () => abrirModal());

cancelarModal.addEventListener('click', cerrarModal);
cancelarEliminar.addEventListener('click', cerrarModal);

closeModal.forEach(btn => btn.addEventListener('click', cerrarModal));

// Cerrar modal al hacer clic fuera
window.addEventListener('click', (e) => {
    if (e.target === modalComentario || e.target === modalEliminar) {
        cerrarModal();
    }
});

aplicarFiltros.addEventListener('click', aplicarFiltrosHandler);
limpiarFiltros.addEventListener('click', limpiarFiltrosHandler);

// Inicializar tabla
renderTabla();