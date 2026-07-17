// admin_mascotasController.js
import Mascota from '/classes/mascotas.js';  // ← Importa DIRECTAMENTE la clase Mascota

class Admin_mascotasController {
    constructor() {
        console.log("🏗️ Inicializando Admin_mascotasController");
        this.inicializar();
    }

    inicializar() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.cargarMascotas());
        } else {
            this.cargarMascotas();
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async cargarMascotas() {
        try {
            console.log("🔄 Cargando mascotas usando Mascota.obtenerTodas()...");

            // ✅ Usar el método estático de la clase Mascota (NO del controlador)
            const resultado = await Mascota.obtenerTodas();

            console.log("📦 Resultado:", resultado);

            if (resultado.success) {
                console.log(`✅ ${resultado.mascotas.length} mascotas cargadas`);
                this.renderizarTabla(resultado.mascotas);
            } else {
                console.error("❌ Error:", resultado.error);
                this.mostrarError(resultado.error);
            }
        } catch (error) {
            console.error("❌ Error cargando mascotas:", error);
            this.mostrarError("Error al cargar mascotas");
        }
    }

    renderizarTabla(mascotas) {
        console.log("🎨 Renderizando tabla de mascotas para admin");

        const tbody = document.getElementById("tabla-mascotas");
        if (!tbody) {
            console.error("❌ No se encontró el elemento con ID 'tabla-usuarios'");
            return;
        }

        tbody.innerHTML = '';

        if (!mascotas || mascotas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay mascotas registradas</td></tr>';
            return;
        }

        mascotas.forEach(m => {
            const row = tbody.insertRow();
            const idMostrar = m.id ? m.id.substring(0, 8) + '...' : 'N/A';

            row.innerHTML = `
            <td>${this.escapeHtml(m.nombre || '')}</td>
            <td>${this.escapeHtml(m.especie || '')}</td>
            <td>${this.escapeHtml(m.genero || '')}</td>
            <td>${this.escapeHtml(m.edad|| '?')} años</td>
            <td>${m.peso || '?'} kg</td>
            <td>${m.raza || ''}</td>
            <td><img src="${m.foto}" alt="foto mascota" >
            <td class="acciones">
                <button class="btn-eliminar" onclick="adminMascotasController.eliminarMascota('${m.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        });

        console.log("✅ Tabla renderizada");
    }
    async eliminarMascota(id) {
        if (!confirm('¿Estás seguro de eliminar esta mascota?')) return;

        try {
            // Usar Mascota para eliminar
            const mascota = new Mascota();
            mascota.id = id;
            const resultado = await mascota.eliminar();

            if (resultado.success) {
                alert('Mascota eliminada correctamente');
                this.cargarMascotas(); // Recargar la tabla
            } else {
                alert('Error: ' + resultado.error);
            }
        } catch (error) {
            console.error("❌ Error:", error);
            alert('Error al eliminar');
        }
    }

    mostrarError(mensaje) {
        const tbody = document.getElementById("tabla-usuarios");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center error">${mensaje}</td></tr>`;
        }
    }
}

// Inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.adminMascotasController = new Admin_mascotasController();
    });
} else {
    window.adminMascotasController = new Admin_mascotasController();
}