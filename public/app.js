// app.js - Actualizado para enviar fotos

if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
}

// Mostrar info usuario y logout
const userName = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");
const adminBtn = document.getElementById("adminBtn");
const formSection = document.getElementById("formSection");

const nombre = localStorage.getItem("nombre");
const rol = localStorage.getItem("rol");

if (userName && nombre) {
    userName.textContent = `👤 ${nombre} (${rol})`;
    logoutBtn.classList.remove("hidden");

    // Si es admin, mostrar botón de dashboard
    if (rol === "admin") {
        adminBtn.classList.remove("hidden");
        adminBtn.addEventListener("click", () => {
            window.location.href = "admin.html";
        });
    }

    formSection.classList.remove("hidden");
}

logoutBtn?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
});

// Inicializar mapa
const map = L.map('map').setView([10.9685, -74.7813], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const ecoIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/427/427735.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

let markers = [];
let markerSeleccion = null;

map.on("click", (e) => {
    const {lat, lng} = e.latlng;
    if (markerSeleccion) map.removeLayer(markerSeleccion);
    markerSeleccion = L.marker([lat, lng], {icon: ecoIcon}).addTo(map)
        .bindPopup(`📍 Ubicación seleccionada<br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}`)
        .openPopup();
    document.getElementById("latitud").value = lat;
    document.getElementById("longitud").value = lng;
    document.getElementById("ubicacionInfo").textContent = "✅ Ubicación seleccionada";
});

// Cargar acciones
async function cargar() {
    try {
        const res = await fetch("/api/acciones");
        const data = await res.json();
        mostrar(data);
    } catch (err) {
        console.error("Error cargando acciones:", err);
    }
}

// Buscar acciones
async function buscar() {
    const q = document.getElementById("buscar").value;
    if (!q.trim()) {
        cargar();
        return;
    }

    try {
        const res = await fetch(`/api/acciones/buscar?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        mostrar(data);
    } catch (err) {
        console.error("Error buscando:", err);
    }
}

function mostrar(data) {
    const tbody = document.querySelector("#tabla-body");
    tbody.innerHTML = "";

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    if (data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5' class='p-4 text-center text-gray-500'>No hay acciones</td></tr>";
        return;
    }

    data.forEach(a => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="border px-3 py-2 text-blue-600 underline cursor-pointer font-semibold">${a.nombre}</td>
            <td class="border px-3 py-2">${a.tipo}</td>
            <td class="border px-3 py-2">${a.ubicacion}</td>
            <td class="border px-3 py-2">${a.responsable}</td>
            <td class="border px-3 py-2 text-sm">${a.resultados}</td>
        `;
        // click en nombre abre detalle
        row.querySelector("td").addEventListener("click", () => {
            window.location.href = `accion.html?id=${a.id}`;
        });

        tbody.appendChild(row);

        if (a.latitud && a.longitud) {
            const marker = L.marker([a.latitud, a.longitud], {icon: ecoIcon}).addTo(map)
                .bindPopup(`<b>${a.nombre}</b><br>${a.ubicacion}<br>${a.tipo}`);
            markers.push(marker);
        }
    });

    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds());
    }
}

// Agregar nueva acción CON FOTO
document.getElementById("formulario").addEventListener("submit", async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const formData = new FormData();

    // Agregar campos de texto
    formData.append("nombre", document.getElementById("nombre").value);
    formData.append("tipo", document.getElementById("tipo").value);
    formData.append("ubicacion", document.getElementById("ubicacion").value);
    formData.append("responsable", document.getElementById("responsable").value);
    formData.append("resultados", document.getElementById("resultados").value);
    formData.append("fecha_inicio", document.getElementById("fecha_inicio").value);
    formData.append("fecha_fin", document.getElementById("fecha_fin").value);
    formData.append("latitud", document.getElementById("latitud").value);
    formData.append("longitud", document.getElementById("longitud").value);

    // Agregar foto si existe
    const fotoFile = document.getElementById("foto").files[0];
    if (fotoFile) {
        formData.append("foto", fotoFile);
    }

    try {
        const res = await fetch("/api/acciones", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token
            },
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ Acción agregada correctamente");
            e.target.reset();
            document.getElementById("ubicacionInfo").textContent = "💡 Haz clic en el mapa para seleccionar ubicación";
            if (markerSeleccion) {
                map.removeLayer(markerSeleccion);
                markerSeleccion = null;
            }
            cargar();
        } else {
            alert("⚠️ Error: " + (data.error || "No se pudo agregar la acción"));
        }
    } catch (err) {
        console.error(err);
        alert("❌ Error conectando con el servidor.");
    }
});

cargar();
