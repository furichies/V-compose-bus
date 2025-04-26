// script.js - payment.js
// Funciones para el proceso de pago (simulado)

// --- Importar funciones necesarias de otros módulos ---
import { showMessage } from './ui.js';
import { resetApp } from './auth.js';

// Importar las variables de estado de booking.js si necesitas detalles de la reserva aquí
// import { currentRouteId, currentSelectedDate, currentSelectedSchedule, selectedSeats, PRICE_PER_SEAT } from './booking.js';

// Necesitarás acceder a los datos de pago simulados del usuario (especialmente el CVV)
// Opción 1: Pasar los datos (incluyendo CVV) a processPaymentSimulation desde dashboard.js
// Opción 2: Tener una forma de acceder a los datos del usuario aquí (menos común, mejor pasar)


/**
 * Simula el proceso de pago, incluyendo una validación básica del CVV.
 * Exportada para ser llamada desde dashboard.js (botón Confirmar Pago).
 * @param {string} enteredCvv El valor del CVV introducido por el usuario.
 * @param {object} userData Opcional: Datos del usuario incluyendo el CVV correcto simulado.
 * @returns {Promise<any>} Una promesa que simula el resultado del pago.
 */
export async function processPaymentSimulation(enteredCvv, userData) { // Recibe el CVV introducido y datos del usuario
    console.log("processPaymentSimulation: Iniciando simulación de pago...");
    console.log("processPaymentSimulation: CVV introducido:", enteredCvv);
    // Necesitas el CVV correcto simulado del usuario para la validación
    // Asumiremos que userData.cvv contiene el CVV correcto simulado.
    const correctCvv = userData ? userData.cvv : null; // Obtener el CVV correcto simulado de los datos del usuario
    console.log("processPaymentSimulation: CVV correcto simulado:", correctCvv);


    const loadingDiv = document.getElementById('loading-payment-simulation');
    const confirmPaymentButton = document.getElementById('confirmPaymentButton');

    // Mostrar spinner y deshabilitar botón
    if(loadingDiv) loadingDiv.style.display = 'block';
    if (confirmPaymentButton) confirmPaymentButton.disabled = true;


    // --- Validación simulada del CVV ---
    const isCvvValid = enteredCvv === correctCvv;
    console.log("processPaymentSimulation: CVV válido (simulado):", isCvvValid);


    // --- Simulación de un retardo y resultado basado en validación y aleatoriedad ---
    const simulationDelay = 2000;

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            let simulationResult = { success: false, message: 'Pago fallido (simulado).' };

            if (!isCvvValid) {
                simulationResult.message = 'CVV inválido.';
                console.error("processPaymentSimulation: Simulación de pago fallida - CVV inválido.");
                 // No hacemos nada más, el resultado es fallo
            } else {
                 // Si el CVV es válido, ahora aplicamos la aleatoriedad general del pago
                 const isPaymentGatewaySuccessful = Math.random() > 0.2; // Simular fallo del 20% incluso con CVV válido

                 if (isPaymentGatewaySuccessful) {
                     simulationResult = { success: true, message: 'Pago procesado con éxito.' };
                     console.log("processPaymentSimulation: Simulación de pago exitosa (CVV válido y pasarela ok).");

                     // Lógica después de un pago exitoso simulado:
                     // Aquí, en un flujo real, llamarías a la API de reservas/orden para marcar la reserva como pagada.
                     // Como no tenemos esa API aún, esto es solo un placeholder.
                     // Por ahora, la reserva ya se hizo en el backend al pulsar "Reservar".
                     // Para la simulación, podemos asumir que el pago "completa" el proceso.

                 } else {
                     simulationResult.message = 'Pago rechazado por la pasarela (simulado).';
                     console.error("processPaymentSimulation: Simulación de pago fallida - Pasarela rechazada.");
                 }
            }

            // Ocultar spinner y habilitar botón
             if(loadingDiv) loadingDiv.style.display = 'none';
             if (confirmPaymentButton) confirmPaymentButton.disabled = false;

            if (simulationResult.success) {
                showMessage(simulationResult.message, 'success');
                resolve(simulationResult);
            } else {
                 showMessage(simulationResult.message, 'error');
                reject(new Error(simulationResult.message));
            }

        }, simulationDelay);
    });

}

// Puedes añadir aquí una función auxiliar para obtener los datos de pago del usuario si no los pasas a processPaymentSimulation
// Esto requeriría almacenar los datos del usuario en el frontend (ej: en una variable global o local)
// o hacer otra llamada API para obtener el perfil de usuario justo antes del pago (menos eficiente).
// La opción de pasar userData a processPaymentSimulation es más limpia.
