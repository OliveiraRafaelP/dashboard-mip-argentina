// =============================================================================
// cuadros.js
// La estructura común de cada cuadro y lo que se puede hacer con él:
//   - el frente: título, subtítulo, controles, gráfico, leyenda y nota;
//   - el reverso: la metodología del cuadro. El botón "Metodología" da vuelta
//     el cuadro (solo ese) y el botón "Ver gráfico" lo vuelve a su lugar;
//   - la vista ampliada: un clic en el botón de la esquina abre en primer plano
//     lo que el cuadro está mostrando (el gráfico, redibujado en grande, o la
//     metodología).
// =============================================================================

import { ocultarInformacion } from "./utilidades.js";
import { escribirReverso, ajustarReverso } from "./metodologia.js";

const crear = (etiqueta, clase) => {
  const elemento = document.createElement(etiqueta);
  elemento.className = clase;
  return elemento;
};

// Un botón cuadrado de la esquina de un cuadro: "ampliar" o "cerrar".
function botonDeEsquina(cual, nombre) {
  const boton = crear("button", `boton-cuadro boton-${cual}`);
  boton.type = "button";
  boton.setAttribute("aria-label", nombre);
  boton.title = cual === "ampliar" ? "Ampliar" : "Cerrar (Esc)";
  boton.textContent = cual === "ampliar" ? "⤢" : "✕";
  return boton;
}
// Un botón con texto, del mismo estilo ("Metodología", "Ver gráfico").
function botonConTexto(texto, nombre) {
  const boton = crear("button", "boton-cuadro boton-texto");
  boton.type = "button";
  boton.textContent = texto;
  boton.setAttribute("aria-label", nombre);
  return boton;
}

// Armo los lugares de un cuadro dentro de `contenedor` y los devuelvo.
// `boton` dice qué va en la esquina: "ampliar" o "cerrar".
export function crearPartes(contenedor, boton) {
  const cabecera = crear("header", "cuadro-cabecera");
  const textos = crear("div", "cuadro-textos");
  const titulo = crear("h3", "cuadro-titulo");
  const subtitulo = crear("p", "cuadro-subtitulo");
  textos.append(titulo, subtitulo);
  const accion = botonDeEsquina(boton, boton === "ampliar" ? "Ampliar el gráfico" : "Cerrar la vista ampliada");
  cabecera.append(textos, accion);

  const controles = crear("div", "cuadro-controles");
  const grafico = crear("div", "cuadro-grafico");
  const leyenda = crear("div", "cuadro-leyenda");
  const nota = crear("div", "cuadro-nota");
  contenedor.replaceChildren(cabecera, controles, grafico, leyenda, nota);
  return { titulo, subtitulo, controles, grafico, leyenda, nota, boton: accion };
}

// ---- Frente y reverso ------------------------------------------------------------
// Los cuadros que están mostrando el reverso, en el orden en que se dieron
// vuelta: la tecla Esc vuelve al frente el último.
const girados = [];

// Armo un cuadro completo dentro de `articulo`: el frente (con sus partes) y el
// reverso con la metodología (`metodologia` es la entrada del cuadro en
// textos/metodologia.json). Devuelvo { partes, girar, estaGirado }.
// El cuadro conserva su tamaño al girar: el reverso ocupa exactamente el lugar
// del frente; la letra del reverso crece hasta ocupar ese lugar y, si con el
// tamaño de base el contenido no entra, se desplaza por dentro.
export function crearCuadro(articulo, metodologia) {
  const giro = crear("div", "cuadro-giro");
  const frente = crear("div", "cuadro-cara cuadro-frente");
  const reverso = crear("div", "cuadro-cara cuadro-reverso");
  giro.append(frente, reverso);
  articulo.replaceChildren(giro);

  const partes = crearPartes(frente, "ampliar");
  const botonMetodologia = botonConTexto("Metodología", "Ver la metodología de este cuadro");
  partes.boton.before(botonMetodologia);

  // El reverso: título, botones y el cuerpo con la metodología.
  const cabecera = crear("header", "cuadro-cabecera");
  const textos = crear("div", "cuadro-textos");
  const titulo = crear("h3", "cuadro-titulo");
  titulo.textContent = metodologia.titulo;
  textos.appendChild(titulo);
  const botonVolver = botonConTexto("Ver gráfico", "Volver al gráfico de este cuadro");
  const botonAmpliar = botonDeEsquina("ampliar", "Ampliar la metodología");
  cabecera.append(textos, botonVolver, botonAmpliar);
  const cuerpo = crear("div", "reverso-cuerpo");
  cuerpo.tabIndex = 0;            // para poder desplazarlo con el teclado
  cuerpo.setAttribute("role", "region");
  cuerpo.setAttribute("aria-label", `Metodología: ${metodologia.titulo}`);
  escribirReverso(cuerpo, metodologia);
  reverso.append(cabecera, cuerpo);

  // El lado que no está a la vista queda fuera del teclado y de los lectores de pantalla.
  const mostrar = alReverso => {
    frente.inert = alReverso;
    reverso.inert = !alReverso;
    frente.setAttribute("aria-hidden", String(alReverso));
    reverso.setAttribute("aria-hidden", String(!alReverso));
  };
  mostrar(false);

  let espera = null;      // el temporizador que desarma el giro al volver al frente
  const cuadro = {
    partes,
    estaGirado: () => articulo.classList.contains("girado"),
    girar(alReverso, conFoco = true) {
      if (cuadro.estaGirado() === alReverso) return;
      ocultarInformacion();
      // El espacio en tres dimensiones se arma para el giro y se desarma
      // cuando el cuadro termina de volver al frente.
      clearTimeout(espera);
      articulo.classList.add("con-giro");
      void giro.offsetWidth;              // el navegador toma nota del estado inicial antes de girar
      articulo.classList.toggle("girado", alReverso);
      if (!alReverso) {
        const duracion = parseFloat(getComputedStyle(giro).transitionDuration) * 1000 || 0;
        espera = setTimeout(() => { if (!cuadro.estaGirado()) articulo.classList.remove("con-giro"); }, duracion + 60);
      }
      mostrar(alReverso);
      const lugar = girados.indexOf(cuadro);
      if (lugar !== -1) girados.splice(lugar, 1);
      if (alReverso) {
        girados.push(cuadro);
        cuerpo.scrollTop = 0;
        ajustarReverso(cuerpo);
      }
      if (conFoco) (alReverso ? botonVolver : botonMetodologia).focus({ preventScroll: true });
    },
    // Si cambia el tamaño del cuadro, la letra del reverso se vuelve a acomodar.
    acomodar() { if (cuadro.estaGirado()) ajustarReverso(cuerpo); }
  };
  botonMetodologia.addEventListener("click", () => cuadro.girar(true));
  botonVolver.addEventListener("click", () => cuadro.girar(false));
  botonAmpliar.addEventListener("click", () => ampliarMetodologia(metodologia));
  return cuadro;
}

// La tecla Esc vuelve al frente el último cuadro que se dio vuelta. Si hay una
// ventana abierta en primer plano, Esc la cierra a ella (lo hace el navegador).
document.addEventListener("keydown", evento => {
  if (evento.key !== "Escape" || girados.length === 0) return;
  if (document.querySelector("dialog[open]")) return;
  girados[girados.length - 1].girar(false);
});

// ---- Vista ampliada ----------------------------------------------------------
// Uso el elemento <dialog> del navegador: ya trae el fondo oscurecido y el
// cierre con la tecla Esc.
let ventana = null;       // el <dialog>
let abierto = null;       // { dibujar, partes } mientras hay un gráfico ampliado

export function iniciarAmpliar(elementoDialogo) {
  ventana = elementoDialogo;
  ventana.addEventListener("close", () => { abierto = null; ocultarInformacion(); ventana.replaceChildren(); });
  // Un clic en el fondo oscuro (fuera del recuadro) también cierra.
  ventana.addEventListener("click", evento => { if (evento.target === ventana) ventana.close(); });
}

// Abro la vista ampliada de un gráfico. `dibujar` es la función del gráfico y
// `contexto` es una función que devuelve el estado actual (sector elegido, etc.).
export function ampliar(dibujar, contexto) {
  const interior = crear("div", "ampliado-interior");
  ventana.replaceChildren(interior);
  const partes = crearPartes(interior, "cerrar");
  partes.boton.addEventListener("click", () => ventana.close());
  abierto = { dibujar, partes, contexto };
  ventana.showModal();
  redibujarAmpliado();
}

// Abro la vista ampliada de la metodología de un cuadro: el mismo contenido
// del reverso, con la letra acomodada al lugar de la ventana.
function ampliarMetodologia(metodologia) {
  const interior = crear("div", "ampliado-interior ampliado-metodologia");
  const cabecera = crear("header", "cuadro-cabecera");
  const textos = crear("div", "cuadro-textos");
  const titulo = crear("h3", "cuadro-titulo");
  titulo.textContent = metodologia.titulo;
  textos.appendChild(titulo);
  const cerrar = botonDeEsquina("cerrar", "Cerrar la vista ampliada");
  cerrar.addEventListener("click", () => ventana.close());
  cabecera.append(textos, cerrar);
  const cuerpo = crear("div", "reverso-cuerpo");
  cuerpo.tabIndex = 0;
  escribirReverso(cuerpo, metodologia);
  interior.append(cabecera, cuerpo);
  ventana.replaceChildren(interior);
  abierto = { cuerpo };
  ventana.showModal();
  ajustarReverso(cuerpo);
}

// Vuelvo a dibujar lo que está ampliado (al abrir, al cambiar el tamaño de la
// ventana o al tocar un control del propio gráfico).
export function redibujarAmpliado() {
  if (!abierto) return;
  if (abierto.cuerpo) return ajustarReverso(abierto.cuerpo);
  abierto.dibujar(abierto.partes, { ...abierto.contexto(), ampliado: true, ancla: ventana });
}
