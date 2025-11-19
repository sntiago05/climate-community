// login.js - Actualizado para crear admins

if (localStorage.getItem("token")) {
    const rol = localStorage.getItem("rol");
    window.location.href = rol === "admin" ? "admin.html" : "index.html";
}

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

const emailLogin = document.getElementById("emailLogin");
const passwordLogin = document.getElementById("passwordLogin");
const btnLogin = document.getElementById("btnLogin");

const nombreReg = document.getElementById("nombreReg");
const emailReg = document.getElementById("emailReg");
const passwordReg = document.getElementById("passwordReg");
const btnRegister = document.getElementById("btnRegister");

// Cambiar entre formularios
showRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
});

showLogin?.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
});

// LOGIN
btnLogin.addEventListener("click", async () => {
    const email = emailLogin.value.trim();
    const password = passwordLogin.value.trim();
    if (!email || !password) return alert("Completa correo y contraseña.");

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({email, password})
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.error("Respuesta no JSON del servidor:", text);
            return alert("Error inesperado en el servidor.");
        }

        if (res.ok) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("rol", data.rol);
            localStorage.setItem("nombre", data.nombre);

            // Redirigir según rol
            if (data.rol === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }
        } else {
            alert(data.error || "Credenciales inválidas.");
        }
    } catch (err) {
        console.error(err);
        alert("❌ No se pudo conectar con el servidor.");
    }
});

// REGISTRO
btnRegister.addEventListener("click", async () => {
    const nombre = nombreReg.value.trim();
    const email = emailReg.value.trim();
    const password = passwordReg.value.trim();

    if (!nombre || !email || !password) {
        return alert("Completa todos los campos.");
    }

    // Validar si es admin
    // Para crear ADMIN: email debe contener "admin" Y contraseña debe ser "admin123"
    let rol = "user";
    if (email.toLowerCase().includes("admin") && password === "admin123") {
        const confirmar = confirm("⚠️ ¿Crear cuenta ADMIN? \n\nEmail: " + email + "\n\nEsta acción es importante.");
        if (!confirmar) return;
        rol = "admin";
        console.log("🛠️  Creando admin con rol:", rol);
    } else {
        console.log("👤 Creando usuario normal con rol:", rol);
    }

    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                nombre,
                email,
                password,
                rol  // ✅ ENVIAR ROL AL BACKEND
            })
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.error("Respuesta no JSON del servidor:", text);
            return alert("Error inesperado en el servidor.");
        }

        if (res.ok) {
            const tipoUsuario = data.rol === "admin" ? "🛠️ ADMIN" : "👤 Usuario";
            alert(`✅ Cuenta creada como ${tipoUsuario}\n\nAhora inicia sesión.`);
            registerForm.classList.add("hidden");
            loginForm.classList.remove("hidden");
            nombreReg.value = "";
            emailReg.value = "";
            passwordReg.value = "";
        } else {
            alert(data.error || "No se pudo crear la cuenta.");
        }
    } catch (err) {
        console.error(err);
        alert("❌ No se pudo conectar con el servidor.");
    }
});

// Mostrar instrucciones
console.log(`
╔════════════════════════════════════════════╗
║ 🌿 CLIMATE COMMUNITY - INSTRUCCIONES       ║
╠════════════════════════════════════════════╣
║                                            ║
║ 📝 CREAR CUENTA NORMAL:                   ║
║   Email: cualquier@email.com              ║
║   Contraseña: cualquier                   ║
║                                            ║
║ 🛠️  CREAR CUENTA ADMIN:                    ║
║   Email: admin@algo.com (debe tener "admin") ║
║   Contraseña: admin123 (exactamente)      ║
║                                            ║
║ 🔓 ADMIN POR DEFECTO:                     ║
║   Email: admin@climate.com                ║
║   Contraseña: admin123                    ║
║                                            ║
╚════════════════════════════════════════════╝
`);