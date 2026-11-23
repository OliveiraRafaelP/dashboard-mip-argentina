// =============================================================================
// datos.js
// Carga de los datos. La página no trae ningún resultado escrito en el código:
// todo lo leo de los archivos JSON de la carpeta datos/, que graba el script
// de R 08_exportar_datos_dashboard.R.
// =============================================================================

// Leo un archivo JSON de datos/ y aviso con un mensaje claro si no lo encuentro.
// Los resultados están en datos/; los textos de metodología, en textos/.
async function leerJSON(archivo, carpeta = "datos") {
  const respuesta = await fetch(`${carpeta}/${archivo}`);
  if (!respuesta.ok) throw new Error(`No pude leer ${carpeta}/${archivo} (código ${respuesta.status}).`);
  return respuesta.json();
}

// Devuelvo lo que la página necesita en esta etapa:
//   sectores   : una fila por sector de la matriz (índices, puestos, clase, agregado provincial)
//   provincias : los nombres de las jurisdicciones, en el orden del archivo regional
//   regional   : lo que la página cuenta o cita del archivo regional: cuántos
//                sectores tiene el agregado provincial y qué años se comparan
//   afectados  : para cada sector extraído (por su código), la lista de los
//                sectores que más pierden
//   mapa       : los contornos de las provincias (los graba el script 09)
//   mundo      : los contornos de los países (también del script 09)
//   exportaciones : destinos de las exportaciones de los sectores que tienen esa apertura
//   correspondencia : la tabla que lleva de cada sector de la matriz a su sector de la planilla provincial
//   textos     : la metodología de cada cuadro, la nota general y los insumos (textos/metodologia.json)
// `regional.datos` es el archivo regional entero, para los cuadros de las fajas 3 y 4.
export async function cargarDatos() {
  const [sectores, regional, filasAfectados, mapa, mundo, exportaciones, correspondencia, textos] = await Promise.all([
    leerJSON("sectores_mip.json"),
    leerJSON("regional.json"),
    leerJSON("extraccion_afectados.json"),
    leerJSON("mapa_provincias.json"),
    leerJSON("mapa_mundo.json"),
    leerJSON("exportaciones.json"),
    leerJSON("correspondencia.json"),
    leerJSON("metodologia.json", "textos")
  ]);
  // Agrupo los afectados por sector extraído, para buscarlos rápido.
  const afectados = new Map();
  for (const fila of filasAfectados) {
    if (!afectados.has(fila.codigo_extraido)) afectados.set(fila.codigo_extraido, []);
    afectados.get(fila.codigo_extraido).push(fila);
  }
  return {
    sectores,
    provincias: regional.provincias,
    afectados,
    mapa,
    mundo,
    exportaciones,
    correspondencia,
    textos,
    regional: {
      datos: regional,
      cantidadSectores: regional.sectores.length,
      anioInicial: regional.anio_inicial,
      aniosFinales: regional.anios_finales,
      anioDetalle: regional.anio_detalle,
      anioPrimero: regional.anios[0],
      anioUltimo: regional.anios[regional.anios.length - 1],
      anioPenultimo: regional.anios[regional.anios.length - 2]
    }
  };
}
