from flask import Flask, request, jsonify
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram

app = Flask(__name__)

# Inicialización de métricas de Prometheus
payments_total = Counter('payments_total', 'Total number of successful payments')
payment_errors_total = Counter('payment_errors_total', 'Total number of failed payment attempts')
payment_response_latency_seconds = Histogram('payment_response_latency_seconds', 'Response latency for payment requests')

@app.route('/pay', methods=['POST'])
def pay():
    with payment_response_latency_seconds.time():
        data = request.json
        amount = data.get('amount')
        card_number = data.get('card_number')
        expiry_date = data.get('expiry_date')
        cvv = data.get('cvv')

        # Simulación de validación de tarjeta
        if not all([amount, card_number, expiry_date, cvv]):
            payment_errors_total.inc()
            return jsonify({"message": "Missing data"}), 400
        if len(card_number) != 16 or len(cvv) != 3:
            payment_errors_total.inc()
            return jsonify({"message": "Invalid card details"}), 400

        payments_total.inc()
        return jsonify({"message": "Payment successful", "transaction_id": "12345"}), 200

@app.route('/pay_metric')
def pay_metric():
    return generate_latest(), {'Content-Type': CONTENT_TYPE_LATEST}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)
