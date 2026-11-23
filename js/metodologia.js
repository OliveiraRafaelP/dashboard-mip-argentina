// =============================================================================
// metodologia.js
// Los textos de metodología de la página. Salen de textos/metodologia.json:
//   cuadros : lo que va en el reverso de cada cuadro (título, fórmulas,
//             símbolos, cómo leer el resultado y origen);
//   general : la nota general del final de la página;
//   insumos : la lista de datos y materiales usados.
// Las fórmulas están en LaTeX y las compone KaTeX (grabado en js/vendor/katex).
// Dentro de los textos, lo que va entre signos $...$ es matemática en línea, y
// once marcadores entre llaves ({n_sectores}, {anio_matriz}...) se completan
// con los datos. Cualquier otra llave es parte de una fórmula y no se toca.
// También está aquí la tabla de correspondencia entre los sectores de la matriz
// y los de la planilla provincial, que se abre en primer plano.
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";
import { sinAcentos } from "./utilidades.js";

// ---- Marcadores -----------------------------------------------------------------
// Devuelvo una copia de los textos con los marcadores completados. `valores`
// trae un valor por marcador ({ n_sectores: 107, ... }). Las fórmulas y los
// símbolos (LaTeX) quedan como están.
export function completarTextos(textos, valores) {
  const completar = texto => texto.replace(/\{([a-z_]+)\}/g, (todo, nombre) => (nombre in valores ? String(valores[nombre]) : todo));
  const recorrer = (cosa, clave) => {
    if (clave === "formulas" || clave === "s") return cosa;
    if (typeof cosa === "string") return completar(cosa);
    if (Array.isArray(cosa)) return cosa.map(elemento => recorrer(elemento, clave));
    if (cosa && typeof cosa === "object") return Object.fromEntries(Object.entries(cosa).map(([k, v]) => [k, recorrer(v, k)]));
    return cosa;
  };
  return recorrer(textos, "");
}

// ---- Matemática -------------------------------------------------------------------
// Compongo una expresión de LaTeX dentro de `elemento`. `enBloque` = true para
// las fórmulas destacadas; false para la matemática dentro de un renglón.
function componer(elemento, latex, enBloque) {
  katex.render(latex, elemento, { displayMode: enBloque, throwOnError: false });
}

// Escribo un texto que puede traer matemática en línea entre signos $...$.
export function escribirConMatematica(elemento, texto) {
  elemento.replaceChildren();
  texto.split("$").forEach((parte, k) => {
    if (k % 2 === 0) { if (parte) elemento.append(parte); return; }
    const formula = document.createElement("span");
    componer(formula, parte, false);
    elemento.appendChild(formula);
  });
  return elemento;
}

const crear = (etiqueta, clase, texto) => {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto != null) elemento.textContent = texto;
  return elemento;
};

// ---- Reverso de un cuadro ---------------------------------------------------------
// Escribo en `cuerpo` el contenido del reverso, en cuatro bloques: las
// fórmulas, centradas; los símbolos, en lista compacta; cómo leer el
// resultado; y el origen, en letra más chica. `entrada` es la del cuadro en
// textos/metodologia.json.
export function escribirReverso(cuerpo, entrada) {
  const contenido = crear("div", "reverso-contenido");
  const bloque = (rotulo, ...elementos) => {
    const seccion = crear("div", "reverso-bloque");
    if (rotulo) seccion.appendChild(crear("h4", "reverso-rotulo", rotulo));
    seccion.append(...elementos);
    contenido.appendChild(seccion);
  };

  const formulas = crear("div", "formulas");
  for (const latex of entrada.formulas) {
    const formula = crear("div", "formula");
    componer(formula, latex, true);
    formulas.appendChild(formula);
  }
  bloque(null, formulas);

  const lista = crear("dl", "simbolos");
  for (const simbolo of entrada.simbolos) {
    const termino = crear("dt");
    componer(termino, simbolo.s, false);
    lista.append(termino, escribirConMatematica(crear("dd"), simbolo.t));
  }
  bloque("Símbolos", lista);
  bloque("Cómo leer", escribirConMatematica(crear("p", "reverso-lectura"), entrada.lectura));
  bloque("Origen", escribirConMatematica(crear("p", "reverso-origen"), entrada.origen));
  cuerpo.replaceChildren(contenido);
}

// Si una fórmula no entra a lo ancho, le achico la letra de a poco; si aun así
// no entra, queda con barra de desplazamiento propia (nunca se corta).
function ajustarFormulas(cuerpo) {
  for (const formula of cuerpo.querySelectorAll(".formula")) {
    formula.style.fontSize = "";
    let escala = 1;
    while (formula.scrollWidth > formula.clientWidth + 1 && escala > 0.72) {
      escala -= 0.07;
      formula.style.fontSize = `${Math.round(escala * 100)}%`;
    }
  }
}

// Acomodo la letra del reverso al lugar que tiene. Toda la letra del reverso
// (fórmulas, símbolos, "Cómo leer" y "Origen") crece en la misma proporción:
// busco el factor más grande, hasta el tope de los parámetros, con el que el
// contenido entra a lo alto sin desplazarse y ninguna fórmula se pasa del
// ancho. El factor nunca baja de 1 (el tamaño de base): si con 1 el contenido
// no entra, queda como antes, con desplazamiento por dentro.
// Se llama al dar vuelta el cuadro, al ampliar y cuando cambia el tamaño.
export function ajustarReverso(cuerpo) {
  const formulas = [...cuerpo.querySelectorAll(".formula")];
  for (const formula of formulas) formula.style.fontSize = "";
  const entra = factor => {
    cuerpo.style.setProperty("--factor", String(factor));
    return cuerpo.scrollHeight <= cuerpo.clientHeight + 1 && formulas.every(f => f.scrollWidth <= f.clientWidth + 1);
  };
  // Algunos cuadros (en los parámetros) pueden bajar de 1, hasta un mínimo,
  // antes de desplazarse por dentro. En la vista ampliada no hay cuadro: mínimo 1.
  const cuadro = cuerpo.closest(".cuadro")?.id.replace("cuadro-", "").replace("-", ".");
  const minimo = P.reverso.menor.cuadros.includes(cuadro) ? P.reverso.menor.factor : 1;
  let factor = 1;
  if (entra(P.reverso.factorMaximo)) factor = P.reverso.factorMaximo;
  else if (entra(1)) {
    let menor = 1, mayor = P.reverso.factorMaximo;
    for (let paso = 0; paso < P.reverso.pasos; paso++) {
      const medio = (menor + mayor) / 2;
      if (entra(medio)) menor = medio; else mayor = medio;
    }
    // Redondeo hacia abajo y vuelvo a probar: el alto no siempre crece parejo
    // con la letra (un renglón que se parte distinto puede ocupar más).
    factor = Math.floor(menor * 100) / 100;
    while (factor > 1 && !entra(factor)) factor = Math.round((factor - 0.01) * 100) / 100;
  } else if (minimo < 1) {
    // No entra con la letra de base: busco el mayor factor, entre el mínimo y
    // 1, con el que entra. Si ni con el mínimo entra, queda el mínimo y el
    // reverso se desplaza por dentro.
    factor = Math.round((1 - 0.01) * 100) / 100;
    while (factor > minimo && !entra(factor)) factor = Math.round((factor - 0.01) * 100) / 100;
    factor = Math.max(minimo, factor);
  }
  cuerpo.style.setProperty("--factor", String(factor));
  cuerpo.dataset.factor = String(factor);
  if (factor <= 1) ajustarFormulas(cuerpo);
}

// ---- Nota general e insumos, al final de la página ----------------------------------
// `abrirCorrespondencia` es la función que abre la tabla: el párrafo que la
// menciona lleva un enlace.
export function escribirNotaGeneral(seccion, general, abrirCorrespondencia) {
  const cabecera = crear("header", "faja-cabecera");
  cabecera.appendChild(crear("h2", null, general.titulo));
  // Dos columnas en ventanas anchas: los párrafos y "Alcance y límites".
  const columnas = crear("div", "columnas-metodologia");
  const columna = crear("div", "columna-parrafos");
  const columnaLimites = crear("div", "columna-limites");
  columnas.append(columna, columnaLimites);
  const ENLACE = "ver correspondencia";
  for (const parrafo of general.parrafos) {
    const p = crear("p");
    const lugar = parrafo.indexOf(ENLACE);
    if (lugar === -1) escribirConMatematica(p, parrafo);
    else {
      // Las palabras "ver correspondencia" pasan a ser un enlace que abre la tabla.
      const enlace = crear("button", "enlace", ENLACE);
      enlace.type = "button";
      enlace.addEventListener("click", abrirCorrespondencia);
      // Las comillas que rodean esas palabras quedan pegadas al enlace, sin
      // cambio de renglón entre ellas y el enlace.
      let antes = parrafo.slice(0, lugar), despues = parrafo.slice(lugar + ENLACE.length);
      const junto = crear("span", "sin-corte");
      const COMILLAS = "'\"‘’“”«»";
      if (antes && COMILLAS.includes(antes.at(-1))) { junto.append(antes.at(-1)); antes = antes.slice(0, -1); }
      junto.appendChild(enlace);
      if (despues && COMILLAS.includes(despues[0])) { junto.append(despues[0]); despues = despues.slice(1); }
      p.append(...escribirConMatematica(crear("span"), antes).childNodes, junto,
        ...escribirConMatematica(crear("span"), despues).childNodes);
    }
    columna.appendChild(p);
  }
  columnaLimites.appendChild(crear("h3", "seccion-subtitulo", general.limites_titulo));
  const limites = crear("ul", "limites");
  for (const limite of general.limites) limites.appendChild(escribirConMatematica(crear("li"), limite));
  columnaLimites.appendChild(limites);
  seccion.replaceChildren(cabecera, columnas);
}

export function escribirInsumos(seccion, insumos) {
  const cabecera = crear("header", "faja-cabecera");
  cabecera.appendChild(crear("h2", null, insumos.titulo));
  cabecera.appendChild(escribirConMatematica(crear("p"), insumos.intro));
  const tabla = crear("table", "tabla-insumos");
  const fila = tabla.createTHead().insertRow();
  for (const titulo of ["Insumo", "Descripción", "Fuente"]) {
    const th = crear("th", null, titulo);
    th.scope = "col";
    fila.appendChild(th);
  }
  const cuerpo = tabla.createTBody();
  for (const item of insumos.items) {
    const tr = cuerpo.insertRow();
    const nombre = escribirConMatematica(crear("th"), item.nombre);
    nombre.scope = "row";
    tr.append(nombre, escribirConMatematica(crear("td"), item.descripcion), escribirConMatematica(crear("td"), item.fuente));
    // En el celular cada celda lleva su rótulo delante (lo pone el CSS).
    tr.children[1].dataset.rotulo = "Descripción";
    tr.children[2].dataset.rotulo = "Fuente";
  }
  seccion.replaceChildren(cabecera, tabla);
}

// ---- Tabla de correspondencia -------------------------------------------------------
// Armo la ventana (un <dialog>, como la vista ampliada) y devuelvo la función
// que la abre. `o` = { ventana, filas, cantidadMatriz, cantidadProvincial,
// sectorElegido (función que dice el código del sector elegido ahora),
// alElegir (función que cambia el filtro) }.
export function iniciarCorrespondencia(o) {
  const { ventana, filas } = o;
  const interior = crear("div", "ampliado-interior correspondencia");
  const cabecera = crear("header", "cuadro-cabecera");
  const textos = crear("div", "cuadro-textos");
  const titulo = crear("h3", "cuadro-titulo", `Correspondencia entre los ${o.cantidadMatriz} sectores de la matriz y los ${o.cantidadProvincial} de la planilla provincial`);
  titulo.id = "titulo-correspondencia";
  textos.append(titulo, crear("p", "cuadro-subtitulo", "Un clic en una fila elige ese sector en el filtro."));
  const cerrar = crear("button", "boton-cuadro boton-cerrar", "✕");
  cerrar.type = "button";
  cerrar.title = "Cerrar (Esc)";
  cerrar.setAttribute("aria-label", "Cerrar la tabla de correspondencia");
  cerrar.addEventListener("click", () => ventana.close());
  cabecera.append(textos, cerrar);

  const barra = crear("div", "correspondencia-busqueda");
  const busqueda = crear("input");
  busqueda.type = "search";
  busqueda.placeholder = "Buscar en la tabla…";
  busqueda.setAttribute("aria-label", "Buscar en la tabla de correspondencia");
  busqueda.autocomplete = "off";
  busqueda.spellcheck = false;
  const conteo = crear("span", "correspondencia-conteo");
  conteo.setAttribute("role", "status");
  barra.append(busqueda, conteo);

  const marco = crear("div", "correspondencia-marco");
  const tabla = crear("table", "tabla-correspondencia");
  tabla.setAttribute("aria-labelledby", "titulo-correspondencia");
  const encabezado = tabla.createTHead().insertRow();
  for (const columna of ["Sector de la matriz", "Descripción", "Sector de la planilla provincial", "Criterio", "Justificación"]) {
    const th = crear("th", null, columna);
    th.scope = "col";
    encabezado.appendChild(th);
  }
  const cuerpo = tabla.createTBody();
  const renglones = filas.map(fila => {
    const tr = cuerpo.insertRow();
    tr.dataset.codigo = fila.codigo_mip;
    tr.tabIndex = 0;
    const celdas = [
      `${fila.codigo_mip} · ${fila.sector_mip}`, fila.descripcion_mip,
      `${fila.numero_52} · ${fila.sector_52}`, fila.criterio, fila.justificacion
    ];
    for (const texto of celdas) tr.appendChild(crear("td", null, texto));
    const elegir = () => { ventana.close(); o.alElegir(fila.codigo_mip); };
    tr.addEventListener("click", elegir);
    tr.addEventListener("keydown", evento => { if (evento.key === "Enter") { evento.preventDefault(); elegir(); } });
    return { tr, texto: sinAcentos(celdas.join(" ")) };
  });
  marco.appendChild(tabla);
  interior.append(cabecera, barra, marco);
  ventana.replaceChildren(interior);

  function filtrar() {
    const buscado = sinAcentos(busqueda.value.trim());
    let visibles = 0;
    for (const r of renglones) {
      const pasa = !buscado || r.texto.includes(buscado);
      r.tr.hidden = !pasa;
      if (pasa) visibles++;
    }
    conteo.textContent = visibles === renglones.length ? `${renglones.length} filas` : `${visibles} de ${renglones.length} filas`;
  }
  busqueda.addEventListener("input", filtrar);
  // Un clic en el fondo oscuro (fuera del recuadro) también cierra.
  ventana.addEventListener("click", evento => { if (evento.target === ventana) ventana.close(); });

  return function abrir() {
    busqueda.value = "";
    filtrar();
    const elegido = o.sectorElegido();
    for (const r of renglones) {
      const esElegido = r.tr.dataset.codigo === elegido;
      r.tr.classList.toggle("elegida", esElegido);
      if (esElegido) r.tr.setAttribute("aria-current", "true"); else r.tr.removeAttribute("aria-current");
    }
    ventana.showModal();
    // La tabla abre ya desplazada hasta la fila del sector elegido.
    cuerpo.querySelector("tr.elegida")?.scrollIntoView({ block: "center" });
  };
}
