// =============================================================================
// graficos_faja6.js
// Los dos cuadros de la faja 6, "Destino de las exportaciones". Reaccionan al
// sector elegido:
//   F6.1  Mapa de los destinos      (modelo: figura 05_mapa_destinos_S008)
//   F6.2  Destinos en barras
//
// Los datos salen de datos/exportaciones.json:
//   resumen    : una fila por sector con apertura por destino (total en dólares,
//                parte confidencial, cantidad de países);
//   destinos   : una fila por sector y país (valor FOB en dólares y participación);
//                el país "Confidencial" lleva el código que dicen los parámetros;
//   flechas    : los destinos que llevan flecha (nombre a escribir, nombre del
//                país en el mapa y longitud y latitud de la capital);
//   posiciones : las posiciones del Sistema Armonizado de cada sector.
// El mapa se dibuja con datos/mapa_mundo.json: países en grados de longitud y
// latitud, sin proyección.
//
// La apertura por destino existe solo para algunos sectores. Para los demás,
// los dos cuadros muestran un aviso y botones para pasar a un sector que la tiene.
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";
import {
  numero, porcentaje, enPalabras, fuente, escribirNota, escribirLeyenda, marcasDelEje, estiloBase,
  TAMANO_EJES, anchoTexto, mostrarInformacion, ocultarInformacion
} from "./utilidades.js";
import { limpiar, tituloDeEje } from "./graficos_fajas3y4.js";

const X = P.exportaciones;

// De dólares a millones de dólares, escrito: sin decimales si el valor es grande.
function enMillones(dolares) {
  const valor = dolares / X.divisorDolares;
  return numero(valor, valor >= 10 ? 0 : 1);
}
const fuenteExportaciones = () =>
  `Fuente: elaboración propia con las bases de exportaciones de ${P.anioExportaciones} del INDEC (dólares FOB).`;

// Lo que los dos cuadros necesitan saber del sector elegido. Si el sector no
// tiene apertura por destino, `resumen` queda vacío.
function exportacionesDelSector(contexto) {
  const exp = contexto.exportaciones;
  const codigo = contexto.elegido.codigo;
  const deEste = lista => lista.filter(fila => fila.sector === codigo);
  const destinos = deEste(exp.destinos);
  // Las flechas, de mayor a menor. Si dos destinos caen en el mismo país del
  // mapa (pasa con China y Hong Kong), dibujo solo la del mayor; el otro no
  // lleva flecha y sigue apareciendo, con su nombre, en el cuadro de barras.
  const paisesConFlecha = new Set();
  const todasLasFlechas = deEste(exp.flechas).sort((a, b) => b.participacion - a.participacion);
  const flechas = todasLasFlechas.filter(f => !paisesConFlecha.has(f.pais_ne) && paisesConFlecha.add(f.pais_ne));
  // Los países de las barras de F6.2: los primeros, uno por uno, y "Otros
  // países" con la suma de los demás. La nota del mapa usa la misma cuenta.
  const paises = destinos.filter(f => f.pais !== X.codigoConfidencial).sort((a, b) => b.participacion - a.participacion);
  const primeros = paises.slice(0, X.barras.cantidad), resto = paises.slice(X.barras.cantidad);
  // Los destinos con barra propia que quedaron sin flecha propia porque caen
  // sobre el país de otra flecha (Hong Kong sobre China), con el país que los cubre.
  const conBarra = new Set(primeros.map(f => f.nombre));
  const sobreOtro = todasLasFlechas.filter(f => !flechas.includes(f) && conBarra.has(f.nombre))
    .map(f => ({ ...f, cubre: flechas.find(g => g.pais_ne === f.pais_ne) }));
  return {
    resumen: exp.resumen.find(fila => fila.sector === codigo),
    paises, primeros, resto,
    otros: resto.reduce((s, f) => s + f.participacion, 0),
    confidencial: destinos.find(f => f.pais === X.codigoConfidencial),
    flechas, sobreOtro,
    posiciones: deEste(exp.posiciones).map(f => f.posicion)
  };
}

// ---- Sector sin apertura por destino -------------------------------------------------
// En lugar del gráfico: un aviso, las exportaciones del sector según la matriz
// y los sectores que sí tienen apertura, como botones que cambian el filtro.
function avisoSinDestinos(partes, contexto) {
  const d = contexto.elegido;
  partes.titulo.textContent = `Destino de las exportaciones de ${d.nombre}`;
  partes.subtitulo.textContent = "";
  partes.controles.replaceChildren();
  partes.leyenda.replaceChildren();
  escribirNota(partes.nota, [fuente()]);
  const contenedor = partes.grafico;
  limpiar(contenedor);

  const aviso = document.createElement("div");
  aviso.className = "mensaje-vacio mensaje-destinos";
  const parrafo = (texto, clase) => {
    const p = document.createElement("p");
    if (clase) p.className = clase;
    p.textContent = texto;
    aviso.appendChild(p);
  };
  const enMatriz = d.d_exp / P.unidades.divisor;
  const conApertura = contexto.exportaciones.resumen;
  parrafo("El destino de las exportaciones no está disponible para este sector.", "mensaje-principal");
  parrafo(`Exportaciones del sector en la matriz insumo-producto: ${numero(enMatriz, enMatriz >= 10 ? 0 : 1)} ${P.unidades.texto} (${porcentaje(d.d_exp_pct, 1)} de las exportaciones del país).`);
  parrafo(`La apertura por país de destino se hizo para ${enPalabras(conApertura.length)} sectores:`);
  const botones = document.createElement("div");
  botones.className = "botones-sectores";
  for (const fila of conApertura) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-sector";
    boton.textContent = `${fila.sector} · ${fila.nombre}`;
    boton.addEventListener("click", () => contexto.elegirSector(fila.sector));
    botones.appendChild(boton);
  }
  aviso.appendChild(botones);
  contenedor.appendChild(aviso);
}

// =============================================================================
// F6.1  Mapa de los destinos
// =============================================================================
export function dibujarMapaDestinos(partes, contexto) {
  const e = exportacionesDelSector(contexto);
  if (!e.resumen) return avisoSinDestinos(partes, contexto);
  const d = contexto.elegido;
  const mundo = contexto.mundo;
  const C = X.mapa;

  partes.titulo.textContent = `${d.nombre}: ¿a dónde van sus exportaciones? (${P.anioExportaciones})`;
  partes.subtitulo.textContent = `Participación de cada país en las exportaciones del sector. Flechas: países con al menos ${porcentaje(P.umbralFlecha * 100, 0)} (hasta ${P.maxFlechas}). Total: ${enMillones(e.resumen.total_usd)} millones de dólares`;
  partes.controles.replaceChildren();
  escribirLeyenda(partes.leyenda, [
    { texto: "Argentina", color: X.colores.argentina, forma: "barra" },
    { texto: "País de destino con flecha", color: X.colores.destino, forma: "barra" },
    { texto: "Flecha: más gruesa cuanto mayor la participación", color: X.colores.flecha, forma: "linea" }
  ]);
  escribirNota(partes.nota, [
    // "Otros países" solo si hay países fuera de las barras (si no, el valor es cero).
    `Sin flecha: ${e.resto.length ? `otros países (${porcentaje(e.otros * 100, 1)}) y ` : ""}destino confidencial (${porcentaje(e.resumen.confidencial * 100, 1)}). Posiciones del Sistema Armonizado: ${e.posiciones.join(", ")}.`,
    "Las flechas llegan a la capital de cada país o cerca de ella.",
    // Destinos con barra propia y sin flecha propia: en el mapa caen sobre otro país.
    ...e.sobreOtro.map(f => `${f.corto} (${porcentaje(f.participacion * 100, 1)}) no lleva flecha propia: en el mapa queda sobre ${f.cubre.corto}.`),
    // La fuente va siempre al final; la del mapa, junto a ella.
    `${fuenteExportaciones()} Mapa: Natural Earth.`
  ]);

  const contenedor = partes.grafico;
  limpiar(contenedor);
  const ancho = contenedor.clientWidth;
  // Sin proyección: un grado de longitud mide lo mismo que uno de latitud. El
  // alto sale del ancho y de la ventana del mapa. En la vista ampliada achico
  // el mapa si hace falta para que entre a lo alto.
  const V = mundo.ventana;
  const grados = { ancho: V.xmax - V.xmin, alto: V.ymax - V.ymin };
  let escala = ancho / grados.ancho;
  if (contexto.ampliado) escala = Math.min(escala, Math.max(120, contenedor.clientHeight) / grados.alto);
  const alto = Math.round(grados.alto * escala);
  const origenX = (ancho - grados.ancho * escala) / 2;
  const px = x => origenX + (x - V.xmin) * escala;
  const py = y => (V.ymax - y) * escala;
  const r1 = v => Math.round(v * 10) / 10;
  const contorno = pais => pais.piezas
    .map(pieza => pieza.map(anillo => "M" + anillo.map(([x, y]) => `${r1(px(x))},${r1(py(y))}`).join("L") + "Z").join(""))
    .join("");

  const svg = d3.create("svg")
    .attr("width", ancho).attr("height", alto).attr("viewBox", `0 0 ${ancho} ${alto}`)
    .attr("role", "img").attr("aria-label", `Mapa del mundo: países de destino de las exportaciones de ${d.nombre}.`)
    .attr("class", "mapa-mundo").style("font-family", "inherit");
  contenedor.appendChild(svg.node());
  // Lo que queda fuera de la ventana no se ve.
  const idRecorte = `recorte-mundo-${contexto.ampliado ? "ampliado" : "cuadro"}`;
  svg.append("defs").append("clipPath").attr("id", idRecorte)
    .append("rect").attr("x", px(V.xmin)).attr("y", 0).attr("width", grados.ancho * escala).attr("height", alto);

  // Valor en dólares de cada destino (está en `destinos`, no en `flechas`).
  const fobDe = new Map(e.paises.map(f => [f.nombre, f.fob]));
  const informacion = f => ({
    titulo: f.nombre, codigo: "",
    filas: [
      ["Participación en las exportaciones del sector", porcentaje(f.participacion * 100, 1)],
      ["Valor", `${enMillones(fobDe.get(f.nombre) ?? f.participacion * e.resumen.total_usd)} millones de dólares`]
    ]
  });
  const mostrar = f => evento => mostrarInformacion(informacion(f), evento.clientX, evento.clientY, contexto.ancla);
  const esconder = evento => { if (evento.pointerType !== "touch") ocultarInformacion(); };

  // Los países. La flecha principal de cada país de destino (si hay dos
  // destinos dentro del mismo país del mapa, la de mayor participación).
  const flechaDelPais = new Map();
  for (const f of e.flechas) if (!flechaDelPais.has(f.pais_ne)) flechaDelPais.set(f.pais_ne, f);
  const capaPaises = svg.append("g").attr("clip-path", `url(#${idRecorte})`);
  const dibujoDelPais = new Map();
  for (const pais of mundo.paises) {
    const f = flechaDelPais.get(pais.nombre);
    const relleno = pais.grupo === "argentina" ? X.colores.argentina : (f ? X.colores.destino : X.colores.pais);
    const dibujo = capaPaises.append("path")
      .attr("d", contorno(pais)).attr("fill-rule", "evenodd").attr("fill", relleno)
      .attr("stroke", P.colores.fondoGrafico).attr("stroke-width", 0.5).attr("stroke-linejoin", "round");
    if (pais.grupo === "argentina") dibujo.attr("class", "pais-argentina");
    else if (f) {
      dibujo.attr("class", "pais-destino").attr("data-pais", pais.nombre)
        .on("pointermove pointerdown", mostrar(f)).on("pointerleave", esconder);
      dibujoDelPais.set(pais.nombre, { pais, nodo: dibujo.node() });
    }
  }

  // Dónde llega cada flecha: a la capital. Los contornos están simplificados y
  // alguna capital (en la costa, o en un país muy chico) queda apenas fuera
  // del dibujo de su país; en ese caso corro la llegada lo mínimo necesario
  // hacia adentro, para que la flecha termine sobre el país pintado.
  // Pruebo siempre el punto ya redondeado, que es el que se dibuja.
  const dentro = (nodo, x, y) => { const p = svg.node().createSVGPoint(); p.x = r1(x); p.y = r1(y); return nodo.isPointInFill(p); };
  function llegada(f) {
    const capital = { x: px(f.x), y: py(f.y) };
    const destino = dibujoDelPais.get(f.pais_ne);
    if (!destino || dentro(destino.nodo, capital.x, capital.y)) return capital;
    // El punto del contorno más cercano a la capital y el centro de esa pieza:
    // pruebo puntos desde el borde hacia el centro.
    let cerca = null, menor = Infinity, anilloCercano = null;
    for (const pieza of destino.pais.piezas) for (const [x, y] of pieza[0]) {
      const distancia = Math.hypot(px(x) - capital.x, py(y) - capital.y);
      if (distancia < menor) { menor = distancia; cerca = { x: px(x), y: py(y) }; anilloCercano = pieza[0]; }
    }
    const puntos = anilloCercano.map(([x, y]) => [px(x), py(y)]);
    const [cx, cy] = d3.polygonCentroid(puntos);
    for (const paso of [0.15, 0.3, 0.5, 0.75, 1]) {
      const x = cerca.x + (cx - cerca.x) * paso, y = cerca.y + (cy - cerca.y) * paso;
      if (dentro(destino.nodo, x, y)) return { x, y };
    }
    // Si el país es tan chico o tan angosto que eso no alcanza, busco en una
    // rejilla fina, dentro de su rectángulo, el punto interior más cercano a la capital.
    const [x0, x1] = d3.extent(puntos, p => p[0]), [y0, y1] = d3.extent(puntos, p => p[1]);
    let mejor = null, distanciaMejor = Infinity;
    for (let i = 0; i <= 20; i++) for (let k = 0; k <= 20; k++) {
      const x = x0 + (x1 - x0) * i / 20, y = y0 + (y1 - y0) * k / 20;
      const distancia = Math.hypot(x - capital.x, y - capital.y);
      if (distancia < distanciaMejor && dentro(destino.nodo, x, y)) { mejor = { x, y }; distanciaMejor = distancia; }
    }
    return mejor ?? capital;
  }
  const llegadaDe = new Map(e.flechas.map(f => [f, llegada(f)]));

  // Las flechas: de Buenos Aires a la capital de cada destino, en curva. El
  // grosor es proporcional a la participación. En cuadros angostos, todo más fino.
  const reduccion = Math.max(C.reduccionMinima, Math.min(1, ancho / C.anchoReferencia));
  const origen = { x: px(mundo.origen.x), y: py(mundo.origen.y) };
  const capaFlechas = svg.append("g");
  const llegadas = [];
  for (const f of [...e.flechas].reverse()) {          // las más gruesas, al final: quedan arriba
    const fin = llegadaDe.get(f);
    llegadas.push(fin);
    const dx = fin.x - origen.x, dy = fin.y - origen.y;
    const largo = Math.hypot(dx, dy) || 1;
    // El punto que curva la flecha: al costado del punto medio.
    const control = { x: (origen.x + fin.x) / 2 + dy / largo * largo * C.curvatura, y: (origen.y + fin.y) / 2 - dx / largo * largo * C.curvatura };
    const grosor = Math.max(C.grosorMinimo, f.participacion * C.grosorPorUnidad * reduccion);
    // La punta: un triángulo en la dirección en que llega la curva.
    const tx = fin.x - control.x, ty = fin.y - control.y, t = Math.hypot(tx, ty) || 1;
    const ux = tx / t, uy = ty / t;
    const largoPunta = Math.min(largo * 0.5, Math.max(7, grosor * 1.6)), mediaPunta = Math.max(3.5, grosor * 0.95);
    const base = { x: fin.x - ux * largoPunta, y: fin.y - uy * largoPunta };
    const curva = `M${r1(origen.x)},${r1(origen.y)}Q${r1(control.x)},${r1(control.y)} ${r1(base.x)},${r1(base.y)}`;
    capaFlechas.append("path").attr("d", curva).attr("fill", "none")
      .attr("stroke", X.colores.flecha).attr("stroke-width", grosor).attr("stroke-opacity", C.opacidad)
      .attr("class", "flecha").attr("data-destino", f.corto).style("pointer-events", "none");
    capaFlechas.append("path")
      .attr("d", `M${r1(fin.x)},${r1(fin.y)}L${r1(base.x - uy * mediaPunta)},${r1(base.y + ux * mediaPunta)}L${r1(base.x + uy * mediaPunta)},${r1(base.y - ux * mediaPunta)}Z`)
      .attr("fill", X.colores.flecha).attr("class", "punta-flecha").attr("data-destino", f.corto).attr("data-pais", f.pais_ne)
      .style("pointer-events", "none");
    // Una franja invisible sobre la curva, más ancha, para acertar con el cursor.
    capaFlechas.append("path").attr("d", curva).attr("fill", "none")
      .attr("stroke", "transparent").attr("stroke-width", Math.max(12, grosor + 6)).attr("class", "franja-flecha")
      .on("pointermove pointerdown", mostrar(f)).on("pointerleave", esconder);
  }

  // Las etiquetas "País x,x %", de fondo blanco, cerca de la punta de cada
  // flecha y sin pisarse. Pruebo posiciones cada vez más lejos; si queda
  // lejos, una línea fina la une a su punto. Si no hay lugar, no la escribo
  // (el dato sigue en el recuadro de información y en el cuadro de barras).
  const tamano = ancho < C.anchoAngosto ? C.tamanoEtiquetaAngosto : C.tamanoEtiqueta;
  const altoEtiqueta = tamano + 7;
  const capaEtiquetas = svg.append("g");
  const colocadas = [];
  const seTocan = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const direcciones = [[0, -1], [1, 0], [-1, 0], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
  for (const f of e.flechas) {
    const fin = llegadaDe.get(f);
    const texto = `${f.corto} ${porcentaje(f.participacion * 100, 1)}`;
    const anchoEtiqueta = anchoTexto(texto, tamano) + 10;
    let sitio = null;
    busqueda:
    for (const distancia of C.distanciasEtiqueta) {
      for (const [sx, sy] of direcciones) {
        const cx = fin.x + sx * (distancia + anchoEtiqueta / 2) * (sx && sy ? 0.6 : 1);
        const cy = fin.y + sy * (distancia + altoEtiqueta / 2);
        const caja = { x0: cx - anchoEtiqueta / 2, x1: cx + anchoEtiqueta / 2, y0: cy - altoEtiqueta / 2, y1: cy + altoEtiqueta / 2 };
        if (caja.x0 < 2 || caja.x1 > ancho - 2 || caja.y0 < 2 || caja.y1 > alto - 2) continue;
        if (colocadas.some(c => seTocan(caja, c))) continue;
        // No tapo la punta de ninguna flecha ni la ciudad de origen.
        if ([...llegadas, origen].some(p => p.x > caja.x0 - 4 && p.x < caja.x1 + 4 && p.y > caja.y0 - 4 && p.y < caja.y1 + 4)) continue;
        sitio = { cx, cy, caja, lejos: distancia > C.distanciasEtiqueta[0] };
        break busqueda;
      }
    }
    if (!sitio) continue;
    colocadas.push(sitio.caja);
    if (sitio.lejos) {
      const bx = Math.max(sitio.caja.x0, Math.min(fin.x, sitio.caja.x1)), by = Math.max(sitio.caja.y0, Math.min(fin.y, sitio.caja.y1));
      capaEtiquetas.append("line").attr("x1", fin.x).attr("y1", fin.y).attr("x2", bx).attr("y2", by)
        .attr("stroke", P.colores.ejes).attr("stroke-width", 0.9).style("pointer-events", "none");
    }
    capaEtiquetas.append("rect")
      .attr("x", sitio.caja.x0).attr("y", sitio.caja.y0).attr("width", anchoEtiqueta).attr("height", altoEtiqueta)
      .attr("rx", 3).attr("fill", P.colores.fondoGrafico).attr("fill-opacity", 0.94)
      .attr("stroke", P.colores.ejes).attr("stroke-width", 0.8).attr("class", "etiqueta-destino")
      .on("pointermove pointerdown", mostrar(f)).on("pointerleave", esconder);
    capaEtiquetas.append("text")
      .attr("x", sitio.cx).attr("y", sitio.cy)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", tamano).attr("fill", P.colores.texto).attr("class", "nombre-destino")
      .style("pointer-events", "none")
      .text(texto);
  }
}

// =============================================================================
// F6.2  Destinos en barras
// =============================================================================
export function dibujarBarrasDestinos(partes, contexto) {
  const e = exportacionesDelSector(contexto);
  if (!e.resumen) return avisoSinDestinos(partes, contexto);
  const d = contexto.elegido;
  const B = X.barras, R = P.regional.barras;

  // Los primeros países; después, la suma de los demás y el destino confidencial.
  // El archivo trae el nombre oficial de cada país, a veces muy largo; si el
  // país tiene nombre corto (los que llevan flecha lo tienen), uso ese.
  const nombreCorto = new Map(contexto.exportaciones.flechas.map(f => [f.nombre, f.corto]));
  const { primeros, resto } = e;
  const filas = primeros.map(f => ({ clave: f.pais, nombre: nombreCorto.get(f.nombre) ?? f.nombre, oficial: f.nombre, parte: f.participacion, fob: f.fob, color: X.colores.barras }));
  if (resto.length) filas.push({
    clave: "otros", nombre: "Otros países", color: X.colores.otros, cantidad: resto.length,
    parte: e.otros, fob: resto.reduce((s, f) => s + f.fob, 0)
  });
  if (e.confidencial && e.confidencial.fob > 0) filas.push({
    clave: "confidencial", nombre: "Confidencial", color: X.colores.confidencial, parte: e.confidencial.participacion, fob: e.confidencial.fob
  });

  partes.titulo.textContent = `${d.nombre}: principales destinos de las exportaciones (${P.anioExportaciones})`;
  partes.subtitulo.textContent = `Participación de cada destino en las exportaciones del sector, en dólares FOB. ${e.resumen.n_paises} países de destino`;
  partes.controles.replaceChildren();
  escribirLeyenda(partes.leyenda, [
    { texto: primeros.length < e.paises.length ? `Los ${primeros.length} primeros países` : "Países de destino", color: X.colores.barras, forma: "barra" },
    ...(resto.length ? [{ texto: `Otros países (${resto.length})`, color: X.colores.otros, forma: "barra" }] : []),
    ...(filas.some(f => f.clave === "confidencial") ? [{ texto: "Destino confidencial", color: X.colores.confidencial, forma: "barra" }] : [])
  ]);
  escribirNota(partes.nota, ["Entre paréntesis: valor en millones de dólares.", fuenteExportaciones()]);

  const contenedor = partes.grafico;
  limpiar(contenedor);
  const ancho = contenedor.clientWidth;
  const margenArriba = 4, margenAbajo = 22, margenDerecho = 6, altoEje = 24;
  let altoFila = B.altoFila;
  if (contexto.ampliado || contexto.rellenar) {
    const disponible = (contenedor.clientHeight - altoEje - margenArriba - margenAbajo) / filas.length;
    const tope = B.altoFila * (contexto.ampliado ? R.estiramientoAmpliado : B.estiramientoMaximo);
    altoFila = Math.max(B.altoFila, Math.min(tope, disponible));
  }
  // Si aun así un nombre ocupa demasiado, lo corto con puntos suspensivos (el
  // nombre entero queda en el recuadro de información).
  const anchoMaximoNombre = ancho * B.anchoMaximoNombre;
  for (const f of filas) {
    f.rotulo = f.nombre;
    while (f.rotulo.length > 4 && anchoTexto(f.rotulo, TAMANO_EJES) > anchoMaximoNombre) f.rotulo = f.rotulo.slice(0, -2).trimEnd() + "…";
  }
  const margenIzquierdo = Math.ceil(Math.max(...filas.map(f => anchoTexto(f.rotulo, TAMANO_EJES)))) + 12;
  const anchoBarras = ancho - margenIzquierdo - margenDerecho;
  const enPorcentaje = f => f.parte * 100;
  // El texto al final de la barra; en cuadros angostos, más corto.
  const largo = f => `${porcentaje(enPorcentaje(f), 1)}  (${enMillones(f.fob)} millones de USD)`;
  const corto = f => `${porcentaje(enPorcentaje(f), 1)}  (${enMillones(f.fob)})`;
  const lugar = texto => Math.max(...filas.map(f => anchoTexto(texto(f), TAMANO_EJES))) + 24;
  const texto = anchoBarras - lugar(largo) >= B.anchoMinimoBarras ? largo : corto;
  const mayor = Math.max(...filas.map(enPorcentaje));
  const maximo = mayor * anchoBarras / Math.max(40, anchoBarras - lugar(texto));
  const m = marcasDelEje(0, maximo, Math.round(anchoBarras / 90));

  const svg = Plot.plot({
    width: ancho,
    height: Math.round(filas.length * altoFila + margenArriba + margenAbajo),
    marginTop: margenArriba, marginRight: margenDerecho, marginBottom: margenAbajo, marginLeft: margenIzquierdo,
    style: estiloBase(),
    ariaLabel: `Barras: participación de cada destino en las exportaciones de ${d.nombre}.`,
    color: { type: "identity" },
    x: { domain: [0, maximo], ticks: m.valores, tickFormat: v => numero(v, m.decimales), tickSize: 0, grid: true, label: null },
    y: { type: "band", domain: filas.map(f => f.clave), axis: null, padding: R.separacion },
    marks: [
      Plot.barX(filas, { x: enPorcentaje, y: "clave", fill: "color" }),
      Plot.text(filas, { x: 0, y: "clave", text: "rotulo", textAnchor: "end", dx: -8, fill: P.colores.texto }),
      Plot.text(filas, { x: enPorcentaje, y: "clave", text: texto, textAnchor: "start", dx: 7, fill: P.colores.texto })
    ]
  });
  contenedor.appendChild(svg);
  tituloDeEje(contenedor, "Participación en las exportaciones del sector (%)", "x");

  const escalaY = svg.scale("y");
  const capa = d3.select(svg).append("g");
  for (const f of filas) {
    capa.append("rect")
      .attr("x", 0).attr("width", ancho)
      .attr("y", escalaY.apply(f.clave) - (escalaY.step - escalaY.bandwidth) / 2).attr("height", escalaY.step)
      .attr("fill", "transparent").attr("class", "franja-fila")
      .on("pointermove pointerdown", evento => mostrarInformacion({
        titulo: f.oficial ?? f.nombre, codigo: "",
        filas: [
          ["Participación en las exportaciones del sector", porcentaje(enPorcentaje(f), 1)],
          ["Valor", `${enMillones(f.fob)} millones de dólares`],
          ...(f.cantidad ? [["Países", String(f.cantidad)]] : [])
        ]
      }, evento.clientX, evento.clientY, contexto.ancla))
      .on("pointerleave", evento => { if (evento.pointerType !== "touch") ocultarInformacion(); });
  }
}

// La lista que usa la página: el nombre que pongo en el HTML (data-grafico) y su función.
export const GRAFICOS_FAJA6 = {
  mapaDestinos: dibujarMapaDestinos,
  barrasDestinos: dibujarBarrasDestinos
};
