// =============================================================================
// mapa_provincias.js
// El mapa de la Argentina por provincia, que usan varios cuadros (F3.1, F5.1 y
// F5.3). Aquí está lo común a todos: los contornos, los dos recuadros (Atlántico
// Sur y Ciudad de Buenos Aires), las etiquetas con nombre, el contorno oscuro
// de la provincia elegida, la información al pasar el cursor y el clic que
// elige otra provincia. Cada cuadro decide el color de cada provincia y qué
// provincias llevan nombre.
//
// Los contornos salen de datos/mapa_provincias.json: cada provincia tiene
// `piezas`, cada pieza es una lista de anillos y cada anillo una lista de
// puntos [x, y] en kilómetros, con "y" creciendo hacia el norte.
// También está aquí la barra de colores de las escalas continuas.
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";
import { numero, anchoTexto, marcasDelEje, mostrarInformacion, ocultarInformacion } from "./utilidades.js";

const M = P.regional.mapa;

// La nota de todo mapa de provincias: la frase de los recuadros (viene con los
// contornos, en datos/mapa_provincias.json) y la de los territorios que forman
// parte de Tierra del Fuego.
const NOTA_TIERRA_DEL_FUEGO = "La Antártida Argentina y las islas Malvinas, Georgias del Sur y Sandwich del Sur forman parte de la provincia de Tierra del Fuego y llevan su color.";
export function notaDelMapa(mapa) {
  return `${mapa.nota} ${NOTA_TIERRA_DEL_FUEGO}`;
}

// El rectángulo que hay que mostrar: el del dibujo y los dos recuadros.
function cajaDelMapa(mapa) {
  return {
    xmin: Math.min(mapa.caja.xmin, ...mapa.marcos.map(c => c.xmin)),
    xmax: Math.max(mapa.caja.xmax, ...mapa.marcos.map(c => c.xmax)),
    ymin: Math.min(mapa.caja.ymin, ...mapa.marcos.map(c => c.ymin)),
    ymax: Math.max(mapa.caja.ymax, ...mapa.marcos.map(c => c.ymax))
  };
}

// Alto del mapa para un ancho dado. El mapa es alto y angosto: el alto que pide
// el ancho tiene un tope. Si el cuadro vecino es más alto (contexto.rellenar),
// crece hasta acompañarlo; en la vista ampliada ocupa el lugar disponible.
// `topes` = los topes de alto de los parámetros que le tocan al cuadro.
export function altoDelMapa(mapa, ancho, contexto, disponible, topes = M.topes) {
  const caja = cajaDelMapa(mapa);
  const forma = (caja.ymax - caja.ymin) / (caja.xmax - caja.xmin);
  const altoPorAncho = Math.round((ancho - 2 * M.margen) * forma + 2 * M.margen);
  // El tope depende del formato de la página: con tres cuadros por fila el
  // mapa no puede hacer más alta la faja; en ventanas medianas y en el celular
  // hay más lugar a lo alto.
  const clases = document.body.classList;
  const tope = clases.contains("celular") ? topes.celular : (clases.contains("medio") ? topes.medio : topes.ancho);
  // Sin alto mínimo: en un cuadro angosto el mapa mide lo que pide su ancho
  // (un mínimo dejaría blanco arriba y abajo del dibujo).
  const propio = Math.min(tope, altoPorAncho);
  if (contexto.ampliado) return Math.max(M.altoMinimoAmpliado, disponible);
  if (contexto.rellenar) return Math.max(propio, Math.min(disponible, altoPorAncho));
  return propio;
}

// Dibujo el mapa dentro de `lugar`.
// `o` describe el mapa:
//   ancho, alto : tamaño del dibujo, en píxeles
//   color       : función (nombre de la provincia, posición) -> color de relleno
//   informacion : función (nombre, posición) -> filas del recuadro de información
//   conNombre   : nombres de las provincias que llevan etiqueta, en orden de prioridad
//   descripcion : texto para lectores de pantalla
// La "posición" es la de la provincia en la lista del archivo regional.
export function dibujarMapaProvincias(lugar, contexto, o) {
  const mapa = contexto.mapa;
  const provincias = contexto.regional.provincias;
  const elegida = contexto.provincia;
  const { ancho, alto } = o;
  const caja = cajaDelMapa(mapa);

  // De kilómetros a píxeles. En el archivo, "y" crece hacia el norte; en la
  // pantalla crece hacia abajo: por eso lo invierto. El mapa va centrado.
  const escala = Math.min((ancho - 2 * M.margen) / (caja.xmax - caja.xmin), (alto - 2 * M.margen) / (caja.ymax - caja.ymin));
  const origenX = (ancho - (caja.xmax - caja.xmin) * escala) / 2;
  const origenY = (alto - (caja.ymax - caja.ymin) * escala) / 2;
  const px = x => origenX + (x - caja.xmin) * escala;
  const py = y => origenY + (caja.ymax - y) * escala;
  const r1 = v => Math.round(v * 10) / 10;
  // El contorno de una provincia: todas sus piezas y, de cada pieza, todos sus
  // anillos (el primero es el borde; los demás, huecos).
  const contorno = provincia => provincia.piezas
    .map(pieza => pieza.map(anillo => "M" + anillo.map(([x, y]) => `${r1(px(x))},${r1(py(y))}`).join("L") + "Z").join(""))
    .join("");

  const svg = d3.create("svg")
    .attr("width", ancho).attr("height", alto).attr("viewBox", `0 0 ${ancho} ${alto}`)
    .attr("role", "img").attr("aria-label", o.descripcion).attr("class", "mapa-provincias")
    .style("font-family", "inherit").style("overflow", "visible");
  lugar.appendChild(svg.node());

  // Las provincias.
  const dibujos = new Map();
  const capaProvincias = svg.append("g");
  const indice = new Map(provincias.map((nombre, i) => [nombre, i]));
  for (const provincia of mapa.provincias) {
    const nombre = provincia.provincia;
    const i = indice.get(nombre);
    const d = contorno(provincia);
    dibujos.set(nombre, d);
    capaProvincias.append("path")
      .attr("d", d).attr("fill-rule", "evenodd")
      .attr("fill", o.color(nombre, i))
      .attr("stroke", M.colorBorde).attr("stroke-width", M.grosorBorde).attr("stroke-linejoin", "round")
      .attr("class", "provincia").attr("data-provincia", nombre)
      .on("pointermove pointerdown", evento => {
        resalte.attr("d", d).style("display", null);
        mostrarInformacion({
          titulo: nombre, codigo: "",
          filas: [...o.informacion(nombre, i), ["Clic", "elegir esta provincia"]]
        }, evento.clientX, evento.clientY, contexto.ancla);
      })
      .on("pointerleave", evento => {
        if (evento.pointerType === "touch") return;
        resalte.style("display", "none");
        ocultarInformacion();
      })
      .on("click", () => contexto.elegirProvincia(nombre));
  }

  // Los dos recuadros: rectángulo punteado y su rótulo, arriba.
  const ocupados = [];
  const capaMarcos = svg.append("g").style("pointer-events", "none");
  const rotulosDeMarcos = [];
  for (const marco of mapa.marcos) {
    capaMarcos.append("rect")
      .attr("x", px(marco.xmin)).attr("y", py(marco.ymax))
      .attr("width", (marco.xmax - marco.xmin) * escala).attr("height", (marco.ymax - marco.ymin) * escala)
      .attr("fill", "none").attr("stroke", P.colores.textoSuave).attr("stroke-width", 1).attr("stroke-dasharray", "4,3");
    const lineas = marco.rotulo.split("\n");
    const renglon = M.tamanoMarco * 1.35;
    const anchoRotulo = Math.max(...lineas.map(l => anchoTexto(l, M.tamanoMarco, true)));
    // Centrado sobre el recuadro, sin salirse del dibujo por la derecha.
    const centro = Math.min((px(marco.xmin) + px(marco.xmax)) / 2, ancho - 2 - anchoRotulo / 2);
    const base = py(marco.ymax) - 4 - lineas.length * renglon;
    const textos = lineas.map((linea, k) => capaMarcos.append("text")
      .attr("x", centro).attr("y", base + (k + 0.5) * renglon)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", M.tamanoMarco).attr("fill", P.colores.textoSuave)
      // Borde blanco alrededor de las letras: el rótulo puede quedar sobre una provincia.
      .attr("stroke", P.colores.fondoGrafico).attr("stroke-width", 3).attr("paint-order", "stroke").attr("stroke-linejoin", "round")
      .text(linea));
    rotulosDeMarcos.push({ zona: marco.zona, textos });
    ocupados.push({ x0: centro - anchoRotulo / 2, x1: centro + anchoRotulo / 2, y0: base, y1: base + lineas.length * renglon });
  }

  // La provincia elegida: contorno oscuro y grueso, por encima de todo.
  svg.append("path")
    .attr("d", dibujos.get(elegida) ?? "").attr("fill", "none").attr("fill-rule", "evenodd")
    .attr("stroke", M.colorElegida).attr("stroke-width", M.grosorElegida).attr("stroke-linejoin", "round")
    .attr("class", "provincia-elegida").style("pointer-events", "none");
  // La provincia sobre la que está el cursor.
  const resalte = svg.append("path")
    .attr("fill", "none").attr("stroke", M.colorElegida).attr("stroke-width", 1.4)
    .style("display", "none").style("pointer-events", "none");

  // Los nombres, en etiquetas de fondo blanco. Si una etiqueta pisa a otra, la
  // corro hacia arriba o hacia abajo.
  const capaNombres = svg.append("g").style("pointer-events", "none");
  const altoEtiqueta = M.tamanoNombre + 7;
  const seTocan = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  for (const nombre of new Set(o.conNombre)) {
    const provincia = mapa.provincias.find(p => p.provincia === nombre);
    if (!provincia) continue;
    const esElegida = nombre === elegida;
    // Sin punto de rótulo: la provincia está en un recuadro, que ya lleva su
    // nombre. Lo paso a negrita y oscuro, y no agrego otra etiqueta.
    if (provincia.rotulo_x == null) {
      for (const r of rotulosDeMarcos.filter(r => provincia.zonas.includes(r.zona)))
        for (const t of r.textos) t.attr("font-weight", 700).attr("fill", P.colores.texto);
      continue;
    }
    const anchoEtiqueta = anchoTexto(nombre, M.tamanoNombre, esElegida) + 10;
    const cx = Math.max(2 + anchoEtiqueta / 2, Math.min(ancho - 2 - anchoEtiqueta / 2, px(provincia.rotulo_x)));
    const cy0 = py(provincia.rotulo_y);
    let sitio = null;
    for (const paso of [0, -1, 1, -2, 2, -3, 3]) {
      const cy = cy0 + paso * (altoEtiqueta + 2);
      const cajaEtiqueta = { x0: cx - anchoEtiqueta / 2, x1: cx + anchoEtiqueta / 2, y0: cy - altoEtiqueta / 2, y1: cy + altoEtiqueta / 2 };
      if (cajaEtiqueta.y0 < 0 || cajaEtiqueta.y1 > alto) continue;
      if (ocupados.some(c => seTocan(cajaEtiqueta, c))) continue;
      sitio = { cy, caja: cajaEtiqueta };
      break;
    }
    if (!sitio) continue;      // no hay lugar: el nombre sigue apareciendo al pasar el cursor
    ocupados.push(sitio.caja);
    capaNombres.append("rect")
      .attr("x", sitio.caja.x0).attr("y", sitio.caja.y0).attr("width", anchoEtiqueta).attr("height", altoEtiqueta)
      .attr("rx", 3).attr("fill", P.colores.fondoGrafico).attr("fill-opacity", 0.92)
      .attr("stroke", P.colores.ejes).attr("stroke-width", esElegida ? 1.4 : 0.8);
    capaNombres.append("text")
      .attr("x", cx).attr("y", sitio.cy)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", M.tamanoNombre).attr("font-weight", esElegida ? 700 : 400)
      .attr("fill", P.colores.texto).attr("class", "nombre-provincia")
      .text(nombre);
  }
  return svg.node();
}

// ---- Escala continua de colores ------------------------------------------------------
// Devuelvo la función que pasa de un valor a su color, del mínimo al máximo.
export function escalaContinua(minimo, maximo) {
  const interpolar = d3[`interpolate${M.escalaContinua}`];
  return valor => interpolar((valor - minimo) / ((maximo - minimo) || 1));
}

// La barra de colores, con su título y sus marcas. Va en el lugar de la leyenda.
let numeroDeBarra = 0;
export function escribirBarraDeColores(contenedor, { titulo, minimo, maximo, elegida }) {
  contenedor.replaceChildren();
  const rotulo = document.createElement("span");
  rotulo.className = "leyenda-titulo";
  rotulo.textContent = titulo;
  contenedor.appendChild(rotulo);

  const ancho = Math.min(M.anchoBarraColores, Math.max(120, contenedor.clientWidth - 30)), altoBarra = 12, borde = 14;
  const color = escalaContinua(minimo, maximo);
  const id = `degradado-${++numeroDeBarra}`;
  const svg = d3.create("svg").attr("width", ancho + 2 * borde).attr("height", altoBarra + 20)
    .attr("class", "barra-colores").style("font-family", "inherit").style("flex", "none");
  const degradado = svg.append("defs").append("linearGradient").attr("id", id);
  for (let k = 0; k <= 10; k++)
    degradado.append("stop").attr("offset", `${k * 10}%`).attr("stop-color", color(minimo + (maximo - minimo) * k / 10));
  svg.append("rect").attr("x", borde).attr("y", 0).attr("width", ancho).attr("height", altoBarra).attr("fill", `url(#${id})`);
  const m = marcasDelEje(minimo, maximo, 4);
  for (const v of m.valores) {
    const x = borde + (v - minimo) / (maximo - minimo) * ancho;
    svg.append("line").attr("x1", x).attr("x2", x).attr("y1", altoBarra - 4).attr("y2", altoBarra).attr("stroke", P.colores.fondoGrafico);
    svg.append("text").attr("x", x).attr("y", altoBarra + 12).attr("text-anchor", "middle")
      .attr("font-size", 11).attr("fill", P.colores.textoSuave).text(numero(v, m.decimales));
  }
  contenedor.appendChild(svg.node());

  // La provincia elegida, como en las demás leyendas.
  const item = document.createElement("span");
  item.className = "leyenda-item";
  const marca = document.createElement("span");
  marca.className = "leyenda-marca leyenda-borde";
  marca.style.borderColor = M.colorElegida;
  const texto = document.createElement("span");
  texto.textContent = `Provincia elegida: ${elegida}`;
  texto.style.fontWeight = "700";
  item.append(marca, texto);
  contenedor.appendChild(item);
}
