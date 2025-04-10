from flask import Flask, jsonify
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram

app = Flask(__name__)

# Inicialización de métricas de Prometheus
routes_requests_total = Counter('routes_requests_total', 'Total number of requests to /routes')
schedules_requests_total = Counter('schedules_requests_total', 'Total number of requests to /schedules')
schedules_not_found_total = Counter('schedules_not_found_total', 'Total number of times a route was not found in /schedules')
routes_response_latency_seconds = Histogram('routes_response_latency_seconds', 'Response latency for /routes requests')
schedules_response_latency_seconds = Histogram('schedules_response_latency_seconds', 'Response latency for /schedules requests')

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
    routes_requests_total.inc()
    with routes_response_latency_seconds.time():
        return jsonify(ROUTES), 200

@app.route('/schedules/<int:route_id>', methods=['GET'])
def get_schedules(route_id):
    schedules_requests_total.inc()
    with schedules_response_latency_seconds.time():
        if route_id not in SCHEDULES:
            schedules_not_found_total.inc()
            return jsonify({"message": "Route not found"}), 404
        return jsonify({"schedules": SCHEDULES[route_id]}), 200

@app.route('/route_metric')
def route_metric():
    return generate_latest(), {'Content-Type': CONTENT_TYPE_LATEST}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004)
