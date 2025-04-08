# Bus Ticket App

## Estructura de Ficheros
bus-ticket-app/
├── proxy/
│ ├── nginx.conf # Configuración de rutas y servidor
│ └── Dockerfile # Imagen de Nginx
├── microservices/
│ ├── user-auth/ # Autenticación (puerto 5001)
│ ├── bus-reservation/ # Reservas (puerto 5002)
│ ├── payment-gateway/ # Pagos (puerto 5003)
│ └── route-scheduler/ # Rutas/horarios (puerto 5004)
├── frontend/
│ ├── index.html # Estructura principal
│ ├── styles.css # Estilos responsive
│ ├── script.js # Lógica interactiva
│ └── assets/
│ └── bus-banner.png # Banner (4MB PNG)
├── docker-compose.yml # Configuración Docker
└── Jenkinsfile # Pipeline CI/CD

## Funcionalidad del Proxy (Nginx)
- **Enrutamiento de APIs**:
  - `/api/auth/*` → user-auth:5001
  - `/api/reservation/*` → bus-reservation:5002
  - `/api/payment/*` → payment-gateway:5003
  - `/api/routes/*` → route-scheduler:5004
- **Servidor estático**: Sirve contenido desde `/frontend`
- **MIME Types**: Configuración correcta para CSS/JS

## Microservicios y APIs

### user-auth (5001)
- **Registro**:  
  `POST /api/auth/register`  
  Parámetros: username, password, email  
  Respuesta: `{"message": "User registered successfully"}`
  
- **Login**:  
  `POST /api/auth/login`  
  Respuesta: `{"token": "JWT"}`

### bus-reservation (5002)
- **Disponibilidad**:  
  `GET /api/reservation/availability/{bus_id}/{date}`  
  Respuesta: `{"available_seats": [1,2,...40]}`
  
- **Reserva**:  
  `POST /api/reservation/reserve`  
  Parámetros: bus_id, seat_number, date

### payment-gateway (5003)
- **Pago**:  
  `POST /api/payment/pay`  
  Parámetros: amount, card_number, expiry_date, cvv  
  Respuesta: `{"transaction_id": "12345"}`

### route-scheduler (5004)
- **Listar rutas**:  
  `GET /api/routes/routes`  
  Respuesta: `[{"id":1, "origin":"...", "destination":"..."}]`
  
- **Horarios**:  
  `GET /api/routes/schedules/{route_id}`

## Comandos de Prueba (curl)

# Registro
curl -X POST http://localhost:8080/api/auth/register \
-H "Content-Type: application/json" \
-d '{"username":"user1","password":"pass123","email":"user1@example.com"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
-H "Content-Type: application/json" \
-d '{"username":"user1","password":"pass123"}'

# Listar rutas (requiere token)
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/routes/routes

# Ver disponibilidad (bus_id=1, fecha=2023-10-05)
curl -H "Authorization: Bearer <token>" \
http://localhost:8080/api/reservation/availability/1/2023-10-05

# Reservar asiento
curl -X POST http://localhost:8080/api/reservation/reserve \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"bus_id": 1, "seat_number": 5, "date": "2023-10-05"}'

# Procesar pago
curl -X POST http://localhost:8080/api/payment/pay \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <token>" \
-d '{"amount": 43, "card_number": "4111111111111111", "expiry_date": "12/25", "cvv": "123"}'


==========================================================================================
## Ejecución y Despliegue

### Docker Compose

# Construir imágenes
docker compose build

# Levantar servicios
docker compose up -d

# Verificar contenedores
docker ps

# Acceder a la app
http://localhost:8080

# Detener servicios
docker compose down

## Jenkinsfile --- pipeline para CI/CD
### Pipeline de Integración Continua (Jenkinsfile)

pipeline {
    agent any
    stages {
        stage('Build') {
            steps { sh 'docker compose build' }
        }
        stage('Test') {
            steps {
                sh 'docker compose run --rm user-auth pytest'
                sh 'docker compose run --rm bus-reservation pytest'
                sh 'docker compose run --rm payment-gateway pytest'
                sh 'docker compose run --rm route-scheduler pytest'
            }
        }
        stage('Deploy') {
            steps { sh 'docker compose up -d' }
        }
        stage('Cleanup') {
            steps { sh 'docker system prune -f' }
        }
    }
}
