const AYUDANTES_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQiEl3Ji1OCzdYNzmO7SJ5bTW8wKaIz16yOsmsmRmxCnjmrqF9gTCglB9dYfA91uPtqrmK8y2iVTYD5/pub?gid=0&single=true&output=csv";

const AUXILIARES_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQiEl3Ji1OCzdYNzmO7SJ5bTW8wKaIz16yOsmsmRmxCnjmrqF9gTCglB9dYfA91uPtqrmK8y2iVTYD5/pub?gid=657863670&single=true&output=csv";

const input = document.querySelector(".search-box input");
const lista = document.getElementById("lista-resultados");
const resultado = document.getElementById("resultado");
const modal = document.getElementById("modal");
const closeBtn = document.querySelector(".close-btn");

closeBtn.onclick = () => modal.classList.add("hidden");

let personas = [];

/* Utils */
function normalizar(t="") {
  return t.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"");
}

function limpiarRut(t="") {
  return t.replace(/[.\s]/g,"");
}

function formatearNombre(raw="") {
  raw = raw.replace(/"/g,"");
  if (!raw.includes(",")) return raw;
  const [a,n] = raw.split(",").map(x=>x.trim());
  return `${n} ${a}`;
}

function parseCSVCompleto(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let dentroComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    const sig = texto[i + 1];

    if (dentroComillas) {
      if (char === '"' && sig === '"') { campo += '"'; i++; }
      else if (char === '"') { dentroComillas = false; }
      else { campo += char; }
    } else {
      if (char === '"') dentroComillas = true;
      else if (char === ",") { fila.push(campo); campo = ""; }
      else if (char === "\r") { /* se ignora, el salto real es \n */ }
      else if (char === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
      else campo += char;
    }
  }
  if (campo.length > 0 || fila.length > 0) { fila.push(campo); filas.push(fila); }

  return filas;
}

/* Parsea un bloque individual "SEMESTRE (CURSO): Comentario" */
function parseBloque(bloque) {
  let m = bloque.match(/^\s*(\d{4}-\d)\s*\(([^)]+)\)\s*:?\s*([\s\S]*)$/);
  if (m) {
    return { semestre: m[1], curso: m[2].trim(), comentarios: m[3].trim() || "-" };
  }
  m = bloque.match(/^\s*(\d{4}-\d)\s*:\s*([\s\S]*)$/);
  if (m) {
    return { semestre: m[1], curso: "Sin información", comentarios: m[2].trim() || "-" };
  }
  m = bloque.match(/^\s*(\d{4}-\d)\s*$/);
  if (m) {
    return { semestre: m[1], curso: "Sin información", comentarios: "-" };
  }
  // Sin semestre identificable: puede venir como "MA1101 - comentario" o similar
  m = bloque.match(/^:?\s*(MA\d{3,4})\s*[-:]\s*([\s\S]*)$/i);
  if (m) {
    return { semestre: "Sin información", curso: m[1].toUpperCase(), comentarios: m[2].trim() || "-" };
  }
  return { semestre: "Sin información", curso: "Sin información", comentarios: bloque.trim() };
}

/* Parsea la columna INFORMACIÓN, que puede traer varios bloques semestre-curso-comentario
   pegados en la misma celda (ej. un ayudante con evaluaciones en 2025-2 y en 2026-1).
   Solo se considera "inicio de bloque nuevo" una fecha que venga seguida de "(" o ":",
   que es la firma real de un encabezado — así una fecha mencionada dentro de un
   comentario (ej. "fue muy bueno en 2025-1)") no corta el texto a la mitad. */
function parseInformacion(info="") {
  info = info.trim();
  if (!info) return [];

  const semestreRegex = /\d{4}-\d(?=\s*[:(])/g;
  const inicios = [...info.matchAll(semestreRegex)].map(m => m.index);

  // No se detectó ningún encabezado de semestre: se trata como un solo bloque
  if (inicios.length === 0) return [parseBloque(info)];

  return inicios.map((inicio, i) => {
    const fin = i + 1 < inicios.length ? inicios[i + 1] : info.length;
    return parseBloque(info.slice(inicio, fin));
  });
}

/* Cargar hojas */
function cargarHoja(url,tipo){
  return fetch(url).then(r=>r.text()).then(csv=>{
    return parseCSVCompleto(csv)
      .slice(1)
      .filter(c => c[0])
      .map(c => ({
        nombre:c[0],
        rut:c[1],
        evaluacion:c[2],
        evaluaciones: parseInformacion(c[3]),
        tipo
      }));
  });
}

/* Combina en una sola persona los registros que vienen repetidos
   por estar tanto en la hoja de ayudantes como en la de auxiliares
   de control (se identifica por RUT, o por nombre si no hay RUT) */
function combinarPersonas(lista) {
  const mapa = new Map();

  lista.forEach(p => {
    const rut = limpiarRut(normalizar(p.rut));
    const clave = rut || ("nombre:" + normalizar(p.nombre));

    if (!mapa.has(clave)) {
      mapa.set(clave, {
        nombre: p.nombre,
        rut: p.rut,
        roles: []
      });
    }

    mapa.get(clave).roles.push({
      tipo: p.tipo,
      evaluacion: p.evaluacion,
      evaluaciones: p.evaluaciones
    });
  });

  return Array.from(mapa.values());
}

Promise.all([
  cargarHoja(AYUDANTES_URL,"Ayudante"),
  cargarHoja(AUXILIARES_URL,"Auxiliar de control")
]).then(r=>personas=combinarPersonas(r.flat()));

/* Convierte la nota 1-4 en estrellas */
function renderEstrellas(valor) {
  const n = parseInt(valor, 10);
  if (!n || n < 1 || n > 4) return "Sin evaluar";
  return "★".repeat(n) + "☆".repeat(4 - n);
}

/* Mostrar persona */
function mostrarPersona(persona) {
  const bloquesRoles = persona.roles.map(rol => {
    const evaluaciones = rol.evaluaciones?.length
      ? rol.evaluaciones.map(e => `
          <div class="evaluacion-item">
            <p><strong>Curso y semestre:</strong> ${e.curso} · ${e.semestre}</p>
            <p><strong>Comentarios:</strong> ${e.comentarios}</p>
          </div>
        `).join("<hr>")
      : `<p>Sin registros de evaluación.</p>`;

    return `
      <div class="rol-bloque">
        <p><strong>Tipo:</strong> ${rol.tipo}</p>
        <p><strong>Evaluación:</strong> <span class="estrellas">${renderEstrellas(rol.evaluacion)}</span></p>
        ${evaluaciones}
      </div>
    `;
  }).join("<hr>");

  resultado.innerHTML = `
    <h2>${formatearNombre(persona.nombre)}</h2>
    ${bloquesRoles}
  `;

  modal.classList.remove("hidden");
}


/* Buscar */
input.addEventListener("input",()=>{
  const q=normalizar(input.value);
  const qRut=limpiarRut(q);
  lista.innerHTML="";
  if(q.length<2) return;

  personas
    .filter(p =>
      normalizar(p.nombre).includes(q) ||
      limpiarRut(normalizar(p.rut)).includes(qRut)
    )
    .forEach(p=>{
      const d=document.createElement("div");
      d.className="resultado-item";
      d.textContent=formatearNombre(p.nombre);
      d.onclick=()=>{
        mostrarPersona(p);
        lista.innerHTML="";
        input.value="";
      };
      lista.appendChild(d);
    });
});
