// script.js
let selectedSeat = null;

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
    .then(data => alert(data.message))
    .catch(error => console.error('Error:', error));
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
            alert('Login satisfactorio');
            localStorage.setItem('token', data.token);
            showRouteSelection();
        } else {
            alert('Credenciales incorrectas');
        }
    })
    .catch(error => console.error('Error:', error));
}

function showRouteSelection() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('route-selection').style.display = 'block';
    loadRoutes();
}

function loadRoutes() {
    fetch('/api/routes/routes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => response.json())
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
    });
}

function checkAvailability() {
    const routeId = document.getElementById('route').value;
    const date = document.getElementById('travel-date').value;

    if (!routeId || !date) {
        alert('Selecciona ruta y fecha');
        return;
    }

    fetch(`/api/reservation/availability/${routeId}/${date}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        showSeatMap(data.available_seats);
        document.getElementById('route-selection').style.display = 'none';
        document.getElementById('seat-selection').style.display = 'block';
    });
}

function showSeatMap(availableSeats) {
    const seatMap = document.getElementById('seat-map');
    seatMap.innerHTML = '';

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

const PRICE_PER_SEAT = 43;
let selectedSeats = []; // permite múltiples asientos

function selectSeat(seatNumber, element) {
    if (element.classList.contains('reserved')) return;

    if (selectedSeats.includes(seatNumber)) {
        // Deseleccionar
        element.classList.remove('selected');
        selectedSeats = selectedSeats.filter(s => s !== seatNumber);
    } else {
        // Limitar a 2 asientos
        if (selectedSeats.length >= 2) {
            alert('Solo puedes seleccionar 2 asientos');
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
    if (selectedSeats.length === 0) { // Usar selectedSeats en lugar de selectedSeat
        alert('Selecciona al menos un asiento');
        return;
    }

    // Mostrar spinner
    document.getElementById('loading').style.display = 'block';
    document.querySelector('button').disabled = true;

    // Simular pago
    setTimeout(() => {
        fetch('/api/payment/pay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                amount: selectedSeats.length * 43, // Calcular monto dinámico
                card_number: "4111111111111111",
                expiry_date: "12/25",
                cvv: "123"
            })
        })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Pago realizado') {
            return reserveSeats(); // Esperar reservas
        }
        throw new Error('Pago Fallido');
    })
    .then(() => {
        alert('Pago y reservas realizadas con éxito');
        resetApp();
    })
        .catch(error => {
            console.error('Error:', error);
            alert('Error en el pago');
        })
		.finally(() => {
        // Ocultar spinner y habilitar botón
			document.getElementById('loading').style.display = 'none';
			document.querySelector('button').disabled = false;
    });
    }, 3000); 
} 

function reserveSeats() {
    const routeId = document.getElementById('route').value;
    const date = document.getElementById('travel-date').value;

    if (!routeId || !date) {
        alert('Missing route or date');
        return;
    }

    // Reservar cada asiento
    const promises = selectedSeats.map(seat => {
        return fetch('/api/reservation/reserve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                bus_id: routeId,        // Asegúrate de que routeId sea un número
                seat_number: seat,      // Asegúrate de que seat sea un número
                date: date              // Formato YYYY-MM-DD (ej: 2023-10-05)
            })
        });
    });

    return Promise.all(promises); // Esperar todas las reservas
}

function resetApp() {
    localStorage.removeItem('token');
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('route-selection').style.display = 'none';
    document.getElementById('seat-selection').style.display = 'none';
    document.getElementById('seat-map').innerHTML = '';
    selectedSeat = null;
}
