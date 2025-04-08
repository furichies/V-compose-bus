from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/pay', methods=['POST'])
def pay():
    data = request.json
    amount = data.get('amount')
    card_number = data.get('card_number')
    expiry_date = data.get('expiry_date')
    cvv = data.get('cvv')

    # Simulación de validación de tarjeta
    if len(card_number) != 16 or len(cvv) != 3:
        return jsonify({"message": "Invalid card details"}), 400

    return jsonify({"message": "Payment successful", "transaction_id": "12345"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003)
