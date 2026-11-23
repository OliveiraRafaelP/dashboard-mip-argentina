// =============================================================================
// graficos_faja1.js
// Los tres cuadros de la faja 1, "Sectores clave":
//   F1.1  Cuadrantes Ui x Uj            (modelo: figura 02_rh_cuadrantes)
//   F1.2  Ranking de Uj y de Ui          (modelo: figura 02_rh_ranking)
//   F1.3  Dispersión U x V               (modelo: figuras 02_uj_vj_cuadrantes y 02_ui_vi_cuadrantes)
//
// ¿Cómo dibujo? Con Observable Plot hago la base de cada gráfico: ejes, grilla,
// líneas de referencia, puntos y barras. Con D3 agrego encima lo que Plot no
// resuelve: los nombres que no se pisan, los rótulos de las esquinas, la marca
// "//" del eje quebrado y la información que aparece al pasar el cursor.
//
// Cada función recibe:
//   partes   : los lugares del cuadro donde escribo (título, subtítulo,
//              controles, gráfico, leyenda, nota);
//   contexto : { sectores, elegido, ampliado, rellenar, ancla, redibujar }.
//              `rellenar` = true en la segunda pasada del dibujo: el gráfico
//              puede crecer hasta ocupar el alto que le deja su cuadro.
// Todos los datos salen de datos/sectores_mip.json (una fila por sector).
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";
import {
  numero, porcentaje, mediana, fuente, mostrarInformacion, ocultarInformacion,
  escribirLeyenda, escribirNota, marcasDelEje, estiloBase, TAMANO_EJES,
  colocarEtiquetas, anchoTexto
} from "./utilidades.js";

// `part_vbp` viene como fracción (0,0236); la muestro en porcentaje.
const participacion = d => ["Participación en el VBP", porcentaje(d.part_vbp * 100)];

// ---- Ayudas de esta faja ---------------------------------------------------------

// El eje quebrado: paso de un valor del índice a su posición en el eje y vuelta.
// Hasta el quiebre no cambia nada; a la derecha, cada unidad ocupa menos lugar.
function ejeQuebrado() {
  const { quiebre: q, compresion: k } = P.ejeQuebrado;
  return {
    ida: u => (u <= q ? u : q + (u - q) * k),
    vuelta: t => (t <= q ? t : q + (t - q) / k)
  };
}
const ejeComun = { ida: u => u, vuelta: t => t };

// Junto varias listas de sectores en una sola, alternando (el primero de cada
// lista, luego el segundo de cada una...) y sin repetir. El orden importa:
// los primeros tienen prioridad cuando no hay lugar para todos los nombres.
function alternar(primero, ...listas) {
  const resultado = [primero];
  const largo = Math.max(...listas.map(l => l.length));
  for (let i = 0; i < largo; i++)
    for (const lista of listas)
      if (lista[i] && !resultado.includes(lista[i])) resultado.push(lista[i]);
  return resultado;
}

// ---- Gráfico de dispersión (sirve para F1.1 y F1.3) ----------------------------
// `o` describe el gráfico:
//   campoX, campoY     : qué columnas van en cada eje
//   campoColor, colores: qué columna da el color y la tabla de colores
//   rotuloX, rotuloY   : nombres de los ejes
//   quebrado           : true si el eje horizontal se quiebra
//   lineaY             : dónde va la línea horizontal de referencia
//   esquinas           : { arribaIzq, arribaDer, abajoIzq, abajoDer }, cada una una lista de renglones
//   conNombre          : sectores que llevan el nombre escrito, en orden de prioridad
//   informacion        : función que arma el recuadro de un sector
//   descripcion        : texto para lectores de pantalla
function dispersion(partes, contexto, o) {
  const D = P.dispersion;
  const contenedor = partes.grafico;
  contenedor.replaceChildren();
  contenedor.classList.remove("paneles-lado");

  // El nombre del eje vertical va arriba, como texto común: así puede ocupar
  // dos renglones en el celular en vez de cortarse.
  const tituloY = document.createElement("div");
  tituloY.className = "eje-titulo eje-titulo-y";
  tituloY.textContent = `↑ ${o.rotuloY}`;
  contenedor.appendChild(tituloY);

  const ancho = contenedor.clientWidth;
  // Alto: en la vista ampliada, todo el lugar disponible. En el cuadro, el
  // ancho por la proporción; y si el cuadro vecino es más alto, crezco hasta
  // acompañarlo (sin pasar de la proporción máxima).
  const disponible = contenedor.clientHeight - tituloY.offsetHeight - 6;
  const celular = document.body.classList.contains("celular");
  const propio = Math.max(D.altoMinimo, Math.round(ancho * (celular ? D.proporcionCelular : D.proporcion)));
  let alto = propio;
  if (contexto.ampliado) alto = Math.max(D.altoMinimo, disponible);
  else if (contexto.rellenar) alto = Math.max(propio, Math.min(disponible, Math.round(ancho * D.proporcionMaxima)));

  const { sectores, elegido } = contexto;
  const eje = o.quebrado ? ejeQuebrado() : ejeComun;
  const ref = P.indiceReferencia;

  // Límites de los ejes: los de los datos, con un poco de aire.
  let [x0, x1] = d3.extent(sectores, d => eje.ida(d[o.campoX]));
  let [y0, y1] = d3.extent(sectores, d => d[o.campoY]);
  const aireX = (x1 - x0) * D.margenHorizontal;
  const aireY = (y1 - y0) * D.margenVertical;
  x0 -= aireX; x1 += aireX; y0 -= aireY; y1 += aireY;

  // Marcas de los ejes.
  let marcasX, formatoX;
  if (o.quebrado) {
    const E = P.ejeQuebrado;
    marcasX = E.marcas.map(eje.ida);
    x0 = Math.min(x0, marcasX[0] - aireX / 2);
    x1 = Math.max(x1, marcasX[marcasX.length - 1] + aireX / 2);
    formatoX = t => numero(eje.vuelta(t), E.decimalesMarcas);
  } else {
    const m = marcasDelEje(x0, x1, Math.max(5, Math.round(ancho / 95)));   // al menos unas cinco marcas, aunque el cuadro sea angosto
    marcasX = m.valores;
    formatoX = t => numero(t, m.decimales);
  }
  const mY = marcasDelEje(y0, y1, Math.round(alto / 75));

  const posX = d => eje.ida(d[o.campoX]);
  const trazoRef = { stroke: P.colores.ejes, strokeWidth: 1.2 };

  // --- La base, con Plot ---
  const svg = Plot.plot({
    width: ancho,
    height: alto,
    marginTop: 8, marginRight: 10, marginBottom: 42, marginLeft: 40,
    style: estiloBase(),
    ariaLabel: o.descripcion,
    color: { type: "identity" },      // los colores ya vienen dados: no quiero que Plot los cambie
    x: { domain: [x0, x1], ticks: marcasX, tickFormat: formatoX, tickSize: 0, grid: true,
         label: o.rotuloX, labelAnchor: "center", labelArrow: "none", labelOffset: 36 },
    y: { domain: [y0, y1], ticks: mY.valores, tickFormat: v => numero(v, mY.decimales), tickSize: 0, grid: true, label: null },
    marks: [
      Plot.ruleX([eje.ida(ref)], trazoRef),                       // índice = 1
      Plot.ruleY([o.lineaY], trazoRef),                           // referencia horizontal
      o.quebrado
        ? Plot.ruleX([P.ejeQuebrado.quiebre], { stroke: P.colores.textoSuave, strokeWidth: 1.3, strokeDasharray: "1.5,4.5", strokeLinecap: "round" })
        : null,
      Plot.dot(sectores, {
        x: posX, y: o.campoY, r: D.radio,
        fill: d => o.colores[d[o.campoColor]],
        stroke: P.colores.fondoGrafico, strokeWidth: 1          // borde blanco: separa los puntos que se enciman
      }),
      // El sector elegido: un círculo rojo alrededor de su punto.
      Plot.dot([elegido], { x: posX, y: o.campoY, r: D.radioDestacado, fill: "none", stroke: P.colores.destacado, strokeWidth: D.grosorDestacado })
    ]
  });
  contenedor.appendChild(svg);

  // --- Lo demás, con D3, usando las escalas que armó Plot ---
  const escalaX = svg.scale("x"), escalaY = svg.scale("y");
  const px = d => escalaX.apply(posX(d));
  const py = d => escalaY.apply(d[o.campoY]);
  const area = {
    x0: Math.min(...escalaX.range), x1: Math.max(...escalaX.range),
    y0: Math.min(...escalaY.range), y1: Math.max(...escalaY.range)
  };
  const capa = d3.select(svg).append("g").attr("class", "capa-rotulos");

  // Lugares ya ocupados, donde no escribo nombres de sectores.
  const ocupados = [];

  // La marca "//" del quiebre: sobre el eje y sobre la línea del índice = 1.
  if (o.quebrado) {
    const xq = escalaX.apply(P.ejeQuebrado.quiebre);
    for (const y of [area.y1, escalaY.apply(o.lineaY)]) {
      capa.append("text").attr("x", xq).attr("y", y)
        .attr("text-anchor", "middle").attr("dominant-baseline", "central")
        .attr("font-size", 14).attr("font-weight", 700).attr("font-style", "italic")
        .attr("fill", P.colores.texto)
        .attr("stroke", P.colores.fondoGrafico).attr("stroke-width", 4).attr("paint-order", "stroke")
        .text("//");
      ocupados.push({ x0: xq - 9, x1: xq + 9, y0: y - 9, y1: y + 9 });
    }
  }

  // Rótulos de las cuatro esquinas. Guardo el lugar que ocupan para que los
  // nombres de los sectores no se escriban encima.
  const tEsq = P.etiquetas.tamanoEsquinas, renglon = tEsq * 1.25, borde = 6;
  const esquinas = [
    { lineas: o.esquinas.arribaIzq, izquierda: true, arriba: true },
    { lineas: o.esquinas.arribaDer, izquierda: false, arriba: true },
    { lineas: o.esquinas.abajoIzq, izquierda: true, arriba: false },
    { lineas: o.esquinas.abajoDer, izquierda: false, arriba: false }
  ];
  for (const e of esquinas) {
    const anchoCaja = Math.max(...e.lineas.map(l => anchoTexto(l, tEsq, true)));
    const altoCaja = e.lineas.length * renglon;
    const x = e.izquierda ? area.x0 + borde : area.x1 - borde;
    // Abajo dejo un poco más de aire: sobre el eje va la marca "//".
    const yArriba = e.arriba ? area.y0 + borde : area.y1 - 2 * borde - altoCaja;
    e.lineas.forEach((linea, i) => {
      capa.append("text").attr("x", x).attr("y", yArriba + (i + 0.5) * renglon)
        .attr("text-anchor", e.izquierda ? "start" : "end").attr("dominant-baseline", "central")
        .attr("font-size", tEsq).attr("font-weight", 700).attr("fill", P.colores.ejes)
        .attr("stroke", P.colores.fondoGrafico).attr("stroke-width", 3).attr("paint-order", "stroke")
        .text(linea);
    });
    ocupados.push({ x0: e.izquierda ? x : x - anchoCaja, x1: e.izquierda ? x + anchoCaja : x, y0: yArriba, y1: yArriba + altoCaja });
  }

  // Nombres de los sectores, sin pisarse.
  const puntos = sectores.map(d => ({ x: px(d), y: py(d), r: D.radio }));
  puntos.push({ x: px(elegido), y: py(elegido), r: D.radioDestacado + D.grosorDestacado / 2 });
  const etiquetas = o.conNombre.map(d => ({
    x: px(d), y: py(d),
    r: d === elegido ? D.radioDestacado + D.grosorDestacado / 2 : D.radio,
    texto: d.nombre,
    negrita: d === elegido,
    obligatoria: d === elegido,   // el nombre del sector elegido se escribe siempre
    color: d === elegido ? P.colores.destacado
      : (P.etiquetas.colorPorClase ? o.colores[d[o.campoColor]] : P.colores.texto)
  }));
  colocarEtiquetas(capa, { etiquetas, puntos, ocupados, area, tamano: P.etiquetas.tamano });

  // Información al pasar el cursor o al tocar: busco el punto más cercano.
  // Si el cursor está dentro del círculo rojo del sector elegido, muestro el
  // elegido, aunque el punto de un vecino quede más cerca.
  const anillo = capa.append("circle").attr("r", D.radio + 3.5)
    .attr("fill", "none").attr("stroke", P.colores.texto).attr("stroke-width", 1.5)
    .style("display", "none").style("pointer-events", "none");
  const apagar = () => { anillo.style("display", "none"); ocultarInformacion(); };
  const radioElegido = D.radioDestacado + D.grosorDestacado / 2;
  d3.select(svg).append("rect")
    .attr("x", area.x0).attr("y", area.y0)
    .attr("width", area.x1 - area.x0).attr("height", area.y1 - area.y0)
    .attr("fill", "transparent")
    .on("pointermove pointerdown", evento => {
      const [mx, my] = d3.pointer(evento, svg);
      let mejor = null, menor = D.distanciaInformacion;
      if (Math.hypot(px(elegido) - mx, py(elegido) - my) <= radioElegido) mejor = elegido;
      else for (const d of sectores) {
        const distancia = Math.hypot(px(d) - mx, py(d) - my);
        if (distancia < menor) { menor = distancia; mejor = d; }
      }
      if (!mejor) return apagar();
      anillo.attr("cx", px(mejor)).attr("cy", py(mejor)).style("display", null);
      mostrarInformacion(o.informacion(mejor), evento.clientX, evento.clientY, contexto.ancla);
    })
    // Con el dedo, el recuadro queda a la vista hasta que toco otra cosa.
    .on("pointerleave", evento => { if (evento.pointerType !== "touch") apagar(); });
}

// =============================================================================
// F1.1  Cuadrantes Ui x Uj
// =============================================================================
export function dibujarCuadrantes(partes, contexto) {
  const { sectores, elegido } = contexto;
  const ref = P.indiceReferencia, r = numero(ref, 0);
  const E = P.etiquetas;

  // Cuento los sectores clave con los datos: los que tienen los dos índices por encima de 1.
  const clave = sectores.filter(d => d.Uj > ref && d.Ui > ref).length;
  partes.titulo.textContent = `Argentina ${P.anioMatriz}: índices de encadenamiento de Rasmussen-Hirschman`;
  partes.subtitulo.textContent = `${clave} de los ${sectores.length} sectores son clave (Uj > ${r} y Ui > ${r})`;
  partes.controles.replaceChildren();

  // Con nombre: el elegido, los de mayor Uj, los de mayor Ui y el de menor Uj.
  const porPuestoUj = [...sectores].sort((a, b) => a.puesto_Uj - b.puesto_Uj);
  const porPuestoUi = [...sectores].sort((a, b) => a.puesto_Ui - b.puesto_Ui);
  const porUjCreciente = [...sectores].sort((a, b) => a.Uj - b.Uj);
  const conNombre = alternar(elegido,
    porPuestoUj.slice(0, E.mayoresUj), porPuestoUi.slice(0, E.mayoresUi), porUjCreciente.slice(0, E.menoresUj));

  // Escribo primero la leyenda y la nota: así, cuando mido el lugar que queda
  // para el gráfico (en la vista ampliada), ya están ocupando su espacio.
  escribirLeyenda(partes.leyenda, [
    ...Object.entries(P.colores.clase)
      .filter(([clase]) => sectores.some(d => d.clase === clase))
      .map(([clase, color]) => ({ texto: clase, color, forma: "punto" })),
    { texto: `${elegido.codigo} · ${elegido.nombre}`, color: P.colores.destacado, forma: "anillo", negrita: true }
  ]);
  escribirNota(partes.nota, [
    `Eje horizontal: a la derecha de la marca // (Ui = ${numero(P.ejeQuebrado.quiebre, 1)}) la escala está comprimida, para mostrar los sectores más alejados.`,
    fuente()
  ]);

  dispersion(partes, contexto, {
    campoX: "Ui", campoY: "Uj", campoColor: "clase", colores: P.colores.clase,
    rotuloX: "Encadenamiento hacia adelante (Ui)",
    rotuloY: "Encadenamiento hacia atrás (Uj)",
    quebrado: true,
    lineaY: ref,
    esquinas: {
      arribaIzq: ["Dependiente de la oferta", `intersectorial (Uj > ${r})`],
      arribaDer: ["SECTORES CLAVE", `Uj > ${r} y Ui > ${r}`],
      abajoIzq: ["Independiente (poco conectado", "con otros sectores)", `Uj < ${r} y Ui < ${r}`],
      abajoDer: ["Dependiente de la demanda", `intersectorial (Ui > ${r})`]
    },
    conNombre,
    informacion: d => ({
      titulo: d.nombre, codigo: d.codigo,
      filas: [
        ["Hacia atrás (Uj)", `${numero(d.Uj)} · puesto ${d.puesto_Uj}`],
        ["Hacia adelante (Ui)", `${numero(d.Ui)} · puesto ${d.puesto_Ui}`],
        ["Clase", d.clase],
        participacion(d)
      ]
    }),
    descripcion: "Gráfico de dispersión: encadenamiento hacia adelante (Ui) en el eje horizontal y hacia atrás (Uj) en el vertical, un punto por sector."
  });
}

// =============================================================================
// F1.2  Ranking
// =============================================================================
export function dibujarRanking(partes, contexto) {
  const { sectores, elegido } = contexto;
  const R = P.ranking;
  const ref = P.indiceReferencia;

  partes.titulo.textContent = `Los ${R.cantidad} sectores con mayor encadenamiento hacia atrás y hacia adelante`;
  partes.subtitulo.textContent = `El número delante del nombre es el puesto entre los ${sectores.length} sectores. Línea punteada: promedio de la economía (índice = ${numero(ref, 0)})`;
  partes.controles.replaceChildren();

  const contenedor = partes.grafico;
  contenedor.replaceChildren();
  const anchoTotal = contenedor.clientWidth;
  const separacion = 18;
  // ¿Entran los dos paneles uno al lado del otro? Si no, van uno debajo del otro.
  const lado = anchoTotal >= 2 * R.anchoMinimoPanel + separacion;
  contenedor.classList.toggle("paneles-lado", lado);
  const anchoPanel = lado ? Math.floor((anchoTotal - separacion) / 2) : anchoTotal;

  const paneles = [
    { titulo: "Hacia atrás (Uj)", campo: "Uj", puesto: "puesto_Uj" },
    { titulo: "Hacia adelante (Ui)", campo: "Ui", puesto: "puesto_Ui" }
  ];
  // Los primeros de cada índice; si el elegido no está entre ellos, entra
  // como una barra más, abajo, con su puesto verdadero.
  for (const panel of paneles) {
    panel.filas = sectores.filter(d => d[panel.puesto] <= R.cantidad).sort((a, b) => a[panel.puesto] - b[panel.puesto]);
    if (!panel.filas.includes(elegido)) panel.filas.push(elegido);
  }

  // En la leyenda, solo las clases que aparecen en las barras.
  const visibles = new Set(paneles.flatMap(p => p.filas.map(d => d.clase)));
  escribirLeyenda(partes.leyenda, [
    ...Object.entries(P.colores.clase)
      .filter(([clase]) => visibles.has(clase))
      .map(([clase, color]) => ({ texto: clase, color, forma: "barra" })),
    { texto: `${elegido.codigo} · ${elegido.nombre}`, color: P.colores.destacado, forma: "borde", negrita: true }
  ]);
  escribirNota(partes.nota, [fuente()]);

  // Alto de cada fila: fijo en el cuadro; en la vista ampliada aprovecho el
  // alto disponible, y en la segunda pasada del dibujo también, si el cuadro
  // vecino es más alto.
  const celular = document.body.classList.contains("celular");
  const altoFilaBase = (!lado && !celular) ? R.altoFilaApilado : R.altoFila;
  let altoFila = altoFilaBase;
  const margenArriba = 4, margenAbajo = 22, altoTitulos = 26, altoEje = 24;
  if (contexto.ampliado || contexto.rellenar) {
    const disponible = contenedor.clientHeight - altoEje;
    const masFilas = Math.max(...paneles.map(p => p.filas.length));
    const totalFilas = paneles[0].filas.length + paneles[1].filas.length;
    altoFila = lado
      ? (disponible - altoTitulos - margenArriba - margenAbajo) / masFilas
      : (disponible - 2 * (altoTitulos + margenArriba + margenAbajo)) / totalFilas;
    altoFila = contexto.ampliado
      ? Math.max(R.altoFila * 0.8, Math.min(R.altoFila * 2.2, altoFila))
      : Math.max(altoFilaBase, Math.min(R.altoFila * R.estiramientoMaximo, altoFila));
  }

  const rotulo = (d, panel) => `${d[panel.puesto]}. ${d.nombre}`;
  for (const panel of paneles) {
    const caja = document.createElement("div");
    caja.className = "panel";
    const titulo = document.createElement("div");
    titulo.className = "panel-titulo";
    titulo.textContent = panel.titulo;
    caja.appendChild(titulo);
    contenedor.appendChild(caja);

    const { filas, campo } = panel;
    const margenIzquierdo = Math.ceil(Math.max(...filas.map(d => anchoTexto(rotulo(d, panel), TAMANO_EJES, d === elegido)))) + 12;
    // El eje llega un poco más allá de la barra más larga: lo necesario para
    // que el valor escrito a su derecha entre en el panel.
    const mayor = Math.max(...filas.map(d => d[campo]));
    const anchoBarras = anchoPanel - margenIzquierdo - 6;
    const lugarValor = Math.max(...filas.map(d => anchoTexto(numero(d[campo]), 10.5))) + 12;
    const maximo = mayor * Math.max(1 + R.aireDerecha, anchoBarras / Math.max(40, anchoBarras - lugarValor));
    const m = marcasDelEje(0, maximo, Math.round((anchoPanel - margenIzquierdo) / 70));
    const otros = filas.filter(d => d !== elegido);

    const svg = Plot.plot({
      width: anchoPanel,
      height: Math.round(filas.length * altoFila + margenArriba + margenAbajo),
      marginTop: margenArriba, marginRight: 6, marginBottom: margenAbajo, marginLeft: margenIzquierdo,
      style: estiloBase(),
      ariaLabel: `Barras: los sectores con mayor índice ${panel.titulo}.`,
      color: { type: "identity" },
      x: { domain: [0, maximo], ticks: m.valores, tickFormat: v => numero(v, m.decimales), tickSize: 0, grid: true, label: null },
      y: { domain: filas.map(d => d.codigo), axis: null, padding: 0.24 },
      marks: [
        Plot.barX(filas, { x: campo, y: "codigo", fill: d => P.colores.clase[d.clase] }),
        Plot.ruleX([ref], { stroke: P.colores.ejes, strokeWidth: 1.3, strokeDasharray: "5,4" }),
        // El sector elegido: la misma barra, con borde rojo grueso.
        Plot.barX([elegido], { x: campo, y: "codigo", fill: "none", stroke: P.colores.destacado, strokeWidth: R.grosorDestacado }),
        // Puesto y nombre, a la izquierda de cada barra.
        Plot.text(otros, { x: 0, y: "codigo", text: d => rotulo(d, panel), textAnchor: "end", dx: -8, fill: P.colores.texto }),
        Plot.text([elegido], { x: 0, y: "codigo", text: d => rotulo(d, panel), textAnchor: "end", dx: -8, fill: P.colores.destacado, fontWeight: 700 }),
        // El valor, al final de la barra.
        Plot.text(filas, { x: campo, y: "codigo", text: d => numero(d[campo]), textAnchor: "start", dx: 6, fill: P.colores.texto, fontSize: 10.5 })
      ]
    });
    caja.appendChild(svg);

    // Información al pasar el cursor: una franja invisible por fila, de lado a
    // lado, para que sea fácil acertar aunque la barra sea corta.
    const escalaY = svg.scale("y");
    const capa = d3.select(svg).append("g");
    for (const d of filas) {
      capa.append("rect")
        .attr("x", 0).attr("width", anchoPanel)
        .attr("y", escalaY.apply(d.codigo) - (escalaY.step - escalaY.bandwidth) / 2).attr("height", escalaY.step)
        .attr("fill", "transparent").attr("class", "franja-fila")
        .on("pointermove pointerdown", evento => {
          mostrarInformacion({
            titulo: d.nombre, codigo: d.codigo,
            filas: [
              [panel.titulo, numero(d[campo])],
              ["Puesto", `${d[panel.puesto]} de ${sectores.length}`],
              ["Clase", d.clase],
              participacion(d)
            ]
          }, evento.clientX, evento.clientY, contexto.ancla);
        })
        .on("pointerleave", evento => { if (evento.pointerType !== "touch") ocultarInformacion(); });
    }
  }

  const tituloX = document.createElement("div");
  tituloX.className = "eje-titulo eje-titulo-x";
  tituloX.textContent = "Índice de Rasmussen-Hirschman";
  contenedor.appendChild(tituloX);
}

// =============================================================================
// F1.3  Dispersión U x V
// =============================================================================
// El botón de dos estados: "atras" (Uj y Vj) o "adelante" (Ui y Vi). Lo guardo
// aquí para que el cuadro y su vista ampliada muestren siempre lo mismo.
let sentido = "atras";
const SENTIDOS = {
  atras: {
    boton: "Hacia atrás", campoU: "Uj", campoV: "Vj", campoCuadrante: "cuadrante_UjVj",
    titulo: "Hacia atrás: ¿cuánto arrastra cada sector y a cuántos sectores llega?",
    rotuloX: "Encadenamiento hacia atrás (Uj)"
  },
  adelante: {
    boton: "Hacia adelante", campoU: "Ui", campoV: "Vi", campoCuadrante: "cuadrante_UiVi",
    titulo: "Hacia adelante: ¿cuánto empuja cada sector y a cuántos sectores llega?",
    rotuloX: "Encadenamiento hacia adelante (Ui)"
  }
};

export function dibujarDispersionUV(partes, contexto) {
  const { sectores, elegido } = contexto;
  const S = SENTIDOS[sentido];
  const ref = P.indiceReferencia;
  // La mediana de V la calculo con los datos.
  const medianaV = mediana(sectores.map(d => d[S.campoV]));

  partes.titulo.textContent = S.titulo;
  partes.subtitulo.textContent = `Línea vertical: índice = ${numero(ref, 0)} (promedio de la economía). Línea horizontal: mediana de V = ${numero(medianaV)}`;

  // El botón de dos estados.
  partes.controles.replaceChildren();
  const grupo = document.createElement("div");
  grupo.className = "dos-estados";
  grupo.setAttribute("role", "group");
  grupo.setAttribute("aria-label", "Sentido del encadenamiento");
  for (const [clave, s] of Object.entries(SENTIDOS)) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = s.boton;
    boton.setAttribute("aria-pressed", String(clave === sentido));
    boton.addEventListener("click", () => {
      if (sentido === clave) return;
      sentido = clave;
      contexto.redibujar();
    });
    grupo.appendChild(boton);
  }
  partes.controles.appendChild(grupo);

  // Con nombre: el elegido, los de menor V y los de mayor V.
  const porV = [...sectores].sort((a, b) => a[S.campoV] - b[S.campoV]);
  const conNombre = alternar(elegido, porV.slice(0, P.etiquetas.extremosV), porV.slice(-P.etiquetas.extremosV).reverse());

  escribirLeyenda(partes.leyenda, [
    ...Object.entries(P.colores.cuadrante)
      .filter(([cuadrante]) => sectores.some(d => d[S.campoCuadrante] === cuadrante))
      .map(([cuadrante, color]) => ({ texto: cuadrante, color, forma: "punto" })),
    { texto: `${elegido.codigo} · ${elegido.nombre}`, color: P.colores.destacado, forma: "anillo", negrita: true }
  ]);
  escribirNota(partes.nota, [fuente()]);

  dispersion(partes, contexto, {
    campoX: S.campoU, campoY: S.campoV, campoColor: S.campoCuadrante, colores: P.colores.cuadrante,
    rotuloX: S.rotuloX,
    rotuloY: "Coeficiente de variación V (menor = repartido entre más sectores)",
    quebrado: false,
    lineaY: medianaV,
    esquinas: {
      arribaIzq: ["Bajo y concentrado", "en pocos sectores"],
      arribaDer: ["Alto, pero concentrado", "en pocos sectores"],
      abajoIzq: ["Bajo, repartido entre", "muchos sectores"],
      abajoDer: ["ALTO Y REPARTIDO", "entre muchos sectores"]
    },
    conNombre,
    informacion: d => ({
      titulo: d.nombre, codigo: d.codigo,
      filas: [
        [`Índice (${S.campoU})`, numero(d[S.campoU])],
        [`Coeficiente de variación (${S.campoV})`, numero(d[S.campoV])],
        ["Cuadrante", d[S.campoCuadrante]],
        participacion(d)
      ]
    }),
    descripcion: `Gráfico de dispersión: índice ${S.campoU} en el eje horizontal y coeficiente de variación ${S.campoV} en el vertical, un punto por sector.`
  });
}

// La lista que usa la página: el nombre que pongo en el HTML (data-grafico) y su función.
export const GRAFICOS_FAJA1 = {
  cuadrantes: dibujarCuadrantes,
  ranking: dibujarRanking,
  dispersionUV: dibujarDispersionUV
};
