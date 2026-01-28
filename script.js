const AYUDANTES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiEl3Ji1OCzdYNzmO7SJ5bTW8wKaIz16yOsmsmRmxCnjmrqF9gTCglB9dYfA91uPtqrmK8y2iVTYD5/pub?gid=0&single=true&output=csv";
const AUXILIARES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQiEl3Ji1OCzdYNzmO7SJ5bTW8wKaIz16yOsmsmRmxCnjmrqF9gTCglB9dYfA91uPtqrmK8y2iVTYD5/pub?gid=657863670&single=true&output=csv";

const input = document.querySelector(".search-box input");
const resultado = document.getElementById("resultado");

let personas = [];

/* Normalizar texto */
function normalizar(texto = "") {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* Cargar una hoja CSV */
function cargarHoja(url, tipo) {
  return fetch(url)
    .then(res => res.text())
    .then(csv => {
      const filas = csv.split("\n").slice(1);

      return filas.map(fila => {
        const columnas = fila.split(",");

        return {
          rut: columnas[0],
          nombre: columnas[1],          // "Apellido, Nombre"
          evaluacion: columnas[2],
          curso: columnas[3],
          comentarios: columnas[4],
          tipo: tipo
        };
      });
    });
}

/* Cargar ambas hojas */
Promise.all([
  cargarHoja(AYUDANTES_URL, "Ayudante"),
  cargarHoja(AUXILIARES_URL, "Auxiliar de control")
]).then(resultados => {
  personas = resultados.flat();
});

/* Buscar */
input.addEventListener("input", () => {
  const busqueda = normalizar(input.value);

  if (busqueda.length < 2) {
    resultado.innerHTML = "";
    return;
  }

  const encontrado = personas.find(p =>
    normalizar(p.nombre).includes(busqueda) ||
    normalizar(p.rut).includes(busqueda)
  );

  if (!encontrado) {
    resultado.innerHTML = "<p>No se encontró la persona.</p>";
    return;
  }

resultado.innerHTML = `
  <div class="card">
    <h2>${encontrado.nombre}</h2>

    <p><strong>Evaluación:</strong> ${encontrado.evaluacion || "Sin evaluar"}</p>
    <p><strong>Tipo:</strong> ${encontrado.tipo}</p>
    <p><strong>Curso y semestre:</strong> ${encontrado.curso || "-"}</p>
    <p><strong>Comentarios:</strong> ${encontrado.comentarios || "-"}</p>
  </div>
`;

});
