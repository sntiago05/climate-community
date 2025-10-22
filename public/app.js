// Redirigir si no hay token
if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
}

// Mostrar info usuario y logout
const userName = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");
const formSection = document.getElementById("formSection");

const nombre = localStorage.getItem("nombre");
const rol = localStorage.getItem("rol");

if (userName && nombre) {
    userName.textContent = `👤 ${nombre} (${rol})`;
    logoutBtn.classList.remove("hidden");
    formSection.classList.remove("hidden");
}

logoutBtn?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
});

// Inicializar mapa
const map = L.map('map').setView([4.5709, -74.2973], 5);
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
    const { lat, lng } = e.latlng;
    if (markerSeleccion) map.removeLayer(markerSeleccion);
    markerSeleccion = L.marker([lat, lng], { icon: ecoIcon }).addTo(map)
        .bindPopup(`📍 Ubicación seleccionada<br>Lat: ${lat.toFixed(5)}<br>Lng: ${lng.toFixed(5)}`)
        .openPopup();
    document.getElementById("latitud").value = lat;
    document.getElementById("longitud").value = lng;
});

// Cargar acciones
async function cargar() {
    const res = await fetch("/api/acciones");
    const data = await res.json();
    mostrar(data);
}

// Buscar acciones
async function buscar() {
    const q = document.getElementById("buscar").value;
    const res = await fetch(`/api/acciones/buscar?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    mostrar(data);
}

function mostrar(data) {
    const tbody = document.querySelector("#tabla-body");
    tbody.innerHTML = "";

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    data.forEach(a => {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td class="border px-3 py-2 text-blue-600 underline cursor-pointer">${a.nombre}</td>
      <td class="border px-3 py-2">${a.tipo}</td>
      <td class="border px-3 py-2">${a.ubicacion}</td>
      <td class="border px-3 py-2">${a.responsable}</td>
      <td class="border px-3 py-2">${a.resultados}</td>
    `;
        // click en nombre abre detalle
        row.querySelector("td").addEventListener("click", () => {
            window.location.href = `accion.html?id=${a.id}`;
        });

        tbody.appendChild(row);

        if (a.latitud && a.longitud) {
            const marker = L.marker([a.latitud, a.longitud], { icon: ecoIcon }).addTo(map)
                .bindPopup(`<b>${a.nombre}</b><br>${a.ubicacion}<br>${a.tipo}`);
            markers.push(marker);
        }
    });

    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds());
    }
}

// Agregar nueva acción (envía token)
document.getElementById("formulario").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nueva = {
        nombre: document.getElementById("nombre").value,
        tipo: document.getElementById("tipo").value,
        ubicacion: document.getElementById("ubicacion").value,
        responsable: document.getElementById("responsable").value,
        resultados: document.getElementById("resultados").value,
        fecha_inicio: document.getElementById("fecha_inicio").value,
        fecha_fin: document.getElementById("fecha_fin").value,
        latitud: parseFloat(document.getElementById("latitud").value) || null,
        longitud: parseFloat(document.getElementById("longitud").value) || null
    };

    const token = localStorage.getItem("token");
    try {
        const res = await fetch("/api/acciones", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(nueva)
        });
        const data = await res.json();
        if (res.ok) {
            alert("✅ Acción agregada correctamente");
            e.target.reset();
            if (markerSeleccion) {
                map.removeLayer(markerSeleccion);
                markerSeleccion = null;
            }
            cargar();
        } else {
            alert("⚠️ " + (data.error || "Error"));
        }
    } catch (err) {
        console.error(err);
        alert("Error conectando con el servidor.");
    }
});

cargar();
