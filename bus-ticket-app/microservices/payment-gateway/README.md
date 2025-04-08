2.3 Microservicio: Pasarela de Pago (payment-gateway)
Este microservicio simulará una pasarela de pago.

Rutas API:

POST /pay : Procesar un pago.
Body: { "amount": "float", "card_number": "string", "expiry_date": "string", "cvv": "string" }
