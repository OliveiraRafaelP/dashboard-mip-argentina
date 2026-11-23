// =============================================================================
// graficos_fajas3y4.js
// Los cinco cuadros regionales:
//   F3.1  Mapa del cociente de localización   (modelo: figura 04_mapa_cociente_localizacion)
//   F3.2  Coeficiente de localización         (modelo: figura 04_coef_localizacion)
//   F3.3  Curva de localización               (modelo: figura 04_curvas_localizacion)
//   F4.1  Coeficiente de redistribución       (modelo: figura 04_coef_redistribucion)
//   F4.2  Asociación geográfica               (modelo: figura 04_asociacion_geografica)
//
// Estos cuadros no usan el sector de la matriz, sino el AGREGADO de la planilla
// provincial al que ese sector pertenece (campo numero_52 del sector). Varios
// sectores de la matriz caen en el mismo agregado: al pasar de uno a otro, los
// cinco cuadros no cambian, y eso está bien.
//
// Los datos salen de datos/regional.json. Allí las matrices no traen nombres:
// el orden de las filas y de las columnas es el de las listas `provincias`,
// `sectores` y `anios` del mismo archivo. El mapa se dibuja con
// datos/mapa_provincias.json (contornos en kilómetros, con el norte hacia arriba).
//
// Cada función recibe `partes` y `contexto`, igual que en las fajas 1 y 2.
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";
import {
  numero, porcentaje, escribirNota, escribirLeyenda, marcasDelEje, estiloBase,
  TAMANO_EJES, altoDelGrafico, anchoTexto, mostrarInformacion, ocultarInformacion
} from "./utilidades.js";

import { dibujarMapaProvincias, altoDelMapa, notaDelMapa } from "./mapa_provincias.js";

const G = P.regional;

// ---- Ayudas comunes --------------------------------------------------------------

// Preparo el lugar del gráfico: lo vacío y le saco las clases de otros arreglos.
export function limpiar(contenedor) {
  contenedor.replaceChildren();
  contenedor.classList.remove("paneles-lado", "paneles-cuatro");
}

// Un título de eje escrito como texto común (puede ocupar dos renglones).
export function tituloDeEje(contenedor, texto, cual) {
  const titulo = document.createElement("div");
  titulo.className = `eje-titulo eje-titulo-${cual}`;
  titulo.textContent = texto;
  contenedor.appendChild(titulo);
  return titulo;
}

// Un número con los decimales que hagan falta y no más (0,5 ; 1,25 ; 2).
function numeroCorto(valor) {
  return new Intl.NumberFormat(P.formato.idioma, { maximumFractionDigits: 2 }).format(valor);
}

// Lo que todos los cuadros necesitan saber del agregado elegido.
//   reg      : el archivo regional entero
//   j        : la posición del agregado en las listas (desde 0)
//   agregado : su nombre corto
//   nombres  : los nombres cortos de todos los agregados, en el orden del archivo
function agregadoElegido(contexto) {
  const reg = contexto.regional;
  const j = contexto.elegido.numero_52 - 1;
  const nombres = reg.sectores.map(s => s.corto);
  return { reg, j, agregado: nombres[j], nombres, total: nombres.length };
}

// Puesto de cada valor en una lista, del mayor (1) al menor. Los empates
// reciben el mismo puesto.
export function puestos(valores) {
  return valores.map(v => 1 + valores.filter(otro => otro > v).length);
}

// La fuente de los cuadros hechos con el VAB provincial (fajas 3, 4 y 5).
export function fuenteRegional() {
  return `Fuente: elaboración propia con el VAB por jurisdicción y sector a precios de ${P.anioPrecios}.`;
}

// Las dos últimas líneas de la nota de los cinco cuadros: a qué agregado
// corresponde el sector elegido y la fuente.
function notaRegional(contexto, lineas) {
  const d = contexto.elegido;
  return [
    ...lineas,
    `Sector elegido: ${d.codigo} · ${d.nombre}. Agregado de la planilla provincial: ${d.sector_52}.`,
    fuenteRegional()
  ];
}

// Los primeros `cantidad` de una lista de puestos y, si no está entre ellos,
// el agregado elegido como una fila más, abajo. Devuelvo las posiciones.
function primerosYElegido(listaPuestos, valores, j) {
  const orden = valores.map((_, k) => k).sort((a, b) => valores[b] - valores[a]);
  const filas = orden.slice(0, G.cantidad);
  if (!filas.includes(j)) filas.push(j);
  return filas;
}

// ---- Barras horizontales (sirve para F3.2, F4.1 y F4.2) ---------------------------
// `o` describe el gráfico:
//   filas       : [{ clave, nombre, puesto, destacado, valores: [..], colores: [..], marca }]
//                 `valores` trae una barra por serie; `marca` (opcional) es el
//                 valor que señalo con un rombo.
//   altoFila    : alto de cada fila con su separación
//   rotuloX     : nombre del eje
//   informacion : función que arma el recuadro de una fila
//   descripcion : texto para lectores de pantalla
function barras(partes, contexto, o) {
  const B = G.barras;
  const contenedor = partes.grafico;
  limpiar(contenedor);
  const ancho = contenedor.clientWidth;
  const { filas } = o;
  const margenArriba = 4, margenAbajo = 22, margenDerecho = 6, altoEje = 24;

  // Alto de cada fila: el de los parámetros; crece si el cuadro vecino es más
  // alto y, en la vista ampliada, hasta ocupar el lugar disponible.
  let altoFila = o.altoFila;
  if (contexto.ampliado || contexto.rellenar) {
    const disponible = (contenedor.clientHeight - altoEje - margenArriba - margenAbajo) / filas.length;
    const tope = o.altoFila * (contexto.ampliado ? B.estiramientoAmpliado : B.estiramientoMaximo);
    altoFila = Math.max(o.altoFila, Math.min(tope, disponible));
  }

  const rotulo = f => (f.puesto ? `${f.puesto}. ${f.nombre}` : f.nombre);
  const margenIzquierdo = Math.ceil(Math.max(...filas.map(f => anchoTexto(rotulo(f), TAMANO_EJES, f.destacado)))) + 12;
  const anchoBarras = ancho - margenIzquierdo - margenDerecho;
  const escrito = v => numero(v, B.decimales);
  // El eje llega más allá de la barra más larga: lo necesario para que el
  // valor escrito a su derecha entre en el cuadro.
  const lugarValor = Math.max(...filas.flatMap(f => f.valores.map(v => anchoTexto(escrito(v), B.tamanoValor)))) + 14;
  const mayor = Math.max(...filas.flatMap(f => [...f.valores, f.marca ?? 0]));
  const maximo = mayor * anchoBarras / Math.max(40, anchoBarras - lugarValor);
  const m = marcasDelEje(0, maximo, Math.round(anchoBarras / 80));

  const svg = Plot.plot({
    width: ancho,
    height: Math.round(filas.length * altoFila + margenArriba + margenAbajo),
    marginTop: margenArriba, marginRight: margenDerecho, marginBottom: margenAbajo, marginLeft: margenIzquierdo,
    style: estiloBase(),
    ariaLabel: o.descripcion,
    x: { domain: [0, maximo], ticks: m.valores, tickFormat: v => numero(v, m.decimales), tickSize: 0, grid: true, label: null },
    y: { type: "band", domain: filas.map(f => f.clave), axis: null, padding: B.separacion },   // "band": las filas tienen alto (con solo textos, Plot usaría puntos)
    marks: [
      // Puesto y nombre, a la izquierda de cada fila; el agregado elegido, en rojo.
      Plot.text(filas.filter(f => !f.destacado), { x: 0, y: "clave", text: rotulo, textAnchor: "end", dx: -8, fill: P.colores.texto }),
      Plot.text(filas.filter(f => f.destacado), { x: 0, y: "clave", text: rotulo, textAnchor: "end", dx: -8, fill: P.colores.destacado, fontWeight: 700 })
    ]
  });
  contenedor.appendChild(svg);
  tituloDeEje(contenedor, o.rotuloX, "x");

  // Las barras, los valores y los rombos, con D3 y las escalas que armó Plot.
  const escalaX = svg.scale("x"), escalaY = svg.scale("y");
  const x0 = escalaX.apply(0);
  const capa = d3.select(svg).append("g");
  const rombo = d3.symbol(d3.symbolDiamond, B.tamanoMarca);
  for (const f of filas) {
    const arriba = escalaY.apply(f.clave);
    const altoBarra = escalaY.bandwidth / f.valores.length;
    f.valores.forEach((v, s) => {
      const y = arriba + s * altoBarra;
      capa.append("rect")
        .attr("x", x0).attr("y", y)
        .attr("width", Math.max(0, escalaX.apply(v) - x0))
        .attr("height", Math.max(1, altoBarra - (f.valores.length > 1 ? 1 : 0)))   // un píxel de separación entre las dos barras de una fila
        .attr("fill", f.colores[s]);
      // El valor, al final de la barra (o del rombo, si queda más a la derecha).
      const fin = Math.max(v, f.marca ?? 0);
      capa.append("text")
        .attr("x", escalaX.apply(fin) + (f.marca > v ? 10 : 6)).attr("y", y + altoBarra / 2)
        .attr("text-anchor", "start").attr("dominant-baseline", "central")
        .attr("font-size", B.tamanoValor).attr("fill", P.colores.texto)
        .text(escrito(v));
    });
    if (f.marca != null) {
      capa.append("path").attr("d", rombo())
        .attr("transform", `translate(${escalaX.apply(f.marca)},${arriba + escalaY.bandwidth / 2})`)
        .attr("fill", G.colores.marca)
        .attr("stroke", P.colores.fondoGrafico).attr("stroke-width", 0.8);
    }
  }

  // Información al pasar el cursor: una franja invisible por fila, de lado a lado.
  for (const f of filas) {
    capa.append("rect")
      .attr("x", 0).attr("width", ancho)
      .attr("y", escalaY.apply(f.clave) - (escalaY.step - escalaY.bandwidth) / 2).attr("height", escalaY.step)
      .attr("fill", "transparent").attr("class", "franja-fila")
      .on("pointermove pointerdown", evento => mostrarInformacion(o.informacion(f), evento.clientX, evento.clientY, contexto.ancla))
      .on("pointerleave", evento => { if (evento.pointerType !== "touch") ocultarInformacion(); });
  }
}

// =============================================================================
// F3.1  Mapa del cociente de localización
// =============================================================================

// La clase de un cociente: la posición del primer corte que no alcanza
// (el límite inferior entra en la clase).
function claseDelCociente(ql) {
  const cortes = G.mapa.cortes;
  const k = cortes.findIndex(corte => ql < corte);
  return k === -1 ? cortes.length : k;
}
// El nombre de cada clase, escrito con los cortes de los parámetros.
function nombreDeClase(k) {
  const cortes = G.mapa.cortes;
  if (k === 0) return `menos de ${numeroCorto(cortes[0])}`;
  if (k === cortes.length) return `más de ${numeroCorto(cortes[k - 1])}`;
  return `${numeroCorto(cortes[k - 1])} a ${numeroCorto(cortes[k])}`;
}

export function dibujarMapaQL(partes, contexto) {
  const { reg, j, agregado } = agregadoElegido(contexto);
  const M = G.mapa;
  const mapa = contexto.mapa;
  const provincias = reg.provincias;
  const ql = reg.QL.map(fila => fila[j]);           // un cociente por provincia
  const puesto = puestos(ql);
  const elegida = contexto.provincia;

  partes.titulo.textContent = `¿Dónde está ${agregado}? Cociente de localización, ${reg.anio_detalle}`;
  partes.subtitulo.textContent = `Rojo: la provincia tiene más de ese sector que su parte esperada (QL > 1). Azul: tiene menos. Con nombre: las ${M.conNombre} mayores y la provincia elegida`;
  partes.controles.replaceChildren();

  escribirLeyenda(partes.leyenda, [
    ...M.colores.map((color, k) => ({ texto: nombreDeClase(k), color, forma: "barra" })),
    { texto: `Provincia elegida: ${elegida}`, color: M.colorElegida, forma: "borde", negrita: true }
  ]);
  const tituloLeyenda = document.createElement("span");
  tituloLeyenda.className = "leyenda-titulo";
  tituloLeyenda.textContent = "Cociente de localización (QL)";
  partes.leyenda.prepend(tituloLeyenda);

  // La fórmula del cociente está en el reverso del cuadro (botón "Metodología").
  escribirNota(partes.nota, notaRegional(contexto, [notaDelMapa(mapa)]));

  // El dibujo del mapa es común a varios cuadros (mapa_provincias.js). Aquí
  // digo el color de cada provincia (la clase de su cociente), qué mostrar al
  // pasar el cursor y cuáles llevan nombre: las de mayor cociente y la elegida.
  const contenedor = partes.grafico;
  limpiar(contenedor);
  const ancho = contenedor.clientWidth;
  const mayores = provincias.map((_, i) => i).sort((a, b) => ql[b] - ql[a]).slice(0, M.conNombre).map(i => provincias[i]);
  dibujarMapaProvincias(contenedor, contexto, {
    ancho, alto: altoDelMapa(mapa, ancho, contexto, contenedor.clientHeight),
    color: (nombre, i) => M.colores[claseDelCociente(ql[i])],
    informacion: (nombre, i) => [
      ["Cociente de localización (QL)", numero(ql[i])],
      ["Puesto", `${puesto[i]} de ${provincias.length}`],
      ["Clase", nombreDeClase(claseDelCociente(ql[i]))]
    ],
    conNombre: [elegida, ...mayores],
    descripcion: `Mapa de la Argentina por provincia: cociente de localización de ${agregado}.`
  });
}

// =============================================================================
// F3.2  Coeficiente de localización
// =============================================================================
export function dibujarLocalizacion(partes, contexto) {
  const { reg, j, nombres, total } = agregadoElegido(contexto);
  const columnaDetalle = reg.anios.indexOf(reg.anio_detalle);
  const columnaInicial = reg.anios.indexOf(reg.anio_inicial);
  const actual = reg.CL_serie.map(fila => fila[columnaDetalle]);
  const inicial = reg.CL_serie.map(fila => fila[columnaInicial]);
  const puesto = puestos(actual);
  const n = G.cantidad;

  partes.titulo.textContent = `¿Qué sectores están más concentrados en pocas provincias? (${reg.anio_detalle})`;
  partes.subtitulo.textContent = "Coeficiente de localización: 0 = el sector se reparte como el total de la economía; cerca de 1 = concentrado en provincias con poco peso";
  partes.controles.replaceChildren();
  escribirLeyenda(partes.leyenda, [
    { texto: `Valor en ${reg.anio_inicial}`, color: G.colores.marca, forma: "rombo" },
    { texto: "Agregado del sector elegido", color: P.colores.destacado, forma: "barra" },
    { texto: `Los ${n} de mayor valor`, color: G.colores.barras, forma: "barra" }
  ]);
  escribirNota(partes.nota, notaRegional(contexto, [
    `Se muestran los ${n} de mayor valor entre los ${total} sectores y el agregado del sector elegido, con su puesto.`
  ]));

  const filas = primerosYElegido(puesto, actual, j).map(k => ({
    clave: String(k), nombre: nombres[k], puesto: puesto[k], destacado: k === j,
    valores: [actual[k]], colores: [k === j ? P.colores.destacado : G.colores.barras],
    marca: inicial[k]
  }));
  barras(partes, contexto, {
    filas, altoFila: G.localizacion.altoFila,
    rotuloX: "Coeficiente de localización (CL)",
    informacion: f => ({
      titulo: f.nombre, codigo: "",
      filas: [
        [`Coeficiente en ${reg.anio_detalle}`, numero(f.valores[0], G.barras.decimales)],
        [`Coeficiente en ${reg.anio_inicial}`, numero(f.marca, G.barras.decimales)],
        ["Puesto", `${f.puesto} de ${total}`]
      ]
    }),
    descripcion: "Barras: los sectores con mayor coeficiente de localización y el agregado del sector elegido."
  });
}

// =============================================================================
// F3.3  Curva de localización
// =============================================================================
export function dibujarCurva(partes, contexto) {
  const { reg, j, agregado, nombres } = agregadoElegido(contexto);
  const C = G.curva;
  const nProvincias = reg.provincias.length;
  // Cuánto reúnen las primeras provincias de cada agregado (las curvas ya son
  // participaciones acumuladas: tomo el punto de la provincia número `primeras`).
  const filaPrimeras = reg.curvas[C.primeras - 1];
  // El agregado más concentrado entre los demás.
  const otro = nombres.map((_, k) => k).filter(k => k !== j).sort((a, b) => filaPrimeras[b] - filaPrimeras[a])[0];

  // Todas las curvas parten de (0, 0).
  const serie = (nombre, color, grosor, valores) => ({
    nombre, color, grosor,
    puntos: [0, ...valores].map((y, x) => ({ x, y }))
  });
  const curvaOtro = serie(nombres[otro], G.colores.otro, C.grosor, reg.curvas.map(fila => fila[otro]));
  const curvaTotal = serie("Total de la economía", G.colores.total, C.grosorTotal, reg.curva_total);
  const curvaElegido = serie(agregado, P.colores.destacado, C.grosor, reg.curvas.map(fila => fila[j]));
  const series = [curvaOtro, curvaTotal, curvaElegido];      // en este orden se dibujan: el elegido queda arriba

  partes.titulo.textContent = `¿En cuántas provincias se concentra ${agregado}? Curva de localización, ${reg.anio_detalle}`;
  partes.subtitulo.textContent = `Provincias ordenadas de la que más tiene a la que menos, para cada curva. Las ${C.primeras} primeras reúnen el ${porcentaje(reg.curva_total[C.primeras - 1] * 100, 0)} del VAB total y el ${porcentaje(filaPrimeras[j] * 100, 0)} de ${agregado}`;
  partes.controles.replaceChildren();
  escribirLeyenda(partes.leyenda, [
    { texto: curvaTotal.nombre, color: curvaTotal.color, forma: "linea" },
    { texto: curvaElegido.nombre, color: curvaElegido.color, forma: "linea", negrita: true },
    { texto: `${curvaOtro.nombre} (el más concentrado entre los demás)`, color: curvaOtro.color, forma: "linea" }
  ]);
  escribirNota(partes.nota, notaRegional(contexto, ["El orden de las provincias es propio de cada curva."]));

  const contenedor = partes.grafico;
  limpiar(contenedor);
  const tituloY = tituloDeEje(contenedor, "↑ Participación acumulada en el VAB del sector", "y");
  const ancho = contenedor.clientWidth;
  const alto = altoDelGrafico(contenedor, contexto, C, tituloY.offsetHeight + 6);
  // Marcas del eje horizontal: de dos en dos provincias; de cuatro en cuatro si el cuadro es angosto.
  const paso = ancho < C.anchoAngosto ? 4 : 2;
  const marcasY = d3.range(0, 1 + 1e-9, 0.25);

  const svg = Plot.plot({
    width: ancho, height: alto,
    marginTop: 10, marginRight: 14, marginBottom: 42, marginLeft: 46,
    style: estiloBase(),
    ariaLabel: "Curvas de localización: participación acumulada en el VAB según el número de provincias.",
    x: { domain: [0, nProvincias], ticks: d3.range(0, nProvincias + 1, paso), tickSize: 0, grid: true,
         label: "Número de provincias", labelAnchor: "center", labelArrow: "none", labelOffset: 36 },
    y: { domain: [0, 1], ticks: marcasY, tickFormat: v => porcentaje(v * 100, 0), tickSize: 0, grid: true, label: null },
    marks: series.flatMap(s => [
      Plot.line(s.puntos, { x: "x", y: "y", stroke: s.color, strokeWidth: s.grosor }),
      Plot.dot(s.puntos, { x: "x", y: "y", r: C.radio, fill: s.color })
    ])
  });
  contenedor.appendChild(svg);

  // Información al pasar el cursor: el punto más cercano, de cualquiera de las
  // curvas. Si el cursor está sobre un punto de la curva del agregado elegido
  // (dentro del anillo que lo marca), muestro esa curva aunque otra pase por encima.
  const escalaX = svg.scale("x"), escalaY = svg.scale("y");
  const todos = [...series].reverse().flatMap(s => s.puntos.map(p => ({ ...p, serie: s, px: escalaX.apply(p.x), py: escalaY.apply(p.y) })));
  const delElegido = todos.filter(p => p.serie === curvaElegido);
  const radioSobre = C.radio + 3.5;
  const capa = d3.select(svg).append("g");
  const anillo = capa.append("circle").attr("r", C.radio + 3.5)
    .attr("fill", "none").attr("stroke", P.colores.texto).attr("stroke-width", 1.5)
    .style("display", "none").style("pointer-events", "none");
  const apagar = () => { anillo.style("display", "none"); ocultarInformacion(); };
  d3.select(svg).append("rect")
    .attr("x", 0).attr("y", 0).attr("width", ancho).attr("height", alto)
    .attr("fill", "transparent")
    .on("pointermove pointerdown", evento => {
      const [mx, my] = d3.pointer(evento, svg);
      let mejor = null, menor = C.distanciaInformacion;
      let sobre = null, menorSobre = radioSobre;
      for (const p of delElegido) {
        const distancia = Math.hypot(p.px - mx, p.py - my);
        if (distancia <= menorSobre) { menorSobre = distancia; sobre = p; }
      }
      if (sobre) mejor = sobre;
      else for (const p of todos) {
        const distancia = Math.hypot(p.px - mx, p.py - my);
        if (distancia < menor) { menor = distancia; mejor = p; }
      }
      if (!mejor) return apagar();
      anillo.attr("cx", mejor.px).attr("cy", mejor.py).style("display", null);
      mostrarInformacion({
        titulo: mejor.serie.nombre, codigo: "",
        filas: [
          ["Número de provincias", String(mejor.x)],
          ["Participación acumulada", porcentaje(mejor.y * 100, 1)]
        ]
      }, evento.clientX, evento.clientY, contexto.ancla);
    })
    .on("pointerleave", evento => { if (evento.pointerType !== "touch") apagar(); });
}

// =============================================================================
// F4.1  Coeficiente de redistribución
// =============================================================================
export function dibujarRedistribucion(partes, contexto) {
  const { reg, j, nombres, total } = agregadoElegido(contexto);
  const [finalUno, finalDos] = reg.anios_finales;
  const periodos = reg.anios_finales.map(final => `${reg.anio_inicial} a ${final}`);
  // Ordeno por el segundo período (la segunda columna de CR).
  const segundo = reg.CR.map(fila => fila[1]);
  const puesto = puestos(segundo);

  partes.titulo.textContent = `¿Qué sectores cambiaron más de lugar entre las provincias? ${reg.anio_inicial} frente a ${reg.anios_finales.join(" y a ")}`;
  partes.subtitulo.textContent = "Coeficiente de redistribución: 0 = el sector se reparte entre las provincias igual que en el año inicial";
  partes.controles.replaceChildren();
  escribirLeyenda(partes.leyenda, [
    ...periodos.map((texto, s) => ({ texto, color: G.colores.periodos[s], forma: "barra" })),
    { texto: "Agregado del sector elegido (nombre en rojo)", color: P.colores.destacado, forma: "borde", negrita: true }
  ]);
  escribirNota(partes.nota, notaRegional(contexto, [
    `Se muestran los ${G.cantidad} de mayor valor en ${periodos[1]} entre los ${total} sectores y el agregado del sector elegido, con su puesto.`,
    `${finalUno} es el año de la matriz insumo-producto nacional; ${finalDos} es el último año de la base (datos preliminares).`
  ]));

  const filas = primerosYElegido(puesto, segundo, j).map(k => ({
    clave: String(k), nombre: nombres[k], puesto: puesto[k], destacado: k === j,
    valores: reg.CR[k], colores: G.colores.periodos
  }));
  barras(partes, contexto, {
    filas, altoFila: G.redistribucion.altoFila,
    rotuloX: "Coeficiente de redistribución (CR)",
    informacion: f => ({
      titulo: f.nombre, codigo: "",
      filas: [
        ...periodos.map((texto, s) => [texto, numero(f.valores[s], G.barras.decimales)]),
        [`Puesto (${periodos[1]})`, `${f.puesto} de ${total}`]
      ]
    }),
    descripcion: "Barras: los sectores con mayor coeficiente de redistribución, en dos períodos, y el agregado del sector elegido."
  });
}

// =============================================================================
// F4.2  Asociación geográfica
// =============================================================================
export function dibujarAsociacion(partes, contexto) {
  const { reg, j, agregado, nombres, total } = agregadoElegido(contexto);
  const n = G.asociacion.cantidad;
  // La fila del agregado elegido, sin él mismo, del menor valor al mayor.
  const orden = nombres.map((_, k) => k).filter(k => k !== j).sort((a, b) => reg.CAG[j][a] - reg.CAG[j][b]);
  const parecidos = orden.slice(0, n);
  const distintos = orden.slice(-n).filter(k => !parecidos.includes(k));

  partes.titulo.textContent = `¿Con qué sectores comparte su geografía ${agregado}? (${reg.anio_detalle})`;
  partes.subtitulo.textContent = "Coeficiente de asociación geográfica: 0 = los dos sectores están en las mismas provincias; cerca de 1 = en provincias distintas";
  partes.controles.replaceChildren();
  escribirLeyenda(partes.leyenda, [
    { texto: `Los ${n} con la geografía más parecida`, color: G.colores.parecida, forma: "barra" },
    { texto: `Los ${n} con la geografía más distinta`, color: G.colores.distinta, forma: "barra" }
  ]);
  escribirNota(partes.nota, notaRegional(contexto, [
    `Se muestran ${parecidos.length + distintos.length} de los ${total - 1} sectores restantes.`
  ]));

  const fila = (k, color) => ({
    clave: String(k), nombre: nombres[k], destacado: false,
    lugar: orden.indexOf(k) + 1,
    valores: [reg.CAG[j][k]], colores: [color]
  });
  const filas = [...parecidos.map(k => fila(k, G.colores.parecida)), ...distintos.map(k => fila(k, G.colores.distinta))];
  barras(partes, contexto, {
    filas, altoFila: G.asociacion.altoFila,
    rotuloX: `Coeficiente de asociación geográfica con ${agregado}`,
    informacion: f => ({
      titulo: f.nombre, codigo: "",
      filas: [
        [`Asociación geográfica con ${agregado}`, numero(f.valores[0], G.barras.decimales)],
        ["Puesto, de la más parecida a la más distinta", `${f.lugar} de ${total - 1}`]
      ]
    }),
    descripcion: `Barras: los sectores con la geografía más parecida y más distinta a la de ${agregado}.`
  });
}

// La lista que usa la página: el nombre que pongo en el HTML (data-grafico) y su función.
export const GRAFICOS_FAJAS3Y4 = {
  mapaQL: dibujarMapaQL,
  localizacion: dibujarLocalizacion,
  curva: dibujarCurva,
  redistribucion: dibujarRedistribucion,
  asociacion: dibujarAsociacion
};
