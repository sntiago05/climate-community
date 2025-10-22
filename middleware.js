const jwt = require("jsonwebtoken");
const { SECRET } = require("./auth");

function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "Token requerido" });

    try {
        const token = header.split(" ")[1];
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        return res.status(403).json({ error: "Token inválido" });
    }
}

module.exports = { auth };
