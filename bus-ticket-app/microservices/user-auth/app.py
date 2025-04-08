from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime

app = Flask(__name__)
SECRET_KEY = "supersecretkey"

# Simulación de base de datos
users_db = {}

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if username in users_db:
        return jsonify({"message": "User already exists"}), 400

    hashed_password = generate_password_hash(password)
    users_db[username] = {"password": hashed_password, "email": email}
    return jsonify({"message": "User registered successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = users_db.get(username)
    if not user or not check_password_hash(user['password'], password):
        return jsonify({"message": "Invalid credentials"}), 401

    token = jwt.encode({
        'user': username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }, SECRET_KEY)

    return jsonify({"token": token}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
