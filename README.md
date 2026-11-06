# Climate Community

Aplicación web full-stack con **Node.js, Express y SQLite** para gestionar acciones comunitarias: registro e inicio de sesión de usuarios, publicación y búsqueda de acciones, y subida de fotos.

## Funcionalidades
- Registro e inicio de sesión (contraseñas cifradas con `bcrypt`)
- CRUD de acciones (`/api/acciones`) y búsqueda (`/api/acciones/buscar`)
- Fotos asociadas a cada acción, guardadas en `/uploads`
- Páginas de login, administración y detalle de acción (carpeta `public/`)

## Tecnologías
- Node.js, Express, `sqlite3`, `bcrypt`
- JavaScript vanilla en el front-end

## Cómo ejecutar
```bash
npm install
node server.js
```
La base de datos SQLite se crea automáticamente al iniciar (`db.js`).

## Estructura
```
server.js        # rutas y arranque del servidor
auth.js          # lógica de autenticación
middleware.js    # middlewares (autorización)
db.js            # conexión y creación de tablas SQLite
public/          # front-end estático
```
