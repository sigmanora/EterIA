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

/* Cargar hojas */
function cargarHoja(url,tipo){
  return fetch(url).then(r=>r.text()).then(csv=>{
    return csv.split("\n").slice(1).map(f=>{
      const c = parseCSV(f);
      return {
        nombre:c[0],
        rut:c[1],
        curso:c[2],
        semestre:c[3],
        evaluacion:c[4],
        comentarios:c[5],
        tipo
      };
    });
  });
}

Promise.all([
  cargarHoja(AYUDANTES_URL,"Ayudante"),
  cargarHoja(AUXILIARES_URL,"Auxiliar de control")
]).then(r=>personas=r.flat());

/* Mostrar persona */
function mostrarPersona(p){
  resultado.innerHTML=`
    <div class="card">
      <h2>${formatearNombre(p.nombre)}</h2>
      <p><strong>Evaluación:</strong> ${p.evaluacion || "Sin evaluar"}</p>
      <p><strong>Tipo:</strong> ${p.tipo}</p>
      <p><strong>Curso y semestre:</strong> ${p.curso} · ${p.semestre}</p>
      <p><strong>Comentarios:</strong> ${p.comentarios || "-"}</p>
    </div>`;
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

