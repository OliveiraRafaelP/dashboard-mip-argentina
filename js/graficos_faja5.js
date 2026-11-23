// =============================================================================
// graficos_faja5.js
// Los tres cuadros de la faja 5, "Especialización y cambio estructural de la
// provincia". Reaccionan a la provincia elegida, no al sector:
//   F5.1  Mapa del coeficiente de especialización   (modelo: figura 04_mapa_especializacion)
//   F5.2  Evolución de la especialización           (modelo: figura 04_evolucion_especializacion)
//   F5.3  Coeficiente de reestructuración, 1 mapa   (modelo: figura 04_mapa_reestructuracion)
//
// Los datos salen de datos/regional.json: `CE_serie` es provincias x años y
// `CT` es provincias x los dos años finales, en el orden de las listas
// `provincias`, `anios` y `anios_finales` del mismo archivo.
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";
import {
  numero, escribirNota, escribirLeyenda, marcasDelEje, estiloBase, TAMANO_EJES,
  altoDelGrafico, anchoTexto, mostrarInformacion, ocultarInformacion
} from "./utilidades.js";
import { limpiar, tituloDeEje, puestos, fuenteRegional } from "./graficos_fajas3y4.js";
import { dibujarMapaProvincias, altoDelMapa, notaDelMapa, escalaContinua, escribirBarraDeColores } from "./mapa_provincias.js";

const G = P.regional;
const DECIMALES = G.barras.decimales;      // los coeficientes se escriben con tres decimales

// Las provincias de mayor valor, por nombre.
function mayores(provincias, valores, cantidad) {
  return provincias.map((_, i) => i).sort((a, b) => valores[b] - valores[a]).slice(0, cantidad).map(i => provincias[i]);
}

// =============================================================================
// F5.1  Mapa del coeficiente de especialización
// =============================================================================
export function dibujarMapaEspecializacion(partes, contexto) {
  const reg = contexto.regional;
  const provincias = reg.provincias;
  const columna = reg.anios.indexOf(reg.anio_detalle);
  const ce = reg.CE_serie.map(fila => fila[columna]);
  const puesto = puestos(ce);
  const n = G.especializacion.conNombre;
  const minimo = Math.min(...ce), maximo = Math.max(...ce);
  const color = escalaContinua(minimo, maximo);

  partes.titulo.textContent = `¿Qué provincias se parecen menos al país? (${reg.anio_detalle})`;
  partes.subtitulo.textContent = `Coeficiente de especialización: 0 = estructura productiva igual a la del país. Con nombre: las ${n} más especializadas y la provincia elegida`;
  partes.controles.replaceChildren();
  escribirBarraDeColores(partes.leyenda, { titulo: "Coeficiente de especialización (CE)", minimo, maximo, elegida: contexto.provincia });
  // La fórmula del coeficiente está en el reverso del cuadro (botón "Metodología").
  escribirNota(partes.nota, [notaDelMapa(contexto.mapa), fuenteRegional()]);

  const contenedor = partes.grafico;
  limpiar(contenedor);
  const ancho = contenedor.clientWidth;
  dibujarMapaProvincias(contenedor, contexto, {
    ancho, alto: altoDelMapa(contexto.mapa, ancho, contexto, contenedor.clientHeight, P.regional.mapa.topesFaja5),
    color: (nombre, i) => color(ce[i]),
    informacion: (nombre, i) => [
      ["Coeficiente de especialización (CE)", numero(ce[i], DECIMALES)],
      ["Puesto", `${puesto[i]} de ${provincias.length}`]
    ],
    conNombre: [contexto.provincia, ...mayores(provincias, ce, n)],
    descripcion: "Mapa de la Argentina por provincia: coeficiente de especialización."
  });
}

// =============================================================================
// F5.2  Evolución de la especialización
// =============================================================================
export function dibujarEvolucion(partes, contexto) {
  const reg = contexto.regional;
  const E = G.evolucion;
  const provincias = reg.provincias, anios = reg.anios;
  const primero = anios[0], ultimo = anios[anios.length - 1], penultimo = anios[anios.length - 2];
  const elegida = contexto.provincia;
  const iElegida = provincias.indexOf(elegida);

  partes.titulo.textContent = `Evolución de la especialización de ${elegida}, ${primero}-${ultimo}`;
  partes.subtitulo.textContent = `En rojo: la provincia elegida. En gris: las demás. Entre paréntesis, el cambio del coeficiente de ${primero} a ${ultimo}`;
  partes.controles.replaceChildren();
  escribirLeyenda(partes.leyenda, [
    { texto: elegida, color: P.colores.destacado, forma: "linea", negrita: true },
    { texto: "Cada una de las demás provincias", color: E.colorDemas, forma: "linea" }
  ]);
  escribirNota(partes.nota, [`${penultimo} y ${ultimo}: datos provisorios o preliminares.`, fuenteRegional()]);

  const contenedor = partes.grafico;
  limpiar(contenedor);
  const tituloY = tituloDeEje(contenedor, "↑ Coeficiente de especialización (CE)", "y");
  const ancho = contenedor.clientWidth;
  const alto = altoDelGrafico(contenedor, contexto, E, tituloY.offsetHeight + 6);

  // Una serie por provincia: [{ anio, valor }].
  const series = provincias.map((nombre, i) => ({
    nombre, i, puntos: reg.CE_serie[i].map((valor, k) => ({ anio: anios[k], valor }))
  }));
  const laElegida = series[iElegida];
  const demas = series.filter(s => s !== laElegida);
  const cambio = laElegida.puntos[anios.length - 1].valor - laElegida.puntos[0].valor;
  const rotulo = `${elegida} (${cambio >= 0 ? "+" : "−"}${numero(Math.abs(cambio), DECIMALES)})`;

  // El nombre va al final de la línea, a la derecha. Si el cuadro es angosto,
  // va encima del último punto, para no quitarle lugar al gráfico.
  const anchoRotulo = anchoTexto(rotulo, TAMANO_EJES, true);
  const alLado = ancho >= E.anchoAngosto;
  const margenDerecho = alLado ? Math.ceil(anchoRotulo) + 14 : 12;

  const todos = reg.CE_serie.flat();
  const aire = (Math.max(...todos) - Math.min(...todos)) * E.margenVertical;
  const y0 = Math.min(...todos) - aire, y1 = Math.max(...todos) + aire;
  const mY = marcasDelEje(y0, y1, Math.round(alto / 70));
  // Sin marcas pegadas al borde de abajo: se pisarían con los años del eje horizontal.
  mY.valores = mY.valores.filter(v => v > y0 + (y1 - y0) * 0.04);
  const paso = ancho - margenDerecho < E.anchoAngosto ? 4 : 2;

  const svg = Plot.plot({
    width: ancho, height: alto,
    marginTop: 14, marginRight: margenDerecho, marginBottom: 26, marginLeft: 40,
    style: estiloBase(),
    ariaLabel: "Líneas: coeficiente de especialización de cada provincia, año por año.",
    x: { domain: [primero, ultimo], ticks: d3.range(primero, ultimo + 1, paso), tickFormat: String, tickSize: 0, grid: true, label: null },
    y: { domain: [y0, y1], ticks: mY.valores, tickFormat: v => numero(v, mY.decimales), tickSize: 0, grid: true, label: null },
    marks: [
      // El año de detalle (el de los mapas): una línea vertical punteada, discreta.
      Plot.ruleX([reg.anio_detalle], { stroke: P.colores.textoSuave, strokeWidth: 1, strokeDasharray: "2,4" }),
      ...demas.map(s => Plot.line(s.puntos, { x: "anio", y: "valor", stroke: E.colorDemas, strokeWidth: E.grosorDemas })),
      Plot.line(laElegida.puntos, { x: "anio", y: "valor", stroke: P.colores.destacado, strokeWidth: E.grosorElegida })
    ]
  });
  contenedor.appendChild(svg);

  const escalaX = svg.scale("x"), escalaY = svg.scale("y");
  const capa = d3.select(svg).append("g").attr("class", "capa-rotulos");
  const fin = laElegida.puntos[anios.length - 1];
  const texto = capa.append("text")
    .attr("dominant-baseline", "central")
    .attr("font-size", TAMANO_EJES).attr("font-weight", 700).attr("fill", P.colores.destacado)
    .attr("stroke", P.colores.fondoGrafico).attr("stroke-width", 3).attr("paint-order", "stroke")
    .attr("class", "nombre-linea")
    .text(rotulo);
  if (alLado) texto.attr("text-anchor", "start").attr("x", escalaX.apply(fin.anio) + 8).attr("y", escalaY.apply(fin.valor));
  else {
    // Encima del final de la línea (o debajo, si arriba no hay lugar).
    const y = escalaY.apply(fin.valor);
    texto.attr("text-anchor", "end").attr("x", escalaX.apply(fin.anio)).attr("y", y - 14 < 12 ? y + 14 : y - 14);
  }

  // Información al pasar el cursor: el punto más cercano, de cualquier línea.
  // Un clic en una línea gris elige esa provincia.
  const puntos = series.flatMap(s => s.puntos.map(p => ({ ...p, serie: s, px: escalaX.apply(p.anio), py: escalaY.apply(p.valor) })));
  const trazo = d3.line().x(p => escalaX.apply(p.anio)).y(p => escalaY.apply(p.valor));
  const resalte = capa.append("path").attr("fill", "none").attr("stroke", P.colores.ejes).attr("stroke-width", 2)
    .style("display", "none").style("pointer-events", "none");
  const anillo = capa.append("circle").attr("r", 5)
    .attr("fill", "none").attr("stroke", P.colores.texto).attr("stroke-width", 1.5)
    .style("display", "none").style("pointer-events", "none");
  const buscar = evento => {
    const [mx, my] = d3.pointer(evento, svg);
    let mejor = null, menor = E.distanciaInformacion;
    for (const p of puntos) {
      const distancia = Math.hypot(p.px - mx, p.py - my);
      if (distancia < menor) { menor = distancia; mejor = p; }
    }
    return mejor;
  };
  const apagar = () => { anillo.style("display", "none"); resalte.style("display", "none"); zona.style("cursor", null); ocultarInformacion(); };
  const zona = d3.select(svg).append("rect")
    .attr("x", 0).attr("y", 0).attr("width", ancho).attr("height", alto)
    .attr("fill", "transparent").attr("class", "zona-lineas")
    .on("pointermove pointerdown", evento => {
      const p = buscar(evento);
      if (!p) return apagar();
      const otra = p.serie !== laElegida;
      anillo.attr("cx", p.px).attr("cy", p.py).style("display", null);
      resalte.attr("d", otra ? trazo(p.serie.puntos) : null).style("display", otra ? null : "none");
      zona.style("cursor", otra ? "pointer" : null);
      mostrarInformacion({
        titulo: p.serie.nombre, codigo: "",
        filas: [
          ["Año", String(p.anio)],
          ["Coeficiente de especialización (CE)", numero(p.valor, DECIMALES)],
          ...(otra ? [["Clic", "elegir esta provincia"]] : [])
        ]
      }, evento.clientX, evento.clientY, contexto.ancla);
    })
    .on("pointerleave", evento => { if (evento.pointerType !== "touch") apagar(); })
    .on("click", evento => {
      const p = buscar(evento);
      if (p && p.serie !== laElegida) contexto.elegirProvincia(p.serie.nombre);
    });
}

// =============================================================================
// F5.3  Coeficiente de reestructuración: un mapa
// =============================================================================
// El archivo trae el coeficiente para dos períodos (una columna de `CT` por
// cada año de `anios_finales`). La página muestra uno solo: del año inicial al
// año de detalle, que es el de la matriz insumo-producto nacional. Busco la
// columna por el año, no por su posición.
export function dibujarReestructuracion(partes, contexto) {
  const reg = contexto.regional;
  const provincias = reg.provincias;
  const n = G.reestructuracion.conNombre;
  const columna = reg.anios_finales.indexOf(reg.anio_detalle);
  const ct = reg.CT.map(fila => fila[columna]);
  const puesto = puestos(ct);
  const minimo = Math.min(...ct), maximo = Math.max(...ct);
  const color = escalaContinua(minimo, maximo);
  const periodo = `${reg.anio_inicial} a ${reg.anio_detalle}`;

  partes.titulo.textContent = `¿En qué provincias cambió más la estructura productiva? ${reg.anio_inicial} frente a ${reg.anio_detalle}`;
  partes.subtitulo.textContent = `Coeficiente de reestructuración: 0 = misma estructura que en el año inicial. Con nombre: las ${n} que más cambiaron y la provincia elegida`;
  partes.controles.replaceChildren();
  escribirBarraDeColores(partes.leyenda, { titulo: "Coeficiente de reestructuración (CT)", minimo, maximo, elegida: contexto.provincia });
  escribirNota(partes.nota, [
    `La comparación es con ${reg.anio_detalle} porque es el año de la matriz insumo-producto nacional.`,
    notaDelMapa(contexto.mapa),
    fuenteRegional()
  ]);

  const contenedor = partes.grafico;
  limpiar(contenedor);
  const ancho = contenedor.clientWidth;
  dibujarMapaProvincias(contenedor, contexto, {
    ancho, alto: altoDelMapa(contexto.mapa, ancho, contexto, contenedor.clientHeight, P.regional.mapa.topesFaja5),
    color: (nombre, i) => color(ct[i]),
    informacion: (nombre, i) => [
      [`Coeficiente de reestructuración, ${periodo}`, numero(ct[i], DECIMALES)],
      ["Puesto", `${puesto[i]} de ${provincias.length}`]
    ],
    conNombre: [contexto.provincia, ...mayores(provincias, ct, n)],
    descripcion: `Mapa de la Argentina por provincia: coeficiente de reestructuración, ${periodo}.`
  });
}

// La lista que usa la página: el nombre que pongo en el HTML (data-grafico) y su función.
export const GRAFICOS_FAJA5 = {
  mapaEspecializacion: dibujarMapaEspecializacion,
  evolucion: dibujarEvolucion,
  reestructuracion: dibujarReestructuracion
};
