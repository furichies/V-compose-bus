from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Gauge, Histogram
from flask_sqlalchemy import SQLAlchemy
import os
import random # <-- Importar random para generar datos simulados

app = Flask(__name__)
SECRET_KEY = "CaM1n0K0y0T3"

# --- Configuración de la Base de Datos ---
db_dir = '/app/data'
if not os.path.exists(db_dir):
    os.makedirs(db_dir)

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_dir}/users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Definición del Modelo de Base de Datos (Tabla de Usuarios) ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    # --- Nuevos campos para simular datos de pago ---
    card_number = db.Column(db.String(16), nullable=True) # Número de tarjeta (simulado)
    expiry_date = db.Column(db.String(5), nullable=True) # Fecha de expiración MM/AA (simulado)
    cvv = db.Column(db.String(4), nullable=True) # CVV (simulado)


    def __repr__(self):
        return f'<User {self.username}>'

    # Método para serializar el objeto a diccionario (útil para jsonify)
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            # Incluir datos de pago simulados en la respuesta del perfil
            'card_number': self.card_number,
            'expiry_date': self.expiry_date,
            'cvv': self.cvv # Incluimos CVV para simular validación en frontend
        }


# --- Helper para generar datos de pago simulados ---
def generate_simulated_card_details():
    # Generar un número de tarjeta simulado (ej: empieza con 4 para Visa)
    card_number = '4' + ''.join([str(random.randint(0, 9)) for _ in range(15)])
    # Generar fecha de expiración simulada (mes/año en el futuro cercano)
    now = datetime.datetime.now()
    expiry_month = random.randint(now.month, 12) if now.year == now.year else random.randint(1, 12)
    expiry_year = random.randint(now.year, now.year + 5) # Hasta 5 años en el futuro
    # Asegurarse de que el mes es en el futuro si el año es el actual
    if expiry_year == now.year and expiry_month == now.month:
        if expiry_month == 12:
            expiry_month = 1
            expiry_year += 1
        else:
            expiry_month += 1

    expiry_date = f"{expiry_month:02d}/{str(expiry_year)[-2:]}" # Formato MM/AA

    # Generar CVV simulado (3 o 4 dígitos)
    cvv = ''.join([str(random.randint(0, 9)) for _ in range(3)]) # CVV de 3 dígitos

    return card_number, expiry_date, cvv


# --- Creación de la Base de Datos y Tablas ---
# Usar un contexto de aplicación para crear la DB si no existe
with app.app_context():
    db.create_all() # Crea todas las tablas y las nuevas columnas si no existen

# Inicialización de métricas de Prometheus (existente)
user_registrations_total = Counter('user_registrations_total', 'Total: usuarios registrados')
user_logins_total = Counter('user_logins_total', 'Total de numero de logins')
active_users_count = Gauge('active_users_count', 'Numero de usuarios activos')
login_attempts_histogram = Histogram('login_attempts', 'Histograma de inicios de sesión')

# Función auxiliar para decodificar y validar el token (existente)
def decode_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload.get('user') # Usar .get() para evitar errores si la clave 'user' no existe
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    # Validar datos de entrada básicos
    if not username or not password or not email:
         return jsonify({"message": "Faltan campos obligatorios (username, password, email)"}), 400
    if '@' not in email or '.' not in email:
        return jsonify({"message": "Formato de email inválido"}), 400

    # Buscar si ya existe un usuario con ese username o email
    existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
    if existing_user:
         if existing_user.username == username:
             return jsonify({"message": "El nombre de usuario ya existe"}), 400
         else: # existing_user.email == email
             return jsonify({"message": "El email ya está registrado"}), 400

    # --- Generar datos de pago simulados al registrar ---
    sim_card_number, sim_expiry_date, sim_cvv = generate_simulated_card_details()

    # --- Crear un nuevo usuario en la base de datos con datos de pago simulados ---
    hashed_password = generate_password_hash(password)
    new_user = User(
        username=username,
        password=hashed_password,
        email=email,
        card_number=sim_card_number, # <-- Guardar datos simulados
        expiry_date=sim_expiry_date, # <-- Guardar datos simulados
        cvv=sim_cvv # <-- Guardar datos simulados
    )

    try:
        db.session.add(new_user)
        db.session.commit()
        user_registrations_total.inc()
        print(f"Usuario registrado con éxito (con datos de pago simulados): {username}")
        return jsonify({"message": "Usuario registrado de manera satisfactoria"}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error al registrar usuario {username}: {e}")
        return jsonify({"message": "Error interno al registrar usuario"}), 500


@app.route('/login', methods=['POST'])
def login():
    # ... (código de login existente) ...
    data = request.json
    username = data.get('username')
    password = data.get('password')

    login_attempts_histogram.observe(1)

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password, password):
        print(f"Intento de login fallido para usuario: {username}")
        return jsonify({"message": "Invalid credentials"}), 401

    token = jwt.encode({
        'user': user.username,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }, SECRET_KEY, algorithm="HS256")

    user_logins_total.inc()
    print(f"Login exitoso para usuario: {user.username}")
    return jsonify({"token": token}), 200


@app.route('/user/profile/', methods=['GET'])
def get_user_profile():
    auth_header = request.headers.get('Authorization')
    # --- Usar la función auxiliar para obtener el username del token ---
    username, auth_error = decode_token_with_error(auth_header) # Usaremos una versión mejorada que retorne el error
    if not username:
        print(f"Intento de acceso a perfil con token inválido/expirado: {auth_error}.")
        return jsonify({"message": auth_error or "Authentication failed"}), 401

    # --- Consultar la base de datos para obtener información COMPLETA del usuario ---
    user_info = User.query.filter_by(username=username).first()

    if not user_info:
        print(f"Usuario {username} no encontrado en la DB al solicitar perfil.")
        return jsonify({"message": "User not found"}), 404

    # Devolver el objeto serializado (incluirá datos de pago simulados)
    print(f"Perfil de usuario {username} solicitado con éxito.")
    return jsonify(user_info.to_dict()), 200 # <-- Usar el método to_dict()


@app.route('/user_metric')
def user_metric():
    return generate_latest(), {'Content-Type': CONTENT_TYPE_LATEST}

# Función auxiliar mejorada para decodificar token y retornar mensaje de error
def decode_token_with_error(auth_header):
     if not auth_header:
         return None, "Authorization header missing"

     parts = auth_header.split()
     if parts[0].lower() != 'bearer' or len(parts) != 2:
         return None, "Invalid Authorization header format"

     token = parts[1]

     try:
         payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
         return payload.get('user'), None # Retorna el username y None para error
     except jwt.ExpiredSignatureError:
         return None, "Token expired"
     except jwt.InvalidTokenError:
         return None, "Invalid token"
     except Exception as e:
         return None, f"Token decoding error: {e}"


# Manejo de errores básicos (existente)
@app.errorhandler(400)
def bad_request_error(error):
     # Log el error
     print(f"Bad request: {error}")
     return jsonify({"message": "Bad request"}), 400

@app.errorhandler(401)
def unauthorized_error(error):
    # Log el error
    print(f"Unauthorized: {error}")
    return jsonify({"message": "Unauthorized"}), 401

@app.errorhandler(404)
def not_found_error(error):
    # Log el error
    print(f"Not Found: {error}")
    return jsonify({"message": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback() # Asegurarse de hacer rollback en caso de error 500 no manejado
    print(f"Internal server error: {error}")
    return jsonify({"message": "Internal server error"}), 500


if __name__ == '__main__':
    with app.app_context():
       # Asegurarse de que la base de datos y las nuevas columnas se crean
       db.create_all()

    app.run(host='0.0.0.0', port=5001, debug=True)
