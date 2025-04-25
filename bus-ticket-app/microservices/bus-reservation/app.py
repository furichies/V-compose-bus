from flask import Flask, request, jsonify
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram

app = Flask(__name__)

# Simulación de base de datos
# Estructura actualizada: bus_id: {date: {schedule: [seats]}}
bus_seats = {1: {}, 2: {}}  # bus_id: {date: {schedule: [seats]}}

# Inicialización de métricas de Prometheus
reservations_total = Counter('reservations_total', 'Total number of seat reservations')
reservation_errors_total = Counter('reservation_errors_total', 'Total number of failed seat reservations')
availability_requests_total = Counter('availability_requests_total', 'Total number of availability checks')
availability_response_latency_seconds = Histogram('availability_response_latency_seconds', 'Response latency for availability checks')
reservation_response_latency_seconds = Histogram('reservation_response_latency_seconds', 'Response latency for reservations')

@app.route('/reserve', methods=['POST'])
def reserve_seat():
    with reservation_response_latency_seconds.time():
        data = request.json
        bus_id = data.get('bus_id')
        seat_numbers = data.get('seat_numbers')
        date = data.get('date')
        schedule = data.get('schedule') # <--- ¡Recuperar el horario del body!

        # Validar que todos los datos necesarios estén presentes
        if not all([bus_id, seat_numbers, date, schedule]): # <--- Añadir schedule a la validación
            reservation_errors_total.inc()
            return jsonify({"message": "Missing data"}), 400

        if bus_id not in bus_seats:
            reservation_errors_total.inc()
            return jsonify({"message": "Invalid bus ID"}), 400

        # Asegurarse de que la estructura anidada para la fecha y el horario existe
        if date not in bus_seats[bus_id]:
            bus_seats[bus_id][date] = {} # <--- Inicializar como diccionario para horarios

        if schedule not in bus_seats[bus_id][date]:
            bus_seats[bus_id][date][schedule] = [] # <--- Inicializar como lista para asientos por horario


        # Verificar si el asiento ya está reservado para esta fecha Y horario
        if seat_numbers in bus_seats[bus_id][date][schedule]: # <--- Verificar dentro del horario
            reservation_errors_total.inc()
            return jsonify({"message": "Seat already reserved"}), 400

        # Reservar el asiento para esta fecha Y horario
        bus_seats[bus_id][date][schedule].append(seat_numbers) # <--- Añadir la reserva dentro del horario
        reservations_total.inc()
        return jsonify({"message": "Seat reserved successfully"}), 200

# La ruta /availability/<int:bus_id>/<string:date> ya recibe bus_id y date como parámetros de ruta
# Ahora, también recuperaremos el horario de los query parameters
@app.route('/availability/<int:bus_id>/<string:date>', methods=['GET'])
def check_availability(bus_id, date):
    availability_requests_total.inc()
    with availability_response_latency_seconds.time():
        schedule = request.args.get('schedule') # <--- ¡Recuperar el horario de los query parameters!

        if not schedule: # <--- Validar que el horario también se envió
             return jsonify({"message": "Missing schedule parameter"}), 400


        # Navegar en la estructura anidada para encontrar las reservas para este bus, fecha Y horario
        if bus_id not in bus_seats or date not in bus_seats[bus_id] or schedule not in bus_seats[bus_id][date]:
             # Si no existe la entrada para este bus, fecha o horario, todos los asientos están disponibles
            return jsonify({"available_seats": list(range(1, 41))}), 200

        # Obtener los asientos reservados para este bus, fecha Y horario
        reserved_seats = bus_seats[bus_id][date][schedule] # <--- Acceder a las reservas por horario
        available_seats = [seat for seat in range(1, 41) if seat not in reserved_seats]

        # La respuesta JSON del backend ({"available_seats": [...]}) ya coincide con lo que espera el frontend
        return jsonify({"available_seats": available_seats}), 200

@app.route('/reserv_metric')
def reserv_metric():
    return generate_latest(), {'Content-Type': CONTENT_TYPE_LATEST}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
