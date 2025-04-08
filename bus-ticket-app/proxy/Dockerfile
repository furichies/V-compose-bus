# Usar Nginx Alpine como base
FROM nginx:alpine

# Copiar la configuración de Nginx
COPY ./proxy/nginx.conf /etc/nginx/nginx.conf

# Copiar los archivos del frontend al directorio de Nginx
COPY ./frontend /usr/share/nginx/html
