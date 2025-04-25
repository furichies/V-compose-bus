// script.js - payment.js
// Funciones para el proceso de pago y reserva final

// --- Importar funciones necesarias de otros módulos ---
import { showMessage } from './ui.js'; // Para mostrar mensajes
import { resetApp } from './auth.js'; // Para redirigir al login en caso de sesión expirada (manejo de error 401)

// Podrías necesitar importar variables o funciones de booking.js si las usas directamente aquí
// import { selectedSeats, PRICE_PER_SEAT } from './booking.js'; // Ejemplo si necesitas acceder a selectedSeats aquí

// --- Funciones de Pago y Reserva ---

/**
 * Inicia el proceso de confirmación de pago y reserva de asientos.
 * Llama a la API de reserva final.
 * @param {string | number} routeId El ID de la ruta seleccionada.
 * @param {string} date La fecha de viaje seleccionada (formato YYYY-MM-DD).
 * @param {string} schedule El horario de viaje seleccionado (ej: "08:00").
 * @param {number[]} seats Array de números de asiento seleccionados.
 * @returns {Promise<any>} Una promesa que se resuelve con la respuesta de la API de reserva.
 */
export async function confirmPayment(routeId, date, schedule, seats) { // Recibe los detalles de la reserva como argumentos
    console.log("Iniciando proceso de confirmación de pago/reserva..."); // Debug log
    console.log("Detalles de reserva:", { routeId, date, schedule, seats }); // Debug log

    const loadingDiv = document.getElementById('loading-payment'); // Spinner específico de pago si tienes

    // Validar que se pasaron los datos necesarios y que hay asientos seleccionados
    if (!routeId || !date || !schedule || !seats || seats.length === 0) {
        showMessage('Faltan datos de reserva o no se han seleccionado asientos.', 'info');
         return Promise.reject(new Error('Faltan datos de reserva o asientos')); // Retornar promesa rechazada
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Por favor, inicia sesión', 'info'); // Esto ya lo maneja dashboard.js si no hay token al cargar
         return Promise.reject(new Error('No hay token de sesión')); // Retornar promesa rechazada
    }

    // Mostrar spinner (si tienes uno específico de pago, úsalo, o el general)
    if(loadingDiv) loadingDiv.style.display = 'block';
    // Podrías querer deshabilitar el botón de pago para evitar múltiples clics
    // const payButton = document.getElementById('payNowButton'); // Asumiendo este ID en HTML
    // if (payButton) payButton.disabled = true;


    // --- Lógica de Llamada a la API de Reserva Final ---
    // *** Asumiendo que tu API /api/reservation/reserve espera un POST con JSON en el body ***
    // Y que espera bus_id, seat_number(s), date, y schedule en el body.
    // Tu backend /reserve actual espera bus_id, seat_number, date, schedule.
    // Como tu backend espera UN seat_number, tendrás que hacer una llamada por asiento seleccionado
    // O modificar el backend para que acepte un array de seat_numbers.
    // Modificar el backend es más eficiente. Asumamos que MODIFICAREMOS el backend para aceptar `seat_numbers` (plural)

    // **Opción A (Recomendada): Modificar backend para aceptar array de seat_numbers**
    // Si el backend acepta un array de asientos:
    const reservationData = {
        bus_id: parseInt(routeId), // Asegurarse de enviar como número si el backend lo espera así
        seat_numbers: seats, // Enviar el array de asientos
        date: date,
        schedule: schedule
    };
    const apiUrl = '/api/reservation/reserve'; // Endpoint de reserva final

    // **Opción B (Si el backend NO se modifica y espera 1 asiento por llamada):**
    // Esto implicaría iterar sobre `seats` y hacer un `Workspace` por cada asiento. Menos eficiente.
    // Por ahora, seguiremos con la Opción A y asumiremos que modificaremos el backend si es necesario.


    try { // Usamos try/catch con async/await para manejar la promesa
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' // Indicar que enviamos JSON en el body
            },
            body: JSON.stringify(reservationData) // Enviar los datos de la reserva en formato JSON
        });

        console.log("Respuesta de fetch para reserva:", response); // Debug log

        if (!response.ok) {
             // Manejar errores de autenticación (401) o de la API (ej: asiento ya ocupado, datos incorrectos)
            if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 setTimeout(() => { resetApp(); }, 2000); // resetApp importada de auth.js
                 throw new Error('Authentication Error: Session expired');
            }
            // Para otros errores (ej: 400, 409 Conflict - asiento ya reservado)
             const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en reserva' }));
             throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // Esperar a parsear el JSON (ej: {"message": "Seat reserved successfully"})
        console.log("Respuesta de reserva recibida:", data); // Debug log

        // --- Lógica después de Reserva Exitosa ---
        showMessage(data.message || 'Reserva realizada con éxito.', 'success'); // Mostrar mensaje de éxito

        // Limpiar el estado de la selección de asientos después de reservar
        // selectedSeats = []; // selectedSeats es exportada de booking.js. Debemos resetearla allí o que booking.js exporte una función de reset.
        // Opción 1: booking.js exporta resetSelectedSeats()
        // import { resetSelectedSeats } from './booking.js';
        // resetSelectedSeats();
        // Opción 2: booking.js exporta selectedSeats y la modificas aquí (menos limpia)
        // import { selectedSeats } from './booking.js';
        // selectedSeats.length = 0; // Vaciar el array (funciona si selectedSeats es exportada con `export let`)
        // Opción 3: Notificar a booking.js que resetee su estado (usando eventos personalizados o una función compartida)
        // Por simplicidad, y dado que `selectedSeats` ya se exporta con `let`, puedes resetearla aquí:
        if (typeof selectedSeats !== 'undefined') {
             selectedSeats.length = 0; // Vaciar el array de asientos seleccionados
         }
         // También resetear el display de precio en la UI
         const priceDisplay = document.getElementById('price-display');
         if(priceDisplay) priceDisplay.textContent = `Total: €0`;


        // Podrías redirigir al usuario a la sección "Mis Reservas"
        // import { showContentSection } from './dashboard.js'; // Importar si la necesitas
        // showContentSection('reservations-section'); // Llamar a la función para cambiar de sección


         if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
        // Volver a habilitar el botón de pago si lo deshabilitaste
        // if (payButton) payButton.disabled = false;

        // Retornar la respuesta de la API si es necesario para el llamador
        return data;

    } catch (error) {
        console.error('Error en confirmPayment:', error);
        showMessage(error.message || 'Error al procesar la reserva.', 'error');
        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
        // Volver a habilitar el botón de pago
        // if (payButton) payButton.disabled = false;
        // Propagar el error para que el llamador (dashboard.js) también pueda manejarlo si es necesario
        throw error;
    }
}

// NOTA: No incluimos aquí confirmPayment(), ya que es llamada por confirmPayment.
// confirmPayment se encargaría de la interacción con un microservicio de pagos real.
// La lógica de 'reservar los asientos en el backend' es lo que hemos puesto en confirmPayment por ahora.
// Si tuvieras un microservicio de pagos, la función confirmPayment llamaría a ese microservicio,
// y solo DESPUÉS de que el pago sea exitoso, llamaría a la API de reserva (reserve).
// Pero por ahora, la lógica de "pago y reserva final" se centraliza en la llamada al endpoint /reserve.
