# Laboratorio de señales: el mezclador como espacio vectorial

Álgebra Lineal, Práctica 3, Parte I (opción 7: laboratorio digital de sonidos y mezcla de audio).

**Enlace:** https://djch18atschool.github.io/laboratorio-de-senales/

Cada canal del mezclador es un vector de V = ℝ⁴⁸⁰ (un periodo de 10 ms muestreado a 48 000 muestras/s).
La mezcla es la combinación lineal m = a₁s₁ + … + aₚsₚ, y lo que se dibuja, se analiza y suena es ese mismo arreglo de 480 números.

La página muestra:

- **Producto por escalar**: la amplitud aᵢ de cada canal (negativa invierte la polaridad).
- **Combinación lineal**: la onda de la mezcla, el vector de coeficientes, ‖m‖ y el pico.
- **Comprobación de una muestra**: la tabla aᵢ·sᵢ[n] cuya suma coincide con el punto de la onda.
- **Dependencia lineal y subespacio generado**: el rango de S (por eliminación gaussiana sobre SᵀS) y, si hay canales redundantes, la relación no trivial con su comprobación numérica.
- **Vector cero e inverso aditivo**: los ejemplos de cancelación.
- **Salida lineal sin saturación**: suena g·m con g = 0.9/p · volumen, fijo, así que |g·m[n]| ≤ 0.9.
- **Ampliación**: la mejor aproximación de una onda cuadrada, de sierra o triangular en el subespacio de los armónicos 1…K (proyección ortogonal).

## Desarrollo

```sh
npm install
npm test        # pruebas de las funciones matemáticas y del estado
npm run dev     # servidor local
npm run build   # compila en dist/
```

TypeScript + Vite, sin biblioteca de interfaz. Código en tres partes: `src/math` (funciones puras con pruebas),
`src/draw` (lienzo 2D) y `src/audio` (Web Audio). Se publica en GitHub Pages con `.github/workflows/deploy.yml`.
