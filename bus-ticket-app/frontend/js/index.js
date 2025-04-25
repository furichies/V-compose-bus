// script.js - index.js
// Lógica específica de la página de login/registro

// Importar funciones necesarias de otros módulos
import { login, register } from './auth.js'; // Importamos las funciones de autenticación
import { showMessage } from './ui.js'; // Importamos la función para mostrar mensajes

// Ejecutar código una vez que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    // Determinar si estamos en la página de inicio (index.html)
    // Usamos window.location.pathname para obtener la ruta de la URL
    // endsWith('/') cubre el caso de acceder a la raíz del sitio
    const isIndexPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/index.html');
    // También necesitamos saber si estamos en la página del dashboard, aunque este script sea para index.html
    // La lógica de redirección necesita esta información.
    const isDashboardPage = window.location.pathname.endsWith('/dashboard.html');


    // Lógica de redirección: si hay un token y estamos en la página de inicio, redirigir al dashboard
    if (token && isIndexPage) {
        console.log('Token found, redirecting to dashboard.');
        // showMessage('Ya has iniciado sesión. Redirigiendo...', 'info'); // Opcional: mostrar un mensaje breve
        // setTimeout(() => { // Opcional: añadir un pequeño retraso si muestras el mensaje
             window.location.href = 'dashboard.html';
        // }, 500);
    }
    // La lógica para cuando NO hay token y estamos en el dashboard, o cuando SÍ hay token y estamos en el dashboard,
    // NO va aquí. Esa lógica va en dashboard.js.

    // Si NO hay token y estamos en la página de inicio (el caso que nos interesa en index.js)
    if (!token && isIndexPage) {
        console.log('No token found on index page. Displaying login/register form.');

        // --- Configurar Event Listeners para los botones de Login/Registro ---
        // IMPORTANTE: Asegúrate de que tus botones en index.html tengan IDs, por ejemplo:
        // <button id="registerButton">Registrar usuario</button>
        // <button id="loginButton">Login</button>

        const registerButton = document.getElementById('registerButton');
        const loginButton = document.getElementById('loginButton');


        if (registerButton) {
            // Añadir event listener al botón de registro
            registerButton.addEventListener('click', (event) => {
                 event.preventDefault(); // Prevenir el comportamiento por defecto (ej: envío de formulario)
                 register(); // Llama a la función register importada de auth.js
            });
        } else {
             console.warn("Elemento con ID 'registerButton' no encontrado en index.html");
        }


         if (loginButton) {
             // Añadir event listener al botón de login
            loginButton.addEventListener('click', (event) => {
                 event.preventDefault(); // Prevenir el comportamiento por defecto
                 login(); // Llama a la función login importada de auth.js
            });
         } else {
              console.warn("Elemento con ID 'loginButton' no encontrado en index.html");
         }

        // -----------------------------------------------------------------

        // Cualquier otra lógica específica para inicializar la UI de index.html
        // (ej: limpiar campos al cargar, mostrar/ocultar partes del formulario, etc.)
        // iría aquí.
    }


});

