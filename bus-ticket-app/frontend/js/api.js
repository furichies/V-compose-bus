// script.js
// Esta variable puede que ya no sea necesaria globalmente si manejamos la selección por página
// let selectedSeat = null; // Considera si esta variable sigue siendo necesaria aquí o solo en el scope del dashboard

const PRICE_PER_SEAT = 43; // Esta constante puede ser útil en ambos lados o solo en el dashboard
let selectedSeats = []; // permite múltiples asientos - útil en el dashboard

// --- Funciones de Autenticación (Usadas en index.html) ---

function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;

    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
    })
    .then(response => response.json())
    .then(data => {
        showMessage(data.message); // Usamos el aviso personalizado
        // Si el registro es exitoso, podrías redirigir al login o mostrar un mensaje
        // Por ahora, solo mostramos el mensaje del backend.
        // Si el backend devuelve un token en el registro, podrías redirigir como en login.
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Error en el registro', 'error');
    });
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.token) {
            // Login satisfactorio - Guardar token y redirigir al dashboard
            showMessage('Login satisfactorio', 'success');
            localStorage.setItem('token', data.token);
            // Redirigir al dashboard después de un breve retraso para que se vea el mensaje
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000); // Redirige después de 1 segundo
        } else {
            // Credenciales incorrectas
            showMessage('Credenciales incorrectas', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Error en el login', 'error');
    });
}

// La función showRouteSelection ya no ocultará/mostrará divs, solo cargará las rutas
// La lógica de mostrar/ocultar secciones ahora residirá en el dashboard.html script.js

function showRouteSelection() {
    // En el contexto del dashboard, esta función simplemente carga las rutas
    loadRoutes();
    // Si estás en el dashboard, asegúrate de que la sección de selección de ruta esté visible
    const routeSection = document.getElementById('route-selection');
    if(routeSection) {
        routeSection.style.display = 'block';
        // Oculta otras secciones si están visibles
        const seatSection = document.getElementById('seat-selection');
        if(seatSection) seatSection.style.display = 'none';
    }
}


function loadRoutes() {
    // Asegúrate de que esta función solo se llame cuando el usuario esté autenticado
    const token = localStorage.getItem('token');
    if (!token) {
        // Si no hay token, redirigir al login (o mostrar un mensaje)
        console.log('No token found, redirecting to login');
        // showMessage('Por favor, inicia sesión', 'info'); // O redirigir inmediatamente
        // window.location.href = 'index.html';
        return; // Salir de la función
    }

    const loadingDiv = document.getElementById('loading');
    if(loadingDiv) loadingDiv.style.display = 'block'; // Mostrar spinner

    fetch('/api/routes/routes', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
        if (!response.ok) {
            // Manejar errores de autenticación o de la API
            if (response.status === 401) { // Ejemplo: Token inválido/expirado
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 // Redirigir al login después de un retraso
                 setTimeout(() => {
                     resetApp(); // Limpia el token y redirige
                 }, 2000);
            }
            throw new Error('Error al cargar rutas');
        }
        return response.json();
    })
    .then(routes => {
        const routeSelect = document.getElementById('route');
        routeSelect.innerHTML = '<option value="">Selecciona una ruta</option>';
        routes.forEach(route => {
            routeSelect.innerHTML += `
                <option value="${route.id}">
                    ${route.origin} → ${route.destination}
                </option>
            `;
        });
        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('No se pudieron cargar las rutas.', 'error');
        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
    });
}

function checkAvailability() {
    const routeId = document.getElementById('route').value;
    const date = document.getElementById('travel-date').value;
    const schedule = document.getElementById('schedule').value; // <--- Obtener el horario seleccionado
    const token = localStorage.getItem('token');

    // Validar que también se haya seleccionado un horario
    if (!routeId || !date || !schedule) {
        showMessage('Selecciona ruta, fecha Y horario'); // Mensaje actualizado
        return;
    }
     if (!token) {
        showMessage('Por favor, inicia sesión', 'info');
        return;
    }

    // ... (código existente para fetch a /api/reservation/availability) ...
    // NOTA: La API de disponibilidad de reservas probablemente necesitará la FECHA y el HORARIO
    // y la ruta. La API actual en el microservicio de reserva (si existe)
    // puede que necesite ser modificada para recibir también el horario.
    // Por ahora, solo la llamamos como antes, pero ten en cuenta que el backend puede necesitar el horario.


    fetch(`/api/reservation/availability/${routeId}/${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
         // Si tu API de disponibilidad necesita el horario, tendrías que añadirlo como parámetro de consulta (?schedule=...)
         // o incluirlo en el body si la petición fuera POST. Por ahora, mantenemos la llamada original.
    })
    .then(response => {
        // ... (manejo de errores) ...
        return response.json();
    })
    .then(data => {
        showSeatMap(data.available_seats);
        showContentSection('seat-selection'); // Muestra la sección de asientos
        // if(document.getElementById('loading-availability')) document.getElementById('loading-availability').style.display = 'none';
    })
     .catch(error => {
        console.error('Error:', error);
        showMessage('Error al verificar disponibilidad.', 'error');
        // if(document.getElementById('loading-availability')) document.getElementById('loading-availability').style.display = 'none';
    });
}

function showSeatMap(availableSeats) {
    const seatMap = document.getElementById('seat-map');
    seatMap.innerHTML = '';
    selectedSeats = []; // Resetear asientos seleccionados al mostrar nuevo mapa
     document.getElementById('price-display').textContent =
        `Total: €0`; // Resetear precio

    for (let seat = 1; seat <= 40; seat++) {
        const seatElement = document.createElement('div');
        seatElement.className = 'seat';
        seatElement.textContent = seat;

        if (!availableSeats.includes(seat)) {
            seatElement.classList.add('reserved');
        } else {
            seatElement.addEventListener('click', () => selectSeat(seat, seatElement));
        }

        seatMap.appendChild(seatElement);
    }
}

// La función selectSeat se mantiene prácticamente igual, opera sobre el seat-map del dashboard
function selectSeat(seatNumber, element) {
    if (element.classList.contains('reserved')) return;

    if (selectedSeats.includes(seatNumber)) {
        // Deseleccionar
        element.classList.remove('selected');
        selectedSeats = selectedSeats.filter(s => s !== seatNumber);
    } else {
        // Limitar a 2 asientos
        if (selectedSeats.length >= 2) {
            showMessage('Solo puedes seleccionar 2 asientos', 'error');
            return;
        }
        element.classList.add('selected');
        selectedSeats.push(seatNumber);
    }

    // Actualizar precio
    document.getElementById('price-display').textContent =
        `Total: €${selectedSeats.length * PRICE_PER_SEAT}`;
}

function confirmPayment() {
    if (selectedSeats.length === 0) {
        showMessage('Selecciona al menos un asiento', 'error');
        return;
    }
    const token = localStorage.getItem('token');
     if (!token) {
        showMessage('Por favor, inicia sesión', 'info');
        return;
    }


    // Mostrar spinner
    const loadingPaymentDiv = document.getElementById('loading-payment');
    const payButton = document.querySelector('#seat-selection button'); // Seleccionar el botón específico
    if(loadingPaymentDiv) loadingPaymentDiv.style.display = 'block';
    if(payButton) payButton.disabled = true;


    // Simular pago
    // setTimeout(() => { // Puedes mantener el setTimeout si quieres simular un retraso, o eliminarlo
        fetch('/api/payment/pay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Usar el token
            },
            body: JSON.stringify({
                amount: selectedSeats.length * PRICE_PER_SEAT,
                card_number: "4111111111111111", // Considerar hacer esto una entrada del usuario
                expiry_date: "12/25", // Considerar hacer esto una entrada del usuario
                cvv: "123" // Considerar hacer esto una entrada del usuario
            })
        })
    .then(response => {
         if (!response.ok) {
             // Manejar errores de autenticación o de la API
             if (response.status === 401) { // Ejemplo: Token inválido/expirado
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 setTimeout(() => {
                     resetApp(); // Limpia el token y redirige
                 }, 2000);
             }
             // Intentar leer el error del body si es posible
             return response.json().then(err => { throw new Error(err.message || 'Error en el pago'); });

         }
         return response.json();
    })
    .then(data => {
        if (data.message === 'Pago realizado') {
            showMessage('Pago realizado con éxito!', 'success');
            return reserveSeats(); // Esperar reservas después de pago exitoso
        }
        // Si el backend devuelve un mensaje de pago fallido sin un error HTTP 4xx/5xx
        throw new Error(data.message || 'Pago Fallido');
    })
    .then(() => {
        showMessage('Reservas realizadas con éxito', 'success'); // Este mensaje se muestra después de que reserveSeats() se complete sin errores
        // Redirigir de vuelta a la selección de ruta o a una página de confirmación de reserva
        // resetApp(); // resetApp ahora redirige al login, quizás queramos otra función para volver al inicio del dashboard
        showRouteSelection(); // Volver a la selección de ruta en el dashboard
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage(error.message || 'Error desconocido en el proceso de pago/reserva', 'error');
    })
	.finally(() => {
        // Ocultar spinner y habilitar botón
        if(loadingPaymentDiv) loadingPaymentDiv.style.display = 'none';
		if(payButton) payButton.disabled = false;
    });
    // }, 3000); // Fin del setTimeout si lo usas
}

function reserveSeats() {
    const routeId = document.getElementById('route').value;
    const date = document.getElementById('travel-date').value;
     const token = localStorage.getItem('token');


    if (!routeId || !date) {
        // Esto no debería pasar si vienes de checkAvailability, pero es una buena validación
        showMessage('Faltan datos de ruta o fecha.', 'error');
        return Promise.reject('Missing route or date'); // Rechazar la promesa para propagar el error
    }
     if (!token) {
         showMessage('Por favor, inicia sesión', 'info');
         return Promise.reject('No token found');
     }


    // Reservar cada asiento
    const promises = selectedSeats.map(seat => {
        return fetch('/api/reservation/reserve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                bus_id: parseInt(routeId), // Asegúrate de que routeId sea un número
                seat_number: seat,      // Asegúrate de que seat sea un número
                date: date              // Formato YYYY-MM-DD (ej: 2023-10-05)
            })
        })
        .then(response => {
             if (!response.ok) {
                 // Manejar errores de reserva por asiento
                 // Podrías querer ser más específico aquí
                 throw new Error(`Error al reservar asiento ${seat}: ${response.status}`);
             }
             return response.json();
        });
    });

    return Promise.all(promises)
        .then(results => {
            console.log('Todas las reservas procesadas:', results);
            // showMessage('Reservas realizadas con éxito'); // Este mensaje se mostrará después de confirmPayment si reserveSeats tiene éxito
            return results; // Pasar los resultados para la siguiente promesa en confirmPayment
        })
        .catch(error => {
            console.error('Error en una o más reservas:', error);
            // showMessage('Error en una o más reservas', 'error'); // Este mensaje se mostrará después de confirmPayment si hay un error
            throw error; // Propagar el error para que lo maneje el catch en confirmPayment
        });
}


// Función para resetear el estado y redirigir al login
function resetApp() {
    localStorage.removeItem('token');
    // Limpiar asientos seleccionados y display de precio
    selectedSeats = [];
     const priceDisplay = document.getElementById('price-display');
     if(priceDisplay) priceDisplay.textContent = `Total: €0`;

    // Redirigir a la página de login
    window.location.href = 'index.html';
}

// --- Funciones del Dashboard (Usadas en dashboard.html) ---

// Función para ocultar todas las secciones de contenido
function hideAllContentSections() {
    const contentSections = document.querySelectorAll('.main-content .content-section');
    contentSections.forEach(section => {
        section.style.display = 'none';
    });
}
// Nueva función para cargar y mostrar la información del usuario
function loadUserInfo() {
    const token = localStorage.getItem('token');
    const usernameSpan = document.getElementById('user-info-username');
    const emailSpan = document.getElementById('user-info-email');
    const tokenSpan = document.getElementById('user-info-token');

    // Limpiar contenido anterior y mostrar estado de carga
    if(usernameSpan) usernameSpan.textContent = 'Cargando...';
    if(emailSpan) emailSpan.textContent = 'Cargando...';
    // Solo mostrar el token si realmente lo queremos ver (para desarrollo)
    if(tokenSpan) tokenSpan.textContent = token ? token : 'No disponible';


    if (!token) {
        console.log('No token found for loading user info.');
        // showMessage('No has iniciado sesión.', 'info'); // Esto ya lo maneja la redirección si no hay token
        if(usernameSpan) usernameSpan.textContent = 'No disponible';
        if(emailSpan) emailSpan.textContent = 'No disponible';
         if(tokenSpan) tokenSpan.textContent = 'No disponible';

        return; // Salir si no hay token
    }

    // Realizar la llamada a la API para obtener la información del usuario
    // *** Asumiendo que tienes un endpoint /api/user/profile en tu backend ***
    fetch('/api/user/profile/', {
        method: 'GET', // O el método que use tu API
        headers: {
            'Authorization': `Bearer ${token}`, // Enviar el token en los encabezados
            'Content-Type': 'application/json' // Depende de si la API espera algo en el body (normalmente no para GET)
        }
    })
    .then(response => {
        if (!response.ok) {
             // Manejar errores de autenticación o de la API
            if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 setTimeout(() => { resetApp(); }, 2000);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(userData => {
        // Rellenar los elementos HTML con los datos del usuario
        if(usernameSpan) usernameSpan.textContent = userData.username || 'N/A';
        if(emailSpan) emailSpan.textContent = userData.email || 'N/A';
        // El token ya lo obtuvimos de localStorage, se muestra arriba
    })
    .catch(error => {
        console.error('Error al cargar info del usuario:', error);
        showMessage('No se pudo cargar la información del usuario.', 'error');
        if(usernameSpan) usernameSpan.textContent = 'Error';
        if(emailSpan) emailSpan.textContent = 'Error';
        // No cambiamos el tokenSpan si hubo error en la API, ya que el token sigue en localStorage
    });
}
// Función para mostrar una sección de contenido específica
function showContentSection(sectionId) {
    hideAllContentSections();
    const sectionToShow = document.getElementById(sectionId);
    if (sectionToShow) {
        sectionToShow.style.display = 'block';

        // Lógica adicional si la sección mostrada es la de rutas
        if (sectionId === 'route-selection') {
            loadRoutes(); // Cargar las rutas cada vez que se muestre la sección de selección de ruta
        }
               // *** Llamar a loadUserInfo si la sección es la de información del usuario ***
        if (sectionId === 'user-info-section') {
             loadUserInfo(); // Cargar y mostrar la info del usuario
        }
        // Puedes añadir lógica similar para la sección de reservas si necesita cargar datos
        // if (sectionId === 'reservations-section') {
        //     loadReservations(); // Una función que tendrías que crear
        // }
         // Y resetear asientos seleccionados al cambiar de sección si no estás en la de asientos
        if (sectionId !== 'seat-selection') {
             selectedSeats = [];
             const priceDisplay = document.getElementById('price-display');
             if(priceDisplay) priceDisplay.textContent = `Total: €0`;
             // Ocultar la sección de asientos si estaba visible y cambias a otra
             const seatSection = document.getElementById('seat-selection');
             if(seatSection) seatSection.style.display = 'none'; // Esto ya lo hace hideAllContentSections, pero es bueno considerarlo
        }


    } else {
        console.error(`Sección de contenido con ID "${sectionId}" no encontrada.`);
        // Opcional: mostrar un mensaje de error al usuario
        // showMessage(`La sección "${sectionId}" no está disponible.`, 'error');
    }
}

// Nueva función para cargar los horarios de una ruta seleccionada
function loadSchedules(routeId) {
    console.log("loadSchedules llamada con routeId:", routeId); // <-- Añade esta línea
    const scheduleSelect = document.getElementById('schedule');
     const loadingDiv = document.getElementById('loading'); // Puedes reutilizar el spinner de carga de rutas

    // Limpiar horarios anteriores y ocultar el select
    scheduleSelect.innerHTML = '<option value="">Selecciona un horario</option>';
    scheduleSelect.style.display = 'none';

    if (!routeId) {
        // Si no hay ruta seleccionada, no cargar horarios
        return;
    }

    const token = localStorage.getItem('token');
     if (!token) {
         showMessage('Por favor, inicia sesión', 'info'); // Esto ya lo maneja la redirección al cambiar de página
         return;
     }

    if(loadingDiv) loadingDiv.style.display = 'block'; // Mostrar spinner

    // *** Asumiendo que tu Nginx proxy y microservicio route-scheduler manejan /api/routes/schedules/<route_id> ***
    // Tu config de Nginx para /api/routes/ { proxy_pass http://route-scheduler:5004/; }
    // y la ruta en Flask /schedules/<int:route_id> deberían hacer que la URL sea /api/routes/schedules/<route_id>
    fetch(`/api/routes/schedules/${routeId}`, { // URL a la que llamamos desde el frontend
        headers: { 'Authorization': `Bearer ${token}` } // Enviar el token si tus endpoints de rutas requieren autenticación
                                                     // Si no requieren autenticación, puedes omitir esta línea
    })
    .then(response => {
        if (!response.ok) {
             if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 setTimeout(() => { resetApp(); }, 2000);
             }
             // Intentar leer el error del body si es posible
             return response.json().then(err => { throw new Error(err.message || `Error al cargar horarios para la ruta ${routeId}: ${response.status}`); });
        }
        return response.json();
    })
    .then(data => {
        // 'data' debería ser algo como { "schedules": ["08:00", "22:00"] } según tu código Flask
        if (data && data.schedules && data.schedules.length > 0) {
             data.schedules.forEach(schedule => {
                 scheduleSelect.innerHTML += `<option value="${schedule}">${schedule}</option>`;
             });
             scheduleSelect.style.display = 'inline-block'; // O 'block' o 'flex', hacerlo visible
        } else {
            showMessage(`No hay horarios disponibles para la ruta seleccionada.`, 'info');
            scheduleSelect.style.display = 'none'; // Asegurarse de que esté oculto si no hay horarios
        }
        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage(error.message || 'No se pudieron cargar los horarios.', 'error');
         if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
         scheduleSelect.style.display = 'none'; // Asegurarse de que esté oculto si hay error
    });
}
// --- Lógica para manejar el inicio (qué hacer al cargar la página) ---

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const isDashboardPage = window.location.pathname.endsWith('/dashboard.html');
    const isIndexPage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/index.html');


    if (token && isIndexPage) {
        // Si hay un token y estamos en la página de login, redirigir al dashboard
        console.log('Token found, redirecting to dashboard.');
        window.location.href = 'dashboard.html';
    } else if (!token && isDashboardPage) {
        // Si no hay token y estamos en el dashboard, redirigir al login
         console.log('No token found on dashboard page, redirecting to login.');
         showMessage('Por favor, inicia sesión para acceder al dashboard.', 'info');
         setTimeout(() => {
             window.location.href = 'index.html';
         }, 1000);

    } else if (token && isDashboardPage) {
        // Si hay token y estamos en el dashboard, configurar la navegación y mostrar la sección inicial
         console.log('Token found on dashboard page. Setting up dashboard navigation...');

         // --- Configuración de la Navegación del Dashboard ---
         const navLinks = document.querySelectorAll('.sidebar a[data-section]');
         const logoutLink = document.getElementById('logout-link');
         const routeSelect = document.getElementById('route'); // <--- Obtener referencia al select de ruta

		// --- Añadir Event Listener para la selección de ruta ---
		if (routeSelect) { // Verifica si el elemento select de ruta existe
			routeSelect.addEventListener('change', (event) => { // <--- Este es el event listener
        const selectedRouteId = event.target.value; // Obtiene el valor seleccionado
        loadSchedules(selectedRouteId); // <--- Llama a loadSchedules
    });
}
// --------------------------------------------------

         navLinks.forEach(link => {
             link.addEventListener('click', (event) => {
                 event.preventDefault(); // Evitar el comportamiento por defecto del enlace
                 const targetSectionId = event.target.getAttribute('data-section');
                 showContentSection(targetSectionId);
             });
         });

         // Manejador para el enlace de cerrar sesión
         if (logoutLink) {
             logoutLink.addEventListener('click', (event) => {
                 event.preventDefault(); // Evitar el comportamiento por defecto del enlace
                 resetApp(); // Llama a la función para cerrar sesión y redirigir
             });
         }


         // --- Mostrar la Sección Inicial del Dashboard ---
         // Muestra la sección de información del usuario por defecto al cargar el dashboard
         showContentSection('user-info-section');

         // Si quieres que la sección de selección de ruta sea la que se muestre por defecto, usa:
         // showContentSection('route-selection');


    }
     // Si no hay token y estamos en la página de login (isIndexPage), no hacer nada, el formulario ya es visible por defecto

});


// La función showMessage se mantiene igual
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('custom-message');
    // Asegurarse de que el elemento de mensaje existe en la página actual
    if (!messageDiv) {
        console.warn('Elemento #custom-message no encontrado en la página.');
        // Fallback a alert si no se encuentra el div (opcional, pero útil para debugging)
        // alert(message);
        return;
    }
    messageDiv.textContent = message;
    messageDiv.className = 'custom-message show ' + type;

    setTimeout(() => {
        messageDiv.className = 'custom-message';
    }, 3000);
}

// Mantén tus otras funciones como showSeatMap, selectSeat, confirmPayment, reserveSeats
// Asegúrate de que usen getElementById para los elementos que ahora están en dashboard.html
// Por ejemplo, en confirmPayment y reserveSeats, accede a #route y #travel-date
