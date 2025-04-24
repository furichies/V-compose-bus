from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Gauge, Histogram

app = Flask(__name__)
SECRET_KEY = "CaM1n0K0y0T3"

# Simulación de base de datos
users_db = {}

# Inicialización de métricas de Prometheus
user_registrations_total = Counter('user_registrations_total', 'Total: usuarios registrados')
user_logins_total = Counter('user_logins_total', 'Total de numero de logins')
active_users_count = Gauge('active_users_count', 'Numero de usuarios activos')
login_attempts_histogram = Histogram('login_attempts', 'Histograma de inicios de sesión')
# Simulación de base de datos
users_db = {}
# Asegúrate de que users_db está poblado con datos de prueba si no tienes registro previo
# users_db = {
#     "testuser": {"password": generate_password_hash("password123"), "email": "test@example.com"}
# }

# Función auxiliar para decodificar y validar el token
def decode_token(token):
    try:
        # Decodificar el token, verificar la firma y la expiración
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        # Puedes añadir más validaciones aquí si es necesario (ej: si el usuario existe en la DB)
        return payload['user'] # Retorna el nombre de usuario
    except jwt.ExpiredSignatureError:
        # Token ha expirado
        return None
    except jwt.InvalidTokenError:
        # Token inválido
        return None
        
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if username in users_db:
        return jsonify({"message": "El usuario ya existe"}), 400

    hashed_password = generate_password_hash(password)
    users_db[username] = {"password": hashed_password, "email": email}
    user_registrations_total.inc()  # Incrementar el contador de registros
    return jsonify({"message": "Usuario registrado de manera satisfactoria"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    login_attempts_histogram.observe(1) # Registrar un intento de inicio de sesión

    user = users_db.get(username)
    if not user or not check_password_hash(user['password'], password):
        return jsonify({"message": "Invalid credentials"}), 401

    token = jwt.encode({
        'user': username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }, SECRET_KEY)

    user_logins_total.inc()  # Incrementar el contador de inicios de sesión
    return jsonify({"token": token}), 200

@app.route('/user/profile/', methods=['GET']) # Nuevo endpoint para obtener perfil de usuario
def get_user_profile():
    # Obtener el token de los encabezados de autorización
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"message": "Authorization header missing"}), 401

    # El encabezado es típicamente "Bearer <token>"
    parts = auth_header.split()
    if parts[0].lower() != 'bearer' or len(parts) != 2:
        return jsonify({"message": "Invalid Authorization header format"}), 401

    token = parts[1]

    # Decodificar y validar el token
    username = decode_token(token)

    if not username:
        # Token inválido o expirado (decode_token ya maneja esto)
        return jsonify({"message": "Invalid or expired token"}), 401

    # Buscar la información del usuario en la "base de datos"
    user_info = users_db.get(username)

    if not user_info:
        # Usuario no encontrado en la base de datos (esto no debería pasar si el token es válido, pero es buena práctica verificar)
        return jsonify({"message": "User not found"}), 404

    # Devolver el nombre de usuario y el email
    return jsonify({
        "username": username,
        "email": user_info.get("email") # Usar .get() para evitar errores si el email no existe (aunque debería existir)
    }), 200

@app.route('/user_metric')
def user_metric():
    return generate_latest(), {'Content-Type': CONTENT_TYPE_LATEST}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
