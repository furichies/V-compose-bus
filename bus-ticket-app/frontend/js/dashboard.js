// script.js - dashboard.js
// Lógica principal y coordinación de la página del dashboard

// --- Importar funciones y variables necesarias de otros módulos ---

// De auth.js (para cerrar sesión)
import { resetApp } from './auth.js';

// De ui.js (para mostrar mensajes)
import { showMessage } from './ui.js';

// De routes.js (para cargar rutas y horarios)
import { loadRoutes, loadSchedules } from './routes.js';

// De booking.js (para verificación de disponibilidad, selección de asientos, estado, y reset)
// Importa las funciones y variables necesarias de booking.js
import {
    checkAvailability, // Función para verificar disponibilidad
    showSeatMap, // Función para renderizar el mapa de asientos (aunque checkAvailability la llama)
    selectSeat, // Función para manejar el clic en asientos (aunque showSeatMap adjunta el listener)
	makeReservation,
    selectedSeats, // Variable de estado para los asientos seleccionados (necesaria para resetear y pasar a makeReservation)
    resetSelectedSeats, // Función para resetear selectedSeats (llamada al cambiar de sección)
    currentRouteId, // Variable de estado para la ruta seleccionada actualmente
    currentSelectedDate, // Variable de estado para la fecha seleccionada actualmente
    currentSelectedSchedule, // Variable de estado para el horario seleccionado actualmente
    PRICE_PER_SEAT // Precio por asiento (necesario para calcular el total en el resumen de pago)
} from './booking.js';

// Asegúrate de que processPaymentSimulation esté exportada en payment.js
import { processPaymentSimulation } from './payment.js';


// --- Variable a nivel de módulo para almacenar datos del usuario ---
let currentUserData = null; // <-- Variable para almacenar el perfil del usuario (para simulación de pago)


// --- Funciones de Manejo de UI del Dashboard ---

/**
 * Oculta todas las secciones de contenido principal del dashboard.
 */
function hideAllContentSections() {
    const contentSections = document.querySelectorAll('.main-content .content-section');
    contentSections.forEach(section => {
        section.style.display = 'none';
    });
}

/**
 * Muestra una sección de contenido específica del dashboard y ejecuta lógica asociada.
 * Exportada para ser llamada desde los manejadores de eventos de navegación.
 * @param {string} sectionId El ID de la sección de contenido a mostrar (ej: 'user-info-section').
 */
export function showContentSection(sectionId) {
    console.log(`showContentSection: Intentando mostrar sección: ${sectionId}`);
    hideAllContentSections();
    const sectionToShow = document.getElementById(sectionId);
    if (sectionToShow) {
        sectionToShow.style.display = 'block';
        console.log(`showContentSection: Sección ${sectionId} mostrada.`);


        // Lógica adicional si la sección mostrada es la de rutas
        if (sectionId === 'route-selection') {
            console.log("showContentSection: Lógica para sección de rutas.");
            // Cargar las rutas cada vez que se muestre la sección de selección de ruta
            loadRoutes(); // <- Función importada de routes.js
            // También podrías querer resetear los selects de horario y fecha aquí
             const scheduleSelect = document.getElementById('schedule');
             const dateInput = document.getElementById('travel-date');
             if (scheduleSelect) {
                 scheduleSelect.innerHTML = '<option value="">Selecciona un horario</option>';
                 scheduleSelect.style.display = 'none';
             }
             if (dateInput) dateInput.value = ''; // Limpiar la fecha
        }
        // Llamar a loadUserInfo si la sección es la de información del usuario
        if (sectionId === 'user-info-section') {
             console.log("showContentSection: Lógica para sección de info de usuario.");
             loadUserInfo(); // <- Función definida en este archivo
        }
        // Lógica similar para la sección de reservas
        if (sectionId === 'reservations-section') {
             console.log("showContentSection: Lógica para sección de Mis Reservas.");
             loadReservations(); // <-- Llama a la función para cargar y mostrar reservas
        }
         // Lógica para la sección de pago
         if (sectionId === 'payment-section') {
              console.log("showContentSection: Lógica para sección de Pago.");
             // El resumen ya se actualiza antes de cambiar a esta sección en el listener del botón Reservar.
             // Mostrar los datos de pago simulados en los spans correspondientes de la sección de pago
             updatePaymentDetailsDisplay(); // <-- Llama a una nueva función para mostrar los datos de pago en la sección de pago
         }


        // --- Lógica para limpiar estado y secciones al SALIR de la sección de asientos/pago ---
         if (sectionId !== 'seat-selection' && sectionId !== 'payment-section') {
             console.log(`showContentSection: Saliendo de secciones de booking/payment. Reseteando estado...`);
             // Resetear asientos seleccionados y display de precio
             if (typeof resetSelectedSeats === 'function') {
                  resetSelectedSeats(); // <-- Llama a la función importada de booking.js
             } else {
                  console.warn("showContentSection: resetSelectedSeats function not found during section change reset.");
             }

             // Asegurarse de que las secciones de asientos y pago estén ocultas
              const seatSection = document.getElementById('seat-selection');
              if(seatSection && seatSection.style.display !== 'none') {
                  seatSection.style.display = 'none';
                   console.log("showContentSection: Sección de asientos forzada a ocultar.");
              }
              const paymentSection = document.getElementById('payment-section');
               if(paymentSection && paymentSection.style.display !== 'none') {
                   paymentSection.style.display = 'none';
                    console.log("showContentSection: Sección de pago forzada a ocultar.");
               }
         } else if (sectionId === 'seat-selection') {
             // Si entras a la sección de asientos, asegúrate de que la de pago esté oculta
              const paymentSection = document.getElementById('payment-section');
              if(paymentSection && paymentSection.style.display !== 'none') {
                  paymentSection.style.display = 'none';
                   console.log("showContentSection: Sección de pago forzada a ocultar al ir a asientos.");
              }
         } else if (sectionId === 'payment-section') {
              // Si entras a la sección de pago, asegúrate de que la de asientos esté oculta
               const seatSection = document.getElementById('seat-selection');
               if(seatSection && seatSection.style.display !== 'none') {
                   seatSection.style.display = 'none';
                    console.log("showContentSection: Sección de asientos forzada a ocultar al ir a pago.");
               }
               // Los datos de pago ya deberían estar en currentUserData si loadUserInfo se llamó al inicio o al ir a user-info
               updatePaymentDetailsDisplay(); // Asegurarse de que los detalles de pago se muestren en la sección de pago
         }


    } else {
        console.error(`showContentSection: Sección de contenido con ID "${sectionId}" no encontrada en dashboard.html.`);
        showMessage(`Error interno: No se pudo mostrar la sección "${sectionId}".`, 'error');
    }
}

/**
 * Carga y muestra la información del usuario en la sección correspondiente.
 * Se llama desde showContentSection cuando se muestra la sección de info de usuario.
 * ¡Modificada para mostrar datos de pago simulados y guardarlos en currentUserData!
 */
function loadUserInfo() {
    console.log("loadUserInfo: Cargando información del usuario...");
    const token = localStorage.getItem('token');
    const usernameSpan = document.getElementById('user-info-username');
    const emailSpan = document.getElementById('user-info-email');
    const tokenSpan = document.getElementById('user-info-token');
    // Referencias a los nuevos elementos para mostrar datos de pago simulados en Info de Usuario
    const cardNumberSpan = document.getElementById('user-info-card-number');
    const expiryDateSpan = document.getElementById('user-info-expiry-date');
    const cvvSpan = document.getElementById('user-info-cvv'); // <-- ¡Asegúrate de tener esta referencia!

    // Limpiar contenido anterior y mostrar estado de carga/placeholder
    if(usernameSpan) usernameSpan.textContent = 'Cargando...';
    if(emailSpan) emailSpan.textContent = 'Cargando...';
    if(tokenSpan) tokenSpan.textContent = token ? `${token.substring(0, 10)}...` : 'No disponible';
    if(cardNumberSpan) cardNumberSpan.textContent = 'Cargando...';
    if(expiryDateSpan) expiryDateSpan.textContent = 'Cargando...';
    if(cvvSpan) cvvSpan.textContent = 'Cargando...'; // Limpiar/cargar el span del CVV


    if (!token) {
        console.log('loadUserInfo: No token found. Cannot load user info.');
         if(usernameSpan) usernameSpan.textContent = 'No disponible';
         if(emailSpan) emailSpan.textContent = 'No disponible';
         if(tokenSpan) tokenSpan.textContent = 'No disponible';
         if(cardNumberSpan) cardNumberSpan.textContent = 'No disponible';
         if(expiryDateSpan) expiryDateSpan.textContent = 'No disponible';
         if(cvvSpan) cvvSpan.textContent = 'No disponible'; // Marcar CVV como no disponible
         currentUserData = null; // Asegurarse de que la variable también esté nula si no hay token
        return;
    }

    // Realizar la llamada a la API para obtener la información del usuario (ahora incluye datos de pago simulados)
    // Asumiendo que tu API de auth maneja /api/user/profile/ y devuelve los nuevos campos
     fetch('/api/user/profile/', {
         method: 'GET',
         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
     })
    .then(response => {
        console.log("loadUserInfo: Respuesta fetch /api/user/profile/:", response);
        if (!response.ok) {
             if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 setTimeout(() => { resetApp(); }, 2000);
                 throw new Error('Authentication Error: Session expired');
             }
             // Intenta leer el error del body si es posible
             return response.json().catch(() => ({ message: 'Error desconocido al cargar perfil' }));
        }
        return response.json();
    })
    .then(userData => {
        console.log("loadUserInfo: Datos de usuario recibidos:", userData);
        // --- ¡GUARDAR LOS DATOS COMPLETOS DEL USUARIO! ---
        currentUserData = userData; // <-- Guardar los datos recibidos


        // Rellenar los elementos HTML en Info de Usuario
        if(usernameSpan) usernameSpan.textContent = userData.username || 'N/A';
        if(emailSpan) emailSpan.textContent = userData.email || 'N/A';
        // Los nuevos campos de pago simulados
        if(cardNumberSpan) cardNumberSpan.textContent = userData.card_number || 'N/A';
        if(expiryDateSpan) expiryDateSpan.textContent = userData.expiry_date || 'N/A';
        if(cvvSpan) {
            cvvSpan.textContent = userData.cvv || 'N/A'; // <-- ¡Añade esta línea!
            // Advertencia de seguridad (mantener en desarrollo, quitar o comentar en producción)
            console.warn("loadUserInfo: Mostrando CVV en la UI (solo para simulación/prueba). En una aplicación real, el CVV NUNCA debe mostrarse en la interfaz de usuario.");
        }

         console.log("loadUserInfo: Información del usuario mostrada (incl. datos de pago) y datos guardados en currentUserData.");

         // Opcional: Si ya estás en la sección de pago, podrías actualizar los detalles de pago aquí también
         // Esto asegura que si el usuario va directamente a user-info y luego a pago, los detalles se muestran
         // Pero lo manejamos mejor llamando a updatePaymentDetailsDisplay() cuando se cambia a la sección de pago.

    })
    .catch(error => {
        console.error('loadUserInfo: Error al cargar info del usuario:', error);
        showMessage(error.message || 'No se pudo cargar la información del usuario.', 'error');
        if(usernameSpan) usernameSpan.textContent = 'Error';
        if(emailSpan) emailSpan.textContent = 'Error';
         if(tokenSpan) tokenSpan.textContent = 'Error';
         if(cardNumberSpan) cardNumberSpan.textContent = 'Error';
         if(expiryDateSpan) expiryDateSpan.textContent = 'Error';
         if(cvvSpan) cvvSpan.textContent = 'Error'; // Marcar CVV como error
         currentUserData = null; // Asegurarse de que la variable esté nula si falla la carga
    });
}


/**
 * Carga las reservas del usuario actual desde la API de reservas y las muestra en la interfaz.
 * Se llama desde showContentSection cuando se muestra la sección de Mis Reservas.
 */
async function loadReservations() {
    console.log("loadReservations: Cargando reservas del usuario...");
    const reservationsListDiv = document.getElementById('reservations-list');
    const loadingDiv = document.getElementById('loading-reservations'); // Puedes añadir un spinner específico para esta sección en HTML

    // Limpiar lista anterior y mostrar estado de carga
    if (reservationsListDiv) {
        reservationsListDiv.innerHTML = ''; // Limpiar contenido anterior
    }
    if (loadingDiv) { // Asumiendo un div con id="loading-reservations" en dashboard.html dentro de #reservations-section
        loadingDiv.style.display = 'block';
    } else {
        // Si no hay spinner específico, podrías poner un mensaje de carga temporal en la lista
        if (reservationsListDiv) reservationsListDiv.innerHTML = '<p>Cargando reservas...</p>';
    }


    const token = localStorage.getItem('token');
    if (!token) {
        console.log('loadReservations: No token found. Cannot load reservations.');
        if (reservationsListDiv) reservationsListDiv.innerHTML = '<p>Por favor, inicia sesión para ver tus reservas.</p>';
        if (loadingDiv) loadingDiv.style.display = 'none';
        return;
    }

    // La API /api/reservation/reservations/user/ espera el token en el header para identificar al usuario
    const apiUrl = '/api/reservation/reservations/user/';

    console.log("loadReservations: Llamando a API:", apiUrl);

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Enviar el token
                'Content-Type': 'application/json'
            }
        });

        console.log("loadReservations: Respuesta de fetch para reservas:", response);

        if (!response.ok) {
            if (response.status === 401) {
                showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                setTimeout(() => { resetApp(); }, 2000);
                throw new Error('Authentication Error: Session expired');
            }
             // Para otros errores (ej: 500 en el backend)
            const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
            throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // Esperamos un objeto como { "reservations": [...] }
        console.log("loadReservations: Datos de reservas recibidos:", data);

        if (!data || !data.reservations || !Array.isArray(data.reservations)) {
            console.error("loadReservations: Formato de datos de reservas incorrecto:", data);
             if (reservationsListDiv) reservationsListDiv.innerHTML = '<p>Error al cargar las reservas (formato incorrecto).</p>';
            throw new Error("Formato de datos de reservas incorrecto de la API.");
        }

        const reservations = data.reservations;

        // --- Mostrar las reservas en la interfaz ---
        if (reservationsListDiv) {
             reservationsListDiv.innerHTML = ''; // Limpiar el mensaje de carga o anterior

             if (reservations.length > 0) {
                 const ul = document.createElement('ul'); // Crear una lista desordenada
                 reservations.forEach(reservation => {
                     const li = document.createElement('li');
                     // Puedes formatear la visualización como prefieras
                     li.textContent = `Reserva ID: ${reservation.id}, Ruta: ${reservation.bus_id}, Fecha: ${reservation.date}, Horario: ${reservation.schedule}, Asiento: ${reservation.seat_number}`;
                     // Opcional: Añadir más detalles o estructura HTML/CSS para cada reserva
                     ul.appendChild(li);
                 });
                 reservationsListDiv.appendChild(ul); // Añadir la lista al contenedor
             } else {
                 reservationsListDiv.innerHTML = '<p>No tienes reservas realizadas aún.</p>';
             }
         } else {
             console.warn("loadReservations: Contenedor #reservations-list no encontrado.");
         }


        if (loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
         console.log("loadReservations: Reservas mostradas en la interfaz.");

    } catch (error) {
        console.error('loadReservations: ERROR CAPTURADO -', error);
        showMessage(error.message || 'No se pudieron cargar las reservas.', 'error');
        if (reservationsListDiv) reservationsListDiv.innerHTML = '<p>Error al cargar las reservas.</p>'; // Mostrar error en la UI
        if (loadingDiv) loadingDiv.style.display = 'none';
        // No propagar el error si ya lo manejamos visualmente
    }
}

/**
 * Actualiza los elementos en la sección de pago con el resumen de la reserva.
 * Se llama antes de mostrar la sección de pago (desde el listener del botón Reservar).
 * @param {string | number} routeId El ID de la ruta seleccionada.
 * @param {string} date La fecha de viaje seleccionada (formatoYYYY-MM-DD).
 * @param {string} schedule El horario de viaje seleccionado (ej: "08:00").
 * @param {number[]} seats Array de números de asiento seleccionados.
 */
function updatePaymentSummary(routeId, date, schedule, seats) {
    console.log("updatePaymentSummary: Actualizando resumen de pago...");
    const summaryRoute = document.getElementById('summary-route');
    const summaryDate = document.getElementById('summary-date');
    const summarySchedule = document.getElementById('summary-schedule');
    const summarySeats = document.getElementById('summary-seats');
    const summaryTotal = document.getElementById('summary-total');

    if(summaryRoute) summaryRoute.textContent = routeId; // O buscar el nombre real de la ruta


    if(summaryDate) summaryDate.textContent = date;
    if(summarySchedule) summarySchedule.textContent = schedule;
    if(summarySeats) summarySeats.textContent = seats && seats.length > 0 ? seats.join(', ') : 'Ninguno'; // Mostrar los asientos separados por coma

    // Calcular y mostrar el total (necesitas PRICE_PER_SEAT, importado desde booking.js)
     if(summaryTotal && typeof PRICE_PER_SEAT !== 'undefined') { // Corregido el typo aquí
          summaryTotal.textContent = `€${(seats ? seats.length : 0) * PRICE_PER_SEAT}`;
           console.log("updatePaymentSummary: Total calculado:", summaryTotal.textContent);
     }
      else {
          console.warn("updatePaymentSummary: PRICE_PER_SEAT no accesible para calcular el total.");
           if(summaryTotal) summaryTotal.textContent = '€N/A';
     }

    console.log("updatePaymentSummary: Resumen de pago actualizado.");
}

/**
 * Muestra los datos de pago simulados del usuario en la sección de pago.
 * Se llama cuando se muestra la sección de pago.
 */
function updatePaymentDetailsDisplay() {
    console.log("updatePaymentDetailsDisplay: Actualizando detalles de pago en la UI...");
    const paymentCardNumberSpan = document.getElementById('payment-card-number');
    const paymentExpiryDateSpan = document.getElementById('payment-expiry-date');
    // No necesitamos el input del CVV aquí, solo sus spans de visualización

    if (!currentUserData) {
        console.warn("updatePaymentDetailsDisplay: currentUserData no disponible. No se pueden mostrar los detalles de pago.");
        if(paymentCardNumberSpan) paymentCardNumberSpan.textContent = 'N/A';
        if(paymentExpiryDateSpan) paymentExpiryDateSpan.textContent = 'N/A';
        return;
    }

    if(paymentCardNumberSpan) paymentCardNumberSpan.textContent = currentUserData.card_number || 'N/A';
    if(paymentExpiryDateSpan) paymentExpiryDateSpan.textContent = currentUserData.expiry_date || 'N/A';

    console.log("updatePaymentDetailsDisplay: Detalles de pago actualizados en la UI.");
}


// --- Lógica de Inicialización del Dashboard (DOMContentLoaded) ---

// Este bloque se ejecuta una vez que el DOM de la página dashboard.html esté completamente cargado.
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Dashboard script started.");

    const token = localStorage.getItem('token');
    // Determinar si estamos en la página del dashboard
    const isDashboardPage = window.location.pathname.endsWith('/dashboard.html');

     // Lógica de redirección: si NO hay token y estamos en el dashboard, redirigir al login
     if (!token && isDashboardPage) {
         console.log('DOMContentLoaded: No token found on dashboard page, redirecting to login.');
         showMessage('Por favor, inicia sesión para acceder al dashboard.', 'info');
         setTimeout(() => {
             window.location.href = 'index.html';
         }, 1000);

     } else if (token && isDashboardPage) {
         // Si SÍ hay token y estamos en el dashboard, configurar la página
         console.log("DOMContentLoaded: Token found on dashboard page. Setting up dashboard...");

         // --- Obtener referencias a elementos clave del DOM ---
         const navLinks = document.querySelectorAll('.sidebar a[data-section]');
         const logoutLink = document.getElementById('logout-link');
         const routeSelect = document.getElementById('route');
         const availabilityButton = document.getElementById('availabilityButton'); // ID del botón Disponibilidad
         const reserveButton = document.getElementById('reserveButton'); // ID del botón Reservar (antes Pagar AHORA)
         const confirmPaymentButton = document.getElementById('confirmPaymentButton'); // ID del botón Confirmar Pago en sección de pago

         console.log("DOMContentLoaded: Referencias a elementos del DOM obtenidas.");


         // --- Configuración de Event Listeners ---

         // Event listener para la navegación lateral (clics en los enlaces del menú)
         navLinks.forEach(link => {
             link.addEventListener('click', (event) => {
                 event.preventDefault(); // Evitar el comportamiento por defecto del enlace (<a href="#">)
                 const targetSectionId = event.target.getAttribute('data-section');
                 // Llama a la función showContentSection definida en este archivo para cambiar de sección
                 showContentSection(targetSectionId);
             });
         });
         console.log("DOMContentLoaded: Event listeners para navegación lateral configurados.");


         // Event listener para el enlace de cerrar sesión
         if (logoutLink) {
             logoutLink.addEventListener('click', (event) => {
                 event.preventDefault(); // Evitar el comportamiento por defecto del enlace
                 // Llama a la función resetApp importada de auth.js para cerrar sesión y redirigir
                 resetApp();
             });
             console.log("DOMContentLoaded: Event listener para cerrar sesión configurado.");
         } else { console.warn("DOMContentLoaded: Elemento con ID 'logout-link' no encontrado."); }


         // Event Listener para el select de ruta (cuando el usuario selecciona una ruta)
         if (routeSelect) {
             routeSelect.addEventListener('change', (event) => {
                 const selectedRouteId = event.target.value;
                 // Llama a loadSchedules si se selecciona una ruta válida
                 if (selectedRouteId) {
                    console.log(`DOMContentLoaded: Ruta seleccionada: ${selectedRouteId}. Llamando a loadSchedules.`);
                    loadSchedules(selectedRouteId); // Llama a la función importada de routes.js
                 } else {
                    // Limpiar select de horarios si se vuelve a la opción por defecto
                    console.log("DOMContentLoaded: Ruta deseleccionada. Limpiando select de horarios.");
                    const scheduleSelect = document.getElementById('schedule');
                    if (scheduleSelect) {
                       scheduleSelect.innerHTML = '<option value="">Selecciona un horario</option>';
                       scheduleSelect.style.display = 'none';
                    }
                 }
             });
              console.log("DOMContentLoaded: Event listener para select de ruta configurado.");
         } else { console.warn("DOMContentLoaded: Elemento con ID 'route' no encontrado."); }


         // Event Listener para el botón "Disponibilidad" en la sección de ruta
         if (availabilityButton) {
             // Hacer el manejador async para poder usar await con checkAvailability
             availabilityButton.addEventListener('click', async (event) => {
                 event.preventDefault(); // Evitar el comportamiento por defecto del botón

                 console.log("DOMContentLoaded: Botón Disponibilidad clicado.");

                 try {
                     // Llama a la función checkAvailability importada de booking.js y espera a que termine.
                     // checkAvailability internamente obtiene los valores de ruta/fecha/horario
                     // y llama a showSeatMap si tiene éxito.
                     await checkAvailability();

                     // Si checkAvailability tuvo éxito (no lanzó error), cambiamos a la sección de asientos
                     console.log("DOMContentLoaded: checkAvailability completada. Cambiando a sección de asientos.");
                     showContentSection('seat-selection'); // Llama a la función definida en este archivo

                 } catch (error) {
                     // checkAvailability ya muestra mensaje de error, aquí solo logeamos si es necesario
                     console.error("DOMContentLoaded: Error manejado por listener del botón de disponibilidad:", error);
                     // Opcional: Quedarse en la sección actual o volver a la selección de ruta si hay un error fatal de API
                     // showContentSection('route-selection');
                 }
             });
             console.log("DOMContentLoaded: Event listener para botón Disponibilidad configurado.");
         } else { console.warn("DOMContentLoaded: Botón de disponibilidad con ID 'availabilityButton' no encontrado."); }


         // --- Event Listener para el botón "Reservar" en la sección de asientos ---
         if (reserveButton) {
             reserveButton.addEventListener('click', async (event) => { // Hacer el manejador async
                 event.preventDefault(); // Evitar el comportamiento por defecto

                 console.log("DOMContentLoaded: Botón Reservar clicado.");

                 // *** Obtener los detalles de la reserva de las variables de estado importadas de booking.js ***
                 // selectedSeats, currentRouteId, currentSelectedDate, currentSelectedSchedule son importadas de booking.js
                 const routeId = currentRouteId;
                 const date = currentSelectedDate;
                 const schedule = currentSelectedSchedule;
                 const seats = selectedSeats; // Los asientos seleccionados del array importado


                 console.log("DOMContentLoaded: Intentando hacer reserva con:", { routeId, date, schedule, seats });


                 try {
                     // Llama a makeReservation con los datos de la reserva y espera a que termine.
                     // makeReservation llama al endpoint /api/reservation/reserve
                     await makeReservation(routeId, date, schedule, seats); // Llama a la función importada de booking.js

                     // Si makeReservation tuvo éxito (no lanzó error), proceder al PAGO
                     console.log("DOMContentLoaded: makeReservation completada. Procediendo a la sección de pago.");

                     // Antes de cambiar de sección, actualizar el resumen en la sección de pago
                     updatePaymentSummary(routeId, date, schedule, seats); // Llama a la función definida en este archivo

                     // Cambiar a la sección de pago
                     showContentSection('payment-section'); // Llama a la función definida en este archivo

                 } catch (error) {
                     // makeReservation ya muestra mensaje de error, aquí solo logeamos si es necesario
                     console.error("DOMContentLoaded: Error manejado por listener del botón de reserva:", error);
                     // Opcional: Quedarse en la sección de asientos con el mensaje de error
                     // showContentSection('seat-selection');
                 }
             });
             console.log("DOMContentLoaded: Event listener para botón Reservar configurado.");
         } else { console.warn("DOMContentLoaded: Botón de reserva con ID 'reserveButton' no encontrado."); }


         // --- Event Listener para el botón "Confirmar Pago" en la sección de pago ---
         if (confirmPaymentButton) {
             confirmPaymentButton.addEventListener('click', async (event) => {
                 event.preventDefault();
                 console.log("DOMContentLoaded: Botón Confirmar Pago clicado. Llamando a simulación de pago...");

                 // --- Obtener el CVV introducido por el usuario ---
                 const cvvInput = document.getElementById('cvv-input');
                 const enteredCvv = cvvInput ? cvvInput.value.trim() : null; // Usar trim() para quitar espacios

                 // Validar que se introdujo algo para el CVV
                 if (!enteredCvv || enteredCvv.length < 3) {
                     showMessage('Introduce un CVV válido.', 'info');
                     console.log("DOMContentLoaded: Validación de CVV fallida.");
                     return; // Detener el proceso si no hay CVV o es muy corto
                 }

                 console.log("DOMContentLoaded: CVV introducido:", enteredCvv);

                 // *** Pasar el CVV introducido Y los datos del usuario (incluyendo el CVV correcto simulado) a processPaymentSimulation ***
                 if (!currentUserData) {
                     console.error("DOMContentLoaded: Datos del usuario no disponibles para simulación de pago.");
                      showMessage('Error: Datos de usuario no cargados.', 'error');
                      return; // Detener si no tenemos los datos del usuario
                 }


                 try {
                     // Llama a la función que simula el pago en payment.js, pasándole el CVV introducido y los datos del usuario
                     await processPaymentSimulation(enteredCvv, currentUserData); // <-- Pasar ambos: CVV introducido y userData

                     // Si la simulación de pago fue exitosa (la promesa se resolvió)
                     console.log("DOMContentLoaded: Simulación de pago completada exitosamente.");
                     // Limpiar el campo de CVV después del intento de pago
                     if (cvvInput) cvvInput.value = '';

                     // Puedes redirigir a Mis Reservas automáticamente O dejar que el usuario haga clic en el menú.
                     // Redirigir después de un pequeño retraso es un buen UX.
                     showMessage('Redirigiendo a Mis Reservas...', 'info');
                     setTimeout(() => {
                         showContentSection('reservations-section'); // Llama a la función definida en este archivo
                     }, 1500); // Un poco más de tiempo para leer el mensaje


                 } catch (error) {
                      // processPaymentSimulation ya muestra mensaje de error si falla
                      console.error("DOMContentLoaded: Error manejado por listener del botón de Confirmar Pago:", error);
                       // No limpiar el campo de CVV si falla, para que el usuario pueda corregir
                 }
             });
         } else { console.warn("DOMContentLoaded: Botón Confirmar Pago con ID 'confirmPaymentButton' no encontrado."); }


         // --- Mostrar la Sección Inicial del Dashboard ---
         // Muestra la sección de información del usuario por defecto al cargar el dashboard
         console.log("DOMContentLoaded: Mostrando sección inicial 'user-info-section'.");
         showContentSection('user-info-section'); // Llama a la función definida en este archivo
         // Esto llamará automáticamente a loadUserInfo() dentro de showContentSection.

         // Si prefieres empezar en la selección de ruta, usa:
         // showContentSection('route-selection');


     }
     // No hay lógica para isIndexPage aquí, eso está en index.js

     console.log("DOMContentLoaded: Dashboard script initialization finished.");
}); // <-- Este es el cierre correcto del DOMContentLoaded
// NO DEBE HABER NADA MÁS AQUÍ EXCEPTO POSIBLEMENTE COMENTARIOS O ESPACIOS EN BLANCO.
