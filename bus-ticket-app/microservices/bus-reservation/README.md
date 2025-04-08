2.2 Microservicio: Reserva de Plazas (bus-reservation)
Este microservicio manejará la reserva de plazas en los autobuses.

Rutas API:

POST /reserve : Reservar una plaza.
Body: { "bus_id": "int", "seat_number": "int", "date": "string" }
GET /availability/<bus_id>/<date> : Consultar disponibilidad de plazas.
