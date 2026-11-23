// =============================================================================
// filtros.js
// La faja de filtros: el selector de sector (con búsqueda por texto), el
// agregado provincial al que corresponde el sector elegido y el selector de
// provincia. También leo y escribo la elección en la dirección de la página
// (#sector=S008&provincia=Neuquén), para poder compartir el enlace ya filtrado.
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";
import { sinAcentos } from "./utilidades.js";

// ---- La dirección de la página ---------------------------------------------------
// Leo la elección de la dirección. Si falta algo o no existe, uso el valor inicial.
export function leerDireccion(sectores, provincias) {
  const pares = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const sector = pares.get("sector");
  const provincia = pares.get("provincia");
  return {
    sector: sectores.some(d => d.codigo === sector) ? sector : P.inicial.sector,
    provincia: provincias.includes(provincia) ? provincia : P.inicial.provincia
  };
}

// Escribo la elección en la dirección, sin agregar pasos al botón "atrás".
export function escribirDireccion(estado) {
  const nueva = `#sector=${encodeURIComponent(estado.sector)}&provincia=${encodeURIComponent(estado.provincia)}`;
  if (window.location.hash !== nueva) history.replaceState(null, "", nueva);
}

// ---- Los filtros -------------------------------------------------------------
// `alCambiar` es la función que llamo cuando la persona elige otro sector u
// otra provincia: recibe { sector } o { provincia }.
// Devuelvo `mostrar(estado)`, que pone en pantalla la elección actual.
export function iniciarFiltros({ sectores, provincias, regional, alCambiar }) {
  const entrada = document.getElementById("filtro-sector");
  const lista = document.getElementById("lista-sectores");
  const agregado = document.getElementById("agregado-provincial");
  const selectorProvincia = document.getElementById("filtro-provincia");

  // Al lado del rótulo de cada campo digo cuántos elementos hay. Los cuento
  // en los datos: no los escribo a mano.
  document.getElementById("conteo-sectores").textContent = `· ${sectores.length} sectores de la matriz`;
  document.getElementById("conteo-agregado").textContent = `· ${regional.cantidadSectores} sectores`;
  document.getElementById("conteo-provincias").textContent = `· ${provincias.length} jurisdicciones`;

  // Texto de cada sector en el selector: "S008 · Extrac. petróleo/gas".
  const rotulo = d => `${d.codigo} · ${d.nombre}`;
  const opciones = sectores.map(d => ({ sector: d, texto: rotulo(d), busqueda: sinAcentos(rotulo(d)) }));
  let elegido = null;      // el sector elegido ahora
  let visibles = [];       // las opciones que pasan la búsqueda
  let activa = -1;         // la opción resaltada con las flechas del teclado

  function cerrar() {
    lista.hidden = true;
    entrada.setAttribute("aria-expanded", "false");
    entrada.removeAttribute("aria-activedescendant");
    if (elegido) entrada.value = rotulo(elegido);
  }

  function resaltar(indice) {
    activa = indice;
    [...lista.children].forEach((li, i) => li.classList.toggle("activa", i === activa));
    const li = lista.children[activa];
    if (li) { li.scrollIntoView({ block: "nearest" }); entrada.setAttribute("aria-activedescendant", li.id); }
  }

  // Abro la lista con las opciones que contienen el texto escrito.
  function abrir(texto) {
    const buscado = sinAcentos(texto.trim());
    visibles = buscado ? opciones.filter(o => o.busqueda.includes(buscado)) : opciones;
    lista.replaceChildren();
    visibles.forEach((o, i) => {
      const li = document.createElement("li");
      li.id = `opcion-sector-${o.sector.codigo}`;
      li.setAttribute("role", "option");
      li.textContent = o.texto;
      if (o.sector === elegido) { li.setAttribute("aria-selected", "true"); li.classList.add("elegida"); }
      // pointerdown y no click: así elijo antes de que el campo pierda el foco.
      li.addEventListener("pointerdown", evento => { evento.preventDefault(); elegir(i); });
      lista.appendChild(li);
    });
    if (visibles.length === 0) {
      const li = document.createElement("li");
      li.className = "sin-resultados";
      li.textContent = "Ningún sector coincide con la búsqueda";
      lista.appendChild(li);
    }
    lista.hidden = false;
    entrada.setAttribute("aria-expanded", "true");
    const actual = visibles.findIndex(o => o.sector === elegido);
    resaltar(buscado ? 0 : actual);
  }

  function elegir(indice) {
    const opcion = visibles[indice];
    if (!opcion) return;
    elegido = opcion.sector;
    cerrar();
    entrada.blur();
    alCambiar({ sector: elegido.codigo });
  }

  entrada.addEventListener("focus", () => { entrada.select(); abrir(""); });
  entrada.addEventListener("input", () => abrir(entrada.value));
  entrada.addEventListener("blur", cerrar);
  entrada.addEventListener("keydown", evento => {
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      if (lista.hidden) return abrir("");
      const paso = evento.key === "ArrowDown" ? 1 : -1;
      if (visibles.length) resaltar((activa + paso + visibles.length) % visibles.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (!lista.hidden) elegir(activa);
    } else if (evento.key === "Escape") {
      cerrar();
      entrada.blur();
    }
  });

  // Provincias: una lista simple, en el orden del archivo regional.
  for (const provincia of provincias) {
    const opcion = document.createElement("option");
    opcion.value = provincia;
    opcion.textContent = provincia;
    selectorProvincia.appendChild(opcion);
  }
  selectorProvincia.addEventListener("change", () => alCambiar({ provincia: selectorProvincia.value }));

  return function mostrar(estado) {
    elegido = sectores.find(d => d.codigo === estado.sector);
    entrada.value = rotulo(elegido);
    agregado.textContent = elegido.sector_52;
    selectorProvincia.value = estado.provincia;
  };
}
