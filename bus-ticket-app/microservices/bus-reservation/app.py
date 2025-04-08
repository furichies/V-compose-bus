from flask import Flask, request, jsonify

app = Flask(__name__)

# Simulación de base de datos
bus_seats = {1: {}, 2: {}}  # bus_id: {date: [seats]}

@app.route('/reserve', methods=['POST'])
def reserve_seat():
    data = request.json
    bus_id = data.get('bus_id')
    seat_number = data.get('seat_number')
    date = data.get('date')
    if not all([bus_id, seat_number, date]):
        return jsonify({"message": "Missing data"}), 400
        
    if bus_id not in bus_seats:
        return jsonify({"message": "Invalid bus ID"}), 400

    if date not in bus_seats[bus_id]:
        bus_seats[bus_id][date] = []

    if seat_number in bus_seats[bus_id][date]:
        return jsonify({"message": "Seat already reserved"}), 400

    bus_seats[bus_id][date].append(seat_number)
    return jsonify({"message": "Seat reserved successfully"}), 200

@app.route('/availability/<int:bus_id>/<string:date>', methods=['GET'])
def check_availability(bus_id, date):
    if bus_id not in bus_seats or date not in bus_seats[bus_id]:
        return jsonify({"available_seats": list(range(1, 41))}), 200

    reserved_seats = bus_seats[bus_id][date]
    available_seats = [seat for seat in range(1, 41) if seat not in reserved_seats]
    return jsonify({"available_seats": available_seats}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
