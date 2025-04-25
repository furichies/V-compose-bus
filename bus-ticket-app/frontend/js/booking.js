// script.js - booking.js
// Funciones para la verificación de disponibilidad, selección de asientos y estado de reserva

// --- Importar funciones necesarias de otros módulos ---
import { showMessage } from './ui.js'; // Para mostrar mensajes
import { resetApp } from './auth.js'; // Para redirigir al login en caso de sesión expirada (manejo de error 401)

// Podrías necesitar importar funciones del módulo de pago si se llaman directamente desde aquí
// import { processPaymentSimulation } from './payment.js'; // Ejemplo si payment.js tiene esta función


// --- Variables de Estado de Booking ---
// Estas variables controlan el estado de la selección de asientos y la reserva actual.
// Las exportamos para que dashboard.js u otros módulos puedan acceder a ellas.

export let selectedSeats = []; // Array de asientos seleccionados por el usuario
export const PRICE_PER_SEAT = 43; // Precio por asiento.

// Variables para almacenar los detalles de la ruta, fecha y horario seleccionados actualmente
// Las exportamos para que dashboard.js pueda leerlas al hacer la reserva o mostrar el resumen
export let currentRouteId = null;
export let currentSelectedDate = null;
export let currentSelectedSchedule = null;

// Variable para almacenar los datos de disponibilidad recibidos (uso interno o si se necesita cachear)
let lastAvailabilityData = null;


// --- Funciones de Booking ---

/**
 * Resetea el array de asientos seleccionados y el display de precio.
 * Exportada para ser llamada desde otros módulos (ej: dashboard.js).
 */
export function resetSelectedSeats() {
    console.log("Reseteando asientos seleccionados (desde booking.js)...");
    selectedSeats.length = 0; // Vaciar el array

    const priceDisplay = document.getElementById('price-display'); // Elemento en dashboard.html
    if(priceDisplay) priceDisplay.textContent = `Total: €0`;

    console.log("selectedSeats después de reset (en booking.js):", selectedSeats);
}

/**
 * Verifica la disponibilidad de asientos para la ruta, fecha y horario seleccionados.
 * Llama a la API de reservas y renderiza el mapa de asientos.
 * Exportada para ser llamada desde dashboard.js (botón Disponibilidad).
 * @returns {Promise<number[]>} Una promesa que se resuelve con los asientos disponibles.
 */
export async function checkAvailability() {
    console.log("checkAvailability: Inicio de la función.");

    // Obtener valores de los elementos del DOM (estos elementos están en dashboard.html)
    const routeSelect = document.getElementById('route');
    const dateInput = document.getElementById('travel-date');
    const scheduleSelect = document.getElementById('schedule');
    const loadingDiv = document.getElementById('loading'); // Spinner en la sección de ruta

    // Obtener los valores seleccionados y ALMACENARLOS en las variables de estado exportadas
    currentRouteId = routeSelect ? routeSelect.value : null;
    currentSelectedDate = dateInput ? dateInput.value : null;
    currentSelectedSchedule = scheduleSelect ? scheduleSelect.value : null;

    console.log("checkAvailability: Valores seleccionados - Ruta:", currentRouteId, "Fecha:", currentSelectedDate, "Horario:", currentSelectedSchedule);


    const token = localStorage.getItem('token');

    // Validar que se hayan seleccionado todos los campos necesarios
    if (!currentRouteId || !currentSelectedDate || !currentSelectedSchedule) {
        showMessage('Selecciona ruta, fecha y horario', 'info');
        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner en caso de validación fallida
        return Promise.reject(new Error('Faltan datos de selección para verificar disponibilidad'));
    }
     if (!token) {
        showMessage('Por favor, inicia sesión', 'info');
        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
         return Promise.reject(new Error('No hay token de sesión para verificar disponibilidad'));
    }

    // Mostrar spinner
    if(loadingDiv) loadingDiv.style.display = 'block';


    // Realizar la llamada a la API para verificar la disponibilidad de asientos
    // URL corregida para coincidir con endpoint backend: /availability/<bus_id>/<date>?schedule=<schedule>
    const apiUrl = `/api/reservation/availability/${currentRouteId}/${currentSelectedDate}?schedule=${encodeURIComponent(currentSelectedSchedule)}`;

    console.log("checkAvailability: Llamando a API:", apiUrl);

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                 'Authorization': `Bearer ${token}`,
                 'Content-Type': 'application/json'
            }
        });

        console.log("checkAvailability: Respuesta de fetch para availability:", response);

        if (!response.ok) {
            if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 setTimeout(() => { resetApp(); }, 2000);
                 throw new Error('Authentication Error: Session expired');
            }
            const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' }));
            throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("checkAvailability: Datos de disponibilidad recibidos:", data);

        if (!data || !data.available_seats || !Array.isArray(data.available_seats)) {
             console.error("checkAvailability: Formato de datos de disponibilidad incorrecto:", data);
             throw new Error("Formato de datos de disponibilidad incorrecto de la API.");
        }

        lastAvailabilityData = data.available_seats; // Almacenar los datos

        console.log("checkAvailability: Punto de control ANTES de llamar a showSeatMap");
        // ¡Esta línea DEBE ESTAR ACTIVA! Llama a la función que renderiza el mapa.
        showSeatMap(data.available_seats);
        console.log("checkAvailability: Punto de control DESPUÉS de llamar a showSeatMap");


        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner

        console.log("checkAvailability: Función completada con éxito.");

        // Retornar los datos de disponibilidad (útil para el llamador si necesita los datos directamente)
        return data.available_seats;

    } catch (error) {
        console.error('checkAvailability: ERROR CAPTURADO -', error);
        showMessage(error.message || 'Error al verificar disponibilidad.', 'error');
        if(loadingDiv) loadingDiv.style.display = 'none';
        const seatMapDiv = document.getElementById('seat-map');
        if(seatMapDiv) seatMapDiv.innerHTML = '<p>No se pudo cargar el mapa de asientos.</p>'; // Mostrar mensaje de error en la UI
        throw error; // Propagar el error para que el llamador (dashboard.js) pueda manejarlo
    }
}


/**
 * Renderiza el mapa de asientos basándose en la disponibilidad.
 * Se llama desde checkAvailability después de obtener los datos.
 * Exportada para ser llamada desde checkAvailability.
 * @param {number[]} availableSeats Array de números de asiento disponibles.
 */
export function showSeatMap(availableSeats) {
    console.log("showSeatMap: Inicio de la función."); // <-- Log al inicio de la función

    try { // <-- Añadir un bloque try para capturar errores sincrónicos
        console.log("showSeatMap: availableSeats recibidos:", availableSeats);
        const seatMap = document.getElementById('seat-map');
        console.log("showSeatMap: Elemento #seat-map encontrado:", seatMap);

        const priceDisplay = document.getElementById('price-display');
        console.log("showSeatMap: Elemento #price-display encontrado:", priceDisplay);


        if (!seatMap) {
            console.error("showSeatMap: ERROR - Elemento #seat-map no encontrado en dashboard.html para renderizar.");
            // No mostrar mensaje de error global aquí, checkAvailability ya lo maneja si falla la API
            return; // Salir si no se encuentra el contenedor
        }
         if (!priceDisplay) {
            console.warn("showSeatMap: Advertencia - Elemento #price-display no encontrado en dashboard.html.");
        }


        seatMap.innerHTML = ''; // Limpiar mapa anterior
        console.log("showSeatMap: #seat-map innerHTML limpiado.");

        // Resetear asientos seleccionados al mostrar nuevo mapa
        // selectedSeats debe ser accesible (está exportada desde este mismo módulo)
        if (typeof selectedSeats !== 'undefined') {
             selectedSeats.length = 0; // Vaciar el array
             console.log("showSeatMap: selectedSeats reseteado a:", selectedSeats);
         } else {
              console.warn("showSeatMap: Advertencia - selectedSeats no accesible para resetear.");
         }

        if(priceDisplay) {
             priceDisplay.textContent = `Total: €0`;
             console.log("showSeatMap: Precio reseteado.");
        }


        // Recorrer todos los asientos (asumiendo 40 asientos)
        console.log("showSeatMap: Iniciando bucle para crear asientos.");
        for (let seat = 1; seat <= 40; seat++) {
            // console.log("showSeatMap: Creando div para asiento:", seat);
            const seatElement = document.createElement('div');
            seatElement.className = 'seat';
            seatElement.textContent = seat;
            seatElement.setAttribute('data-seat-number', seat);

            const isAvailable = availableSeats && Array.isArray(availableSeats) && availableSeats.includes(seat);

            if (isAvailable) {
                 seatElement.classList.add('available');
                 // console.log("showSeatMap: Asiento", seat, "disponible. Añadiendo listener.");
                 // El listener llama a selectSeat, que está exportada en este archivo.
                 seatElement.addEventListener('click', () => selectSeat(seat, seatElement));
            } else {
                 seatElement.classList.add('reserved');
                 // console.log("showSeatMap: Asiento", seat, "reservado.");
                 // No añadir listener de click
            }

            seatMap.appendChild(seatElement); // Añadir el asiento al mapa
        }
         console.log("showSeatMap: Bucle de creación de asientos terminado.");
         console.log("showSeatMap: Elementos div.seat creados:", seatMap.querySelectorAll('.seat').length);

         // Verificar display de la sección de asientos
         const seatSection = document.getElementById('seat-selection');
         if(seatSection) {
             console.log("showSeatMap: #seat-selection display style:", seatSection.style.display);
         }

        console.log("showSeatMap: Función completada sin errores aparentes.");

    } catch (error) {
        console.error('showSeatMap: ERROR CAPTURADO -', error);
        // No mostrar mensaje de error global aquí, checkAvailability ya lo maneja si falla la API
        const seatMapDiv = document.getElementById('seat-map');
        if(seatMapDiv) seatMapDiv.innerHTML = '<p>Error interno al mostrar el mapa de asientos.</p>'; // Mostrar mensaje de error en la UI
        // No relanzar el error, ya fue capturado y manejado visualmente.
    }
}

/**
 * Maneja la selección/deselección de un asiento por el usuario.
 * Se llama desde el event listener de cada asiento.
 * Exportada para ser llamada desde showSeatMap.
 * @param {number} seatNumber El número del asiento seleccionado.
 * @param {HTMLElement} element El elemento DOM del asiento.
 */
export function selectSeat(seatNumber, element) {
    console.log("selectSeat: Intento de seleccionar asiento:", seatNumber);

    if (element.classList.contains('reserved')) {
        console.log("selectSeat: Asiento", seatNumber, "está reservado.");
        return;
    }

    const index = selectedSeats.indexOf(seatNumber); // Buscar si el asiento ya está seleccionado

    if (index > -1) {
        console.log("selectSeat: Deseleccionando asiento:", seatNumber);
        element.classList.remove('selected');
        selectedSeats.splice(index, 1);
    } else {
        if (selectedSeats.length >= 2) {
            console.log("selectSeat: Límite de selección (2 asientos) alcanzado.");
            showMessage('Solo puedes seleccionar 2 asientos', 'info'); // showMessage importada
            return;
        }
        console.log("selectSeat: Seleccionando asiento:", seatNumber);
        element.classList.add('selected');
        selectedSeats.push(seatNumber);
    }

    console.log("selectSeat: Asientos seleccionados actuales:", selectedSeats);

    const priceDisplay = document.getElementById('price-display'); // Elemento en dashboard.html
    if(priceDisplay) {
        // PRICE_PER_SEAT debe ser accesible (está exportada desde este mismo módulo)
        priceDisplay.textContent = `Total: €${selectedSeats.length * PRICE_PER_SEAT}`;
        console.log("selectSeat: Precio actualizado:", priceDisplay.textContent);
    } else {
        console.warn("selectSeat: Elemento #price-display no encontrado para actualizar precio.");
    }
}


// --- Función para hacer la RESERVA (llama a la API /api/reservation/reserve) ---
/**
 * Realiza la llamada API para reservar los asientos seleccionados para la ruta, fecha y horario.
 * Exportada para ser llamada desde dashboard.js (botón Reservar).
 * @returns {Promise<any>} Una promesa que se resuelve al completar la reserva.
 */
export async function makeReservation() {
    console.log("makeReservation: Iniciando proceso de reserva...");

    // Obtener los detalles de la reserva de las variables de estado de este módulo (exportadas)
    const routeId = currentRouteId;
    const date = currentSelectedDate;
    const schedule = currentSelectedSchedule;
    const seats = selectedSeats; // selectedSeats está definida y exportada en este archivo

    console.log("makeReservation: Detalles de reserva:", { routeId, date, schedule, seats }); // Debug log


    const loadingDiv = document.getElementById('loading-payment'); // Spinner en la sección de asientos/reserva (en dashboard.html)
    const reserveButton = document.getElementById('reserveButton'); // Botón de reserva (en dashboard.html)

    // Validar que se tienen los datos necesarios y asientos seleccionados
    if (!routeId || !date || !schedule || !seats || seats.length === 0) {
        showMessage('Faltan datos de reserva o no se han seleccionado asientos.', 'info');
        // No necesitamos ocultar spinner/deshabilitar botón aquí, ya que la validación es inmediata
         return Promise.reject(new Error('Faltan datos de reserva o asientos seleccionados'));
    }
     if (seats.length > 2) { // Validar límite también antes de la llamada API
        showMessage('Solo puedes reservar hasta 2 asientos.', 'info');
        return Promise.reject(new Error('Límite de asientos excedido'));
     }


    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Por favor, inicia sesión', 'info');
         return Promise.reject(new Error('No hay token de sesión para hacer la reserva'));
    }

    // Mostrar spinner y deshabilitar botón
    if(loadingDiv) loadingDiv.style.display = 'block';
    if (reserveButton) reserveButton.disabled = true;


    // --- Llamada a la API de Reserva Final (/api/reservation/reserve) ---
    // Basado en la modificación anterior del backend para aceptar `seat_numbers` (array)
    const reservationData = {
        bus_id: parseInt(routeId), // Convertir a número si el backend lo espera así
        seat_numbers: seats, // Enviar el array de asientos seleccionados
        date: date,
        schedule: schedule
    };
    const apiUrl = '/api/reservation/reserve'; // Endpoint de reserva final


    console.log("makeReservation: Llamando a API de reserva:", apiUrl, "con datos:", reservationData);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservationData)
        });

        console.log("makeReservation: Respuesta de fetch para reserva:", response);

        if (!response.ok) {
            if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 setTimeout(() => { resetApp(); }, 2000);
                 throw new Error('Authentication Error: Session expired during reservation');
            }
            const errorBody = await response.json().catch(() => ({ message: 'Error desconocido en reserva' }));
            throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("makeReservation: Respuesta de reserva recibida:", data);

        // --- Lógica después de Reserva Exitosa ---
        // NOTA: La reserva está hecha en el backend (simulada), pero AÚN NO ESTÁ PAGADA en un flujo real.
        showMessage(data.message || 'Reserva realizada con éxito. Proceda al pago.', 'success');

        // Limpiar el estado de la selección de asientos después de reservar
        resetSelectedSeats(); // Llama a la función de reseteo de este mismo módulo

        // No redirigimos automáticamente a la sección de pago desde aquí.
        // El listener del botón en dashboard.js hará eso después de que makeReservation termine con éxito.

        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
        if (reserveButton) reserveButton.disabled = false; // Volver a habilitar botón

        console.log("makeReservation: Función completada con éxito.");

        // Retornar la respuesta de la API (podría incluir un ID de reserva si el backend lo devuelve)
        return data;

    } catch (error) {
        console.error('makeReservation: ERROR CAPTURADO -', error);
        showMessage(error.message || 'Error al procesar la reserva.', 'error');
        if(loadingDiv) loadingDiv.style.display = 'none';
        if (reserveButton) reserveButton.disabled = false; // Volver a habilitar botón
        throw error; // Propagar el error para que el llamador (dashboard.js) pueda manejarlo
    }
}


// NOTA: processPaymentSimulation (simulación de pago) irá a payment.js.
