// === SERVER.JS - ADAPTADO A TU ESTRUCTURA DB ===
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./db"); // Importar tu db.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Crear carpeta de uploads si no existe
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// JWT Secret
const SECRET = process.env.JWT_SECRET || "Booof";

// Configurar multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({
    storage,
    limits: {fileSize: 5 * 1024 * 1024},
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten imágenes"));
        }
    }
});

// ===== AGREGAR COLUMNA FOTO A acciones_ambientales SI NO EXISTE =====
db.run(`ALTER TABLE acciones_ambientales
    ADD COLUMN foto TEXT DEFAULT NULL`, (err) => {
    // No mostrar error si la columna ya existe
});

// ===== AGREGAR COLUMNA imagen_url A reseñas SI NO EXISTE =====
db.run(`ALTER TABLE reseñas
    ADD COLUMN imagen_url TEXT DEFAULT NULL`, (err) => {
    // No mostrar error si la columna ya existe
});

// ===== AGREGAR COLUMNA usuario_nombre A reseñas SI NO EXISTE =====
db.run(`ALTER TABLE reseñas
    ADD COLUMN usuario_nombre TEXT DEFAULT NULL`, (err) => {
    // No mostrar error si la columna ya existe
});

// ===== MIDDLEWARE =====
const auth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({error: "Token requerido"});

    try {
        const token = header.split(" ")[1];
        req.user = jwt.verify(token, SECRET);
        next();
    } catch (err) {
        return res.status(403).json({error: "Token inválido"});
    }
};

const adminOnly = (req, res, next) => {
    if (req.user.rol !== "admin" && req.user.rol !== "usuario") {
        return res.status(403).json({error: "Solo admins pueden hacer esto"});
    }
    // Verificar en DB si es admin
    db.get("SELECT rol FROM usuarios WHERE id = ?", [req.user.id], (err, user) => {
        if (err || !user || user.rol !== "admin") {
            return res.status(403).json({error: "Solo admins pueden hacer esto"});
        }
        next();
    });
};

// ===== AUTENTICACIÓN =====
app.post("/api/auth/register", async (req, res) => {
    const {nombre, email, password, rol} = req.body;

    console.log(`📝 Registro: ${email}, rol=${rol}`);

    if (!nombre || !email || !password) {
        return res.status(400).json({error: "Datos incompletos"});
    }

    try {
        db.get("SELECT * FROM usuarios WHERE email = ?", [email], async (err, user) => {
            if (err) return res.status(500).json({error: "Error interno"});
            if (user) return res.status(400).json({error: "Email ya existe"});

            const hashedPassword = await bcrypt.hash(password, 10);

            let nuevoRol = "usuario";
            if (rol === "admin") {
                nuevoRol = "admin";
                console.log(`🛠️  ADMIN creado: ${email}`);
            } else {
                console.log(`👤 Usuario normal: ${email}`);
            }

            db.run(
                `INSERT INTO usuarios (nombre, email, password, rol)
                 VALUES (?, ?, ?, ?)`,
                [nombre, email, hashedPassword, nuevoRol],
                function (err) {
                    if (err) return res.status(500).json({error: "Error al crear usuario"});
                    res.json({id: this.lastID, rol: nuevoRol, mensaje: "Usuario creado"});
                }
            );
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({error: "Error interno"});
    }
});

app.post("/api/auth/login", async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({error: "Credenciales incompletas"});
    }

    db.get("SELECT * FROM usuarios WHERE email = ?", [email], async (err, user) => {
        if (err) return res.status(500).json({error: "Error interno"});
        if (!user) return res.status(401).json({error: "Credenciales inválidas"});

        try {
            const ok = await bcrypt.compare(password, user.password);
            if (!ok) return res.status(401).json({error: "Credenciales inválidas"});

            const token = jwt.sign(
                {id: user.id, rol: user.rol, nombre: user.nombre},
                SECRET,
                {expiresIn: "7d"}
            );

            console.log(`🔓 Login: ${user.nombre} (${user.rol})`);
            res.json({token, nombre: user.nombre, rol: user.rol});
        } catch (err) {
            res.status(500).json({error: "Error al comparar contraseña"});
        }
    });
});

// ===== ACCIONES =====
app.get("/api/acciones", (req, res) => {
    db.all("SELECT * FROM acciones_ambientales", (err, acciones) => {
        if (err) return res.status(500).json({error: "Error al obtener acciones"});
        res.json(acciones || []);
    });
});

app.get("/api/acciones/buscar", (req, res) => {
    const q = req.query.q?.toLowerCase() || "";
    const query = `SELECT *
                   FROM acciones_ambientales
                   WHERE LOWER(nombre) LIKE ?
                      OR LOWER(tipo) LIKE ?
                      OR LOWER(ubicacion) LIKE ?`;
    const param = `%${q}%`;

    db.all(query, [param, param, param], (err, acciones) => {
        if (err) return res.status(500).json({error: "Error al buscar"});
        res.json(acciones || []);
    });
});

app.get("/api/acciones/:id", (req, res) => {
    db.get("SELECT * FROM acciones_ambientales WHERE id = ?", [req.params.id], (err, accion) => {
        if (err) return res.status(500).json({error: "Error interno"});
        if (!accion) return res.status(404).json({error: "Acción no encontrada"});
        res.json(accion);
    });
});

app.post("/api/acciones", auth, upload.single("foto"), (req, res) => {
    const {nombre, tipo, ubicacion, responsable, resultados, fecha_inicio, fecha_fin, latitud, longitud} = req.body;

    if (!nombre || !tipo || !ubicacion) {
        return res.status(400).json({error: "Faltan campos requeridos"});
    }

    const foto = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
        `INSERT INTO acciones_ambientales (nombre, tipo, ubicacion, responsable, resultados, fecha_inicio, fecha_fin,
                                           latitud, longitud, foto, creador_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, tipo, ubicacion, responsable || "", resultados || "", fecha_inicio, fecha_fin, latitud, longitud, foto, req.user.id],
        function (err) {
            if (err) return res.status(500).json({error: "Error al crear acción"});
            console.log(`📍 Nueva acción: ${nombre}`);
            res.json({
                id: this.lastID,
                nombre,
                tipo,
                ubicacion,
                responsable,
                resultados,
                fecha_inicio,
                fecha_fin,
                latitud,
                longitud,
                foto
            });
        }
    );
});

app.delete("/api/acciones/:id", auth, adminOnly, (req, res) => {
    db.get("SELECT * FROM acciones_ambientales WHERE id = ?", [req.params.id], (err, accion) => {
        if (err) return res.status(500).json({error: "Error interno"});
        if (!accion) return res.status(404).json({error: "Acción no encontrada"});

        // Eliminar foto
        if (accion.foto) {
            const filepath = path.join(__dirname, "public", accion.foto);
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        }

        // Eliminar reseñas asociadas
        db.run("DELETE FROM reseñas WHERE accion_id = ?", [req.params.id], (err) => {
            if (err) console.error("Error eliminando reseñas");
        });

        // Eliminar fotos asociadas
        db.run("DELETE FROM fotos WHERE accion_id = ?", [req.params.id], (err) => {
            if (err) console.error("Error eliminando fotos");
        });

        // Eliminar acción
        db.run("DELETE FROM acciones_ambientales WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({error: "Error al eliminar"});
            console.log(`🗑️  Acción eliminada: ${accion.nombre}`);
            res.json({mensaje: "Acción eliminada"});
        });
    });
});

app.put("/api/acciones/:id", auth, adminOnly, upload.single("foto"), (req, res) => {
    const {nombre, tipo, ubicacion, responsable, resultados, fecha_inicio, fecha_fin} = req.body;

    if (!nombre || !tipo || !ubicacion) {
        return res.status(400).json({error: "Faltan campos requeridos"});
    }

    db.get("SELECT * FROM acciones_ambientales WHERE id = ?", [req.params.id], (err, accion) => {
        if (err) return res.status(500).json({error: "Error interno"});
        if (!accion) return res.status(404).json({error: "Acción no encontrada"});

        let foto = accion.foto;

        if (req.file) {
            if (accion.foto) {
                const filepath = path.join(__dirname, "public", accion.foto);
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            }
            foto = `/uploads/${req.file.filename}`;
        }

        db.run(
            `UPDATE acciones_ambientales
             SET nombre = ?,
                 tipo = ?,
                 ubicacion = ?,
                 responsable = ?,
                 resultados = ?,
                 fecha_inicio = ?,
                 fecha_fin = ?,
                 foto = ?
             WHERE id = ?`,
            [nombre, tipo, ubicacion, responsable, resultados, fecha_inicio, fecha_fin, foto, req.params.id],
            (err) => {
                if (err) return res.status(500).json({error: "Error al actualizar"});
                console.log(`✏️  Acción editada: ${nombre}`);
                res.json({
                    id: req.params.id,
                    nombre,
                    tipo,
                    ubicacion,
                    responsable,
                    resultados,
                    fecha_inicio,
                    fecha_fin,
                    foto
                });
            }
        );
    });
});

// ===== FOTOS =====
app.get("/api/acciones/:id/fotos", (req, res) => {
    db.get("SELECT foto FROM acciones_ambientales WHERE id = ?", [req.params.id], (err, accion) => {
        if (err) return res.status(500).json({error: "Error interno"});

        const fotos = [];

        if (accion?.foto) {
            fotos.push({url: accion.foto});
        }

        // Agregar fotos de la tabla fotos
        db.all(
            "SELECT url FROM fotos WHERE accion_id = ?",
            [req.params.id],
            (err, fotosDB) => {
                if (!err && fotosDB) {
                    fotosDB.forEach(f => fotos.push({url: f.url}));
                }

                // Agregar fotos de reseñas
                db.all(
                    "SELECT imagen_url FROM reseñas WHERE accion_id = ? AND imagen_url IS NOT NULL",
                    [req.params.id],
                    (err, resenas) => {
                        if (!err && resenas) {
                            resenas.forEach(r => fotos.push({url: r.imagen_url}));
                        }
                        res.json(fotos);
                    }
                );
            }
        );
    });
});

// ===== RESEÑAS =====
app.get("/api/acciones/:id/resenas", (req, res) => {
    db.all(
        `SELECT id, accion_id, usuario_id, usuario_nombre as usuario, comentario, imagen_url as imagenUrl, fecha
         FROM reseñas
         WHERE accion_id = ?
         ORDER BY fecha DESC`,
        [req.params.id],
        (err, resenas) => {
            if (err) return res.status(500).json({error: "Error al obtener reseñas"});
            res.json(resenas || []);
        }
    );
});

app.post("/api/acciones/:id/resenas", auth, upload.single("imagen"), (req, res) => {
    const {comentario} = req.body;

    if (!comentario || comentario.trim() === "") {
        return res.status(400).json({error: "Comentario vacío"});
    }

    const imagenUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
        `INSERT INTO reseñas (accion_id, usuario_id, usuario_nombre, comentario, imagen_url, fecha)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [req.params.id, req.user.id, req.user.nombre, comentario, imagenUrl],
        function (err) {
            if (err) return res.status(500).json({error: "Error al crear reseña"});
            console.log(`💬 Nueva reseña para acción ${req.params.id}`);
            res.json({
                id: this.lastID,
                accionId: req.params.id,
                usuario: req.user.nombre,
                usuarioId: req.user.id,
                comentario,
                imagenUrl,
                fecha: new Date().toISOString()
            });
        }
    );
});

app.put("/api/resenas/:id", auth, upload.single("imagen"), (req, res) => {
    const {comentario} = req.body;

    if (!comentario || comentario.trim() === "") {
        return res.status(400).json({error: "Comentario vacío"});
    }

    db.get("SELECT * FROM reseñas WHERE id = ?", [req.params.id], (err, resena) => {
        if (err) return res.status(500).json({error: "Error interno"});
        if (!resena) return res.status(404).json({error: "Reseña no encontrada"});

        // Validar permisos
        if (resena.usuario_id !== req.user.id && req.user.rol !== "admin") {
            return res.status(403).json({error: "No tienes permiso para editar esta reseña"});
        }

        let imagenUrl = resena.imagen_url;

        if (req.file) {
            if (resena.imagen_url) {
                const filepath = path.join(__dirname, "public", resena.imagen_url);
                if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            }
            imagenUrl = `/uploads/${req.file.filename}`;
        }

        db.run(
            `UPDATE reseñas
             SET comentario = ?,
                 imagen_url = ?
             WHERE id = ?`,
            [comentario, imagenUrl, req.params.id],
            (err) => {
                if (err) return res.status(500).json({error: "Error al actualizar reseña"});
                console.log(`✏️  Reseña editada: ${req.params.id}`);
                res.json({id: req.params.id, comentario, imagenUrl});
            }
        );
    });
});

app.delete("/api/resenas/:id", auth, (req, res) => {
    db.get("SELECT * FROM reseñas WHERE id = ?", [req.params.id], (err, resena) => {
        if (err) return res.status(500).json({error: "Error interno"});
        if (!resena) return res.status(404).json({error: "Reseña no encontrada"});

        // Validar permisos
        if (resena.usuario_id !== req.user.id && req.user.rol !== "admin") {
            return res.status(403).json({error: "No tienes permiso para eliminar esta reseña"});
        }

        if (resena.imagen_url) {
            const filepath = path.join(__dirname, "public", resena.imagen_url);
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        }

        db.run("DELETE FROM reseñas WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({error: "Error al eliminar"});
            console.log(`🗑️  Reseña eliminada: ${req.params.id}`);
            res.json({mensaje: "Reseña eliminada"});
        });
    });
});

// ===== ADMIN: DASHBOARD =====
app.get("/api/admin/stats", auth, adminOnly, (req, res) => {
    let stats = {};

    db.get("SELECT COUNT(*) as total FROM acciones_ambientales", (err, row) => {
        stats.totalAcciones = row?.total || 0;

        db.get("SELECT COUNT(*) as total FROM reseñas", (err, row) => {
            stats.totalResenas = row?.total || 0;

            db.get("SELECT COUNT(*) as total FROM usuarios", (err, row) => {
                stats.totalUsuarios = row?.total || 0;

                db.all("SELECT id, nombre, tipo, ubicacion, responsable, resultados, fecha_inicio, fecha_fin, latitud, longitud FROM acciones_ambientales", (err, acciones) => {
                    stats.acciones = acciones || [];

                    db.all("SELECT id, accion_id as accionId, usuario_id as usuarioId, usuario_nombre as usuario, comentario, imagen_url as imagenUrl, fecha FROM reseñas", (err, resenas) => {
                        stats.reseñas = resenas || [];

                        db.all("SELECT id, nombre, email, rol FROM usuarios", (err, usuarios) => {
                            stats.usuarios = usuarios || [];
                            res.json(stats);
                        });
                    });
                });
            });
        });
    });
});

// ===== SERVIDOR =====
app.listen(3000, () => {
    console.log("\n🚀 Servidor iniciado en http://localhost:3000");
    console.log("📝 Credenciales admin por defecto:");
    console.log("   Email: admin@climate.com");
    console.log("   Contraseña: 1234 (o admin123 si registraste uno nuevo)");
    console.log("\n🛠️  PARA CREAR NUEVO ADMIN EN REGISTRO:");
    console.log("   Email: DEBE contener 'admin' (ejemplo: miiadmin@empresa.com)");
    console.log("   Contraseña: EXACTAMENTE: admin123\n");
});