// script.js - dashboard.js
// Lógica principal y coordinación de la página del dashboard

// --- Importar funciones necesarias de otros módulos ---

// De auth.js (para cerrar sesión)
import { resetApp } from './auth.js';

// De ui.js (para mostrar mensajes)
import { showMessage } from './ui.js';

// De routes.js (para cargar rutas y horarios) - Asumimos que se exportarán desde allí
import { loadRoutes, loadSchedules } from './routes.js'; // Estas funciones deben ser movidas a routes.js y exportadas

// De booking.js (para verificación de disponibilidad, selección de asientos) - Asumimos que se exportarán desde allí
import { checkAvailability, showSeatMap, selectSeat, selectedSeats, resetSelectedSeats } from './booking.js';

// De payment.js (para confirmar pago, reservar asientos) - Asumimos que se exportarán desde allí
import { confirmPayment } from './payment.js'; // Importar confirmPayment
// (Las funciones de payment/reserve podrían estar en booking.js o un archivo de orden/checkout, decidiremos después)

// Variables de estado que podrían ir en booking.js o un archivo de estado global si es necesario en varios módulos
// export let selectedSeats = []; // Si se gestionan en booking.js, importarlas
// export const PRICE_PER_SEAT = 43; // Si se gestiona en booking.js, importarla


// --- Funciones de Manejo de UI del Dashboard ---

// Función para ocultar todas las secciones de contenido
function hideAllContentSections() {
    const contentSections = document.querySelectorAll('.main-content .content-section');
    contentSections.forEach(section => {
        section.style.display = 'none';
    });
}

// Función para mostrar una sección de contenido específica y ejecutar lógica asociada
export function showContentSection(sectionId) { // Exportar si necesitas llamarla desde fuera de este módulo (ej: desde un import dinámico)
    hideAllContentSections();
    const sectionToShow = document.getElementById(sectionId);
    if (sectionToShow) {
        sectionToShow.style.display = 'block';

        // Lógica adicional si la sección mostrada es la de rutas
        if (sectionId === 'route-selection') {
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
             loadUserInfo(); // <- Función definida/importada en este archivo
        }
        // Lógica similar para la sección de reservas
        if (sectionId === 'reservations-section') {
            // loadReservations(); // Necesitas crear esta función e importarla/definirla
             console.log("Mostrando sección de Mis Reservas. (Funcionalidad pendiente)");
        }

        // Lógica para resetear asientos/pago si sales de la sección de asientos/pago
         // Si la sección mostrada NO es la de asientos
         if (sectionId !== 'seat-selection') {
             // Resetear asientos seleccionados y display de precio
             // ¡Llama a la función de reseteo del módulo booking.js en lugar de reasignar directamente!
             if (typeof resetSelectedSeats === 'function') { // Verifica si la función existe (buena práctica)
                  resetSelectedSeats(); // <-- Llama a la función importada para resetear
             } else {
                  console.warn("resetSelectedSeats function not found in booking.js module.");
                   // Fallback: intentar vaciar el array si es accesible y es un array
                   if (Array.isArray(selectedSeats)) {
                       selectedSeats.length = 0;
                       const priceDisplay = document.getElementById('price-display');
                       if(priceDisplay) priceDisplay.textContent = `Total: €0`;
                   }
             }
             // Ocultar la sección de asientos si estaba visible
             const seatSection = document.getElementById('seat-selection');
             if(seatSection) seatSection.style.display = 'none'; // Esto ya lo hace hideAllContentSections, pero esta lógica es específica de no estar en la sección de asientos

             // Ocultar la sección de pago si estaba visible
             const paymentSection = document.getElementById('payment-section'); // Asumiendo este ID para la nueva sección de pago
             if(paymentSection) paymentSection.style.display = 'none'; // Asegurarse de que la sección de pago también se oculte
         }

         // Si la sección mostrada ES la de asientos, quizás limpiar la sección de pago por si vienes de allí?
          if (sectionId === 'seat-selection') {
              const paymentSection = document.getElementById('payment-section');
              if(paymentSection) paymentSection.style.display = 'none';
              // Quizás inicializar algo en la sección de asientos si vienes de otro lado
              // showSeatMap(lastAvailabilityData); // Si guardas los datos de disponibilidad
          }

         // Si la sección mostrada ES la de pago, quizás limpiar la sección de asientos o resumen
         // if (sectionId === 'payment-section') { /* ... */ }

    } else {
        console.error(`Sección de contenido con ID "${sectionId}" no encontrada en dashboard.html.`);
        // Opcional: mostrar un mensaje de error al usuario
        showMessage(`Error interno: No se pudo mostrar la sección "${sectionId}".`, 'error');
    }
}

// Función para cargar y mostrar la información del usuario (podría ir aquí o en un archivo api/user)
// La mantenemos aquí por ahora ya que actualiza directamente el DOM de esta sección.
function loadUserInfo() {
    const token = localStorage.getItem('token');
    const usernameSpan = document.getElementById('user-info-username');
    const emailSpan = document.getElementById('user-info-email');
    const tokenSpan = document.getElementById('user-info-token'); // Opcional

    // Limpiar contenido anterior y mostrar estado de carga/placeholder
    if(usernameSpan) usernameSpan.textContent = 'Cargando...';
    if(emailSpan) emailSpan.textContent = 'Cargando...';
    if(tokenSpan) tokenSpan.textContent = token ? token.substring(0, 10) + '...' : 'No disponible'; // Mostrar solo parte del token

    if (!token) {
        console.log('No token found for loading user info.');
         if(usernameSpan) usernameSpan.textContent = 'No disponible';
         if(emailSpan) emailSpan.textContent = 'No disponible';
         if(tokenSpan) tokenSpan.textContent = 'No disponible';
         // No redirigimos aquí, eso lo maneja el DOMContentLoaded inicial
        return;
    }

    // Realizar la llamada a la API para obtener la información del usuario
    // La llamada fetch podría estar encapsulada en un módulo api.js
     fetch('/api/user/profile/', { // Asegúrate de la barra final si tu backend la espera
         method: 'GET',
         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
     })
    .then(response => {
        if (!response.ok) {
             if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error'); // showMessage importada
                 setTimeout(() => { resetApp(); }, 2000); // resetApp importada
             }
             // Intentar leer el error del body si es posible
             return response.json().then(err => { throw new Error(err.message || `HTTP error! status: ${response.status}`); });
        }
        return response.json();
    })
    .then(userData => {
        // Rellenar los elementos HTML con los datos del usuario
        if(usernameSpan) usernameSpan.textContent = userData.username || 'N/A';
        if(emailSpan) emailSpan.textContent = userData.email || 'N/A';
        // El token ya se mostró, no lo actualizamos aquí a menos que la API lo devuelva (no suele ser el caso)
    })
    .catch(error => {
        console.error('Error al cargar info del usuario:', error);
        showMessage(error.message || 'No se pudo cargar la información del usuario.', 'error'); // showMessage importada
        if(usernameSpan) usernameSpan.textContent = 'Error';
        if(emailSpan) emailSpan.textContent = 'Error';
    });
}


// --- Lógica de Inicialización del Dashboard (DOMContentLoaded) ---

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    // Determinar si estamos en la página del dashboard
    const isDashboardPage = window.location.pathname.endsWith('/dashboard.html');

     // Lógica de redirección: si NO hay token y estamos en el dashboard, redirigir al login
     if (!token && isDashboardPage) {
         console.log('No token found on dashboard page, redirecting to login.');
         showMessage('Por favor, inicia sesión para acceder al dashboard.', 'info'); // showMessage importada
         setTimeout(() => {
             window.location.href = 'index.html';
         }, 1000);

     } else if (token && isDashboardPage) {
         // Si SÍ hay token y estamos en el dashboard, configurar la página
         console.log('Token found on dashboard page. Setting up dashboard...');

         // --- Configuración de Event Listeners para la Navegación y Elementos del Dashboard ---

         const navLinks = document.querySelectorAll('.sidebar a[data-section]');
         const logoutLink = document.getElementById('logout-link');
         const routeSelect = document.getElementById('route'); // <--- Obtener referencia al select de ruta

         // Event listener para la navegación lateral
         navLinks.forEach(link => {
             link.addEventListener('click', (event) => {
                 event.preventDefault(); // Evitar el comportamiento por defecto del enlace
                 const targetSectionId = event.target.getAttribute('data-section');
                 showContentSection(targetSectionId); // showContentSection definida en este archivo
             });
         });

         // Event listener para cerrar sesión
         if (logoutLink) {
             logoutLink.addEventListener('click', (event) => {
                 event.preventDefault(); // Evitar el comportamiento por defecto del enlace
                 resetApp(); // Llama a la función resetApp importada de auth.js
             });
         }

         // Event Listener para la selección de ruta (para cargar horarios)
         if (routeSelect) {
             routeSelect.addEventListener('change', (event) => {
                 const selectedRouteId = event.target.value;
                 // Llamar a loadSchedules si se selecciona una ruta (importada de routes.js)
                 if (selectedRouteId) { // Solo cargar horarios si se seleccionó una ruta válida (no la opción por defecto "")
                    loadSchedules(selectedRouteId);
                 } else {
                    // Limpiar select de horarios si se vuelve a la opción por defecto
                    const scheduleSelect = document.getElementById('schedule');
                    if (scheduleSelect) {
                       scheduleSelect.innerHTML = '<option value="">Selecciona un horario</option>';
                       scheduleSelect.style.display = 'none';
                    }
                 }
             });
         } else {
              console.warn("Elemento con ID 'route' no encontrado en dashboard.html");
         }

         // Event Listener para el botón "Disponibilidad" (llama a checkAvailability)
         // Necesitarás obtener la referencia a este botón e importar checkAvailability de booking.js
         const availabilityButton = document.querySelector('#route-selection button'); // Ajusta el selector si es necesario
			if (availabilityButton) {
			// Hacer el manejador async para poder usar await con checkAvailability
				availabilityButton.addEventListener('click', async (event) => {
					event.preventDefault();
					try {
						// checkAvailability ahora retorna los datos disponibles si tiene éxito
						const availableSeats = await checkAvailability(); // Llama a la función importada y espera a que termine

						// Si checkAvailability tuvo éxito y retornó datos, mostramos el mapa y cambiamos a la sección de asientos
						// showSeatMap(availableSeats); // checkAvailability ya llama a showSeatMap internamente. ¡No llamar de nuevo aquí!

						// Solo cambiar la sección DESPUÉS del éxito de checkAvailability
						showContentSection('seat-selection'); // Llama a la función definida en dashboard.js

					} catch (error) {
						// checkAvailability ya muestra mensaje de error, aquí solo podrías hacer algo adicional si fuera necesario
						console.error("Error manejado por listener del botón de disponibilidad:", error);
						// Opcional: Volver a la sección de selección de ruta si hay un error fatal de API
						// showContentSection('route-selection');
					}
				});
			}

         // Event Listener para el botón "Pagar AHORA" (llama a confirmPayment) - Este botón se moverá a la sección de pago
         // Necesitarás obtener la referencia a este botón en la nueva sección de pago e importar confirmPayment de payment.js
			const payButton = document.getElementById('payNowButton'); // Asegúrate de tener el ID en HTML

			if (payButton) {
				payButton.addEventListener('click', async (event) => { // Hacer el manejador async
					event.preventDefault();

					// *** Obtener los detalles de la reserva antes de llamar a confirmPayment ***
					const routeId = document.getElementById('route').value;
					const date = document.getElementById('travel-date').value;
					const schedule = document.getElementById('schedule').value;
					// selectedSeats ya está importada desde booking.js

					try {
						// Llama a confirmPayment con los datos de la reserva
						await confirmPayment(routeId, date, schedule, selectedSeats);

						// Si confirmPayment tuvo éxito (no lanzó error), puedes hacer algo adicional aquí
						console.log("Proceso de pago/reserva completado exitosamente.");
						// Opcional: Redirigir a la sección "Mis Reservas"
						// showContentSection('reservations-section');

					} catch (error) {
						// confirmPayment ya muestra mensaje de error, aquí solo podrías hacer algo adicional si fuera necesario
						console.error("Error manejado por listener del botón de pago:", error);
					}
				});
			}


         // ... (configuración de listeners para otros elementos del dashboard si es necesario) ...


         // --- Mostrar la Sección Inicial del Dashboard ---
         // Muestra la sección de información del usuario por defecto al cargar el dashboard
         showContentSection('user-info-section'); // showContentSection definida en este archivo
         // Esto llamará automáticamente a loadUserInfo()

     }
     // No hay lógica para isIndexPage aquí

});

