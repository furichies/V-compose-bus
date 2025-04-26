from flask import Flask, request, jsonify
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram
from flask_sqlalchemy import SQLAlchemy
import os
import jwt # Para decodificar token
import datetime # Para manejar expiración de token (aunque solo decodificamos)

app = Flask(__name__)

# --- Configuración de la Base de Datos ---
# Asegúrate de que el directorio 'data' existe dentro del contenedor
db_dir = '/app/data'
if not os.path.exists(db_dir):
    os.makedirs(db_dir) # Crea el directorio si no existe al iniciar la app

# Configurar la URI de la base de datos SQLite
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_dir}/reservations.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Definición del Modelo de Base de Datos (Tabla de Reservas) ---
class Reservation(db.Model):
    id = db.Column(db.Integer, primary_key=True) # ID de la reserva
    username = db.Column(db.String(80), nullable=False) # Nombre de usuario que hizo la reserva
    bus_id = db.Column(db.Integer, nullable=False)
    date = db.Column(db.String(10), nullable=False) # Formato YYYY-MM-DD
    schedule = db.Column(db.String(5), nullable=False) # Formato HH:MM
    seat_number = db.Column(db.Integer, nullable=False)

    # Añadir una restricción única para evitar doble reserva del mismo asiento en el mismo bus, fecha y horario
    __table_args__ = (db.UniqueConstraint('bus_id', 'date', 'schedule', 'seat_number', name='_bus_date_schedule_seat_uc'),)

    def __repr__(self):
        return f'<Reservation user={self.username} bus={self.bus_id} date={self.date} schedule={self.schedule} seat={self.seat_number}>'

    # Método para serializar el objeto a diccionario (útil para jsonify)
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'bus_id': self.bus_id,
            'date': self.date,
            'schedule': self.schedule,
            'seat_number': self.seat_number
        }


# --- Creación de la Base de Datos y Tablas ---
with app.app_context():
    db.create_all() # Crea la tabla Reservation si no existe


# Inicialización de métricas de Prometheus (existente)
reservations_total = Counter('reservations_total', 'Total number of seat reservations')
reservation_errors_total = Counter('reservation_errors_total', 'Total number of failed seat reservations')
availability_requests_total = Counter('availability_requests_total', 'Total number of availability checks')
availability_response_latency_seconds = Histogram('availability_response_latency_seconds', 'Response latency for availability checks')
reservation_response_latency_seconds = Histogram('reservation_response_latency_seconds', 'Response latency for reservations')

# Secreto para decodificar el token (debe ser el MISMO que en user-auth)
# En un entorno real, se compartiría de forma segura o se usaría un servicio de validación
SECRET_KEY = "CaM1n0K0y0T3" # <-- Usar el mismo SECRET_KEY que en user-auth

# Función auxiliar para obtener el username del token (copiada de user-auth)
def get_username_from_token(auth_header):
     if not auth_header:
         return None, "Authorization header missing"

     parts = auth_header.split()
     if parts[0].lower() != 'bearer' or len(parts) != 2:
         return None, "Invalid Authorization header format"

     token = parts[1]

     try:
         payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
         # Puedes añadir validación adicional, como si el usuario realmente existe (opcional)
         return payload.get('user'), None # Retorna el username si existe en el payload
     except jwt.ExpiredSignatureError:
         return None, "Token expired"
     except jwt.InvalidTokenError:
         return None, "Invalid token"
     except Exception as e:
         return None, f"Token decoding error: {e}"


@app.route('/reserve', methods=['POST'])
def reserve_seat():
    with reservation_response_latency_seconds.time():
        auth_header = request.headers.get('Authorization')
        username, auth_error = get_username_from_token(auth_header)
        if not username:
             reservation_errors_total.inc()
             return jsonify({"message": auth_error or "Authentication failed"}), 401 # Devuelve 401 si falla auth

        data = request.json
        bus_id = data.get('bus_id')
        seat_numbers = data.get('seat_numbers') # Esperamos un array de números de asiento
        date = data.get('date')
        schedule = data.get('schedule')

        # Validar que todos los datos necesarios estén presentes
        if not all([bus_id is not None, seat_numbers is not None, date, schedule]):
             reservation_errors_total.inc()
             print(f"Reserva fallida para usuario {username}: Datos faltantes.") # Log
             return jsonify({"message": "Missing data (bus_id, seat_numbers, date, schedule)"}), 400

        if not isinstance(seat_numbers, list) or not seat_numbers:
            reservation_errors_total.inc()
            print(f"Reserva fallida para usuario {username}: seat_numbers no es una lista o está vacía.") # Log
            return jsonify({"message": "seat_numbers must be a non-empty list"}), 400

        successful_reservations = []
        failed_reservations = []

        # --- Iterar sobre los asientos y intentar reservarlos en la base de datos ---
        for seat_number in seat_numbers:
            if not isinstance(seat_number, int) or not (1 <= seat_number <= 40):
                 failed_reservations.append({"seat": seat_number, "message": "Invalid seat number format or value"})
                 continue # Saltar a la siguiente iteración del bucle

            try:
                # Verificar si el asiento ya está reservado para este bus, fecha y horario en la DB
                existing_reservation = Reservation.query.filter_by(
                    bus_id=bus_id,
                    date=date,
                    schedule=schedule,
                    seat_number=seat_number
                ).first() # <-- Consulta a la DB

                if existing_reservation:
                    failed_reservations.append({"seat": seat_number, "message": "Seat already reserved"})
                    print(f"Asiento {seat_number} ya reservado para bus {bus_id}, {date}, {schedule}.") # Log
                else:
                    # Crear una nueva entrada de reserva en la base de datos
                    new_reservation = Reservation(
                        username=username, # <-- Asociar la reserva al usuario
                        bus_id=bus_id,
                        date=date,
                        schedule=schedule,
                        seat_number=seat_number
                    )
                    db.session.add(new_reservation) # Añadir a la sesión
                    successful_reservations.append(seat_number)
                    print(f"Asiento {seat_number} marcado para reserva por {username}.") # Log

            except Exception as e: # Capturar cualquier error de DB (ej: UniqueConstraint Violation si no se manejó antes)
                db.session.rollback() # Deshacer la transacción si falla un asiento
                failed_reservations.append({"seat": seat_number, "message": f"Database error: {e}"})
                print(f"Error DB al reservar asiento {seat_number} para bus {bus_id}, {date}, {schedule}: {e}") # Log

        # --- Confirmar todas las reservas exitosas en una sola transacción ---
        if successful_reservations:
            try:
                db.session.commit() # <-- Confirmar la transacción para todos los asientos añadidos exitosamente
                reservations_total.inc(len(successful_reservations)) # Incrementar métrica por número de asientos
                print(f"Reservas exitosas para {username} en bus {bus_id}, {date}, {schedule}: {successful_reservations}") # Log final
                return jsonify({
                    "message": "Reservas procesadas",
                    "successful": successful_reservations,
                    "failed": failed_reservations
                }), 201 # O 200, dependiendo si consideras el éxito parcial un 200 o 201

            except Exception as e: # Capturar errores durante el commit final
                db.session.rollback() # Deshacer TODO si el commit falla
                reservation_errors_total.inc(len(successful_reservations)) # Contar como errores si fallan al commit
                print(f"Error durante el commit de reservas para {username}: {e}") # Log
                # Mover todas las reservas que intentaron ser exitosas a la lista de fallidas si el commit falla
                failed_reservations.extend([{"seat": s, "message": "Commit failed"} for s in successful_reservations])
                return jsonify({
                    "message": "Error al confirmar reservas",
                    "successful": [], # Ninguna se confirmó
                    "failed": failed_reservations # Todas fallaron al final o parcialmente
                }), 500 # Error interno si el commit falla

        else: # Si no hay asientos exitosos
            reservation_errors_total.inc(len(seat_numbers)) # Todos fallaron
            print(f"Todas las reservas fallaron para {username} en bus {bus_id}, {date}, {schedule}.") # Log
            return jsonify({
                "message": "Ninguna reserva procesada",
                "successful": [],
                "failed": failed_reservations # Lista de fallos específicos
            }), 409 # Conflict si la razón es que ya estaban reservados, o 400/500 dependiendo del tipo de fallo


@app.route('/availability/<int:bus_id>/<string:date>', methods=['GET'])
def check_availability(bus_id, date):
    availability_requests_total.inc()
    with availability_response_latency_seconds.time():
        # Authentication is optional for availability check, but good practice if schedule depends on user
        # auth_header = request.headers.get('Authorization')
        # username, auth_error = get_username_from_token(auth_header)
        # # Handle auth error if needed

        schedule = request.args.get('schedule') # Recuperar el horario de los query parameters

        if not schedule:
            print(f"Disponibilidad fallida para bus {bus_id}, {date}: Horario faltante.") # Log
            return jsonify({"message": "Missing schedule parameter"}), 400

        # --- Consultar la base de datos para obtener los asientos reservados ---
        # Buscar todas las reservas para el bus, fecha y horario específicos
        reserved_reservations = Reservation.query.filter_by(
            bus_id=bus_id,
            date=date,
            schedule=schedule
        ).all() # <-- Consulta a la DB

        reserved_seats = [res.seat_number for res in reserved_reservations] # Extraer solo los números de asiento
        print(f"Disponibilidad para bus {bus_id}, {date}, {schedule}: {len(reserved_seats)} asientos reservados.") # Log


        all_seats = set(range(1, 41)) # Asumimos 40 asientos totales
        available_seats = sorted(list(all_seats - set(reserved_seats))) # Asientos totales - asientos reservados

        # La respuesta JSON {"available_seats": [...]} coincide con lo que espera el frontend
        return jsonify({"available_seats": available_seats}), 200

# --- Nuevo endpoint para listar reservas de un usuario ---
@app.route('/reservations/user/', methods=['GET']) # Usamos GET en el body para enviar username (menos común, query param más típico)
# Alternativa (más típica): @app.route('/reservations/user/<string:username>', methods=['GET']) - Requiere username en URL
# O enviar el token y obtener el usuario en el backend (más seguro)
def list_user_reservations():
     # Opción más segura: Obtener el username del token de autenticación
     auth_header = request.headers.get('Authorization')
     username, auth_error = get_username_from_token(auth_header)
     if not username:
          print(f"Intento de listar reservas con token inválido/expirado: {auth_error}.") # Log
          return jsonify({"message": auth_error or "Authentication failed"}), 401

     print(f"Listando reservas para usuario: {username}") # Log


     # --- Consultar la base de datos para obtener las reservas del usuario ---
     user_reservations = Reservation.query.filter_by(username=username).all() # <-- Consulta a la DB


     # Serializar los objetos de reserva a diccionarios
     reservations_list = [res.to_dict() for res in user_reservations]
     print(f"Encontradas {len(reservations_list)} reservas para {username}.") # Log


     return jsonify({"reservations": reservations_list}), 200


@app.route('/reserv_metric')
def reserv_metric():
    return generate_latest(), {'Content-Type': CONTENT_TYPE_LATEST}

# Manejo de errores básicos
@app.errorhandler(400)
def bad_request_error(error):
    return jsonify({"message": "Bad request"}), 400

@app.errorhandler(401)
def unauthorized_error(error):
    return jsonify({"message": "Unauthorized"}), 401

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"message": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback() # Asegurarse de hacer rollback en caso de error 500 no manejado
    print(f"Internal server error: {error}") # Log el error
    return jsonify({"message": "Internal server error"}), 500


if __name__ == '__main__':
    # Asegurarse de que la base de datos se crea al iniciar si no existe
    with app.app_context():
       db.create_all()

    # Ejecutar la aplicación Flask
    app.run(host='0.0.0.0', port=5002, debug=True) # debug=True es útil para desarrollo
