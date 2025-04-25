// script.js - ui.js
// Funciones de utilidad para la interfaz de usuario

/**
 * Muestra un mensaje personalizado en la interfaz.
 * @param {string} message El texto del mensaje a mostrar.
 * @param {string} [type='info'] El tipo de mensaje ('info', 'success', 'error') para aplicar estilos.
 */
export function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('custom-message');

    // Asegurarse de que el elemento de mensaje existe en la página actual
    if (!messageDiv) {
        console.warn('Elemento #custom-message no encontrado en la página.');
        // Fallback a alert si no se encuentra el div (opcional)
        // alert(message);
        return;
    }

    messageDiv.textContent = message;
    // Limpiar clases anteriores y añadir las nuevas
    messageDiv.className = 'custom-message show ' + type;

    // Ocultar el mensaje automáticamente después de 3 segundos
    setTimeout(() => {
        // Eliminar las clases 'show' y la de tipo para ocultar el mensaje
        messageDiv.className = 'custom-message';
    }, 3000); // 3000 milisegundos = 3 segundos
}

// Si tuvieras otras funciones de UI generales (ej: mostrar/ocultar spinners de forma genérica), irían aquí
// y también serían exportadas si se necesitan fuera de este archivo.
