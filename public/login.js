// 🔐 Si ya hay sesión activa, redirigir al inicio
if (localStorage.getItem("token")) {
    window.location.href = "index.html";
}

// Referencias a elementos del DOM
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

// 🔄 Cambiar entre formularios
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

// 🚪 LOGIN
btnLogin.addEventListener("click", async () => {
    const email = emailLogin.value.trim();
    const password = passwordLogin.value.trim();
    if (!email || !password) return alert("Completa correo y contraseña.");

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
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
            window.location.href = "index.html";
        } else {
            alert(data.error || "Credenciales inválidas.");
        }
    } catch (err) {
        console.error(err);
        alert("❌ No se pudo conectar con el servidor.");
    }
});

// 🧾 REGISTRO
btnRegister.addEventListener("click", async () => {
    const nombre = nombreReg.value.trim();
    const email = emailReg.value.trim();
    const password = passwordReg.value.trim();
    if (!nombre || !email || !password) return alert("Completa todos los campos.");

    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, email, password })
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
            alert("✅ Cuenta creada. Ahora inicia sesión.");
            registerForm.classList.add("hidden");
            loginForm.classList.remove("hidden");
        } else {
            alert(data.error || "No se pudo crear la cuenta.");
        }
    } catch (err) {
        console.error(err);
        alert("❌ No se pudo conectar con el servidor.");
    }
});
