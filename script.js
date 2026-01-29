const AYUDANTES_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiEl3Ji1OCzdYNzmO7SJ5bTW8wKaIz16yOsmsmRmxCnjmrqF9gTCglB9dYfA91uPtqrmK8y2iVTYD5/pub?gid=0&single=true&output=csv";

const AUXILIARES_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiEl3Ji1OCzdYNzmO7SJ5bTW8wKaIz16yOsmsmRmxCnjmrqF9gTCglB9dYfA91uPtqrmK8y2iVTYD5/pub?gid=657863670&single=true&output=csv";

const input = document.querySelector(".search-box input");
const lista = document.getElementById("lista-resultados");
const resultado = document.getElementById("resultado");

const modal = document.getElementById("modal");
const closeBtn = document.querySelector(".close-btn");

closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

/* ================= UTILIDADES ================= */

function normalizar(texto = "") {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatearNombre(crudo = "") {
  const limpio = crudo.replace(/"/g, "").trim();
  if (!limpio.includes(",")) return limpio;

  const [apellido, nombre] = limpio.split(",").map(t => t.trim());
  return `${nombre} ${apellido}`;
}

function parseCSVLine(line) {
  const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
  return line?.match(regex)?.map(v =>
    v.replace(/^"|"$/g, "").trim()
  ) || [];
}

/* ================= CARGA DE DATOS ================= */

let personas = [];

function cargarHoja(url, tipo) {
  return fetch(url)
    .then(res => res.text())
    .then(csv => {
      const filas = csv.split("\n").slice(1);

      return filas.map(fila => {
        const c = parseCSVLine(fila);
        return {
          nombre: c[0],
          rut: c[1],
          curso: c[2],
          semestre: c[3],
          evaluacion: c[4],
          comentarios: c[5],
          tipo
        };
      });
    });
}

Promise.all([
  cargarHoja(AYUDANTES_URL, "Ayudante"),
  cargarHoja(AUXILIARES_URL, "Auxiliar de control")
]).then(res => {
  personas = res.flat();
});

/* ================= MOSTRAR PERSONA ================= */

function mostrarPersona(p) {
  resultado.innerHTML = `
    <div class="card">
      <h2>${formatearNombre(p.nombre)}</h2>

      <p><strong>Evaluación:</strong> ${p.evaluacion || "Sin evaluar"}</p>
      <p><strong>Tipo:</strong> ${p.tipo}</p>
      <p><strong>Curso y semestre:</strong> ${p.curso} · ${p.semestre}</p>
      <p><strong>Comentarios:</strong> ${p.comentarios || "-"}</p>
    </div>
  `;
  modal.classList.remove("hidden");
}

/* ================= BUSCADOR ================= */

input.addEventListener("input", () => {
  const q = normalizar(input.value);
  lista.innerHTML = "";

  if (q.length < 2) return;

  const encontrados = personas.filter(p =>
    normalizar(p.nombre).includes(q) ||
    normalizar(p.rut).includes(q)
  );

  if (encontrados.length === 0) {
    lista.innerHTML = `<div class="resultado-item">No hay resultados</div>`;
    return;
  }

  encontrados.forEach(p => {
    const item = document.createElement("div");
    item.className = "resultado-item";
    item.textContent = formatearNombre(p.nombre);

    item.addEventListener("click", () => {
      mostrarPersona(p);
      lista.innerHTML = "";
      input.value = "";
    });

    lista.appendChild(item);
  });
});

