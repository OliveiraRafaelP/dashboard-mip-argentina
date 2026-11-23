// =============================================================================
// principal.js
// El punto de partida de la página. Aquí junto las piezas:
//   1. aplico los parámetros de presentación;
//   2. cargo los datos;
//   3. armo los filtros y leo la elección de la dirección de la página;
//   4. dibujo los cuadros y los vuelvo a dibujar cuando cambia el filtro o el
//      tamaño de la ventana.
// =============================================================================

import { PARAMETROS as P } from "./parametros.js";
import { cargarDatos } from "./datos.js";
import { iniciarFiltros, leerDireccion, escribirDireccion } from "./filtros.js";
import { crearCuadro, iniciarAmpliar, ampliar, redibujarAmpliado } from "./cuadros.js";
import { completarTextos, escribirNotaGeneral, escribirInsumos, iniciarCorrespondencia } from "./metodologia.js";
import { ocultarInformacion, enPalabras } from "./utilidades.js";
import { GRAFICOS_FAJA1 } from "./graficos_faja1.js";
import { GRAFICOS_FAJA2 } from "./graficos_faja2.js";
import { GRAFICOS_FAJAS3Y4 } from "./graficos_fajas3y4.js";
import { GRAFICOS_FAJA5 } from "./graficos_faja5.js";
import { GRAFICOS_FAJA6 } from "./graficos_faja6.js";

const GRAFICOS = { ...GRAFICOS_FAJA1, ...GRAFICOS_FAJA2, ...GRAFICOS_FAJAS3Y4, ...GRAFICOS_FAJA5, ...GRAFICOS_FAJA6 };

// ---- 1. Parámetros de presentación ----------------------------------------------
// Paso al CSS los valores que viven en parametros.js, para no repetirlos.
const raiz = document.documentElement;
raiz.style.setProperty("--ancho-maximo", `${P.anchoMaximo}px`);
raiz.style.setProperty("--margen-lateral", `${P.margenLateral}px`);
raiz.style.setProperty("--color-destacado", P.colores.destacado);
raiz.style.setProperty("--color-texto", P.colores.texto);
raiz.style.setProperty("--color-texto-suave", P.colores.textoSuave);
raiz.style.setProperty("--color-filtros", P.colores.filtros.fondo);
raiz.style.setProperty("--color-filtros-texto", P.colores.filtros.texto);
raiz.style.setProperty("--color-titulos", P.colores.titulos);
raiz.style.setProperty("--columnas-metodologia", P.seccionesFinales.columnasMetodologia.map(p => `minmax(0, ${p}fr)`).join(" "));

// Formato de celular por debajo del ancho indicado en los parámetros.
const pantallaChica = window.matchMedia(`(max-width: ${P.anchoCelular - 0.02}px)`);
// Ventana mediana: entre el ancho de celular y el ancho medio de los parámetros.
const pantallaMedia = window.matchMedia(`(min-width: ${P.anchoCelular}px) and (max-width: ${P.anchoMedio - 0.02}px)`);
const aplicarFormato = () => {
  document.body.classList.toggle("celular", pantallaChica.matches);
  document.body.classList.toggle("medio", pantallaMedia.matches);
};
aplicarFormato();
pantallaChica.addEventListener("change", aplicarFormato);
pantallaMedia.addEventListener("change", aplicarFormato);

// Ancho de los cuadros de cada faja: el que dicen los parámetros o, si la faja
// no figura allí, partes iguales. Sirve para fajas de dos, tres o cuatro cuadros.
for (const faja of document.querySelectorAll(".faja")) {
  const fila = faja.querySelector(".faja-cuadros");
  if (!fila) continue;
  const config = P.fajas[faja.id] ?? {};
  const enColumnas = proporciones => proporciones.map(p => `minmax(0, ${p}fr)`).join(" ");
  fila.style.setProperty("--columnas", enColumnas(config.columnas ?? Array.from(fila.children, () => 1)));
  // En ventanas medianas: dos cuadros arriba y uno abajo, a todo el ancho.
  if (config.columnasMedio) {
    fila.style.setProperty("--columnas-medio", enColumnas(config.columnasMedio));
    fila.children[config.enteroEnMedio]?.classList.add("entero-en-medio");
  }
}

// Botones del encabezado: bajan hasta las secciones finales.
for (const boton of document.querySelectorAll("[data-ir-a]")) {
  boton.addEventListener("click", () => document.getElementById(boton.dataset.irA).scrollIntoView({ behavior: "smooth" }));
}

// ---- 2 a 4. Datos, filtros y cuadros ---------------------------------------------
async function iniciar() {
  const { sectores, provincias, regional, afectados, mapa, mundo, exportaciones, correspondencia, textos: textosCrudos } = await cargarDatos();

  // Números que aparecen dentro de los textos de la página (descripciones de
  // las fajas, fuentes). No los escribo a mano: los cuento o los leo en los
  // datos. En el HTML, cada uno es un <span data-dato="nombre">.
  const datosDeTexto = {
    nSectores: sectores.length,
    nAgregado: regional.cantidadSectores,
    nProvincias: provincias.length,
    nAfectados: Math.max(...sectores.map(d => d.n_afectados)),
    nConDestinos: sectores.filter(d => d.con_destinos).length,
    anioMatriz: P.anioMatriz,
    anioExportaciones: P.anioExportaciones,
    anioDetalle: regional.anioDetalle,
    anioInicial: regional.anioInicial,
    anioPrimero: regional.anioPrimero,
    anioUltimo: regional.anioUltimo
  };
  for (const lugar of document.querySelectorAll("[data-dato]")) {
    const valor = datosDeTexto[lugar.dataset.dato];
    lugar.textContent = lugar.dataset.forma === "palabra" ? enPalabras(valor) : String(valor);
  }

  // Los textos de metodología traen once marcadores entre llaves. Los completo
  // con los mismos valores que usan las descripciones de las fajas.
  const textos = completarTextos(textosCrudos, {
    n_sectores: datosDeTexto.nSectores,
    n_agregados: datosDeTexto.nAgregado,
    n_provincias: datosDeTexto.nProvincias,
    n_afectados: enPalabras(datosDeTexto.nAfectados),
    n_con_destinos: enPalabras(datosDeTexto.nConDestinos),
    anio_matriz: P.anioMatriz,
    anio_precios: P.anioPrecios,
    anio_exportaciones: P.anioExportaciones,
    anio_inicial: regional.anioInicial,
    anio_final: regional.anioUltimo,
    // El penúltimo año de la planilla provincial (el mismo que usa F5.2).
    anio_penultimo: regional.anioPenultimo
  });

  // Títulos que citan los años comparados: los años salen del archivo regional.
  for (const titulo of document.querySelectorAll("[data-titulo-con-anios]")) {
    titulo.textContent = `${titulo.dataset.tituloConAnios}: ${regional.anioInicial} frente a ${regional.aniosFinales.join(" y a ")}`;
  }
  const porCodigo = new Map(sectores.map(d => [d.codigo, d]));
  const estado = leerDireccion(sectores, provincias);

  // Lo que cada gráfico necesita saber para dibujarse.
  const contexto = () => ({
    sectores,
    elegido: porCodigo.get(estado.sector),
    provincia: estado.provincia,
    porCodigo,
    afectados,
    regional: regional.datos,   // el archivo regional entero (fajas 3 y 4)
    mapa,                       // los contornos de las provincias
    mundo,                      // los contornos de los países (faja 6)
    exportaciones,              // destinos de las exportaciones (faja 6)
    ampliado: false,
    ancla: document.body,
    redibujar,
    elegirSector,      // para los gráficos en los que un clic elige otro sector
    elegirProvincia    // y para el mapa, en el que un clic elige otra provincia
  });

  // Los cuadros que tienen gráfico: en el HTML llevan data-grafico="nombre".
  // Cada uno tiene su frente (el gráfico) y su reverso (la metodología). La
  // metodología se busca por el número del cuadro: "cuadro-F3-1" -> "F3.1".
  const cuadros = [...document.querySelectorAll("[data-grafico]")].map(elemento => {
    const dibujar = GRAFICOS[elemento.dataset.grafico];
    const tarjeta = crearCuadro(elemento, textos.cuadros[elemento.id.replace("cuadro-", "").replace("-", ".")]);
    tarjeta.partes.boton.addEventListener("click", () => ampliar(dibujar, contexto));
    return { partes: tarjeta.partes, dibujar, tarjeta };
  });

  // Dibujo en dos pasadas. En la primera, cada gráfico toma su alto propio.
  // En la segunda (solo en la computadora, donde los cuadros van lado a lado),
  // cada gráfico puede crecer hasta el alto del cuadro más alto de su fila,
  // para que no queden huecos en blanco.
  function redibujar() {
    ocultarInformacion();
    for (const cuadro of cuadros) cuadro.dibujar(cuadro.partes, contexto());
    if (!pantallaChica.matches)
      for (const cuadro of cuadros) cuadro.dibujar(cuadro.partes, { ...contexto(), rellenar: true });
    // Los cuadros que están mostrando el reverso siguen así: el gráfico se
    // actualiza por detrás y la letra del reverso se acomoda al tamaño nuevo.
    for (const cuadro of cuadros) cuadro.tarjeta.acomodar();
    redibujarAmpliado();
  }

  // Cambio la elección (sector o provincia) y actualizo todo.
  function cambiarEstado(cambio) {
    Object.assign(estado, cambio);
    escribirDireccion(estado);
    mostrarFiltros(estado);
    redibujar();
  }
  function elegirSector(codigo) {
    if (porCodigo.has(codigo) && codigo !== estado.sector) cambiarEstado({ sector: codigo });
  }

  function elegirProvincia(provincia) {
    if (provincias.includes(provincia) && provincia !== estado.provincia) cambiarEstado({ provincia });
  }

  const mostrarFiltros = iniciarFiltros({ sectores, provincias, regional, alCambiar: cambiarEstado });

  iniciarAmpliar(document.getElementById("ventana-ampliada"));

  // La tabla de correspondencia: la abren el enlace que está junto al filtro
  // de sector y el de la nota general.
  const abrirCorrespondencia = iniciarCorrespondencia({
    ventana: document.getElementById("ventana-correspondencia"),
    filas: correspondencia,
    cantidadMatriz: sectores.length,
    cantidadProvincial: regional.cantidadSectores,
    sectorElegido: () => estado.sector,
    alElegir: elegirSector
  });
  document.getElementById("ver-correspondencia").addEventListener("click", abrirCorrespondencia);

  // Nota general e insumos, al final de la página.
  escribirNotaGeneral(document.getElementById("metodologia"), textos.general, abrirCorrespondencia);
  escribirInsumos(document.getElementById("insumos"), textos.insumos);
  escribirDireccion(estado);
  mostrarFiltros(estado);
  redibujar();

  // Si alguien cambia la dirección a mano (o pega un enlace), sigo la dirección.
  window.addEventListener("hashchange", () => {
    Object.assign(estado, leerDireccion(sectores, provincias));
    escribirDireccion(estado);
    mostrarFiltros(estado);
    redibujar();
  });

  // Si cambia el ancho de la ventana, vuelvo a dibujar (no estiro la imagen).
  let anchoAnterior = window.innerWidth, altoAnterior = window.innerHeight, espera = null;
  window.addEventListener("resize", () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      if (window.innerWidth !== anchoAnterior) redibujar();
      else if (window.innerHeight !== altoAnterior) redibujarAmpliado();
      anchoAnterior = window.innerWidth; altoAnterior = window.innerHeight;
    }, 150);
  });

  // Con el dedo: un toque fuera de los gráficos esconde el recuadro de información.
  document.addEventListener("pointerdown", evento => {
    if (!evento.target.closest(".cuadro-grafico")) ocultarInformacion();
  });

  // Cuando terminan de llegar las letras de las fórmulas, los reversos que
  // estén a la vista se acomodan otra vez (las medidas cambian con la letra).
  document.fonts.ready.then(() => { for (const cuadro of cuadros) cuadro.tarjeta.acomodar(); redibujarAmpliado(); });

  document.body.dataset.estado = "listo";
}

iniciar().catch(error => {
  console.error(error);
  const aviso = document.getElementById("aviso-error");
  aviso.textContent = `No pude cargar la página: ${error.message}`;
  aviso.hidden = false;
});
