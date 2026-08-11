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

function formatearNombre(raw="") {
  raw = raw.replace(/"/g,"");
  if (!raw.includes(",")) return raw;
  const [a,n] = raw.split(",").map(x=>x.trim());
  return `${n} ${a}`;
}

function parseCSV(line) {
  const r = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
  return line?.match(r)?.map(v=>v.replace(/^"|"$/g,"")) || [];
}

/* Parsea la columna INFORMACIÓN: "SEMESTRE (CURSO): Comentario" */
function parseInformacion(info="") {
  // Caso normal: "2026-1 (MA1101): Comentario..."
  let m = info.match(/^\s*([^(:]+?)\s*\(([^)]+)\)\s*:\s*(.*)$/s);
  if (m) {
    return { semestre: m[1].trim(), curso: m[2].trim(), comentarios: m[3].trim() };
  }
  // Caso sin curso entre paréntesis: "2023-2 : Comentario..."
  m = info.match(/^\s*([^:]+?)\s*:\s*(.*)$/s);
  if (m) {
    return { semestre: m[1].trim(), curso: "-", comentarios: m[2].trim() };
  }
  // Sin formato reconocible: se deja todo como comentario
  return { semestre: "-", curso: "-", comentarios: info.trim() };
}

/* Cargar hojas */
function cargarHoja(url,tipo){
  return fetch(url).then(r=>r.text()).then(csv=>{
    return csv.split("\n").slice(1).map(f=>{
      const c = parseCSV(f);
      const { semestre, curso, comentarios } = parseInformacion(c[3]);
      return {
        nombre:c[0],
        rut:c[1],
        evaluacion:c[2],
        curso,
        semestre,
        comentarios,
        tipo
      };
    });
  });
}

Promise.all([
  cargarHoja(AYUDANTES_URL,"Ayudante"),
  cargarHoja(AUXILIARES_URL,"Auxiliar de control")
]).then(r=>personas=r.flat());

/* Convierte la nota 1-4 en estrellas */
function renderEstrellas(valor) {
  const n = parseInt(valor, 10);
  if (!n || n < 1 || n > 4) return "Sin evaluar";
  return "★".repeat(n) + "☆".repeat(4 - n);
}

/* Mostrar persona */
function mostrarPersona(persona) {
  resultado.innerHTML = `
    <h2>${formatearNombre(persona.nombre)}</h2>

    <p><strong>Evaluación:</strong> <span class="estrellas">${renderEstrellas(persona.evaluacion)}</span></p>
    <p><strong>Tipo:</strong> ${persona.tipo}</p>
    <p><strong>Curso y semestre:</strong> ${persona.curso} · ${persona.semestre}</p>
    <p><strong>Comentarios:</strong> ${persona.comentarios || "-"}</p>
  `;

  modal.classList.remove("hidden");
}


/* Buscar */
input.addEventListener("input",()=>{
  const q=normalizar(input.value);
  lista.innerHTML="";
  if(q.length<2) return;

  personas
    .filter(p =>
      normalizar(p.nombre).includes(q) ||
      normalizar(p.rut).includes(q)
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
