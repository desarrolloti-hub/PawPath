// components/JS chatbot-component.js
import { sendChatMessage } from '/config/gemini-service.js';

(function () {
    'use strict';

    // ─── Config por rol ──────────────────────────────────────────────────────────

    const ROL_CONFIG = {
        usuario: {
            bienvenida: (nombre) =>
                `¡Hola${nombre ? ', ' + nombre : ''}! Soy PawBot 🐾. ` +
                `Puedo ayudarte a registrar tus mascotas, agendar citas veterinarias, usar el foro y mucho más. ¿En qué te ayudo?`,
            sugerencias: [
                '¿Cómo agendo una cita?',
                '¿Cómo registro a mi mascota?',
                '¿Cómo uso el foro?',
                '¿Cómo cancelo una cita?',
            ],
            funciones:
                '- Ver y registrar mascotas (especie, raza, edad, vacunas)\n' +
                '- Agendar, ver y cancelar citas veterinarias\n' +
                '- Publicar y comentar en el foro comunitario\n' +
                '- Buscar veterinarios disponibles en el mapa\n' +
                '- Gestionar su perfil de usuario\n' +
                '- Ver detalles y historial de cada mascota',
        },
        veterinario: {
            bienvenida: (nombre) =>
                `¡Hola${nombre ? ', Dr(a). ' + nombre : ''}! Soy PawBot 🐾. ` +
                `Puedo orientarte sobre cómo gestionar tus citas, usar el chat con pacientes y actualizar tu perfil. ¿Qué necesitas?`,
            sugerencias: [
                '¿Cómo confirmo una cita?',
                '¿Cómo uso el chat con pacientes?',
                '¿Cómo actualizo mi perfil?',
                '¿Cómo marco una consulta como completada?',
            ],
            funciones:
                '- Ver y gestionar su agenda de citas (pendiente, confirmada, completada, cancelada)\n' +
                '- Chat en tiempo real con dueños de mascotas\n' +
                '- Actualizar su perfil y especialidades\n' +
                '- Registrar resultados y observaciones de consultas\n' +
                '- Ver el historial de atención de cada paciente',
        },
        administrador: {
            bienvenida: (nombre) =>
                `¡Hola${nombre ? ', ' + nombre : ''}! Soy PawBot 🐾. ` +
                `Como administrador puedo ayudarte con la gestión de usuarios, veterinarios, mascotas y el foro. ¿Qué necesitas?`,
            sugerencias: [
                '¿Cómo gestiono usuarios?',
                '¿Cómo apruebo a un veterinario?',
                '¿Cómo modero el foro?',
                '¿Cómo veo el dashboard?',
            ],
            funciones:
                '- Dashboard con estadísticas y métricas generales\n' +
                '- Gestión de usuarios (ver, activar, desactivar, eliminar)\n' +
                '- Gestión y aprobación de veterinarios\n' +
                '- Gestión del catálogo de mascotas\n' +
                '- Moderación del foro (aprobar, editar, eliminar publicaciones y comentarios)',
        },
        invitado: {
            bienvenida: () =>
                `¡Hola! Soy PawBot 🐾, el asistente de PawPath. ` +
                `Puedo contarte sobre la app y cómo registrarte. Para acceder a todas las funciones, inicia sesión. ¿En qué te ayudo?`,
            sugerencias: [
                '¿Cómo me registro?',
                '¿Qué es PawPath?',
                '¿Cómo encuentro un veterinario?',
                '¿Qué puedo hacer con la app?',
            ],
            funciones:
                '- Ver información pública sobre PawPath\n' +
                '- Conocer cómo registrarse e iniciar sesión\n' +
                '- Información general sobre mascotas y veterinarios\n' +
                '(Para usar funciones avanzadas debe iniciar sesión)',
        },
    };

    const ERRORES = {
        QUOTA_EXCEEDED: 'El servicio está temporalmente ocupado. Inténtalo en unos minutos.',
        INVALID_KEY: 'Error de configuración del servicio. Contacta al soporte.',
        default: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    };

    // ─── Clase principal ─────────────────────────────────────────────────────────

    class PawBotComponent extends HTMLElement {
        constructor() {
            super();
            /** @type {{ role: 'user'|'model', parts: [{ text: string }] }[]} */
            this._historial = [];
            this._abierto = false;
            this._cargando = false;
            this._rolConfig = null;
            this._contextoRol = null;
        }

        connectedCallback() {
            this._cargarContextoUsuario();
            this._insertarEstilos();
            this._render();
            this._bindEvents();
        }

        // ─── Contexto de usuario ─────────────────────────────────────────────────

        _cargarContextoUsuario() {
            const rol = localStorage.getItem('currentUserRole') || 'invitado';
            const nombre = localStorage.getItem('userDisplayName') || '';
            const rolNormalizado = ROL_CONFIG[rol] ? rol : 'invitado';

            this._rolConfig = ROL_CONFIG[rolNormalizado];
            this._contextoRol = {
                rol: rolNormalizado,
                nombre: nombre || undefined,
                funciones: this._rolConfig.funciones,
            };
        }

        // ─── Estilos ─────────────────────────────────────────────────────────────

        _insertarEstilos() {
            if (document.getElementById('pawbot-styles')) return;
            const style = document.createElement('style');
            style.id = 'pawbot-styles';
            style.textContent = `
                #pawbot-trigger {
                    position: fixed;
                    bottom: 28px;
                    right: 28px;
                    z-index: 9000;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #33105c 0%, #090979 55%, #008cff 100%);
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(9, 9, 121, 0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    outline: none;
                }
                #pawbot-trigger:hover {
                    transform: scale(1.08);
                    box-shadow: 0 6px 28px rgba(9, 9, 121, 0.6);
                }
                #pawbot-trigger svg { width: 28px; height: 28px; fill: #fff; }
                #pawbot-trigger .pawbot-icon-open  { display: flex; }
                #pawbot-trigger .pawbot-icon-close { display: none; }
                #pawbot-trigger.is-open .pawbot-icon-open  { display: none; }
                #pawbot-trigger.is-open .pawbot-icon-close { display: flex; }

                #pawbot-badge {
                    position: absolute;
                    top: 4px; right: 4px;
                    width: 12px; height: 12px;
                    background: #ff4d4f;
                    border-radius: 50%;
                    border: 2px solid #fff;
                    display: none;
                }
                #pawbot-badge.visible { display: block; }

                #pawbot-panel {
                    position: fixed;
                    bottom: 100px;
                    right: 28px;
                    z-index: 8999;
                    width: 360px;
                    max-width: calc(100vw - 40px);
                    height: 530px;
                    max-height: calc(100vh - 130px);
                    background: #fff;
                    border-radius: 18px;
                    box-shadow: 0 8px 40px rgba(9, 9, 121, 0.22);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    opacity: 0;
                    transform: translateY(16px) scale(0.97);
                    pointer-events: none;
                    transition: opacity 0.22s ease, transform 0.22s ease;
                }
                #pawbot-panel.is-open {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    pointer-events: all;
                }

                .pawbot-header {
                    background: linear-gradient(90deg, #33105c 0%, #090979 55%, #008cff 100%);
                    color: #fff;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }
                .pawbot-header-avatar {
                    width: 38px; height: 38px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 20px; flex-shrink: 0;
                }
                .pawbot-header-info { flex: 1; min-width: 0; }
                .pawbot-header-name {
                    font-family: 'Poppins', sans-serif;
                    font-weight: 600; font-size: 15px; line-height: 1.2;
                }
                .pawbot-header-status {
                    font-size: 11px; opacity: 0.85;
                    display: flex; align-items: center; gap: 5px;
                }
                .pawbot-status-dot {
                    width: 7px; height: 7px;
                    background: #4cff91;
                    border-radius: 50%; display: inline-block;
                }

                /* Pill de rol */
                .pawbot-rol-pill {
                    padding: 2px 9px;
                    border-radius: 20px;
                    font-size: 10px;
                    font-family: 'Poppins', sans-serif;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .pawbot-rol-pill.usuario      { background: rgba(255,255,255,0.2); color: #fff; }
                .pawbot-rol-pill.veterinario  { background: #00c97a22; color: #c0ffe3; border: 1px solid #00c97a55; }
                .pawbot-rol-pill.administrador{ background: #ffd70022; color: #ffe97a; border: 1px solid #ffd70055; }
                .pawbot-rol-pill.invitado     { background: rgba(255,255,255,0.12); color: #ddd; }

                .pawbot-clear-btn {
                    background: rgba(255,255,255,0.15);
                    border: none; border-radius: 8px;
                    color: #fff; padding: 4px 8px; font-size: 10px;
                    cursor: pointer; font-family: 'Poppins', sans-serif;
                    transition: background 0.15s; white-space: nowrap;
                }
                .pawbot-clear-btn:hover { background: rgba(255,255,255,0.28); }

                /* Contexto de usuario visible */
                .pawbot-user-bar {
                    background: #f8f5ff;
                    border-bottom: 1px solid #ede9ff;
                    padding: 7px 14px;
                    display: flex; align-items: center; gap: 8px;
                    font-family: 'Poppins', sans-serif;
                    font-size: 12px; color: #5a3d80;
                    flex-shrink: 0;
                }
                .pawbot-user-bar-icon { font-size: 15px; }
                .pawbot-user-bar-name { font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .pawbot-user-bar-rol  { font-size: 10px; opacity: 0.7; }
                .pawbot-user-bar.invitado { background: #fff8f0; border-color: #ffe0b2; color: #7c4a00; }

                .pawbot-messages {
                    flex: 1; overflow-y: auto;
                    padding: 14px 14px 8px;
                    display: flex; flex-direction: column; gap: 10px;
                    scroll-behavior: smooth;
                }
                .pawbot-messages::-webkit-scrollbar { width: 4px; }
                .pawbot-messages::-webkit-scrollbar-thumb { background: #d0c8e8; border-radius: 4px; }

                .pawbot-msg {
                    display: flex; flex-direction: column;
                    max-width: 82%;
                    animation: pawbot-fadein 0.18s ease;
                }
                @keyframes pawbot-fadein {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .pawbot-msg.bot  { align-self: flex-start; }
                .pawbot-msg.user { align-self: flex-end; }

                .pawbot-bubble {
                    padding: 10px 14px;
                    border-radius: 14px;
                    font-family: 'Poppins', sans-serif;
                    font-size: 13.5px; line-height: 1.5; word-break: break-word;
                }
                .pawbot-msg.bot  .pawbot-bubble { background: #f0ebff; color: #1e1e2e; border-bottom-left-radius: 4px; }
                .pawbot-msg.user .pawbot-bubble { background: linear-gradient(135deg, #33105c, #090979); color: #fff; border-bottom-right-radius: 4px; }
                .pawbot-msg.warning .pawbot-bubble { background: #fff3e0; color: #7c4a00; border: 1px solid #ffe0b2; }

                .pawbot-msg-time { font-size: 10px; color: #aaa; margin-top: 3px; padding: 0 4px; }
                .pawbot-msg.user .pawbot-msg-time { text-align: right; }

                .pawbot-typing {
                    display: flex; align-items: center; gap: 5px;
                    padding: 10px 14px;
                    background: #f0ebff;
                    border-radius: 14px; border-bottom-left-radius: 4px;
                    width: fit-content; align-self: flex-start;
                }
                .pawbot-typing span {
                    width: 7px; height: 7px; background: #090979;
                    border-radius: 50%; display: inline-block;
                    animation: pawbot-bounce 1.1s infinite ease-in-out;
                }
                .pawbot-typing span:nth-child(2) { animation-delay: 0.18s; }
                .pawbot-typing span:nth-child(3) { animation-delay: 0.36s; }
                @keyframes pawbot-bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }

                .pawbot-sugerencias {
                    display: flex; flex-wrap: wrap; gap: 6px;
                    padding: 0 14px 10px; flex-shrink: 0;
                }
                .pawbot-chip {
                    background: #ede9ff; color: #33105c;
                    border: 1px solid #c8bbf0; border-radius: 20px;
                    padding: 5px 12px; font-size: 12px;
                    font-family: 'Poppins', sans-serif;
                    cursor: pointer; transition: background 0.15s, transform 0.1s;
                    white-space: nowrap;
                }
                .pawbot-chip:hover { background: #d6ccff; transform: scale(1.03); }

                .pawbot-input-area {
                    border-top: 1px solid #eee;
                    padding: 10px 12px;
                    display: flex; gap: 8px; align-items: flex-end;
                    flex-shrink: 0; background: #fafafa;
                }
                #pawbot-input {
                    flex: 1;
                    border: 1.5px solid #d0c8e8; border-radius: 12px;
                    padding: 9px 13px;
                    font-family: 'Poppins', sans-serif; font-size: 13.5px;
                    resize: none; outline: none;
                    max-height: 90px; overflow-y: auto; line-height: 1.4;
                    transition: border-color 0.15s; background: #fff;
                }
                #pawbot-input:focus { border-color: #090979; }
                #pawbot-input::placeholder { color: #bbb; }
                #pawbot-send {
                    width: 40px; height: 40px; border-radius: 12px;
                    background: linear-gradient(135deg, #33105c, #090979);
                    border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; transition: opacity 0.15s, transform 0.15s;
                }
                #pawbot-send:hover:not(:disabled) { transform: scale(1.07); }
                #pawbot-send:disabled { opacity: 0.45; cursor: not-allowed; }
                #pawbot-send svg { width: 18px; height: 18px; fill: #fff; }

                @media (max-width: 420px) {
                    #pawbot-panel { right: 12px; bottom: 88px; width: calc(100vw - 24px); }
                    #pawbot-trigger { right: 16px; bottom: 20px; }
                }
            `;
            document.head.appendChild(style);
        }

        // ─── HTML ─────────────────────────────────────────────────────────────────

        _render() {
            const { rol, nombre } = this._contextoRol;
            const etiquetasRol = {
                usuario: '🐾 Usuario',
                veterinario: '⚕️ Veterinario',
                administrador: '🛡️ Administrador',
                invitado: '👤 Invitado',
            };
            const iconosRol = { usuario: '🐾', veterinario: '⚕️', administrador: '🛡️', invitado: '👤' };

            const barraUsuario = nombre
                ? `<div class="pawbot-user-bar ${rol === 'invitado' ? 'invitado' : ''}">
                       <span class="pawbot-user-bar-icon">${iconosRol[rol]}</span>
                       <span class="pawbot-user-bar-name">${this._sanitizar(nombre)}</span>
                       <span class="pawbot-user-bar-rol">${etiquetasRol[rol]}</span>
                   </div>`
                : rol === 'invitado'
                    ? `<div class="pawbot-user-bar invitado">
                           <span class="pawbot-user-bar-icon">👤</span>
                           <span class="pawbot-user-bar-name">Navegando como invitado</span>
                           <span class="pawbot-user-bar-rol"><a href="/user/visitor/login/login.html" style="color:#b56a00;text-decoration:underline;">Iniciar sesión</a></span>
                       </div>`
                    : '';

            this.innerHTML = `
                <button id="pawbot-trigger" aria-label="Abrir PawBot" aria-expanded="false">
                    <span class="pawbot-icon-open">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.253 2 11.5c0 2.304.87 4.41 2.3 6.03L3 21l3.765-1.195A10.07 10.07 0 0012 21c5.523 0 10-4.253 10-9.5S17.523 2 12 2zm-1 13H9v-2h2v2zm4 0h-2v-2h2v2zm0-4H9V9h6v2z"/></svg>
                    </span>
                    <span class="pawbot-icon-close">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </span>
                    <span id="pawbot-badge"></span>
                </button>

                <div id="pawbot-panel" role="dialog" aria-label="PawBot - Asistente virtual" aria-hidden="true">
                    <div class="pawbot-header">
                        <div class="pawbot-header-avatar">🤖</div>
                        <div class="pawbot-header-info">
                            <div class="pawbot-header-name">PawBot</div>
                            <div class="pawbot-header-status">
                                <span class="pawbot-status-dot"></span> Asistente de PawPath
                            </div>
                        </div>
                        <span class="pawbot-rol-pill ${rol}">${etiquetasRol[rol]}</span>
                        <button class="pawbot-clear-btn" id="pawbot-clear" title="Nueva conversación">↺ Limpiar</button>
                    </div>

                    ${barraUsuario}

                    <div class="pawbot-messages" id="pawbot-messages" role="log" aria-live="polite"></div>
                    <div class="pawbot-sugerencias" id="pawbot-sugerencias"></div>

                    <div class="pawbot-input-area">
                        <textarea id="pawbot-input" placeholder="Escribe tu consulta..." rows="1" maxlength="500" aria-label="Mensaje para PawBot"></textarea>
                        <button id="pawbot-send" disabled aria-label="Enviar mensaje">
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </div>
                </div>
            `;

            this._renderSugerencias();
            this._agregarMensaje('bot', this._rolConfig.bienvenida(this._contextoRol.nombre));
        }

        // ─── Sugerencias ──────────────────────────────────────────────────────────

        _renderSugerencias() {
            const cont = this.querySelector('#pawbot-sugerencias');
            if (!cont) return;
            cont.innerHTML = this._rolConfig.sugerencias
                .map(s => `<button class="pawbot-chip" data-texto="${s}">${s}</button>`)
                .join('');
        }

        _ocultarSugerencias() {
            const cont = this.querySelector('#pawbot-sugerencias');
            if (cont) cont.style.display = 'none';
        }

        // ─── Mensajes ─────────────────────────────────────────────────────────────

        _agregarMensaje(tipo, texto) {
            const contenedor = this.querySelector('#pawbot-messages');
            if (!contenedor) return;
            const ahora = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            const msg = document.createElement('div');
            msg.className = `pawbot-msg ${tipo}`;
            msg.innerHTML = `
                <div class="pawbot-bubble">${this._sanitizar(texto)}</div>
                <span class="pawbot-msg-time">${ahora}</span>
            `;
            contenedor.appendChild(msg);
            this._scrollAbajo(contenedor);
        }

        _mostrarTyping() {
            const contenedor = this.querySelector('#pawbot-messages');
            if (!contenedor) return;
            const el = document.createElement('div');
            el.id = 'pawbot-typing-indicator';
            el.className = 'pawbot-typing';
            el.innerHTML = '<span></span><span></span><span></span>';
            contenedor.appendChild(el);
            this._scrollAbajo(contenedor);
        }

        _quitarTyping() {
            this.querySelector('#pawbot-typing-indicator')?.remove();
        }

        _scrollAbajo(contenedor) {
            setTimeout(() => { contenedor.scrollTop = contenedor.scrollHeight; }, 50);
        }

        _sanitizar(texto) {
            return texto
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/\n/g, '<br>');
        }

        // ─── Envío ────────────────────────────────────────────────────────────────

        async _enviar(texto) {
            texto = texto.trim();
            if (!texto || this._cargando) return;

            this._ocultarSugerencias();
            this._agregarMensaje('user', texto);
            this._setInputValue('');
            this._setCargando(true);
            this._mostrarTyping();

            try {
                const resultado = await sendChatMessage(
                    this._historial,
                    texto,
                    this._contextoRol
                );
                this._quitarTyping();

                if (resultado.fuera_de_tema) {
                    this._agregarMensaje('warning', resultado.respuesta);
                } else {
                    this._historial.push(
                        { role: 'user',  parts: [{ text: texto }] },
                        { role: 'model', parts: [{ text: resultado.respuesta }] }
                    );
                    this._agregarMensaje('bot', resultado.respuesta);
                }
            } catch (err) {
                this._quitarTyping();
                this._agregarMensaje('warning', ERRORES[err.message] || ERRORES.default);
            } finally {
                this._setCargando(false);
            }
        }

        _setCargando(estado) {
            this._cargando = estado;
            const btn   = this.querySelector('#pawbot-send');
            const input = this.querySelector('#pawbot-input');
            if (btn)   btn.disabled   = estado || !input?.value.trim();
            if (input) input.disabled = estado;
        }

        _setInputValue(val) {
            const input = this.querySelector('#pawbot-input');
            if (!input) return;
            input.value = val;
            input.style.height = 'auto';
        }

        // ─── Eventos ──────────────────────────────────────────────────────────────

        _bindEvents() {
            const trigger = this.querySelector('#pawbot-trigger');
            const input   = this.querySelector('#pawbot-input');
            const send    = this.querySelector('#pawbot-send');
            const clear   = this.querySelector('#pawbot-clear');
            const chips   = this.querySelector('#pawbot-sugerencias');

            trigger?.addEventListener('click', () => this._togglePanel());

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this._abierto) this._togglePanel(false);
            });

            document.addEventListener('click', (e) => {
                if (this._abierto && !this.contains(e.target)) this._togglePanel(false);
            });

            input?.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 90) + 'px';
                if (send) send.disabled = !input.value.trim() || this._cargando;
            });

            input?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this._enviar(input.value);
                }
            });

            send?.addEventListener('click', () => {
                if (input) this._enviar(input.value);
            });

            clear?.addEventListener('click', () => {
                this._historial = [];
                const msgs = this.querySelector('#pawbot-messages');
                if (msgs) msgs.innerHTML = '';
                const sugs = this.querySelector('#pawbot-sugerencias');
                if (sugs) { sugs.style.display = ''; this._renderSugerencias(); }
                this._agregarMensaje('bot', this._rolConfig.bienvenida(this._contextoRol.nombre));
            });

            chips?.addEventListener('click', (e) => {
                const chip = e.target.closest('.pawbot-chip');
                if (chip) this._enviar(chip.dataset.texto);
            });

            // Reaccionar si el usuario cierra sesión / inicia sesión mientras el componente está montado
            window.addEventListener('storage', (e) => {
                if (e.key === 'currentUserRole' || e.key === 'userDisplayName') {
                    this._cargarContextoUsuario();
                }
            });
        }

        _togglePanel(forzar) {
            const panel   = this.querySelector('#pawbot-panel');
            const trigger = this.querySelector('#pawbot-trigger');
            const badge   = this.querySelector('#pawbot-badge');

            this._abierto = forzar !== undefined ? forzar : !this._abierto;

            panel?.classList.toggle('is-open', this._abierto);
            trigger?.classList.toggle('is-open', this._abierto);
            trigger?.setAttribute('aria-expanded', String(this._abierto));
            panel?.setAttribute('aria-hidden', String(!this._abierto));

            if (this._abierto) {
                badge?.classList.remove('visible');
                setTimeout(() => this.querySelector('#pawbot-input')?.focus(), 250);
            }
        }
    }

    if (!customElements.get('paw-chatbot')) {
        customElements.define('paw-chatbot', PawBotComponent);
    }
})();


(function () {
    'use strict';

    const SUGERENCIAS = [
        '¿Cómo agendo una cita?',
        '¿Qué veterinarios hay cerca?',
        '¿Cómo registro a mi mascota?',
        '¿Cómo uso el foro?',
    ];

    const BIENVENIDA =
        '¡Hola! Soy PawBot 🐾, tu asistente de PawPath. ' +
        'Puedo ayudarte con el cuidado de tus mascotas, agendar citas, encontrar veterinarios y usar la app. ¿En qué te ayudo?';

    const ERRORES = {
        QUOTA_EXCEEDED: 'El servicio está temporalmente ocupado. Inténtalo en unos minutos.',
        INVALID_KEY: 'Error de configuración del servicio. Contacta al soporte.',
        default: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    };

    class PawBotComponent extends HTMLElement {
        constructor() {
            super();
            /** @type {{ role: 'user'|'model', parts: [{ text: string }] }[]} */
            this._historial = [];
            this._abierto = false;
            this._cargando = false;
        }

        connectedCallback() {
            this._insertarEstilos();
            this._render();
            this._bindEvents();
        }

        // ─── Estilos ────────────────────────────────────────────────────────────

        _insertarEstilos() {
            if (document.getElementById('pawbot-styles')) return;
            const style = document.createElement('style');
            style.id = 'pawbot-styles';
            style.textContent = `
                /* ── Botón flotante ── */
                #pawbot-trigger {
                    position: fixed;
                    bottom: 28px;
                    right: 28px;
                    z-index: 9000;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #33105c 0%, #090979 55%, #008cff 100%);
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(9, 9, 121, 0.45);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    outline: none;
                }
                #pawbot-trigger:hover {
                    transform: scale(1.08);
                    box-shadow: 0 6px 28px rgba(9, 9, 121, 0.6);
                }
                #pawbot-trigger svg {
                    width: 28px;
                    height: 28px;
                    fill: #fff;
                    transition: opacity 0.2s;
                }
                #pawbot-trigger .pawbot-icon-open  { display: flex; }
                #pawbot-trigger .pawbot-icon-close { display: none; }
                #pawbot-trigger.is-open .pawbot-icon-open  { display: none; }
                #pawbot-trigger.is-open .pawbot-icon-close { display: flex; }

                /* Indicador de mensaje nuevo */
                #pawbot-badge {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 12px;
                    height: 12px;
                    background: #ff4d4f;
                    border-radius: 50%;
                    border: 2px solid #fff;
                    display: none;
                }
                #pawbot-badge.visible { display: block; }

                /* ── Panel del chat ── */
                #pawbot-panel {
                    position: fixed;
                    bottom: 100px;
                    right: 28px;
                    z-index: 8999;
                    width: 360px;
                    max-width: calc(100vw - 40px);
                    height: 520px;
                    max-height: calc(100vh - 130px);
                    background: #fff;
                    border-radius: 18px;
                    box-shadow: 0 8px 40px rgba(9, 9, 121, 0.22);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    opacity: 0;
                    transform: translateY(16px) scale(0.97);
                    pointer-events: none;
                    transition: opacity 0.22s ease, transform 0.22s ease;
                }
                #pawbot-panel.is-open {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                    pointer-events: all;
                }

                /* Header */
                .pawbot-header {
                    background: linear-gradient(90deg, #33105c 0%, #090979 55%, #008cff 100%);
                    color: #fff;
                    padding: 14px 18px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }
                .pawbot-header-avatar {
                    width: 38px;
                    height: 38px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    flex-shrink: 0;
                }
                .pawbot-header-info { flex: 1; min-width: 0; }
                .pawbot-header-name {
                    font-family: 'Poppins', sans-serif;
                    font-weight: 600;
                    font-size: 15px;
                    line-height: 1.2;
                }
                .pawbot-header-status {
                    font-size: 11px;
                    opacity: 0.85;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .pawbot-status-dot {
                    width: 7px;
                    height: 7px;
                    background: #4cff91;
                    border-radius: 50%;
                    display: inline-block;
                }
                .pawbot-clear-btn {
                    background: rgba(255,255,255,0.15);
                    border: none;
                    border-radius: 8px;
                    color: #fff;
                    padding: 5px 9px;
                    font-size: 11px;
                    cursor: pointer;
                    font-family: 'Poppins', sans-serif;
                    transition: background 0.15s;
                    white-space: nowrap;
                }
                .pawbot-clear-btn:hover { background: rgba(255,255,255,0.28); }

                /* Área de mensajes */
                .pawbot-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 14px 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    scroll-behavior: smooth;
                }
                .pawbot-messages::-webkit-scrollbar { width: 4px; }
                .pawbot-messages::-webkit-scrollbar-thumb {
                    background: #d0c8e8;
                    border-radius: 4px;
                }

                /* Burbujas */
                .pawbot-msg {
                    display: flex;
                    flex-direction: column;
                    max-width: 82%;
                    animation: pawbot-fadein 0.18s ease;
                }
                @keyframes pawbot-fadein {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .pawbot-msg.bot  { align-self: flex-start; }
                .pawbot-msg.user { align-self: flex-end;   }

                .pawbot-bubble {
                    padding: 10px 14px;
                    border-radius: 14px;
                    font-family: 'Poppins', sans-serif;
                    font-size: 13.5px;
                    line-height: 1.5;
                    word-break: break-word;
                }
                .pawbot-msg.bot .pawbot-bubble {
                    background: #f0ebff;
                    color: #1e1e2e;
                    border-bottom-left-radius: 4px;
                }
                .pawbot-msg.user .pawbot-bubble {
                    background: linear-gradient(135deg, #33105c, #090979);
                    color: #fff;
                    border-bottom-right-radius: 4px;
                }
                .pawbot-msg.warning .pawbot-bubble {
                    background: #fff3e0;
                    color: #7c4a00;
                    border: 1px solid #ffe0b2;
                }
                .pawbot-msg-time {
                    font-size: 10px;
                    color: #aaa;
                    margin-top: 3px;
                    padding: 0 4px;
                }
                .pawbot-msg.user .pawbot-msg-time { text-align: right; }

                /* Indicador de carga (dots) */
                .pawbot-typing {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 10px 14px;
                    background: #f0ebff;
                    border-radius: 14px;
                    border-bottom-left-radius: 4px;
                    width: fit-content;
                    align-self: flex-start;
                }
                .pawbot-typing span {
                    width: 7px;
                    height: 7px;
                    background: #090979;
                    border-radius: 50%;
                    display: inline-block;
                    animation: pawbot-bounce 1.1s infinite ease-in-out;
                }
                .pawbot-typing span:nth-child(2) { animation-delay: 0.18s; }
                .pawbot-typing span:nth-child(3) { animation-delay: 0.36s; }
                @keyframes pawbot-bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }

                /* Sugerencias rápidas */
                .pawbot-sugerencias {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    padding: 0 14px 10px;
                    flex-shrink: 0;
                }
                .pawbot-chip {
                    background: #ede9ff;
                    color: #33105c;
                    border: 1px solid #c8bbf0;
                    border-radius: 20px;
                    padding: 5px 12px;
                    font-size: 12px;
                    font-family: 'Poppins', sans-serif;
                    cursor: pointer;
                    transition: background 0.15s, transform 0.1s;
                    white-space: nowrap;
                }
                .pawbot-chip:hover {
                    background: #d6ccff;
                    transform: scale(1.03);
                }

                /* Input area */
                .pawbot-input-area {
                    border-top: 1px solid #eee;
                    padding: 10px 12px;
                    display: flex;
                    gap: 8px;
                    align-items: flex-end;
                    flex-shrink: 0;
                    background: #fafafa;
                }
                #pawbot-input {
                    flex: 1;
                    border: 1.5px solid #d0c8e8;
                    border-radius: 12px;
                    padding: 9px 13px;
                    font-family: 'Poppins', sans-serif;
                    font-size: 13.5px;
                    resize: none;
                    outline: none;
                    max-height: 90px;
                    overflow-y: auto;
                    line-height: 1.4;
                    transition: border-color 0.15s;
                    background: #fff;
                }
                #pawbot-input:focus { border-color: #090979; }
                #pawbot-input::placeholder { color: #bbb; }
                #pawbot-send {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #33105c, #090979);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: opacity 0.15s, transform 0.15s;
                }
                #pawbot-send:hover:not(:disabled) { transform: scale(1.07); }
                #pawbot-send:disabled { opacity: 0.45; cursor: not-allowed; }
                #pawbot-send svg { width: 18px; height: 18px; fill: #fff; }

                /* Responsive móvil */
                @media (max-width: 420px) {
                    #pawbot-panel {
                        right: 12px;
                        bottom: 88px;
                        width: calc(100vw - 24px);
                    }
                    #pawbot-trigger {
                        right: 16px;
                        bottom: 20px;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // ─── HTML ────────────────────────────────────────────────────────────────

        _render() {
            this.innerHTML = `
                <!-- Botón flotante -->
                <button id="pawbot-trigger" aria-label="Abrir PawBot" aria-expanded="false">
                    <span class="pawbot-icon-open">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.477 2 2 6.253 2 11.5c0 2.304.87 4.41 2.3 6.03L3 21l3.765-1.195A10.07 10.07 0 0012 21c5.523 0 10-4.253 10-9.5S17.523 2 12 2zm-1 13H9v-2h2v2zm4 0h-2v-2h2v2zm0-4H9V9h6v2z"/>
                        </svg>
                    </span>
                    <span class="pawbot-icon-close">
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </span>
                    <span id="pawbot-badge"></span>
                </button>

                <!-- Panel de chat -->
                <div id="pawbot-panel" role="dialog" aria-label="PawBot - Asistente virtual" aria-hidden="true">
                    <div class="pawbot-header">
                        <div class="pawbot-header-avatar">🐾</div>
                        <div class="pawbot-header-info">
                            <div class="pawbot-header-name">PawBot</div>
                            <div class="pawbot-header-status">
                                <span class="pawbot-status-dot"></span> Asistente de PawPath
                            </div>
                        </div>
                        <button class="pawbot-clear-btn" id="pawbot-clear" title="Nueva conversación">
                            Nueva conversación
                        </button>
                    </div>

                    <div class="pawbot-messages" id="pawbot-messages" role="log" aria-live="polite"></div>

                    <div class="pawbot-sugerencias" id="pawbot-sugerencias"></div>

                    <div class="pawbot-input-area">
                        <textarea
                            id="pawbot-input"
                            placeholder="Escribe tu consulta..."
                            rows="1"
                            maxlength="500"
                            aria-label="Mensaje para PawBot"
                        ></textarea>
                        <button id="pawbot-send" disabled aria-label="Enviar mensaje">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            this._renderSugerencias();
            this._agregarMensaje('bot', BIENVENIDA);
        }

        // ─── Sugerencias ────────────────────────────────────────────────────────

        _renderSugerencias() {
            const cont = this.querySelector('#pawbot-sugerencias');
            if (!cont) return;
            cont.innerHTML = SUGERENCIAS.map(s =>
                `<button class="pawbot-chip" data-texto="${s}">${s}</button>`
            ).join('');
        }

        _ocultarSugerencias() {
            const cont = this.querySelector('#pawbot-sugerencias');
            if (cont) cont.style.display = 'none';
        }

        // ─── Mensajes ────────────────────────────────────────────────────────────

        _agregarMensaje(tipo, texto) {
            const contenedor = this.querySelector('#pawbot-messages');
            if (!contenedor) return;

            const ahora = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            const msg = document.createElement('div');
            msg.className = `pawbot-msg ${tipo}`;
            msg.innerHTML = `
                <div class="pawbot-bubble">${this._sanitizar(texto)}</div>
                <span class="pawbot-msg-time">${ahora}</span>
            `;
            contenedor.appendChild(msg);
            this._scrollAbajo(contenedor);
        }

        _mostrarTyping() {
            const contenedor = this.querySelector('#pawbot-messages');
            if (!contenedor) return null;
            const el = document.createElement('div');
            el.id = 'pawbot-typing-indicator';
            el.className = 'pawbot-typing';
            el.innerHTML = '<span></span><span></span><span></span>';
            contenedor.appendChild(el);
            this._scrollAbajo(contenedor);
            return el;
        }

        _quitarTyping() {
            const el = this.querySelector('#pawbot-typing-indicator');
            if (el) el.remove();
        }

        _scrollAbajo(contenedor) {
            setTimeout(() => { contenedor.scrollTop = contenedor.scrollHeight; }, 50);
        }

        /** Previene XSS escapando HTML */
        _sanitizar(texto) {
            return texto
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/\n/g, '<br>');
        }

        // ─── Envío de mensajes ───────────────────────────────────────────────────

        async _enviar(texto) {
            texto = texto.trim();
            if (!texto || this._cargando) return;

            this._ocultarSugerencias();
            this._agregarMensaje('user', texto);
            this._setInputValue('');
            this._setCargando(true);
            this._mostrarTyping();

            try {
                const resultado = await sendChatMessage(this._historial, texto);

                this._quitarTyping();

                if (resultado.fuera_de_tema) {
                    this._agregarMensaje('warning', resultado.respuesta);
                } else {
                    // Actualizar historial con el nuevo intercambio
                    this._historial.push(
                        { role: 'user', parts: [{ text: texto }] },
                        { role: 'model', parts: [{ text: resultado.respuesta }] }
                    );
                    this._agregarMensaje('bot', resultado.respuesta);
                }
            } catch (err) {
                this._quitarTyping();
                const msg = ERRORES[err.message] || ERRORES.default;
                this._agregarMensaje('warning', msg);
            } finally {
                this._setCargando(false);
            }
        }

        _setCargando(estado) {
            this._cargando = estado;
            const btn = this.querySelector('#pawbot-send');
            const input = this.querySelector('#pawbot-input');
            if (btn) btn.disabled = estado || !input?.value.trim();
            if (input) input.disabled = estado;
        }

        _setInputValue(val) {
            const input = this.querySelector('#pawbot-input');
            if (!input) return;
            input.value = val;
            input.style.height = 'auto';
        }

        // ─── Eventos ─────────────────────────────────────────────────────────────

        _bindEvents() {
            const trigger = this.querySelector('#pawbot-trigger');
            const panel   = this.querySelector('#pawbot-panel');
            const input   = this.querySelector('#pawbot-input');
            const send    = this.querySelector('#pawbot-send');
            const clear   = this.querySelector('#pawbot-clear');
            const chips   = this.querySelector('#pawbot-sugerencias');

            // Toggle panel
            trigger?.addEventListener('click', () => this._togglePanel());

            // Cerrar con Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this._abierto) this._togglePanel(false);
            });

            // Cerrar al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (this._abierto && !this.contains(e.target)) {
                    this._togglePanel(false);
                }
            });

            // Auto-resize textarea
            input?.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 90) + 'px';
                if (send) send.disabled = !input.value.trim() || this._cargando;
            });

            // Enviar con Enter (Shift+Enter = salto de línea)
            input?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this._enviar(input.value);
                }
            });

            // Botón enviar
            send?.addEventListener('click', () => {
                if (input) this._enviar(input.value);
            });

            // Limpiar conversación
            clear?.addEventListener('click', () => {
                this._historial = [];
                const msgs = this.querySelector('#pawbot-messages');
                if (msgs) msgs.innerHTML = '';
                const sugs = this.querySelector('#pawbot-sugerencias');
                if (sugs) { sugs.style.display = ''; this._renderSugerencias(); }
                this._agregarMensaje('bot', BIENVENIDA);
                this._bindChips();
            });

            // Chips de sugerencias
            chips?.addEventListener('click', (e) => {
                const chip = e.target.closest('.pawbot-chip');
                if (chip) this._enviar(chip.dataset.texto);
            });
        }

        _bindChips() {
            const chips = this.querySelector('#pawbot-sugerencias');
            chips?.addEventListener('click', (e) => {
                const chip = e.target.closest('.pawbot-chip');
                if (chip) this._enviar(chip.dataset.texto);
            });
        }

        _togglePanel(forzar) {
            const panel   = this.querySelector('#pawbot-panel');
            const trigger = this.querySelector('#pawbot-trigger');
            const badge   = this.querySelector('#pawbot-badge');

            this._abierto = forzar !== undefined ? forzar : !this._abierto;

            panel?.classList.toggle('is-open', this._abierto);
            trigger?.classList.toggle('is-open', this._abierto);
            trigger?.setAttribute('aria-expanded', String(this._abierto));
            panel?.setAttribute('aria-hidden', String(!this._abierto));

            if (this._abierto) {
                badge?.classList.remove('visible');
                setTimeout(() => this.querySelector('#pawbot-input')?.focus(), 250);
            }
        }
    }

    if (!customElements.get('paw-chatbot')) {
        customElements.define('paw-chatbot', PawBotComponent);
    }
})();
