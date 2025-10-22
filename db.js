const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database.sqlite");
const bcrypt = require("bcrypt");

db.run("PRAGMA foreign_keys = ON");
console.log("🧩 Conectando a base de datos SQLite...");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios
        (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre   TEXT,
            email    TEXT UNIQUE,
            password TEXT,
            rol      TEXT CHECK (rol IN ('admin', 'usuario')) DEFAULT 'usuario'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS acciones_ambientales
        (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre       TEXT,
            tipo         TEXT,
            ubicacion    TEXT,
            responsable  TEXT,
            resultados   TEXT,
            fecha_inicio TEXT,
            fecha_fin    TEXT,
            latitud      REAL,
            longitud     REAL,
            creador_id   INTEGER,
            FOREIGN KEY (creador_id) REFERENCES usuarios (id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS fotos
        (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            accion_id INTEGER,
            url       TEXT,
            FOREIGN KEY (accion_id) REFERENCES acciones_ambientales (id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reseñas
        (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            accion_id  INTEGER,
            usuario_id INTEGER,
            comentario TEXT,
            fecha      TEXT,
            FOREIGN KEY (accion_id) REFERENCES acciones_ambientales (id) ON DELETE CASCADE,
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        )
    `);

    // Crear admin solo si no existe
    db.get(`SELECT COUNT(*) AS c
            FROM usuarios`, (err, row) => {
        if (!err && row.c === 0) {
            const saltRounds = 10;
            bcrypt.hash("1234", saltRounds, (err, hashedPassword) => {
                if (err) {
                    console.error("Error al hashear la contraseña del admin:", err);
                    return;
                }
                db.run(
                    `INSERT INTO usuarios (nombre, email, password, rol)
                     VALUES (?, ?, ?, ?)`,
                    ["Admin", "admin@climate.com", hashedPassword, "admin"],
                    function (err) {
                        if (err) {
                            console.error("Error al insertar admin:", err);
                        } else {
                            console.log("Usuario admin creado: admin@climate.com / 1234");

                            // Insertar acciones de ejemplo después de crear el admin
                            const adminId = this.lastID;
                            db.run(
                                `INSERT INTO acciones_ambientales
                                 (nombre, tipo, ubicacion, responsable, resultados, fecha_inicio, fecha_fin, latitud,
                                  longitud,
                                  creador_id)
                                 VALUES ('Reforestación del Caribe', 'Reforestación', 'Barranquilla',
                                         'Ministerio de Ambiente',
                                         'Plantadas 10,000 especies nativas', '2024-03-01', '2024-08-30', 10.9685,
                                         -74.7813, ?),
                                        ('Educación ambiental escolar', 'Educación', 'Cartagena', 'Fundación Verde',
                                         'Capacitación a 200 estudiantes', '2024-05-10', '2024-06-15', 10.3910,
                                         -75.4794, ?),
                                        ('Energía solar comunitaria', 'Energía Renovable', 'Riohacha', 'ONG Solverde',
                                         '50 paneles solares instalados', '2024-02-01', '2024-11-01', 11.5449, -72.9070,
                                         ?)
                                `, [adminId, adminId, adminId],
                                (err) => {
                                    if (err) {
                                        console.error("Error al insertar acciones:", err);
                                    } else {
                                        console.log("🌱 Acciones ambientales de ejemplo insertadas.");
                                    }
                                }
                            );
                        }
                    }
                );
            });
        }
    });
});

console.log("Base de datos lista");
module.exports = db;