from flask import Flask, jsonify

app = Flask(__name__)

ROUTES = [
    {"id": 1, "origin": "Madrid", "destination": "Ponferrada"},
    {"id": 2, "origin": "Ponferrada", "destination": "Madrid"}
]

SCHEDULES = {
    1: ["08:00", "22:00"],
    2: ["08:00", "22:00"]
}

@app.route('/routes', methods=['GET'])
def get_routes():
    return jsonify(ROUTES), 200

@app.route('/schedules/<int:route_id>', methods=['GET'])
def get_schedules(route_id):
    if route_id not in SCHEDULES:
        return jsonify({"message": "Route not found"}), 404
    return jsonify({"schedules": SCHEDULES[route_id]}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004)
