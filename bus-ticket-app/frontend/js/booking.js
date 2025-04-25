// script.js - booking.js
// Funciones para la verificación de disponibilidad, selección de asientos y estado de reserva

// --- Importar funciones necesarias de otros módulos ---
import { showMessage } from './ui.js'; // Para mostrar mensajes
import { resetApp } from './auth.js'; // Para redirigir al login en caso de sesión expirada (manejo de error 401)

// Podrías necesitar importar funciones del módulo de pago si se llaman directamente desde aquí
// import { confirmPayment } from './payment.js'; // Ejemplo

// --- Variables de Estado de Booking ---
// Estas variables controlan el estado de la selección de asientos.
// La variable selectedSeats se exporta si otros módulos necesitan acceder a ella (ej: payment.js)
export let selectedSeats = [];
export const PRICE_PER_SEAT = 43; // Precio por asiento. Exportamos si otros módulos necesitan acceder.

// Variables para almacenar la ruta, fecha y horario seleccionados
// Podrían gestionarse aquí o en otro archivo de estado global si es necesario en varios módulos.
// Por ahora, las obtenemos del DOM en checkAvailability, pero si quieres que estén disponibles
// en otros puntos del proceso de booking/pago, considera exportarlas o gestionarlas en un estado central.
let currentRouteId = null; // Renombrado para evitar confusión si también exportas selectedRouteId
let currentSelectedDate = null; // Renombrado
let currentSelectedSchedule = null; // Renombrado
// También podrías querer almacenar los datos de disponibilidad recibidos
let lastAvailabilityData = null;


// --- Funciones de Booking ---

/**
 * Resetea el array de asientos seleccionados.
 */
export function resetSelectedSeats() { // <-- Nueva función exportada
    console.log("Reseteando asientos seleccionados..."); // Debug log
    selectedSeats.length = 0; // Vaciar el array
    // Opcional: también resetear el display de precio aquí si booking.js lo maneja
    const priceDisplay = document.getElementById('price-display');
    if(priceDisplay) priceDisplay.textContent = `Total: €0`;
    console.log("selectedSeats después de reset:", selectedSeats); // Debug log
}
/**
 * Verifica la disponibilidad de asientos para la ruta, fecha y horario seleccionados.
 * Llama a la API de reservas. Retorna una Promesa con los asientos disponibles.
 */
export async function checkAvailability() { // Convertimos a async para manejar la promesa más fácilmente
    // Obtener valores de los elementos del DOM (estos elementos están en dashboard.html)
    const routeSelect = document.getElementById('route');
    const dateInput = document.getElementById('travel-date');
    const scheduleSelect = document.getElementById('schedule');
    const loadingDiv = document.getElementById('loading'); // Spinner en la sección de ruta

    // Obtener los valores seleccionados
    currentRouteId = routeSelect ? routeSelect.value : null;
    currentSelectedDate = dateInput ? dateInput.value : null;
    currentSelectedSchedule = scheduleSelect ? scheduleSelect.value : null;

    const token = localStorage.getItem('token');

    // Validar que se hayan seleccionado todos los campos necesarios
    if (!currentRouteId || !currentSelectedDate || !currentSelectedSchedule) {
        showMessage('Selecciona ruta, fecha y horario', 'info');
        // No lanzar error aquí, es una validación de entrada
        return Promise.reject(new Error('Faltan datos de selección')); // Retornar una promesa rechazada si hay campos faltantes
    }
     if (!token) {
        showMessage('Por favor, inicia sesión', 'info');
         // No lanzar error aquí, la redirección la maneja dashboard.js
         return Promise.reject(new Error('No hay token de sesión')); // Retornar promesa rechazada
    }

    // Mostrar spinner
    if(loadingDiv) loadingDiv.style.display = 'block';

    // Realizar la llamada a la API para verificar la disponibilidad de asientos
    // Basado en tu backend: /availability/<int:bus_id>/<string:date> y recupera schedule de query params
    // La URL en el frontend debe coincidir con lo que Nginx proxy a tu backend.
    // Nginx location /api/reservation/ { proxy_pass http://bus-reservation:5002/; }
    // Frontend fetch: /api/reservation/availability/1?date=...&schedule=...
    // Backend endpoint: /availability/<int:bus_id>/<string:date> recuperando schedule de query params.
    // Esto implica que la URL del frontend DEBERÍA ser: /api/reservation/availability/${currentRouteId}/${currentSelectedDate}?schedule=${encodeURIComponent(currentSelectedSchedule)}
    // ¡Corregimos la URL de fetch en el frontend para que coincida con el endpoint backend y envíe la fecha como parámetro de ruta!

    const apiUrl = `/api/reservation/availability/${currentRouteId}/${currentSelectedDate}?schedule=${encodeURIComponent(currentSelectedSchedule)}`;


    try { // Usamos try/catch con async/await para manejar la promesa
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' // Aunque GET, buena práctica si la API lo espera
            }
        });

        console.log("Respuesta de fetch para availability:", response); // Debug log

        if (!response.ok) {
             // Manejar errores de autenticación (401) o de la API
            if (response.status === 401) {
                 showMessage('Sesión expirada. Por favor, inicia sesión de nuevo.', 'error');
                 setTimeout(() => { resetApp(); }, 2000); // resetApp importada de auth.js
                 // Lanzar un error para que el catch lo maneje y detenga el flujo
                 throw new Error('Authentication Error: Session expired');
            }
             // Intentar leer el error del body si es posible para un mensaje más detallado
            const errorBody = await response.json().catch(() => ({ message: 'Error desconocido' })); // Intenta leer JSON, si falla, usa un mensaje genérico
            throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); // Esperar a parsear el JSON
        console.log("Datos de disponibilidad recibidos:", data); // Debug log

        // 'data' debería contener la lista de asientos disponibles, ej: { "available_seats": [1, 5, 10, ...] }
        if (!data || !data.available_seats || !Array.isArray(data.available_seats)) {
             console.error("Formato de datos de disponibilidad incorrecto:", data);
             throw new Error("Formato de datos de disponibilidad incorrecto de la API.");
        }

        lastAvailabilityData = data.available_seats; // Almacenar los datos si los necesitas más adelante

        showSeatMap(data.available_seats); // Llamar a showSeatMap aquí
        // NO llamaremos a showContentSection aquí. El llamador en dashboard.js lo hará.

        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner

        // Retornar los datos de disponibilidad para que el llamador los use
        return data.available_seats;

    } catch (error) {
        console.error('Error en checkAvailability:', error);
        showMessage(error.message || 'Error al verificar disponibilidad.', 'error');
        if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
        // No mostrar el mapa de asientos si hay error
        const seatMapDiv = document.getElementById('seat-map');
        if(seatMapDiv) seatMapDiv.innerHTML = '<p>No se pudo cargar el mapa de asientos.</p>';
        // Propagar el error para que el llamador (dashboard.js) también pueda manejarlo (ej: no cambiar de sección)
        throw error;
    }
}


/**
 * Renderiza el mapa de asientos basándose en la disponibilidad.
 * Se llama después de obtener los datos de checkAvailability.
 * @param {number[]} availableSeats Array de números de asiento disponibles.
 */
export function showSeatMap(availableSeats) {
    console.log("showSeatMap: Inicio de la función."); // <-- Log al inicio de la función

    try { // <-- Añadir un bloque try para capturar errores sincrónicos
        console.log("showSeatMap: availableSeats recibidos:", availableSeats); // <-- Log para verificar los datos
        const seatMap = document.getElementById('seat-map');
        console.log("showSeatMap: Elemento #seat-map encontrado:", seatMap); // <-- Log: ¿Se encuentra #seat-map?

        const priceDisplay = document.getElementById('price-display');
        console.log("showSeatMap: Elemento #price-display encontrado:", priceDisplay); // <-- Log: ¿Se encuentra #price-display?


        if (!seatMap) {
            console.error("showSeatMap: ERROR - Elemento #seat-map no encontrado en dashboard.html para renderizar.");
            showMessage("Error interno al mostrar asientos.", 'error'); // showMessage importada
            return; // Salir si no se encuentra el contenedor
        }
         if (!priceDisplay) {
            console.warn("showSeatMap: Advertencia - Elemento #price-display no encontrado en dashboard.html.");
        }


        seatMap.innerHTML = ''; // Limpiar mapa anterior
        console.log("showSeatMap: #seat-map innerHTML limpiado."); // Log

        // Resetear asientos seleccionados al mostrar nuevo mapa
        // selectedSeats debe ser accesible/importable
        if (typeof selectedSeats !== 'undefined') { // Asegurarse de que la variable existe
             selectedSeats.length = 0; // Vaciar el array
             console.log("showSeatMap: selectedSeats reseteado a:", selectedSeats); // Log
         } else {
              console.warn("showSeatMap: Advertencia - selectedSeats no accesible para resetear."); // Advertencia si no es accesible
         }

        if(priceDisplay) {
             priceDisplay.textContent = `Total: €0`; // Resetear precio
             console.log("showSeatMap: Precio reseteado."); // Log
        }


        // Recorrer todos los asientos (asumiendo 40 asientos)
        console.log("showSeatMap: Iniciando bucle para crear asientos."); // Log antes del bucle
        for (let seat = 1; seat <= 40; seat++) {
            // console.log("showSeatMap: Creando div para asiento:", seat); // <-- Log dentro del bucle (puede ser muy verboso)
            const seatElement = document.createElement('div');
            seatElement.className = 'seat';
            seatElement.textContent = seat;
            seatElement.setAttribute('data-seat-number', seat); // <-- Añadir atributo para facilitar la referencia si es necesario

            const isAvailable = availableSeats && Array.isArray(availableSeats) && availableSeats.includes(seat); // <-- Asegurarse de que availableSeats es un array

            if (isAvailable) {
                 seatElement.classList.add('available');
                 // console.log("showSeatMap: Asiento", seat, "disponible. Añadiendo listener."); // Log
                 // NOTA: El listener llama a selectSeat, que debe estar exportada o definida aquí.
                 seatElement.addEventListener('click', () => selectSeat(seat, seatElement));
            } else {
                 // Si el asiento NO está en la lista de disponibles (está reservado u ocupado)
                 seatElement.classList.add('reserved');
                 // console.log("showSeatMap: Asiento", seat, "reservado."); // Log
                 // No añadir listener de click
            }

            seatMap.appendChild(seatElement); // Añadir el asiento al mapa
        }
         console.log("showSeatMap: Bucle de creación de asientos terminado. Intentando mostrar innerHTML final."); // Log después del bucle

         // console.log("showSeatMap: Contenido final de #seat-map:", seatMap.innerHTML); // <-- ¡Este log fue útil antes! Descomentar si quieres ver el HTML
         console.log("showSeatMap: Elementos div.seat creados:", seatMap.querySelectorAll('.seat').length); // <-- Contar elementos creados

         // Asegúrate de que #seat-selection esté visible (esto lo maneja dashboard.js con showContentSection)
         // Pero podemos verificar el display aquí:
         const seatSection = document.getElementById('seat-selection');
         if(seatSection) {
             console.log("showSeatMap: #seat-selection display style:", seatSection.style.display);
              // Puedes usar las herramientas de desarrollo (pestaña Computed) para ver el estilo final aplicado
         }


        console.log("showSeatMap: Función completada sin errores aparentes."); // <-- Log al final de la función

    } catch (error) { // <-- Captura cualquier error que ocurra dentro del bloque try
        console.error('showSeatMap: ERROR CAPTURADO -', error); // Log si hay un error
        showMessage('Error al mostrar el mapa de asientos.', 'error'); // showMessage importada
        const seatMapDiv = document.getElementById('seat-map');
        if(seatMapDiv) seatMapDiv.innerHTML = '<p>Error al cargar el mapa de asientos.</p>'; // Mostrar mensaje de error en la UI
    }
}

/**
 * Maneja la selección/deselección de un asiento por el usuario.
 * Se llama desde el event listener de cada asiento.
 * @param {number} seatNumber El número del asiento seleccionado.
 * @param {HTMLElement} element El elemento DOM del asiento.
 */
export function selectSeat(seatNumber, element) {
    console.log("Intento de seleccionar asiento:", seatNumber); // Debug log

    // Verificar si el asiento está reservado
    if (element.classList.contains('reserved')) {
        console.log("Asiento", seatNumber, "está reservado."); // Debug log
        return;
    }

    const index = selectedSeats.indexOf(seatNumber); // Buscar si el asiento ya está seleccionado

    if (index > -1) {
        // Si el asiento ya está seleccionado (lo deseleccionamos)
        console.log("Deseleccionando asiento:", seatNumber); // Debug log
        element.classList.remove('selected');
        selectedSeats.splice(index, 1);
    } else {
        // Si el asiento NO está seleccionado (lo seleccionamos)
        // Limitar a 2 asientos
        if (selectedSeats.length >= 2) {
            console.log("Límite de selección (2 asientos) alcanzado."); // Debug log
            showMessage('Solo puedes seleccionar 2 asientos', 'info'); // showMessage importada
            return; // No permitir seleccionar más de 2
        }
        console.log("Seleccionando asiento:", seatNumber); // Debug log
        element.classList.add('selected');
        selectedSeats.push(seatNumber);
    }

    console.log("Asientos seleccionados actuales:", selectedSeats); // Debug log

    // Actualizar display de precio
    const priceDisplay = document.getElementById('price-display');
    if(priceDisplay) {
        // PRICE_PER_SEAT debe ser accesible (está exportada desde este mismo módulo)
        priceDisplay.textContent = `Total: €${selectedSeats.length * PRICE_PER_SEAT}`;
        console.log("Precio actualizado:", priceDisplay.textContent); // Debug log
    } else {
        console.warn("Elemento #price-display no encontrado para actualizar precio.");
    }
}


// NOTA: confirmPayment y reserveSeats irán a payment.js o un archivo de checkout/orden.
// La variable selectedSeats es exportada para que payment.js pueda acceder a ella.
