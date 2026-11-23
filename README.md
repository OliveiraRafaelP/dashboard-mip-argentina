# Análisis exploratorios de la economía argentina

Este repositorio contiene una página web con la que exploramos la economía argentina a partir de la matriz insumo-producto nacional de 2022 y del valor agregado bruto por provincia: sectores clave e índices de encadenamiento, extracción hipotética de sectores, medidas de localización y especialización regional y destino de las exportaciones. Se elige un sector y una provincia, y los gráficos se actualizan.

Es un trabajo del curso EAE6083, Análisis de Insumo-Producto (FEA-USP), en **versión preliminar**.

Este repositorio contiene solo la página con resultados derivados: los insumos y los programas de cálculo no se distribuyen aquí. La metodología de cada gráfico está en el reverso de su cuadro (botón "Metodología"), y las fuentes, en la sección "Insumos" de la página.

## Cómo verla en la computadora

La página lee sus datos con el navegador, así que hay que abrirla con un servidor local y no con doble clic en `index.html`. Por ejemplo, desde esta carpeta:

```
python -m http.server 8000
```

y luego abrir `http://localhost:8000` en el navegador.
