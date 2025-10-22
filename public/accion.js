const id = new URLSearchParams(window.location.search).get("id");
if (!id) {
    document.body.innerHTML = "<h3>ID no especificado</h3>";
    throw new Error("No id");
}

async function cargar() {
    const res = await fetch(`/api/acciones/${id}`);
    if (!res.ok) return (document.body.innerHTML = "<h3>Acción no encontrada</h3>");
    const accion = await res.json();

    document.getElementById("detalle").innerHTML = `
    <h2>${accion.nombre}</h2>
    <p><b>Tipo:</b> ${accion.tipo}</p>
    <p><b>Ubicación:</b> ${accion.ubicacion}</p>
    <p>${accion.resultados}</p>
  `;

    const fotos = await (await fetch(`/api/acciones/${id}/fotos`)).json();
    document.getElementById("fotos").innerHTML =
        fotos.length ? fotos.map(f => `<img src="${f.url}" width="200">`).join("") : "<p>No hay fotos</p>";

    const resReseñas = await fetch(`/api/acciones/${id}/resenas`);
    if (!resReseñas.ok) {
        console.error("Error al cargar reseñas:", await resReseñas.text());
        return;
    }
    const reseñas = await resReseñas.json();
    document.getElementById("reseñas").innerHTML =
        reseñas.length ? reseñas.map(r => `<p><b>${r.usuario}</b>: ${r.comentario}</p>`).join("") : "<p>No hay reseñas</p>";
}

document.getElementById("enviarReseña").addEventListener("click", async () => {
    const comentario = document.getElementById("comentario").value.trim();
    if (!comentario) return alert("Escribe algo.");
    const token = localStorage.getItem("token");
    if (!token) return alert("Debes iniciar sesión.");

    const res = await fetch(`/api/acciones/${id}/resenas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ comentario })
    });

    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        console.error("Respuesta inesperada:", text);
        return alert("Error inesperado del servidor.");
    }

    if (res.ok) {
        alert("💬 Reseña enviada");
        document.getElementById("comentario").value = "";
        cargar();
    } else {
        alert("Error: " + (data.error || "No se pudo enviar reseña"));
    }
});

cargar();
