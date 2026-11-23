// =============================================================================
// parametros.js
// Aquí junto TODOS los valores de presentación de la página: colores, tamaños,
// cuántos sectores entran en el ranking, dónde se quiebra el eje, qué sector y
// qué provincia aparecen al abrir, etc. Si quiero cambiar cómo se ve algo,
// lo cambio aquí y no en el resto del código.
//
// Ojo: aquí NO hay ningún número de resultado (índices, puestos, cantidades de
// sectores). Esos salen siempre de los archivos de datos/.
// =============================================================================

export const PARAMETROS = {
  // Qué se ve al abrir la página, si la dirección no dice otra cosa.
  inicial: { sector: "S008", provincia: "Neuquén" },

  // El año de la matriz insumo-producto nacional (cita en "Insumos"). No está
  // en ningún archivo de datos/, por eso va aquí. Todos los textos que citan el
  // año de la matriz usan este parámetro.
  anioMatriz: 2022,

  // El año base de los precios del VAB provincial (la planilla está a precios
  // constantes de ese año). Tampoco está en los archivos de datos/. Lo usa la
  // línea de fuente de los cuadros regionales (fajas 3 y 4).
  anioPrecios: 2004,

  // Exportaciones por país de destino (faja 6). Estos tres valores repiten los
  // del script 05 y no están en los archivos de datos/; se usan solo en los textos.
  anioExportaciones: 2022,   // año de las bases de exportaciones del INDEC
  umbralFlecha: 0.01,        // llevan flecha los países con al menos esta parte de las exportaciones del sector
  maxFlechas: 10,            // y nunca más de esta cantidad

  // Los valores en pesos de los archivos de datos/ están en millones. En los
  // gráficos los muestro divididos por `divisor`, con el nombre de esa unidad.
  unidades: { divisor: 1000, texto: "miles de millones de pesos" },

  // Por debajo de este ancho (en píxeles) la página pasa al formato de celular:
  // una columna, un cuadro por fila y los filtros apilados.
  anchoCelular: 800,
  // Entre el ancho de celular y este ancho, la ventana es "mediana": las fajas
  // que lo indican más abajo pasan a dos filas (dos cuadros arriba y uno abajo,
  // a todo el ancho).
  anchoMedio: 1500,
  // El contenido ocupa todo el ancho de la ventana. Solo en pantallas muy
  // anchas pongo un límite, para que los gráficos no queden desproporcionados.
  anchoMaximo: 2200,
  // Margen a cada lado del contenido, en píxeles (en la computadora).
  margenLateral: 47,

  // Ancho de los cuadros de cada faja, como proporciones. La clave es el id de
  // la faja en index.html.
  //   columnas      : un número por cuadro (la faja puede tener dos, tres o cuatro).
  //   columnasMedio : en ventanas medianas, las proporciones de los dos cuadros de arriba.
  //   enteroEnMedio : en ventanas medianas, cuál cuadro va abajo, a todo el ancho
  //                   (su posición en la faja, contando desde 0).
  // Las fajas que no figuran aquí reparten el ancho en partes iguales.
  fajas: {
    // cuadrantes (F1.1), ranking (F1.2) y dispersión U x V (F1.3); en ventanas medianas el ranking va abajo
    "faja-1": { columnas: [38, 34, 28], columnasMedio: [56, 44], enteroEnMedio: 1 },
    // cascada (F2.1), más afectados (F2.2) y comparación (F2.3); en ventanas medianas la comparación va abajo
    "faja-2": { columnas: [26, 30, 44], columnasMedio: [45, 55], enteroEnMedio: 2 },
    // mapa (F3.1), coeficiente de localización (F3.2) y curva (F3.3); en ventanas medianas la curva va abajo
    // El cuadro del mapa es angosto: el mapa es alto y, con un cuadro más ancho, sobra blanco a los lados.
    "faja-3": { columnas: [25, 33, 42], columnasMedio: [27, 73], enteroEnMedio: 2 },
    // mapa de especialización (F5.1), evolución (F5.2) y mapa de reestructuración (F5.3);
    // en ventanas medianas siguen los tres en una fila, con los mapas un poco más anchos
    "faja-5": { columnas: [25, 47, 28], columnasMedio: [27, 46, 27] },
    // mapa de los destinos (F6.1) y destinos en barras (F6.2)
    "faja-6": { columnas: [58, 42] }
  },

  // Reverso de los cuadros (la metodología). La letra del reverso crece, en
  // cada cuadro, hasta que el contenido ocupa el alto del cuadro.
  reverso: {
    factorMaximo: 1.6,   // la letra crece como mucho hasta esta cantidad de veces su tamaño de base
    pasos: 7,            // cuántas veces parto el intervalo al buscar el factor (más pasos = más precisión)
    // Cuadros cuyo reverso puede achicar la letra por debajo del tamaño de base,
    // hasta `factor`, antes de desplazarse por dentro (F2.1 dejó de entrar con
    // el texto de la rodada 15).
    menor: { cuadros: ["F2.1"], factor: 0.9 }
  },

  // Secciones finales. En "Metodología", con la ventana ancha, el texto va en
  // dos columnas: los párrafos en una y "Alcance y límites" en la otra. Estas
  // son las proporciones de las dos columnas.
  seccionesFinales: { columnasMetodologia: [64, 36] },

  // Números: coma decimal y punto de millar.
  formato: { idioma: "es-AR", decimales: 2 },

  colores: {
    destacado: "#C00000",          // el sector elegido en el filtro
    texto: "#1F2933",              // textos principales
    textoSuave: "#5F6B7A",         // subtítulos, notas, ejes
    ejes: "#4A5560",               // líneas de referencia (índice = 1, mediana)
    fondoGrafico: "#FFFFFF",
    // Faja de los filtros: el verde del sitio del NEREUS de fondo y un tono
    // oscuro para los textos que van sobre él (rótulos, conteos, enlace).
    filtros: { fondo: "#81BEC0", texto: "#0B2F36" },
    // Títulos de las seis fajas y de las secciones "Metodología" e "Insumos", y
    // círculo con el número de la faja: el tono oscuro del sitio del NEREUS.
    titulos: "#007183",
    // Clases de Rasmussen-Hirschman (cuadros F1.1 y F1.2). El orden de esta
    // lista es el orden de la leyenda.
    clase: {
      "Sector clave": "#D99A00",
      "Solo encadenamiento hacia atrás": "#1F4E9E",
      "Solo encadenamiento hacia adelante": "#2E8B57",
      "Independiente": "#8A94A6"
    },
    // Cuadrantes de la dispersión U x V (cuadro F1.3).
    cuadrante: {
      "Alto y repartido": "#D99A00",
      "Alto y concentrado": "#1F4E9E",
      "Bajo y repartido": "#2E8B57",
      "Bajo y concentrado": "#8A94A6"
    }
  },

  // Valor del índice que separa "por encima" y "por debajo" del promedio.
  indiceReferencia: 1,

  // Gráficos de dispersión (F1.1 y F1.3).
  dispersion: {
    proporcion: 0.68,        // alto del gráfico = ancho x proporción (más ancho que alto)
    proporcionMaxima: 1.15,  // si el cuadro vecino es más alto, el gráfico crece hasta esta proporción para acompañarlo
    proporcionCelular: 1.15, // en el celular (una columna) el gráfico es más alto que ancho
    altoMinimo: 340,         // pero nunca menos que esto, en píxeles
    margenHorizontal: 0.08,  // aire a la izquierda y a la derecha, como parte del rango de los datos
    margenVertical: 0.30,    // aire arriba y abajo: ahí van los rótulos de las esquinas
    radio: 4.5,              // radio de cada punto
    radioDestacado: 10,      // radio del círculo rojo del sector elegido
    grosorDestacado: 2.5,
    distanciaInformacion: 26 // hasta qué distancia del cursor (px) busco el punto más cercano
  },

  // Eje horizontal quebrado del cuadro F1.1 (igual que en el script 02):
  // hasta `quiebre` la escala es normal; a la derecha, cada unidad ocupa
  // `compresion` del espacio. `marcas` son los valores que escribo en el eje.
  ejeQuebrado: {
    quiebre: 2.7,
    compresion: 0.35,
    marcas: [0.5, 1, 1.5, 2, 2.5, 3, 4, 5],
    decimalesMarcas: 1
  },

  // Qué sectores llevan el nombre escrito además del elegido.
  etiquetas: {
    mayoresUj: 5,          // F1.1: los de mayor Uj
    mayoresUi: 5,          // F1.1: los de mayor Ui
    menoresUj: 1,          // F1.1: el de menor Uj
    extremosV: 5,          // F1.3: los de menor V y los de mayor V
    tamano: 11,            // tamaño de la letra, en píxeles
    tamanoEsquinas: 10.5,  // rótulos de las cuatro esquinas
    colorPorClase: false   // true = el nombre va del color del punto; false = en gris oscuro (se lee mejor)
  },

  // Ranking (cuadro F1.2).
  ranking: {
    cantidad: 15,           // cuántos sectores por panel
    altoFila: 19,           // alto de cada barra con su separación, en píxeles
    altoFilaApilado: 16,    // lo mismo cuando, en la computadora, los dos paneles van uno debajo del otro (para que el cuadro no quede tan alto)
    anchoMinimoPanel: 240,  // si no entran dos paneles de este ancho, van uno debajo del otro
    estiramientoMaximo: 1.7, // si el cuadro vecino es más alto, las filas crecen hasta altoFila x este valor
    grosorDestacado: 3,
    aireDerecha: 0.14       // espacio mínimo a la derecha de la barra más larga (parte del máximo), para escribir el valor
  },

  // Extracción hipotética (faja 2).
  extraccion: {
    colores: {
      propio: "#C00000",   // producción del propio sector
      demas: "#F2B400",    // producción de los demás sectores
      total: "#595959",    // total
      puntos: "#B8BEC8"    // los demás sectores en la comparación (F2.3)
    },
    // Cascada (F2.1).
    cascada: {
      proporcion: 0.78, proporcionMaxima: 1.15, proporcionCelular: 0.95, altoMinimo: 320, altoMaximo: 480,
      separacion: 0.24,    // espacio entre barras, como parte del ancho de cada una
      tamanoMinimoRotulo: 9  // la letra de los nombres de las barras no baja de este tamaño, en píxeles
    },
    // Sectores más afectados (F2.2).
    afectados: {
      altoFila: 30,              // alto de cada barra con su separación, en píxeles
      separacion: 0.26,
      estiramientoMaximo: 1.6,   // si el cuadro vecino es más alto, las filas crecen hasta altoFila x este valor
      estiramientoAmpliado: 2.6, // lo mismo en la vista ampliada
      anchoMinimoBarras: 120     // si a las barras les queda menos que esto, acorto el texto que va a su derecha
    },
    // El sector frente a los demás (F2.3).
    comparacion: {
      proporcion: 0.52, proporcionMaxima: 0.8, proporcionCelular: 1.5, altoMinimo: 300, altoMaximo: 440,
      anchoMinimoPanel: 130,     // si no entran cuatro paneles de este ancho, van en dos filas de dos
      margenVertical: 0.08,      // aire arriba y abajo de los puntos, como parte del rango
      radio: 3.5, radioDestacado: 7, grosorDestacado: 2.5,
      posicionElegido: 0.12,     // el sector elegido va a la izquierda (0 = borde izquierdo, 1 = borde derecho)
      zonaPuntos: [0.5, 0.95],   // los demás puntos se reparten en esta zona
      semilla: 12.9898,          // número fijo con el que saco la posición horizontal de cada punto
      distanciaInformacion: 22
    }
  },

  // Cuadros regionales (fajas 3 y 4), hechos con el VAB provincial.
  regional: {
    colores: {
      barras: "#9AA3B2",                 // barras de los demás agregados (F3.2)
      marca: "#000000",                  // rombo del valor en el año inicial (F3.2)
      total: "#000000",                  // curva del total de la economía (F3.3)
      otro: "#9AA3B2",                   // curva del agregado más concentrado entre los demás (F3.3)
      periodos: ["#7FA6C9", "#1F4E79"],  // los dos períodos de la redistribución (F4.1), en el orden del archivo
      parecida: "#1B9E77",               // geografía más parecida (F4.2)
      distinta: "#B5524B"                // geografía más distinta (F4.2)
    },
    cantidad: 10,              // cuántos agregados muestran los gráficos de barras F3.2 y F4.1
    // Lo común a los tres gráficos de barras.
    barras: {
      decimales: 3,              // decimales de los coeficientes
      separacion: 0.26,          // espacio entre filas, como parte del alto de cada una
      estiramientoMaximo: 2.2,   // si el cuadro vecino es más alto, las filas crecen hasta altoFila x este valor
      estiramientoAmpliado: 2.6, // lo mismo en la vista ampliada
      tamanoValor: 10.5,         // letra del valor escrito al final de la barra
      tamanoMarca: 44            // tamaño del rombo (área, en píxeles cuadrados)
    },
    // Mapa del cociente de localización (F3.1). Cortes y colores del script 04:
    // seis clases; el límite inferior entra en cada clase.
    mapa: {
      cortes: [0.5, 0.8, 1.25, 2, 4],
      colores: ["#2166AC", "#92C5DE", "#DCDCDC", "#FDDBC7", "#EF8A62", "#B2182B"],
      conNombre: 3,              // cuántas provincias de mayor cociente llevan el nombre
      // El mapa es alto y angosto: le pongo un tope de alto, en píxeles, para que
      // no haga más alta la faja. El tope depende del formato de la página:
      // ancho (tres cuadros por fila), medio (ventanas medianas) y celular.
      topes: { ancho: 533, medio: 620, celular: 640 },         // mapa de la faja 3 (F3.1)
      topesFaja5: { ancho: 518, medio: 604, celular: 623 },    // mapas de la faja 5 (F5.1 y F5.3): sus notas son más largas
      altoMinimoAmpliado: 200,   // en la vista ampliada el mapa ocupa el lugar disponible, pero no menos que esto
      escalaContinua: "YlOrRd",  // escala de colores continua de D3 (del amarillo claro al rojo oscuro), para F5.1 y F5.3
      anchoBarraColores: 220,    // ancho máximo de la barra de colores de la leyenda, en píxeles
      margen: 8,                 // aire alrededor del mapa, en píxeles
      colorBorde: "#FFFFFF", grosorBorde: 0.6,
      colorElegida: "#1F2933", grosorElegida: 2.6,   // contorno de la provincia elegida
      tamanoNombre: 11,          // letra de los nombres de las provincias
      tamanoMarco: 9.5           // letra de los rótulos de los recuadros
    },
    // Coeficiente de localización (F3.2).
    localizacion: { altoFila: 30 },
    // Curva de localización (F3.3).
    curva: {
      primeras: 3,               // cuántas primeras provincias uso para medir la concentración
      proporcion: 0.6, proporcionMaxima: 1.05, proporcionCelular: 0.9, altoMinimo: 320, altoMaximo: 460,
      anchoAngosto: 420,         // por debajo de este ancho, el eje marca de cuatro en cuatro provincias
      grosorTotal: 3.5, grosor: 2, radio: 2.8,
      distanciaInformacion: 26
    },
    // Coeficiente de redistribución (F4.1): dos barras por fila.
    redistribucion: { altoFila: 40 },
    // Asociación geográfica (F4.2).
    asociacion: {
      cantidad: 7,               // cuántos agregados de cada extremo (los más parecidos y los más distintos)
      altoFila: 26
    },
    // Mapa del coeficiente de especialización (F5.1).
    especializacion: { conNombre: 5 },   // cuántas provincias de mayor valor llevan el nombre
    // Evolución de la especialización (F5.2).
    evolucion: {
      proporcion: 0.6, proporcionMaxima: 1.05, proporcionCelular: 0.9, altoMinimo: 320, altoMaximo: 460,
      colorDemas: "#C9CED6", grosorDemas: 1.1,   // las provincias no elegidas
      grosorElegida: 3,
      margenVertical: 0.06,      // aire arriba y abajo, como parte del rango de los datos
      anchoAngosto: 520,         // por debajo de este ancho, el nombre va encima de la línea y el eje marca cada cuatro años
      distanciaInformacion: 22
    },
    // Coeficiente de reestructuración (F5.3): un mapa, del año inicial al año de detalle.
    reestructuracion: { conNombre: 5 }   // cuántas provincias de mayor valor llevan el nombre
  },

  // Destino de las exportaciones (faja 6). Colores del script 05.
  exportaciones: {
    codigoConfidencial: "999",   // código de "país" del destino confidencial en el archivo
    divisorDolares: 1000000,     // los valores vienen en dólares; los muestro en millones
    colores: {
      pais: "#E0E0E0",           // países sin flecha
      argentina: "#C00000",
      destino: "#9DC3E6",        // países de destino con flecha
      flecha: "#1F4E79",
      barras: "#1F4E79",         // los primeros destinos (F6.2)
      otros: "#A6A6A6",          // "Otros países"
      confidencial: "#595959"    // destino confidencial
    },
    // Mapa de los destinos (F6.1).
    mapa: {
      curvatura: 0.18,           // cuánto se aparta la flecha de la línea recta, como parte de su largo
      grosorPorUnidad: 26,       // grosor de la flecha, en píxeles, si la participación fuera 100 %
      grosorMinimo: 1.3,
      opacidad: 0.9,
      anchoReferencia: 900,      // por debajo de este ancho del mapa, las flechas se afinan en proporción
      reduccionMinima: 0.45,
      tamanoEtiqueta: 11, tamanoEtiquetaAngosto: 9.5,
      anchoAngosto: 520,         // por debajo de este ancho uso la letra chica en las etiquetas
      distanciasEtiqueta: [8, 20, 34, 50, 68, 88]   // distancias (px) a las que pruebo poner cada etiqueta
    },
    // Destinos en barras (F6.2).
    barras: {
      cantidad: 10,              // cuántos países antes de "Otros países"
      altoFila: 30,
      estiramientoMaximo: 2.2,   // si el cuadro vecino es más alto, las filas crecen hasta altoFila x este valor
      anchoMaximoNombre: 0.36,   // el nombre de un país ocupa como mucho esta parte del ancho del cuadro; si no, se corta
      anchoMinimoBarras: 120     // si a las barras les queda menos que esto, acorto el texto que va a su derecha
    }
  }
};
