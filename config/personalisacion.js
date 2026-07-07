// personalizacion-simple.js - Versión simplificada sin Firebase
(function() {
    'use strict';

   

    // Función para obtener el valor de una variable CSS
    function getCSSVariable(variableName) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(variableName).trim();
    }

    // Aplicar estilos personalizados basados en variables CSS
    function applyCustomStyles() {
        // Obtener colores de las variables CSS
        const primaryColor = getCSSVariable('--color-primary');
        const secondaryColor = getCSSVariable('--color-secondary');
        const accentColor = getCSSVariable('--color-accent');
        const backgroundColor = getCSSVariable('--color-background');
        const textColor = getCSSVariable('--color-text');
        const surfaceColor = getCSSVariable('--color-surface');
        const successColor = getCSSVariable('--color-success');
        const warningColor = getCSSVariable('--color-warning');
        const errorColor = getCSSVariable('--color-error');
        

        const styleId = 'personalizacion-simple-styles';
        let styleElement = document.getElementById(styleId);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }
        
        // Generar estilos basados en las variables CSS
        styleElement.textContent = `
            /* ESTILOS PERSONALIZADOS - VERSIÓN SIMPLE */
            
            /* Aplicar colores a elementos comunes */
            body {
                background-color: ${backgroundColor} !important;
                color: ${textColor} !important;
                transition: all 0.3s ease;
            }
            
            /* Botones primarios */
            .btn-primary, 
            button[class*="primary"],
            .primary-button {
                background-color: ${primaryColor} !important;
                border-color: ${primaryColor} !important;
                color: white !important;
            }
            
            .btn-primary:hover,
            button[class*="primary"]:hover,
            .primary-button:hover {
                filter: brightness(0.9) !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px ${primaryColor}40 !important;
            }
            
            /* Botones secundarios */
            .btn-secondary,
            button[class*="secondary"],
            .secondary-button {
                background-color: ${secondaryColor} !important;
                border-color: ${secondaryColor} !important;
                color: ${textColor} !important;
            }
            
            .btn-secondary:hover {
                filter: brightness(0.95) !important;
                transform: translateY(-2px);
            }
            
            /* Tarjetas y contenedores */
            .card,
            .panel,
            .content-box {
                background-color: ${surfaceColor} !important;
                color: ${textColor} !important;
                border: 1px solid ${getCSSVariable('--color-gray-200')} !important;
            }
            
            /* Encabezados */
            h1, h2, h3, h4, h5, h6 {
                color: ${primaryColor} !important;
            }
            
            /* Enlaces */
            a {
                color: ${primaryColor} !important;
            }
            
            a:hover {
                color: ${accentColor} !important;
            }
            
            /* Badges */
            .badge-primary {
                background-color: ${primaryColor}20 !important;
                color: ${primaryColor} !important;
                border: 1px solid ${primaryColor}40 !important;
            }
            
            .badge-success {
                background-color: ${successColor}20 !important;
                color: ${successColor} !important;
            }
            
            .badge-warning {
                background-color: ${warningColor}20 !important;
                color: ${warningColor} !important;
            }
            
            .badge-error {
                background-color: ${errorColor}20 !important;
                color: ${errorColor} !important;
            }
            
            /* Formularios */
            input, textarea, select {
                background-color: ${backgroundColor} !important;
                color: ${textColor} !important;
                border: 2px solid ${getCSSVariable('--color-gray-200')} !important;
                border-radius: var(--radius-md) !important;
                padding: 12px !important;
            }
            
            input:focus, textarea:focus, select:focus {
                border-color: ${primaryColor} !important;
                box-shadow: 0 0 0 3px ${primaryColor}20 !important;
                outline: none !important;
            }
            
            /* Tablas */
            table {
                background-color: ${surfaceColor} !important;
                border-radius: var(--radius-lg) !important;
                overflow: hidden !important;
            }
            
            th {
                background-color: ${primaryColor} !important;
                color: white !important;
                padding: 12px !important;
            }
            
            td {
                padding: 12px !important;
                border-bottom: 1px solid ${getCSSVariable('--color-gray-200')} !important;
            }
            
            tr:last-child td {
                border-bottom: none !important;
            }
            
            /* Alertas */
            .alert-success {
                background-color: ${successColor}10 !important;
                border-left: 4px solid ${successColor} !important;
                color: ${textColor} !important;
            }
            
            .alert-warning {
                background-color: ${warningColor}10 !important;
                border-left: 4px solid ${warningColor} !important;
                color: ${textColor} !important;
            }
            
            .alert-error {
                background-color: ${errorColor}10 !important;
                border-left: 4px solid ${errorColor} !important;
                color: ${textColor} !important;
            }
            
            .alert-info {
                background-color: ${primaryColor}10 !important;
                border-left: 4px solid ${primaryColor} !important;
                color: ${textColor} !important;
            }
            
            /* Navegación */
            .navbar {
                background-color: ${surfaceColor} !important;
                border-bottom: 1px solid ${getCSSVariable('--color-gray-200')} !important;
            }
            
            .nav-item.active {
                color: ${primaryColor} !important;
                border-bottom: 2px solid ${primaryColor} !important;
            }
            
            /* Iconos */
            .icon-primary {
                color: ${primaryColor} !important;
            }
            
            .icon-secondary {
                color: ${secondaryColor} !important;
            }
            
            .icon-accent {
                color: ${accentColor} !important;
            }
            
            /* Progress bars */
            .progress-bar {
                background-color: ${primaryColor} !important;
                border-radius: var(--radius-full) !important;
            }
            
            .progress-track {
                background-color: ${getCSSVariable('--color-gray-200')} !important;
                border-radius: var(--radius-full) !important;
            }
            
            /* Tooltips */
            .tooltip {
                background-color: ${textColor} !important;
                color: ${backgroundColor} !important;
                border-radius: var(--radius-sm) !important;
                padding: 4px 8px !important;
                font-size: 0.875rem !important;
            }
            
            /* ESTILOS PARA SWEETALERT2 PERSONALIZADOS */
            .swal2-popup {
                background: ${surfaceColor} !important;
                color: ${textColor} !important;
                border: 2px solid ${primaryColor} !important;
                border-radius: var(--radius-lg) !important;
            }

            .swal2-title {
                color: ${primaryColor} !important;
                font-weight: 700 !important;
            }

            .swal2-confirm {
                background: ${primaryColor} !important;
                border: none !important;
                color: white !important;
                border-radius: var(--radius-full) !important;
                padding: 12px 24px !important;
            }

            .swal2-confirm:hover {
                filter: brightness(0.9) !important;
                transform: translateY(-2px) !important;
            }

            .swal2-cancel {
                background: ${surfaceColor} !important;
                border: 2px solid ${getCSSVariable('--color-gray-300')} !important;
                color: ${textColor} !important;
                border-radius: var(--radius-full) !important;
                padding: 12px 24px !important;
            }

            .swal2-cancel:hover {
                background: ${getCSSVariable('--color-gray-200')} !important;
            }

            .swal2-icon.swal2-success {
                border-color: ${successColor} !important;
                color: ${successColor} !important;
            }

            .swal2-icon.swal2-error {
                border-color: ${errorColor} !important;
                color: ${errorColor} !important;
            }

            .swal2-icon.swal2-warning {
                border-color: ${warningColor} !important;
                color: ${warningColor} !important;
            }

            .swal2-icon.swal2-info {
                border-color: ${primaryColor} !important;
                color: ${primaryColor} !important;
            }
        `;
        
      
        
        // Configurar SweetAlert2 si está disponible
        setupSweetAlert(primaryColor, surfaceColor, textColor, successColor, warningColor, errorColor);
    }
    
    // Configurar SweetAlert2 con los colores personalizados
    function setupSweetAlert(primaryColor, surfaceColor, textColor, successColor, warningColor, errorColor) {
        if (typeof Swal !== 'undefined') {
            Swal.mixin({
                background: surfaceColor,
                color: textColor,
                confirmButtonColor: primaryColor,
                cancelButtonColor: getCSSVariable('--color-gray-400'),
                customClass: {
                    popup: 'sweet-alert-custom',
                    confirmButton: 'sweet-alert-confirm-custom',
                    cancelButton: 'sweet-alert-cancel-custom'
                }
            });
            
        
        }
    }

    // Función para mostrar alerta personalizada
    window.showCustomAlert = function(config) {
        if (typeof Swal === 'undefined') {
            console.warn('SweetAlert2 no está cargado');
            return Promise.resolve(false);
        }

        const primaryColor = getCSSVariable('--color-primary');
        const surfaceColor = getCSSVariable('--color-surface');
        const textColor = getCSSVariable('--color-text');

        const defaultConfig = {
            background: surfaceColor,
            color: textColor,
            confirmButtonColor: primaryColor,
            cancelButtonColor: getCSSVariable('--color-gray-400')
        };

        return Swal.fire({
            ...defaultConfig,
            ...config
        });
    };

    // Función para confirmación personalizada
    window.showCustomConfirm = function(title, text, confirmButtonText = 'Confirmar', cancelButtonText = 'Cancelar') {
        return window.showCustomAlert({
            title: title,
            text: text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: confirmButtonText,
            cancelButtonText: cancelButtonText
        });
    };

    // Función para éxito personalizado
    window.showCustomSuccess = function(title, text) {
        return window.showCustomAlert({
            title: title,
            text: text,
            icon: 'success'
        });
    };

    // Función para error personalizado
    window.showCustomError = function(title, text) {
        return window.showCustomAlert({
            title: title,
            text: text,
            icon: 'error'
        });
    };

    // Función para advertencia personalizada
    window.showCustomWarning = function(title, text) {
        return window.showCustomAlert({
            title: title,
            text: text,
            icon: 'warning'
        });
    };

    // Función para actualizar colores (útil si cambian dinámicamente)
    window.actualizarColoresPersonalizados = function() {
        applyCustomStyles();
    };

    // Inicializar cuando el DOM esté listo
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyCustomStyles);
        } else {
            applyCustomStyles();
        }
        
        // Observar cambios en las variables CSS (opcional, para temas dinámicos)
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'style' || 
                    (mutation.target === document.documentElement && mutation.type === 'attributes')) {
                    applyCustomStyles();
                }
            });
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }

    // Iniciar
    init();


})();