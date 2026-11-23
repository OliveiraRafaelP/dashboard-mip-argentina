// =============================================================================
// utilidades.js
// Herramientas que usan todos los gráficos:
//   - escribir números con coma decimal y punto de millar;
//   - el recuadro de información que aparece al pasar el cursor (o al tocar);
//   - la leyenda;
//   - la colocación de los nombres de los sectores sin que se pisen entre sí
//     ni tapen los puntos.
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";

// ---- Números ----------------------------------------------------------------
// numero(1.0319) -> "1,03" ; numero(3282290.3, 0) -> "3.282.290"
export function numero(valor, decimales = P.formato.decimales) {
  return new Intl.NumberFormat(P.formato.idioma, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  }).format(valor);
}

// porcentaje(4.2051) -> "4,21 %" (el valor ya viene en porcentaje).
export function porcentaje(valor, decimales = P.formato.decimales) {
  return `${numero(valor, decimales)}\u00a0%`;
}

// Números chicos escritos con letras ("diez sectores"); los demás, con cifras.
const PALABRAS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];
export function enPalabras(cantidad) {
  return PALABRAS[cantidad] ?? String(cantidad);
}

// La fuente que va al pie de los cuadros hechos con la matriz.
export function fuente() {
  return `Fuente: elaboración propia con la matriz insumo-producto de Argentina ${P.anioMatriz} (Haddad, Araújo y Elosegui, 2026).`;
}

// Paso un texto a minúsculas y sin acentos, para que la búsqueda del filtro
// encuentre "petroleo" aunque el nombre diga "petróleo".
export function sinAcentos(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Mediana de una lista de números.
export function mediana(valores) {
  return d3.median(valores);
}

// ---- Piezas comunes de los gráficos ---------------------------------------------
export const TAMANO_EJES = 11;   // tamaño de la letra de los ejes, en píxeles

// Escribo la nota al pie: las frases de la nota y la de la fuente van una
// después de la otra, en un solo párrafo de texto corrido.
export function escribirNota(contenedor, frases) {
  const p = document.createElement("p");
  p.textContent = frases.join(" ");
  contenedor.replaceChildren(p);
}

// Marcas "redondas" para un eje, y cuántos decimales hacen falta para escribirlas
// (así el eje dice 0,50 - 0,75 - 1,00 y no 0,5 - 0,75 - 1).
export function marcasDelEje(desde, hasta, cantidad) {
  const valores = d3.ticks(desde, hasta, Math.max(2, cantidad));
  let decimales = 0;
  while (decimales < 4 && valores.some(v => Math.abs(v * 10 ** decimales - Math.round(v * 10 ** decimales)) > 1e-9)) decimales++;
  return { valores, decimales };
}

// Estilo común de los gráficos de Plot.
export function estiloBase() {
  return {
    fontFamily: "inherit",
    fontSize: `${TAMANO_EJES}px`,
    background: P.colores.fondoGrafico,
    color: P.colores.textoSuave,
    overflow: "visible"
  };
}

// Alto de un gráfico dentro de su cuadro.
//   - En el cuadro: el ancho por la proporción (otra proporción en el celular),
//     con un mínimo.
//   - En la segunda pasada del dibujo (contexto.rellenar): si el cuadro vecino
//     es más alto, el gráfico crece hasta acompañarlo, sin pasar de la
//     proporción máxima.
//   - En la vista ampliada: todo el lugar disponible.
// `o` = { proporcion, proporcionMaxima, proporcionCelular, altoMinimo, altoMaximo };
// altoMaximo evita gráficos demasiado altos cuando el cuadro ocupa todo el ancho.
// `descuento` = píxeles del contenedor ya ocupados por otra cosa (un título de eje).
export function altoDelGrafico(contenedor, contexto, o, descuento = 0) {
  const ancho = contenedor.clientWidth;
  const disponible = contenedor.clientHeight - descuento;
  const celular = document.body.classList.contains("celular");
  const tope = celular ? Infinity : (o.altoMaximo ?? Infinity);   // en el celular el cuadro nunca es ancho: no hace falta tope
  const propio = Math.max(o.altoMinimo, Math.min(tope, Math.round(ancho * (celular ? o.proporcionCelular : o.proporcion))));
  if (contexto.ampliado) return Math.max(o.altoMinimo, disponible);
  if (contexto.rellenar) return Math.max(propio, Math.min(disponible, Math.round(ancho * o.proporcionMaxima)));
  return propio;
}

// ---- Recuadro de información ---------------------------------------------------
// Hay uno solo para toda la página. Lo muestro cerca del cursor y cuido que no
// se salga de la pantalla.
let recuadro = null;

function crearRecuadro() {
  recuadro = document.createElement("div");
  recuadro.className = "informacion";
  recuadro.setAttribute("role", "status");
  recuadro.hidden = true;
  document.body.appendChild(recuadro);
}

// `contenido` = { titulo, codigo, filas: [[rótulo, valor], ...] }
export function mostrarInformacion(contenido, clienteX, clienteY, ancla = document.body) {
  if (!recuadro) crearRecuadro();
  // Si el gráfico está dentro de la ventana ampliada, el recuadro tiene que
  // estar dentro de ella para quedar por encima.
  if (recuadro.parentElement !== ancla) ancla.appendChild(recuadro);

  recuadro.replaceChildren();
  const cabecera = document.createElement("div");
  cabecera.className = "informacion-titulo";
  cabecera.textContent = contenido.titulo;
  const codigo = document.createElement("span");
  codigo.className = "informacion-codigo";
  codigo.textContent = contenido.codigo;
  cabecera.appendChild(codigo);
  recuadro.appendChild(cabecera);
  for (const [rotulo, valor] of contenido.filas) {
    const fila = document.createElement("div");
    fila.className = "informacion-fila";
    const izquierda = document.createElement("span");
    izquierda.textContent = rotulo;
    const derecha = document.createElement("strong");
    derecha.textContent = valor;
    fila.append(izquierda, derecha);
    recuadro.appendChild(fila);
  }

  recuadro.hidden = false;
  const caja = recuadro.getBoundingClientRect();
  const separacion = 14;
  let x = clienteX + separacion;
  let y = clienteY + separacion;
  if (x + caja.width > window.innerWidth - 8) x = clienteX - separacion - caja.width;
  if (y + caja.height > window.innerHeight - 8) y = clienteY - separacion - caja.height;
  recuadro.style.left = `${Math.max(8, x)}px`;
  recuadro.style.top = `${Math.max(8, y)}px`;
}

export function ocultarInformacion() {
  if (recuadro) recuadro.hidden = true;
}

// ---- Leyenda -----------------------------------------------------------------
// `elementos` = [{ texto, color, forma, borde, negrita }] ; forma: "punto", "barra", "anillo" o "borde".
export function escribirLeyenda(contenedor, elementos) {
  contenedor.replaceChildren();
  for (const elemento of elementos) {
    const item = document.createElement("span");
    item.className = "leyenda-item";
    const marca = document.createElement("span");
    marca.className = `leyenda-marca leyenda-${elemento.forma}`;
    if (elemento.forma === "anillo" || elemento.forma === "borde") marca.style.borderColor = elemento.color;
    else marca.style.background = elemento.color;
    // Un punto relleno con borde de otro color (el sector elegido en F2.3).
    if (elemento.borde) { marca.style.border = `2px solid ${elemento.borde}`; marca.style.boxSizing = "content-box"; }
    const texto = document.createElement("span");
    texto.textContent = elemento.texto;
    if (elemento.negrita) texto.style.fontWeight = "700";
    item.append(marca, texto);
    contenedor.appendChild(item);
  }
}

// ---- Medir textos ------------------------------------------------------------
// Para saber cuánto lugar ocupa un nombre antes de escribirlo.
const lienzo = document.createElement("canvas").getContext("2d");
export function anchoTexto(texto, tamano, negrita = false) {
  const familia = getComputedStyle(document.body).fontFamily;
  lienzo.font = `${negrita ? 700 : 400} ${tamano}px ${familia}`;
  return lienzo.measureText(texto).width;
}

// ---- Nombres sin superposición --------------------------------------------------
// ¿Se tocan dos rectángulos? Cada uno es { x0, y0, x1, y1 }.
function seTocan(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}
// ¿Un segmento { x1, y1, x2, y2 } pasa por dentro de un rectángulo? Lo reviso
// caminando por el segmento de a pasos cortos.
function cruza(segmento, caja) {
  const largo = Math.hypot(segmento.x2 - segmento.x1, segmento.y2 - segmento.y1);
  const pasos = Math.max(1, Math.ceil(largo / 2));
  for (let i = 0; i <= pasos; i++) {
    const x = segmento.x1 + (segmento.x2 - segmento.x1) * i / pasos;
    const y = segmento.y1 + (segmento.y2 - segmento.y1) * i / pasos;
    if (x > caja.x0 && x < caja.x1 && y > caja.y0 && y < caja.y1) return true;
  }
  return false;
}
// La línea que une un punto con la caja de su nombre: del borde del punto al
// borde más cercano de la caja.
function lineaGuia(e, caja) {
  const bx = Math.max(caja.x0, Math.min(e.x, caja.x1));
  const by = Math.max(caja.y0, Math.min(e.y, caja.y1));
  const largo = Math.hypot(bx - e.x, by - e.y) || 1;
  return { x1: e.x + (bx - e.x) / largo * (e.r + 1), y1: e.y + (by - e.y) / largo * (e.r + 1), x2: bx, y2: by };
}
// ¿Un rectángulo toca un círculo { x, y, r }?
function tocaCirculo(caja, c) {
  const cercaX = Math.max(caja.x0, Math.min(c.x, caja.x1));
  const cercaY = Math.max(caja.y0, Math.min(c.y, caja.y1));
  return (cercaX - c.x) ** 2 + (cercaY - c.y) ** 2 < c.r ** 2;
}

// colocarEtiquetas: escribe los nombres en el grupo `g` (un <g> de SVG).
//   etiquetas  : [{ x, y, r, texto, negrita, color, obligatoria }] en orden de
//                importancia; (x, y) es el centro del punto y r su radio.
//                Las obligatorias (el sector elegido) se colocan primero y
//                nunca se descartan: los demás nombres les ceden el lugar.
//   puntos     : [{ x, y, r }] todos los puntos del gráfico (no se pueden tapar).
//   ocupados   : rectángulos ya ocupados (por ejemplo, los rótulos de las esquinas).
//   area       : { x0, y0, x1, y1 } el interior del gráfico.
// Para cada nombre pruebo varias posiciones alrededor de su punto, de la más
// cercana a la más lejana, y me quedo con la primera que no toca nada. Si el
// nombre queda lejos, dibujo una línea fina que lo une a su punto; esa línea
// tampoco puede pasar por encima de otro nombre. Si no hay
// lugar, no lo escribo: el nombre sigue apareciendo al pasar el cursor.
// Un nombre obligatorio que no encuentra lugar libre se escribe igual, en la
// posición que tapa menos puntos (nunca encima de otro nombre ni fuera del
// gráfico, salvo que el gráfico sea más angosto que el nombre).
// Devuelvo la lista de los textos que no entraron.
export function colocarEtiquetas(g, { etiquetas, puntos, ocupados, area, tamano }) {
  const alto = tamano * 1.4;
  const colocadas = [...ocupados];
  const guias = [];        // las líneas ya dibujadas
  const omitidas = [];
  const distancias = [3, 9, 16, 24, 34, 46, 60, 76];
  // Direcciones: derecha, izquierda, arriba, abajo y las cuatro diagonales.
  // Las cuatro últimas (con un tercer valor) son arriba o abajo con el texto
  // empezando o terminando a la altura del punto: sirven cuando el punto está
  // pegado a un borde del gráfico y el texto centrado se saldría.
  const direcciones = [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1],
                       [0, -1, 1], [0, 1, 1], [0, -1, -1], [0, 1, -1]];

  const enOrden = [...etiquetas.filter(e => e.obligatoria), ...etiquetas.filter(e => !e.obligatoria)];
  for (const e of enOrden) {
    const ancho = anchoTexto(e.texto, tamano, e.negrita) + 2;
    let elegida = null;
    busqueda:
    for (const d of distancias) {
      for (const [dx, dy, alineado] of direcciones) {
        const separacion = e.r + d;
        // Centro de la caja del texto, según la dirección.
        const cx = alineado
          ? e.x + alineado * (ancho / 2 - e.r)
          : e.x + dx * (separacion + ancho / 2) * (dy !== 0 && dx !== 0 ? 0.75 : 1);
        const cy = e.y + dy * (separacion + alto / 2) * (dy !== 0 && dx !== 0 ? 0.75 : 1);
        const caja = { x0: cx - ancho / 2, y0: cy - alto / 2, x1: cx + ancho / 2, y1: cy + alto / 2 };
        if (caja.x0 < area.x0 || caja.x1 > area.x1 || caja.y0 < area.y0 || caja.y1 > area.y1) continue;
        if (colocadas.some(c => seTocan(caja, c))) continue;
        if (puntos.some(p => tocaCirculo(caja, { x: p.x, y: p.y, r: p.r + 1.5 }))) continue;
        if (guias.some(g0 => cruza(g0, caja))) continue;
        const guia = d > 9 ? lineaGuia(e, caja) : null;
        if (guia && colocadas.some(c => cruza(guia, c))) continue;
        elegida = { caja, cx, cy, guia };
        break busqueda;
      }
    }
    if (!elegida && e.obligatoria) {
      // Sin lugar libre: pruebo las mismas posiciones y me quedo con la que
      // tapa menos puntos, sin pisar otro nombre ni su propio punto.
      let menos = Infinity;
      for (const d of distancias) {
        for (const [dx, dy, alineado] of direcciones) {
          const separacion = e.r + d;
          const diagonal = dy !== 0 && dx !== 0 ? 0.75 : 1;
          let cx = alineado ? e.x + alineado * (ancho / 2 - e.r) : e.x + dx * (separacion + ancho / 2) * diagonal;
          let cy = e.y + dy * (separacion + alto / 2) * diagonal;
          // La caja se corre lo necesario para quedar dentro del gráfico.
          cx = Math.max(area.x0 + ancho / 2, Math.min(area.x1 - ancho / 2, cx));
          cy = Math.max(area.y0 + alto / 2, Math.min(area.y1 - alto / 2, cy));
          const caja = { x0: cx - ancho / 2, y0: cy - alto / 2, x1: cx + ancho / 2, y1: cy + alto / 2 };
          if (tocaCirculo(caja, { x: e.x, y: e.y, r: e.r })) continue;
          if (colocadas.some(c => seTocan(caja, c))) continue;
          const tapados = puntos.filter(p => tocaCirculo(caja, { x: p.x, y: p.y, r: p.r })).length;
          if (tapados < menos) { menos = tapados; elegida = { caja, cx, cy, guia: d > 9 ? lineaGuia(e, caja) : null }; }
        }
      }
    }
    if (!elegida) { omitidas.push(e.texto); continue; }
    colocadas.push(elegida.caja);

    if (elegida.guia) {
      guias.push(elegida.guia);
      g.append("line")
        .attr("x1", elegida.guia.x1).attr("y1", elegida.guia.y1)
        .attr("x2", elegida.guia.x2).attr("y2", elegida.guia.y2)
        .attr("stroke", e.color).attr("stroke-width", 0.9).attr("stroke-opacity", 0.75);
    }
    g.append("text")
      .attr("x", elegida.cx).attr("y", elegida.cy)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", tamano).attr("font-weight", e.negrita ? 700 : 400)
      .attr("fill", e.color)
      // Borde blanco alrededor de las letras, para que la grilla no las cruce.
      .attr("stroke", P.colores.fondoGrafico).attr("stroke-width", 3).attr("paint-order", "stroke")
      .attr("stroke-linejoin", "round")
      .text(e.texto);
  }
  return omitidas;
}
