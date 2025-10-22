const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const db = require("./db");
const { router: authRouter } = require("./auth");
const { auth } = require("./middleware");

const app = express();
const upload = multer({ dest: "uploads/" });

// Middlewares
app.use(cors());
app.use(express.json());

// Crea rutas en la pagina
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rutas de autenticación
app.use("/api/auth", authRouter);

// Obtener todas las acciones
app.get("/api/acciones", (req, res) => {
    db.all("SELECT * FROM acciones_ambientales", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Buscar acciones
app.get("/api/acciones/buscar", (req, res) => {
    const q = `%${req.query.q || ""}%`;
    db.all(
        "SELECT * FROM acciones_ambientales WHERE nombre LIKE ? OR tipo LIKE ? OR ubicacion LIKE ?",
        [q, q, q],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Obtener una acción
app.get("/api/acciones/:id", (req, res) => {
    db.get("SELECT * FROM acciones_ambientales WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Acción no encontrada" });
        res.json(row);
    });
});

// Obtener fotos
app.get("/api/acciones/:id/fotos", (req, res) => {
    db.all("SELECT * FROM fotos WHERE accion_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Crear acción (requiere token)
app.post("/api/acciones", auth, (req, res) => {
    const { nombre, tipo, ubicacion, responsable, resultados, fecha_inicio, fecha_fin, latitud, longitud } = req.body;

    db.run(
        `INSERT INTO acciones_ambientales 
        (nombre, tipo, ubicacion, responsable, resultados, fecha_inicio, fecha_fin, latitud, longitud, creador_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, tipo, ubicacion, responsable, resultados, fecha_inicio, fecha_fin, latitud, longitud, req.user.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: "✅ Acción creada correctamente" });
        }
    );
});

// Subir fotos (requiere token)
app.post("/api/acciones/:id/fotos", auth, upload.array("imagenes", 8), (req, res) => {
    if (!req.files || req.files.length === 0)
        return res.status(400).json({ error: "No se subieron archivos" });

    const fotos = req.files.map((f) => `/uploads/${f.filename}`);
    const stmt = db.prepare("INSERT INTO fotos (accion_id, url) VALUES (?, ?)");
    fotos.forEach((url) => stmt.run(req.params.id, url));
    stmt.finalize();

    res.json({ message: "📸 Fotos guardadas", urls: fotos });
});

// Obtener reseñas
app.get("/api/acciones/:id/resenas", (req, res) => {
    db.all(
        `SELECT r.*, u.nombre AS usuario 
         FROM reseñas r
         JOIN usuarios u ON r.usuario_id = u.id
         WHERE accion_id = ? ORDER BY fecha DESC`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Agregar reseña (requiere token)
app.post("/api/acciones/:id/resenas", auth, (req, res) => {
    const { comentario } = req.body;
    if (!comentario) return res.status(400).json({ error: "Comentario vacío" });

    db.run(
        `INSERT INTO reseñas (accion_id, usuario_id, comentario, fecha)
         VALUES (?, ?, ?, datetime('now'))`,
        [req.params.id, req.user.id, comentario],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: "💬 Reseña agregada correctamente" });
        }
    );
});

// ✅ Catch-all: redirige solo rutas no /api a login
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌎 Servidor activo en: http://localhost:${PORT}`));
