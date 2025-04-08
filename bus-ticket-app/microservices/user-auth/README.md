2.1 Microservicio: Registro/Validación de Usuarios (user-auth)
Este microservicio manejará el registro y validación de usuarios.

Rutas API:

POST /register : Registrar un nuevo usuario.
Body: { "username": "string", "password": "string", "email": "string" }
POST /login : Iniciar sesión.
Body: { "username": "string", "password": "string" }
Respuesta: Token JWT para autenticación.
