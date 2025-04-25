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
    selectedSeats, // Variable de estado para los asientos seleccionados (necesaria para resetear y pasar a makeReservation)
    resetSelectedSeats, // Función para resetear selectedSeats (llamada al cambiar de sección)
    currentRouteId, // Variable de estado para la ruta seleccionada actualmente
    currentSelectedDate, // Variable de estado para la fecha seleccionada actualmente
    currentSelectedSchedule, // Variable de estado para el horario seleccionado actualmente
    PRICE_PER_SEAT // Precio por asiento (necesario para calcular el total en el resumen de pago)
} from './booking.js';

// De payment.js (para simulación de pago) - Asumimos que tendrá una función para iniciar la simulación
// Asegúrate de que processPaymentSimulation esté exportada en payment.js
import { processPaymentSimulation } from './payment.js';


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
             console.log("showContentSection: Lógica para sección de Mis Reservas (pendiente de implementación).");
            // loadReservations(); // Necesitas crear esta función (en booking.js o un nuevo archivo) e importarla/definirla
        }
         // Lógica para la sección de pago
         if (sectionId === 'payment-section') {
              console.log("showContentSection: Lógica para sección de Pago.");
             // No hay lógica de carga aquí per se, el resumen se actualiza antes de cambiar a esta sección.
         }


        // --- Lógica para limpiar estado y secciones al SALIR de la sección de asientos/pago ---
        // Esto se ejecuta CADA VEZ que cambias a una sección que NO es 'seat-selection'
         if (sectionId !== 'seat-selection' && sectionId !== 'payment-section') {
             console.log(`showContentSection: Saliendo de secciones de booking/payment. Reseteando estado...`);
             // Resetear asientos seleccionados y display de precio llamando a la función de booking.js
             if (typeof resetSelectedSeats === 'function') {
                  resetSelectedSeats(); // <-- Llama a la función importada de booking.js
             } else {
                  console.warn("showContentSection: resetSelectedSeats function not found during section change reset.");
                  // Fallback menos seguro si la función no se importa correctamente
                  if (Array.isArray(selectedSeats)) selectedSeats.length = 0;
                  const priceDisplay = document.getElementById('price-display');
                  if(priceDisplay) priceDisplay.textContent = `Total: €0`;
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
               // Aquí podrías llamar a una función para inicializar la sección de pago si fuera necesario,
               // pero updatePaymentSummary ya lo hace antes de cambiar la sección.
         }


    } else {
        console.error(`showContentSection: Sección de contenido con ID "${sectionId}" no encontrada en dashboard.html.`);
        showMessage(`Error interno: No se pudo mostrar la sección "${sectionId}".`, 'error');
    }
}

/**
 * Carga y muestra la información del usuario en la sección correspondiente.
 * Se llama desde showContentSection cuando se muestra la sección de info de usuario.
 */
function loadUserInfo() {
    console.log("loadUserInfo: Cargando información del usuario...");
    const token = localStorage.getItem('token');
    const usernameSpan = document.getElementById('user-info-username');
    const emailSpan = document.getElementById('user-info-email');
    const tokenSpan = document.getElementById('user-info-token');

    // Limpiar contenido anterior y mostrar estado de carga/placeholder
    if(usernameSpan) usernameSpan.textContent = 'Cargando...';
    if(emailSpan) emailSpan.textContent = 'Cargando...';
    // Mostrar solo parte del token por seguridad, si existe
    if(tokenSpan) tokenSpan.textContent = token ? `${token.substring(0, 10)}...` : 'No disponible';

    if (!token) {
        console.log('loadUserInfo: No token found. Cannot load user info.');
         if(usernameSpan) usernameSpan.textContent = 'No disponible';
         if(emailSpan) emailSpan.textContent = 'No disponible';
         if(tokenSpan) tokenSpan.textContent = 'No disponible';
         // La redirección al login ya la maneja el DOMContentLoaded si no hay token al cargar la página
        return;
    }

    // Realizar la llamada a la API para obtener la información del usuario
    // *** Asumiendo que tu API de auth maneja /api/user/profile/ ***
     fetch('/api/user/profile/', { // Asegúrate de la barra final si tu backend la espera
         method: 'GET',
         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
     })
    .then(response => {
        console.log("loadUserInfo: Respuesta fetch /api/user/profile/:", response);
        if (!response.ok) {
             if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error'); // showMessage importada
                 setTimeout(() => { resetApp(); }, 2000); // resetApp importada
                  // Lanzar error para el catch
                 throw new Error('Authentication Error: Session expired');
             }
             // Intentar leer el error del body para un mensaje más detallado
             return response.json().then(err => { throw new Error(err.message || `HTTP error! status: ${response.status}`); });
        }
        return response.json();
    })
    .then(userData => {
        console.log("loadUserInfo: Datos de usuario recibidos:", userData);
        // Rellenar los elementos HTML con los datos del usuario
        if(usernameSpan) usernameSpan.textContent = userData.username || 'N/A';
        if(emailSpan) emailSpan.textContent = userData.email || 'N/A';
        // El token ya se mostró, no lo actualizamos aquí a menos que la API lo devuelva (no suele ser el caso)
         console.log("loadUserInfo: Información del usuario mostrada.");
    })
    .catch(error => {
        console.error('loadUserInfo: Error al cargar info del usuario:', error);
        showMessage(error.message || 'No se pudo cargar la información del usuario.', 'error'); // showMessage importada
        if(usernameSpan) usernameSpan.textContent = 'Error';
        if(emailSpan) emailSpan.textContent = 'Error';
         if(tokenSpan) tokenSpan.textContent = 'Error';
    });
}

/**
 * Actualiza los elementos en la sección de pago con el resumen de la reserva.
 * Se llama antes de mostrar la sección de pago.
 * @param {string | number} routeId El ID de la ruta seleccionada.
 * @param {string} date La fecha de viaje seleccionada (formato YYYY-MM-DD).
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

    // Para obtener el nombre de la ruta (ej: Madrid -> Ponferrada), necesitarías
    // tener la lista completa de rutas disponible (quizás guardada en routes.js y exportada/importada)
    // o hacer otra llamada a la API de rutas. Por ahora, solo mostramos el ID.
    if(summaryRoute) summaryRoute.textContent = routeId; // O buscar el nombre real de la ruta


    if(summaryDate) summaryDate.textContent = date;
    if(summarySchedule) summarySchedule.textContent = schedule;
    if(summarySeats) summarySeats.textContent = seats && seats.length > 0 ? seats.join(', ') : 'Ninguno'; // Mostrar los asientos separados por coma

    // Calcular y mostrar el total (necesitas PRICE_PER_SEAT, importado desde booking.js)
     if(summaryTotal && typeof PRICE_PER_PER_SEAT !== 'undefined') { // ¡OJO! Typo aquí, debería ser PRICE_PER_SEAT
          console.warn("updatePaymentSummary: Typo detectado: Usando PRICE_PER_PER_SEAT en lugar de PRICE_PER_SEAT.");
          summaryTotal.textContent = `€${(seats ? seats.length : 0) * PRICE_PER_PER_SEAT}`; // Usando el typo detectado
     } else if (summaryTotal && typeof PRICE_PER_SEAT !== 'undefined') { // Usando el nombre correcto
          summaryTotal.textContent = `€${(seats ? seats.length : 0) * PRICE_PER_SEAT}`;
           console.log("updatePaymentSummary: Total calculado:", summaryTotal.textContent);
     }
      else {
          console.warn("updatePaymentSummary: PRICE_PER_SEAT no accesible para calcular el total.");
           if(summaryTotal) summaryTotal.textContent = '€N/A';
     }

    console.log("updatePaymentSummary: Resumen de pago actualizado.");
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
         console.log('DOMContentLoaded: Token found on dashboard page. Setting up dashboard...');

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
                 event.preventDefault(); // Evitar el comportamiento por defecto

                 console.log("DOMContentLoaded: Botón Confirmar Pago clicado. Llamando a simulación de pago...");

                 try {
                     // Llama a la función que simula el pago importada de payment.js
                     // Puedes pasarle detalles de la reserva si processPaymentSimulation los necesita (aunque en la simulación básica no es estrictamente necesario)
                     await processPaymentSimulation(/* pasar datos si es necesario */);

                     // Si la simulación de pago fue exitosa (no lanzó error)
                     console.log("DOMContentLoaded: Simulación de pago completada exitosamente.");
                     // Opcional: Redirigir a la sección de Mis Reservas o mostrar un mensaje final
                     showMessage('Redirigiendo a Mis Reservas...', 'info'); // showMessage importada
                     setTimeout(() => { // Pequeño retraso para que el mensaje se vea
                         showContentSection('reservations-section'); // Llama a la función definida en este archivo
                     }, 1000);


                 } catch (error) {
                      // processPaymentSimulation ya muestra mensaje de error, aquí solo logeamos
                      console.error("DOMContentLoaded: Error manejado por listener del botón de Confirmar Pago:", error);
                 }
             });
              console.log("DOMContentLoaded: Event listener para botón Confirmar Pago configurado.");
         } else { console.warn("DOMContentLoaded: Botón Confirmar Pago con ID 'confirmPaymentButton' no encontrado."); }


         // ... (configuración de listeners para otros elementos del dashboard si es necesario) ...


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
});
