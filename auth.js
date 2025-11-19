const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "Booof";

// Registro
router.post("/register", async (req, res) => {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password)
        return res.status(400).json({ error: "Datos incompletos" });

    try {
        const hashed = await bcrypt.hash(password, 10);
        db.run(
            `INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)`,
            [nombre, email, hashed],
            function (err) {
                if (err) return res.status(400).json({ error: "Usuario ya existe" });
                res.json({ id: this.lastID, message: "Usuario creado" });
            }
        );
    } catch {
        res.status(500).json({ error: "Error interno" });
    }
});

// Login
router.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "Faltan credenciales" });

    db.get(`SELECT * FROM usuarios WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: "Error interno" });
        if (!user) return res.status(400).json({ error: "Usuario no encontrado" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(400).json({ error: "Contraseña incorrecta" });

        const token = jwt.sign(
            { id: user.id, rol: user.rol, nombre: user.nombre },
            SECRET,
            { expiresIn: "4h" }
        );
        res.json({ token, rol: user.rol, nombre: user.nombre });
    });
});

module.exports = { router, SECRET };
