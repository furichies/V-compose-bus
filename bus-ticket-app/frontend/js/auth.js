// script.js - auth.js
// Funciones para el manejo de autenticación (registro, login, logout)

// Necesitamos importar showMessage si lo usas aquí
import { showMessage } from './ui.js'; // Asumiendo que showMessage estará en ui.js y es exportada

// Asumiendo que 'selectedSeats' se moverá a booking.js
// import { selectedSeats } from './booking.js'; // Ejemplo si usas módulos

// Exporta las funciones que necesitas usar fuera de este archivo
export function register() {
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
        showMessage(data.message); // showMessage debe estar importada o accesible
        // ... (resto de la lógica de registro) ...
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Error en el registro', 'error');
    });
}

export function login() {
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
            showMessage('Login satisfactorio', 'success');
            localStorage.setItem('token', data.token);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showMessage('Credenciales incorrectas', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Error en el login', 'error');
    });
}

// Función para resetear el estado y redirigir al login (logout)
export function resetApp() {
    localStorage.removeItem('token');
    // selectedSeats estará en otro archivo, necesitarás importarla o llamar a una función de limpieza
     if (typeof selectedSeats !== 'undefined') {
        selectedSeats = []; // Esto funcionará si selectedSeats es una variable exportada de otro módulo e importada aquí
     }
     const priceDisplay = document.getElementById('price-display'); // priceDisplay también estará en otro lado, quizás en booking.js
     if(priceDisplay) priceDisplay.textContent = `Total: €0`;


    window.location.href = 'index.html';
}

