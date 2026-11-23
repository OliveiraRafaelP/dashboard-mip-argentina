// =============================================================================
// graficos_faja2.js
// Los tres cuadros de la faja 2, "Extracción hipotética de sectores":
//   F2.1  Cascada de la pérdida                 (modelo: figura 03_cascada)
//   F2.2  Sectores más afectados                (modelo: figura 03_sectores_mas_afectados)
//   F2.3  El sector frente a los demás sectores (modelo: figura 03_comparacion_107_sectores)
//
// La pregunta de la faja: si el sector elegido dejara de existir (pongo en cero
// su fila, su columna y su demanda final), ¿cuánto dejaría de producir el país?
//
// Datos:
//   datos/sectores_mip.json         una fila por sector, con los totales de su extracción
//   datos/extraccion_afectados.json los sectores que más pierden en cada extracción
// Los valores en pesos vienen en millones; los muestro en miles de millones
// (el divisor está en js/parametros.js). Las variaciones vienen con signo
// negativo; aquí las muestro como pérdida, en positivo.
//
// Igual que en la faja 1: la base de cada gráfico la hace Observable Plot y los
// detalles (líneas de unión de la cascada, nombres sin superposición,
// información al pasar el cursor) los agrego con D3.
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";
import {
  numero, porcentaje, fuente, escribirNota, escribirLeyenda, marcasDelEje, estiloBase,
  TAMANO_EJES, altoDelGrafico, anchoTexto, colocarEtiquetas, mostrarInformacion, ocultarInformacion
} from "./utilidades.js";

const E = P.extraccion;

// De millones de pesos (como vienen en los archivos) a la unidad que muestro.
const enUnidad = valor => valor / P.unidades.divisor;
// "miles de millones de pesos de <año de la matriz>"
const textoUnidad = () => `${P.unidades.texto} de ${P.anioMatriz}`;

// Preparo el lugar del gráfico: lo vacío y le saco las clases de otros arreglos.
function limpiar(contenedor) {
  contenedor.replaceChildren();
  contenedor.classList.remove("paneles-lado", "paneles-cuatro");
}

// Un título de eje escrito como texto común (puede ocupar dos renglones).
function tituloDeEje(contenedor, texto, cual) {
  const titulo = document.createElement("div");
  titulo.className = `eje-titulo eje-titulo-${cual}`;
  titulo.textContent = texto;
  contenedor.appendChild(titulo);
  return titulo;
}

// =============================================================================
// F2.1  Cascada
// =============================================================================
// Cuatro barras. Las tres primeras se apilan, cada una desde donde termina la
// anterior: lo que el sector vendía a la demanda final, lo que vendía como
// insumo y lo que dejan de producir los demás. La cuarta es el total, desde cero.
export function dibujarCascada(partes, contexto) {
  const d = contexto.elegido;
  const C = E.cascada;

  partes.titulo.textContent = `Argentina sin ${d.nombre}: ¿de dónde viene la pérdida de producción?`;
  partes.subtitulo.textContent = `Por cada peso que deja de producir el sector, los demás sectores dejan de producir ${numero(d.arrastre)} pesos`;
  partes.controles.replaceChildren();
  escribirLeyenda(partes.leyenda, [
    { texto: "Producción del propio sector", color: E.colores.propio, forma: "barra" },
    { texto: "Producción de los demás sectores", color: E.colores.demas, forma: "barra" },
    { texto: "Total", color: E.colores.total, forma: "barra" }
  ]);
  escribirNota(partes.nota, [
    `Extracción hipotética: fila, columna y demanda final del sector ${d.codigo} en cero.`,
    fuente()
  ]);

  // Qué parte del VBP total de la economía es cada escalón. Para el total y
  // para los demás sectores el dato viene en el archivo; para los dos primeros
  // lo saco por proporción con el total.
  const parteDelTotal = valor => valor / d.T_total * d.T_total_pct;
  const escalones = [
    { clave: "demanda", rotulo: "Demanda final\ndel sector", angosto: "Demanda\nfinal\ndel sector", valor: d.cascada_demanda_final, pct: parteDelTotal(d.cascada_demanda_final), color: E.colores.propio },
    { clave: "ventas", rotulo: "Ventas intermedias\ndel sector", angosto: "Ventas\nintermedias\ndel sector", valor: d.cascada_ventas_intermedias, pct: parteDelTotal(d.cascada_ventas_intermedias), color: E.colores.propio },
    { clave: "demas", rotulo: "Demás sectores\n(proveedores)", angosto: "Demás\nsectores\n(proveedores)", valor: d.cascada_demas_sectores, pct: d.T_sin_propio_pct, color: E.colores.demas },
    { clave: "total", rotulo: "Pérdida total\n(Tj)", angosto: "Pérdida\ntotal\n(Tj)", valor: d.T_total, pct: d.T_total_pct, color: E.colores.total, desdeCero: true }
  ];
  let acumulado = 0;
  for (const e of escalones) {
    e.desde = e.desdeCero ? 0 : acumulado;
    e.hasta = e.desde + e.valor;
    if (!e.desdeCero) acumulado = e.hasta;
    e.abajo = enUnidad(Math.min(e.desde, e.hasta));
    e.arriba = enUnidad(Math.max(e.desde, e.hasta));
  }

  const contenedor = partes.grafico;
  limpiar(contenedor);
  const tituloY = tituloDeEje(contenedor, `↑ Pérdida de producción (${textoUnidad()})`, "y");
  const ancho = contenedor.clientWidth;
  const alto = altoDelGrafico(contenedor, contexto, C, tituloY.offsetHeight + 6);

  // El texto sobre cada barra: el valor y, entre paréntesis, la parte del VBP
  // total. Si no entra en el ancho de una barra, lo parto en tres renglones.
  const margenIzquierdo = 46, margenArriba = 8, margenDerecho = 6;
  const paso = (ancho - margenIzquierdo - margenDerecho) / escalones.length;
  // Los nombres de las barras, debajo del eje: en dos renglones si entran en el
  // ancho de una barra; si no, en tres; y si aun así no entran, achico la letra.
  const anchoDe = (rotulo, tamano) => Math.max(...rotulo.split("\n").map(linea => anchoTexto(linea, tamano)));
  const entra = campo => escalones.every(e => anchoDe(e[campo], TAMANO_EJES) <= paso - 6);
  const campoRotulo = entra("rotulo") ? "rotulo" : "angosto";
  const masAncho = Math.max(...escalones.map(e => anchoDe(e[campoRotulo], TAMANO_EJES)));
  const tamanoRotulo = Math.max(C.tamanoMinimoRotulo, Math.min(TAMANO_EJES, TAMANO_EJES * (paso - 6) / masAncho));
  const renglones = Math.max(...escalones.map(e => e[campoRotulo].split("\n").length));
  const margenAbajo = Math.round(renglones * tamanoRotulo * 1.2 + 16);
  const entraEnDos = escalones.every(e => anchoTexto(`(${porcentaje(e.pct)} del VBP total)`, TAMANO_EJES) <= paso - 4);
  for (const e of escalones) {
    e.texto = entraEnDos
      ? `${numero(enUnidad(e.valor), 0)}\n(${porcentaje(e.pct)} del VBP total)`
      : `${numero(enUnidad(e.valor), 0)}\n(${porcentaje(e.pct)} del\nVBP total)`;
  }
  // Dejo lugar arriba de la barra más alta para ese texto.
  const altoTexto = (entraEnDos ? 2 : 3) * TAMANO_EJES * 1.25 + 10;
  const altoUtil = alto - margenArriba - margenAbajo;
  const minimo = Math.min(0, ...escalones.map(e => e.abajo));
  const mayor = Math.max(...escalones.map(e => e.arriba));
  const maximo = minimo + (mayor - minimo) * altoUtil / Math.max(60, altoUtil - altoTexto);
  const m = marcasDelEje(minimo, maximo, Math.round(alto / 70));
  const rotuloDe = new Map(escalones.map(e => [e.clave, e[campoRotulo]]));

  const svg = Plot.plot({
    width: ancho, height: alto,
    marginTop: margenArriba, marginRight: margenDerecho, marginBottom: margenAbajo, marginLeft: margenIzquierdo,
    style: estiloBase(),
    ariaLabel: "Gráfico de cascada: componentes de la pérdida de producción al extraer el sector.",
    color: { type: "identity" },
    x: { domain: escalones.map(e => e.clave), axis: null, padding: C.separacion },
    y: { domain: [minimo, maximo], ticks: m.valores, tickFormat: v => numero(v, m.decimales), tickSize: 0, grid: true, label: null },
    marks: [
      Plot.axisX({ tickFormat: clave => rotuloDe.get(clave), tickSize: 0, label: null, fontSize: tamanoRotulo }),
      Plot.barY(escalones, { x: "clave", y1: "abajo", y2: "arriba", fill: "color" }),
      Plot.ruleY([0], { stroke: P.colores.ejes, strokeWidth: 1 }),
      Plot.text(escalones, { x: "clave", y: "arriba", text: "texto", dy: -6, lineAnchor: "bottom", fill: P.colores.texto, fontSize: TAMANO_EJES })
    ]
  });
  contenedor.appendChild(svg);

  const escalaX = svg.scale("x"), escalaY = svg.scale("y");
  const capa = d3.select(svg).append("g");
  // Líneas punteadas que unen el final de una barra con el comienzo de la siguiente.
  for (let i = 0; i < escalones.length - 1; i++) {
    const y = escalaY.apply(enUnidad(escalones[i].hasta));
    capa.append("line")
      .attr("x1", escalaX.apply(escalones[i].clave) + escalaX.bandwidth).attr("x2", escalaX.apply(escalones[i + 1].clave))
      .attr("y1", y).attr("y2", y)
      .attr("stroke", P.colores.textoSuave).attr("stroke-width", 1.2).attr("stroke-dasharray", "5,4");
  }
  // Información al pasar el cursor: una franja por barra, de arriba abajo.
  const arribaArea = Math.min(...escalaY.range), abajoArea = Math.max(...escalaY.range);
  for (const e of escalones) {
    capa.append("rect")
      .attr("x", escalaX.apply(e.clave) - (escalaX.step - escalaX.bandwidth) / 2).attr("width", escalaX.step)
      .attr("y", arribaArea).attr("height", abajoArea - arribaArea)
      .attr("fill", "transparent").attr("class", "franja-fila")
      .on("pointermove pointerdown", evento => {
        mostrarInformacion({
          titulo: e.rotulo.replace("\n", " "), codigo: d.codigo,
          filas: [
            ["Pérdida de producción", `${numero(enUnidad(e.valor), 0)} ${P.unidades.texto}`],
            ["Parte del VBP total", porcentaje(e.pct)],
            ["Sector extraído", d.nombre]
          ]
        }, evento.clientX, evento.clientY, contexto.ancla);
      })
      .on("pointerleave", evento => { if (evento.pointerType !== "touch") ocultarInformacion(); });
  }
}

// =============================================================================
// F2.2  Sectores más afectados
// =============================================================================
// Barras horizontales: los sectores que más pierden cuando se extrae el elegido,
// del que más pierde al que menos. Un clic en una barra elige ese sector.
export function dibujarAfectados(partes, contexto) {
  const d = contexto.elegido;
  const A = E.afectados;
  const n = d.n_afectados;
  const filas = (contexto.afectados.get(d.codigo) ?? []).map(f => ({
    sector: contexto.porCodigo.get(f.codigo),
    puesto: f.puesto,
    perdida: enUnidad(-f.d_vbp),          // en el archivo es negativa: la muestro como pérdida
    pct: -f.d_vbp_pct                     // % de la producción del sector afectado
  })).sort((a, b) => a.puesto - b.puesto);

  partes.controles.replaceChildren();
  partes.leyenda.replaceChildren();
  escribirNota(partes.nota, ["No incluye al propio sector extraído.", fuente()]);
  const contenedor = partes.grafico;
  limpiar(contenedor);

  // Caso especial: el sector no compra insumos a nadie y nadie pierde.
  if (n === 0 || filas.length === 0) {
    partes.titulo.textContent = `Sectores que pierden si se extrae ${d.nombre}`;
    partes.subtitulo.textContent = "";
    const mensaje = document.createElement("p");
    mensaje.className = "mensaje-vacio";
    mensaje.textContent = "Al extraer este sector, ningún otro sector pierde producción.";
    contenedor.appendChild(mensaje);
    return;
  }

  partes.titulo.textContent = `Los ${n} sectores que más pierden si se extrae ${d.nombre}`;
  partes.subtitulo.textContent = `Entre paréntesis, la pérdida como porcentaje de la producción de cada sector. Estos ${n} sectores concentran el ${porcentaje(d.pct_afectados, 0)} de la pérdida de los demás sectores`;

  const ancho = contenedor.clientWidth;
  const margenArriba = 4, margenAbajo = 22, margenDerecho = 6, altoEje = 24;
  // Alto de cada fila: el de los parámetros; crece si el cuadro vecino es más
  // alto y, en la vista ampliada, hasta ocupar el lugar disponible.
  let altoFila = A.altoFila;
  if (contexto.ampliado || contexto.rellenar) {
    const disponible = (contenedor.clientHeight - altoEje - margenArriba - margenAbajo) / filas.length;
    const tope = A.altoFila * (contexto.ampliado ? A.estiramientoAmpliado : A.estiramientoMaximo);
    altoFila = Math.max(A.altoFila, Math.min(tope, disponible));
  }

  const margenIzquierdo = Math.ceil(Math.max(...filas.map(f => anchoTexto(f.sector.nombre, TAMANO_EJES)))) + 12;
  const anchoBarras = ancho - margenIzquierdo - margenDerecho;
  // El texto al final de la barra. Si el cuadro es angosto, acorto el paréntesis
  // (el subtítulo ya dice qué significa).
  const largo = f => `${numero(f.perdida, 1)}  (${porcentaje(f.pct, 1)} de su producción)`;
  const corto = f => `${numero(f.perdida, 1)}  (${porcentaje(f.pct, 1)})`;
  const lugar = texto => Math.max(...filas.map(f => anchoTexto(texto(f), TAMANO_EJES))) + 14;
  const texto = anchoBarras - lugar(largo) >= A.anchoMinimoBarras ? largo : corto;
  const mayor = Math.max(...filas.map(f => f.perdida));
  const maximo = mayor * anchoBarras / Math.max(40, anchoBarras - lugar(texto));
  const m = marcasDelEje(0, maximo, Math.round(anchoBarras / 90));
  const clave = f => f.sector.codigo;

  const svg = Plot.plot({
    width: ancho,
    height: Math.round(filas.length * altoFila + margenArriba + margenAbajo),
    marginTop: margenArriba, marginRight: margenDerecho, marginBottom: margenAbajo, marginLeft: margenIzquierdo,
    style: estiloBase(),
    ariaLabel: "Barras: los sectores que más producción pierden al extraer el sector elegido.",
    x: { domain: [0, maximo], ticks: m.valores, tickFormat: v => numero(v, m.decimales), tickSize: 0, grid: true, label: null },
    y: { domain: filas.map(clave), axis: null, padding: A.separacion },
    marks: [
      Plot.barX(filas, { x: "perdida", y: clave, fill: E.colores.demas }),
      Plot.text(filas, { x: 0, y: clave, text: f => f.sector.nombre, textAnchor: "end", dx: -8, fill: P.colores.texto }),
      Plot.text(filas, { x: "perdida", y: clave, text: texto, textAnchor: "start", dx: 7, fill: P.colores.texto })
    ]
  });
  contenedor.appendChild(svg);
  tituloDeEje(contenedor, `Pérdida de producción (${textoUnidad()})`, "x");

  // Una franja por fila: información al pasar el cursor y, con un clic, el
  // filtro pasa al sector de esa barra.
  const escalaY = svg.scale("y");
  const capa = d3.select(svg).append("g");
  for (const f of filas) {
    capa.append("rect")
      .attr("x", 0).attr("width", ancho)
      .attr("y", escalaY.apply(clave(f)) - (escalaY.step - escalaY.bandwidth) / 2).attr("height", escalaY.step)
      .attr("fill", "transparent").attr("class", "franja-fila franja-clic")
      .on("pointermove pointerdown", evento => {
        mostrarInformacion({
          titulo: f.sector.nombre, codigo: f.sector.codigo,
          filas: [
            ["Pérdida de producción", `${numero(f.perdida, 1)} ${P.unidades.texto}`],
            ["Parte de su producción", porcentaje(f.pct, 1)],
            ["Puesto", `${f.puesto} de ${n}`],
            ["Clic", "elegir este sector"]
          ]
        }, evento.clientX, evento.clientY, contexto.ancla);
      })
      .on("pointerleave", evento => { if (evento.pointerType !== "touch") ocultarInformacion(); })
      .on("click", () => contexto.elegirSector(f.sector.codigo));
  }
}

// =============================================================================
// F2.3  El sector frente a los demás sectores
// =============================================================================
// Cuatro paneles. En cada uno, un punto por sector: la altura es cuánto pierde
// la economía en esa variable (en % de su total) cuando se extrae ese sector.
const PANELES = [
  { titulo: "Producción (VBP)", campo: "T_total_pct" },
  { titulo: "Valor agregado (VAB)", campo: "d_vab_pct" },
  { titulo: "Impuestos (IP + IVA)", campo: "d_imp_pct" },
  { titulo: "Exportaciones", campo: "d_exp_pct" }
];

// La posición horizontal no mide nada: solo separa los puntos. La saco del
// número del sector con una cuenta fija, para que cada punto quede siempre en
// el mismo lugar aunque cambie el filtro. Devuelve un valor entre 0 y 1.
function desplazamiento(numeroSector) {
  const s = Math.sin(numeroSector * E.comparacion.semilla) * 10000;
  return s - Math.floor(s);
}

export function dibujarComparacion(partes, contexto) {
  const { sectores, elegido } = contexto;
  const C = E.comparacion;

  partes.titulo.textContent = "¿Qué pierde la economía argentina si se extrae cada sector?";
  partes.subtitulo.textContent = `Cada punto es uno de los ${sectores.length} sectores. Altura: pérdida, en % del total de la economía en esa variable, cuando se extrae ese sector`;
  partes.controles.replaceChildren();
  escribirLeyenda(partes.leyenda, [
    { texto: `${elegido.codigo} · ${elegido.nombre}`, color: E.colores.demas, borde: P.colores.destacado, forma: "punto", negrita: true },
    { texto: "Cada uno de los demás sectores", color: E.colores.puntos, forma: "punto" }
  ]);
  escribirNota(partes.nota, [
    "La posición horizontal no mide nada: solo separa los puntos. Exportaciones: las del propio sector extraído. Impuestos negativos: sectores que reciben subsidios netos.",
    fuente()
  ]);

  const contenedor = partes.grafico;
  limpiar(contenedor);
  const tituloY = tituloDeEje(contenedor, "↑ Pérdida (% del total de la economía)", "y");
  const ancho = contenedor.clientWidth;
  const alto = altoDelGrafico(contenedor, contexto, C, tituloY.offsetHeight + 6);

  // Cuatro paneles lado a lado; si no entran (celular), dos filas de dos.
  const separacion = 14, altoTitulo = 24;
  const columnas = (ancho - separacion * (PANELES.length - 1)) / PANELES.length >= C.anchoMinimoPanel ? PANELES.length : PANELES.length / 2;
  const filasDePaneles = PANELES.length / columnas;
  const anchoPanel = Math.floor((ancho - separacion * (columnas - 1)) / columnas);
  const altoPanel = Math.floor((alto - filasDePaneles * altoTitulo - separacion * (filasDePaneles - 1)) / filasDePaneles);
  const rejilla = document.createElement("div");
  rejilla.className = "paneles-rejilla";
  rejilla.style.gridTemplateColumns = `repeat(${columnas}, ${anchoPanel}px)`;
  rejilla.style.gap = `${separacion}px`;
  contenedor.appendChild(rejilla);

  // Posición horizontal de cada punto: los demás, repartidos en la zona de la
  // derecha; el elegido, a la izquierda.
  const [zonaDesde, zonaHasta] = C.zonaPuntos;
  const posX = d => (d === elegido ? C.posicionElegido : zonaDesde + desplazamiento(d.numero) * (zonaHasta - zonaDesde));
  const otros = sectores.filter(d => d !== elegido);

  for (const panel of PANELES) {
    const caja = document.createElement("div");
    caja.className = "panel";
    const titulo = document.createElement("div");
    titulo.className = "panel-titulo panel-titulo-fuerte";
    titulo.textContent = panel.titulo;
    caja.appendChild(titulo);
    rejilla.appendChild(caja);

    const { campo } = panel;
    let [y0, y1] = d3.extent(sectores, d => d[campo]);
    const aire = (y1 - y0) * C.margenVertical;
    y0 -= aire; y1 += aire;
    const m = marcasDelEje(y0, y1, Math.round(altoPanel / 60));

    const svg = Plot.plot({
      width: anchoPanel, height: altoPanel,
      marginTop: 6, marginRight: 4, marginBottom: 8, marginLeft: 40,
      style: estiloBase(),
      ariaLabel: `Puntos: pérdida de ${panel.titulo} al extraer cada sector, en % del total.`,
      x: { domain: [0, 1], axis: null },
      y: { domain: [y0, y1], ticks: m.valores, tickFormat: v => porcentaje(v, m.decimales), tickSize: 0, grid: true, label: null },
      marks: [
        Plot.dot(otros, { x: posX, y: campo, r: C.radio, fill: E.colores.puntos, stroke: P.colores.fondoGrafico, strokeWidth: 0.8 }),
        Plot.dot([elegido], { x: posX, y: campo, r: C.radioDestacado, fill: E.colores.demas, stroke: P.colores.destacado, strokeWidth: C.grosorDestacado })
      ]
    });
    caja.appendChild(svg);

    const escalaX = svg.scale("x"), escalaY = svg.scale("y");
    const px = d => escalaX.apply(posX(d)), py = d => escalaY.apply(d[campo]);
    const area = {
      x0: Math.min(...escalaX.range), x1: Math.max(...escalaX.range),
      y0: Math.min(...escalaY.range), y1: Math.max(...escalaY.range)
    };
    const capa = d3.select(svg).append("g").attr("class", "capa-rotulos");

    // Con nombre: el elegido (en negrita) y, en gris, el de mayor y el de menor valor del panel.
    const ordenados = [...sectores].sort((a, b) => b[campo] - a[campo]);
    const conNombre = [elegido, ordenados[0], ordenados[ordenados.length - 1]].filter((s, i, lista) => lista.indexOf(s) === i);
    const radioElegido = C.radioDestacado + C.grosorDestacado / 2;
    const puntos = sectores.map(s => ({ x: px(s), y: py(s), r: s === elegido ? radioElegido : C.radio }));
    colocarEtiquetas(capa, {
      etiquetas: conNombre.map(s => ({
        x: px(s), y: py(s), r: s === elegido ? radioElegido : C.radio,
        texto: s.nombre, negrita: s === elegido,
        obligatoria: s === elegido,   // el nombre del sector elegido se escribe siempre
        color: s === elegido ? P.colores.destacado : P.colores.textoSuave
      })),
      puntos, ocupados: [], area, tamano: P.etiquetas.tamano
    });

    // Información al pasar el cursor: el punto más cercano; dentro del círculo
    // rojo del sector elegido, el elegido (como en la faja 1).
    const puestoDe = s => 1 + sectores.filter(o => o[campo] > s[campo]).length;   // 1 = el de mayor pérdida
    const anillo = capa.append("circle").attr("r", C.radio + 3.5)
      .attr("fill", "none").attr("stroke", P.colores.texto).attr("stroke-width", 1.5)
      .style("display", "none").style("pointer-events", "none");
    const apagar = () => { anillo.style("display", "none"); ocultarInformacion(); };
    d3.select(svg).append("rect")
      .attr("x", area.x0).attr("y", area.y0).attr("width", area.x1 - area.x0).attr("height", area.y1 - area.y0)
      .attr("fill", "transparent")
      .on("pointermove pointerdown", evento => {
        const [mx, my] = d3.pointer(evento, svg);
        let mejor = null, menor = C.distanciaInformacion;
        if (Math.hypot(px(elegido) - mx, py(elegido) - my) <= radioElegido) mejor = elegido;
        else for (const s of sectores) {
          const distancia = Math.hypot(px(s) - mx, py(s) - my);
          if (distancia < menor) { menor = distancia; mejor = s; }
        }
        if (!mejor) return apagar();
        anillo.attr("cx", px(mejor)).attr("cy", py(mejor)).style("display", null);
        mostrarInformacion({
          titulo: mejor.nombre, codigo: mejor.codigo,
          filas: [
            [panel.titulo, porcentaje(mejor[campo])],
            ["Puesto", `${puestoDe(mejor)} de ${sectores.length}`]
          ]
        }, evento.clientX, evento.clientY, contexto.ancla);
      })
      .on("pointerleave", evento => { if (evento.pointerType !== "touch") apagar(); });
  }
}

// La lista que usa la página: el nombre que pongo en el HTML (data-grafico) y su función.
export const GRAFICOS_FAJA2 = {
  cascada: dibujarCascada,
  afectados: dibujarAfectados,
  comparacion: dibujarComparacion
};
