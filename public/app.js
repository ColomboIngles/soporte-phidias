const API = "https://soporte-phidias.onrender.com";

// ===============================
function getEmail() {
    return new URLSearchParams(window.location.search).get("tli");
}

// ===============================
async function cargarTickets() {
    const res = await fetch(API + "/tickets");
    const tickets = await res.json();

    const tabla = document.getElementById("tabla");
    tabla.innerHTML = "";

    tickets.forEach(t => {
        tabla.innerHTML += `
      <tr>
        <td>${t.titulo}</td>
        <td>${t.estado}</td>
        <td>${t.categoria || "-"}</td>
        <td>${t.prioridad || "-"}</td>
        <td>
          <button onclick="verTicket('${t.id}')">Ver</button>
          <button onclick="cerrarTicket('${t.id}')">Cerrar</button>
        </td>
      </tr>
    `;
    });
}

// ===============================
async function crearTicket() {
    const email = getEmail();

    const body = {
        email,
        titulo: document.getElementById("titulo").value,
        descripcion: document.getElementById("descripcion").value,
        categoria: document.getElementById("categoria").value,
        prioridad: document.getElementById("prioridad").value
    };

    await fetch(API + "/webhook-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    cerrarModal();
    cargarTickets();
}

// ===============================
async function verTicket(id) {
    const res = await fetch(API + "/tickets/" + id);
    const t = await res.json();

    alert(`
${t.titulo}
${t.descripcion}
Estado: ${t.estado}
  `);
}

// ===============================
async function cerrarTicket(id) {
    await fetch(API + "/tickets/" + id + "/cerrar", {
        method: "PUT"
    });

    cargarTickets();
}

// ===============================
function abrirModal() {
    document.getElementById("modal").style.display = "flex";
}

function cerrarModal() {
    document.getElementById("modal").style.display = "none";
}

// ===============================
cargarTickets();