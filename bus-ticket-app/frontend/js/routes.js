// script.js - routes.js
// Funciones para el manejo de rutas y horarios

// --- Importar funciones necesarias de otros módulos ---
import { showMessage } from './ui.js'; // Para mostrar mensajes
import { resetApp } from './auth.js'; // Para redirigir al login en caso de sesión expirada (manejo de error 401)

// --- Funciones de Rutas y Horarios ---

/**
 * Carga las rutas disponibles desde la API y rellena el desplegable de rutas.
 */
export function loadRoutes() {
    const routeSelect = document.getElementById('route');
    const loadingDiv = document.getElementById('loading'); // Spinner en la sección de ruta

    // Limpiar rutas anteriores y mostrar estado de carga
    if (routeSelect) { // Asegurarse de que el elemento existe
        routeSelect.innerHTML = '<option value="">Selecciona una ruta</option>';
    }
    if (loadingDiv) {
        loadingDiv.style.display = 'block'; // Mostrar spinner
    }

    const token = localStorage.getItem('token');
    if (!token) {
        // Si no hay token, la redirección ya la maneja dashboard.js al cargar la página.
        // Aquí solo nos aseguramos de no hacer la llamada API.
        console.warn('No token found. Cannot load routes.');
        if (loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner si no hay token
        return; // Salir de la función
    }

    // Realizar la llamada a la API para obtener las rutas
    // *** Asumiendo que tu Nginx proxy y microservicio route-scheduler manejan /api/routes/ ***
    fetch('/api/routes/routes', {
        headers: {
            'Authorization': `Bearer ${token}` // Enviar el token si tus endpoints de rutas requieren autenticación
        } // Si no requieren autenticación, puedes omitir esta línea
    })
    .then(response => {
        if (!response.ok) {
             // Manejar errores de autenticación (401) o de la API
            if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 setTimeout(() => { resetApp(); }, 2000); // resetApp importada de auth.js
            }
             // Intentar leer el error del body si es posible
             return response.json().then(err => { throw new Error(err.message || `Error al cargar rutas: ${response.status}`); });
        }
        return response.json();
    })
    .then(routes => {
        // 'routes' debería ser un array de objetos { id, origin, destination } según tu código Flask
        if (routeSelect) { // Asegurarse de que el elemento existe
            // Limpiar de nuevo por si acaso y añadir la opción por defecto
            routeSelect.innerHTML = '<option value="">Selecciona una ruta</option>';
            if (routes && routes.length > 0) {
                 routes.forEach(route => {
                     routeSelect.innerHTML += `
                         <option value="${route.id}">
                             ${route.origin} → ${route.destination}
                         </option>
                     `;
                 });
            } else {
                 showMessage('No hay rutas disponibles en este momento.', 'info');
            }
        }
        if (loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
    })
    .catch(error => {
        console.error('Error en loadRoutes:', error);
        showMessage(error.message || 'No se pudieron cargar las rutas.', 'error'); // showMessage importada
        if (loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
         if (routeSelect) routeSelect.innerHTML = '<option value="">Error al cargar rutas</option>'; // Opcional: indicar error en el select
    });
}

/**
 * Carga los horarios disponibles para una ruta seleccionada desde la API
 * y rellena el desplegable de horarios.
 * @param {string | number} routeId El ID de la ruta seleccionada.
 */
export function loadSchedules(routeId) {
     const scheduleSelect = document.getElementById('schedule');
     const loadingDiv = document.getElementById('loading'); // Puedes reutilizar el spinner de carga de rutas

    // Limpiar horarios anteriores y ocultar el select
    if (scheduleSelect) { // Asegurarse de que el elemento existe
        scheduleSelect.innerHTML = '<option value="">Selecciona un horario</option>';
        scheduleSelect.style.display = 'none'; // Ocultar inicialmente
    }


    if (!routeId) {
        // Si no hay ruta seleccionada, no cargar horarios y salir.
        console.log("No routeId provided for loadSchedules.");
        if (loadingDiv) loadingDiv.style.display = 'none'; // Asegurarse de que el spinner esté oculto
        return;
    }

    const token = localStorage.getItem('token');
     if (!token) {
         // Si no hay token, la redirección ya la maneja dashboard.js.
         // Aquí solo nos aseguramos de no hacer la llamada API y ocultar spinner/select.
         console.warn('No token found. Cannot load schedules.');
         if (loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
         if (scheduleSelect) scheduleSelect.style.display = 'none';
         return;
     }

    if(loadingDiv) loadingDiv.style.display = 'block'; // Mostrar spinner

    // *** Asumiendo que tu Nginx proxy y microservicio route-scheduler manejan /api/routes/schedules/<route_id> ***
    // Tu config de Nginx para /api/routes/schedules/ { proxy_pass http://route-scheduler:5004/schedules/; }
    // y la ruta en Flask /schedules/<int:route_id> deberían hacer que la URL sea /api/routes/schedules/<route_id>
    fetch(`/api/routes/schedules/${routeId}`, { // URL a la que llamamos desde el frontend
        headers: { 'Authorization': `Bearer ${token}` } // Enviar el token si tus endpoints de rutas requieren autenticación
                                                     // Si no requieren autenticación, puedes omitir esta línea
    })
    .then(response => {
        console.log("Respuesta de fetch para schedules:", response); // Debug log
        if (!response.ok) {
             if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error'); // showMessage importada
                 setTimeout(() => { resetApp(); }, 2000); // resetApp importada
             }
             // Intentar leer el error del body si es posible
             return response.json().then(err => { throw new Error(err.message || `Error al cargar horarios para la ruta ${routeId}: ${response.status}`); });
        }
        return response.json();
    })
    .then(data => {
        console.log("Datos recibidos de la API de schedules:", data); // Debug log
        // 'data' debería ser algo como { "schedules": ["08:00", "22:00"] } según tu código Flask
        if (scheduleSelect) { // Asegurarse de que el elemento existe
            // Limpiar de nuevo por si acaso y añadir la opción por defecto
             scheduleSelect.innerHTML = '<option value="">Selecciona un horario</option>';
             if (data && data.schedules && data.schedules.length > 0) {
                 data.schedules.forEach(schedule => {
                     scheduleSelect.innerHTML += `<option value="${schedule}">${schedule}</option>`;
                 });
                 scheduleSelect.style.display = 'inline-block'; // O 'block' o 'flex', hacerlo visible
                 console.log("#schedule display style:", scheduleSelect.style.display); // Debug log

             } else {
                showMessage(`No hay horarios disponibles para la ruta seleccionada.`, 'info'); // showMessage importada
                scheduleSelect.style.display = 'none'; // Asegurarse de que esté oculto si no hay horarios
                console.log("No schedules received or data format incorrect."); // Debug log
             }
        }
        if (loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
    })
    .catch(error => {
        console.error('Error en loadSchedules:', error);
        showMessage(error.message || 'No se pudieron cargar los horarios.', 'error'); // showMessage importada
         if (loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
         if (scheduleSelect) scheduleSelect.style.display = 'none'; // Asegurarse de que esté oculto si hay error
         if (scheduleSelect) scheduleSelect.innerHTML = '<option value="">Error horarios</option>'; // Opcional: indicar error
    });
}

// NOTA: Asegúrate de que las funciones showMessage y resetApp sean exportadas desde ui.js y auth.js respectivamente.
