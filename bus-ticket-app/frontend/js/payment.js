// script.js - payment.js
// Funciones para el proceso de pago (simulado por ahora)

// --- Importar funciones necesarias de otros módulos ---
import { showMessage } from './ui.js'; // Para mostrar mensajes
import { resetApp } from './auth.js'; // Para redirigir al login en caso de sesión expirada (manejo de error 401)

// Puedes importar variables de estado de booking.js si necesitas detalles de la reserva para el resumen/pago
// import { currentRouteId, currentSelectedDate, currentSelectedSchedule, selectedSeats, PRICE_PER_SEAT } from './booking.js';


// --- Funciones de Pago (Simulado) ---

/**
 * Simula el proceso de pago. En un escenario real, interactuaría con una pasarela de pago.
 * Exportada para ser llamada desde dashboard.js (botón Confirmar Pago).
 * @returns {Promise<any>} Una promesa que simula el resultado del pago.
 */
export async function processPaymentSimulation(/* Puedes pasar detalles de la reserva o pago aquí si los necesitas */) {
    console.log("processPaymentSimulation: Iniciando simulación de pago...");

    const loadingDiv = document.getElementById('loading-payment-simulation'); // Spinner específico de pago (en dashboard.html)
    const confirmPaymentButton = document.getElementById('confirmPaymentButton'); // Botón de confirmar pago (en dashboard.html)

    // Puedes obtener los detalles de la reserva de los elementos del resumen en la UI
    // o de las variables de estado importadas de booking.js si las pasas o las importas aquí.
    // const routeId = currentRouteId; // Si se importa
    // const seats = selectedSeats; // Si se importa
    // console.log("processPaymentSimulation: Detalles para simulación:", { routeId, seats, ... }); // Debug log


    // Mostrar spinner y deshabilitar botón
    if(loadingDiv) loadingDiv.style.display = 'block';
    if (confirmPaymentButton) confirmPaymentButton.disabled = true;


    // --- Simulación de un retardo y resultado aleatorio ---
    const simulationDelay = 2000; // Simular 2 segundos de procesamiento
    const isPaymentSuccessful = Math.random() > 0.3; // 70% de éxito, 30% de fallo simulado

    console.log(`processPaymentSimulation: Simulando pago por ${simulationDelay / 1000} segundos. Éxito esperado: ${isPaymentSuccessful}`);

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (isPaymentSuccessful) {
                console.log("processPaymentSimulation: Simulación de pago exitosa.");
                showMessage('Pago procesado con éxito.', 'success');

                // Lógica después de un pago exitoso simulado:
                // En un flujo real, aquí llamarías a la API de reservas/orden para marcar la reserva como pagada.
                // Por ahora, simplemente mostramos el mensaje y terminamos la simulación.
                // Podrías querer redirigir a la sección "Mis Reservas" o a una página de confirmación.
                // import { showContentSection } from './dashboard.js'; // Ejemplo de importación si decides cambiar de sección aquí
                // showContentSection('reservations-section'); // Ejemplo: redirigir a mis reservas

                 if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
                 if (confirmPaymentButton) confirmPaymentButton.disabled = false; // Volver a habilitar botón

                resolve({ success: true, message: 'Pago exitoso' }); // Resolver la promesa

            } else {
                console.error("processPaymentSimulation: Simulación de pago fallida.");
                const errorMessage = 'Error al procesar el pago (simulado).';
                showMessage(errorMessage, 'error');

                 if(loadingDiv) loadingDiv.style.display = 'none'; // Ocultar spinner
                 if (confirmPaymentButton) confirmPaymentButton.disabled = false; // Volver a habilitar botón

                reject(new Error(errorMessage)); // Rechazar la promesa
            }
        }, simulationDelay);
    });

}

// Otras funciones relacionadas con el pago podrían ir aquí (ej: formatear número de tarjeta, validar campos, etc.)
