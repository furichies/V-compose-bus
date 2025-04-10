from flask import Flask, request, jsonify
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram

app = Flask(__name__)

# Simulación de base de datos
bus_seats = {1: {}, 2: {}}  # bus_id: {date: [seats]}

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
        seat_number = data.get('seat_number')
        date = data.get('date')
        if not all([bus_id, seat_number, date]):
            reservation_errors_total.inc()
            return jsonify({"message": "Missing data"}), 400

        if bus_id not in bus_seats:
            reservation_errors_total.inc()
            return jsonify({"message": "Invalid bus ID"}), 400

        if date not in bus_seats[bus_id]:
            bus_seats[bus_id][date] = []

        if seat_number in bus_seats[bus_id][date]:
            reservation_errors_total.inc()
            return jsonify({"message": "Seat already reserved"}), 400

        bus_seats[bus_id][date].append(seat_number)
        reservations_total.inc()
        return jsonify({"message": "Seat reserved successfully"}), 200

@app.route('/availability/<int:bus_id>/<string:date>', methods=['GET'])
def check_availability(bus_id, date):
    availability_requests_total.inc()
    with availability_response_latency_seconds.time():
        if bus_id not in bus_seats or date not in bus_seats[bus_id]:
            return jsonify({"available_seats": list(range(1, 41))}), 200

        reserved_seats = bus_seats[bus_id][date]
        available_seats = [seat for seat in range(1, 41) if seat not in reserved_seats]
        return jsonify({"available_seats": available_seats}), 200

@app.route('/reserv_metric')
def reserv_metric():
    return generate_latest(), {'Content-Type': CONTENT_TYPE_LATEST}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
