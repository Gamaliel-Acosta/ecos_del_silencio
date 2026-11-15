# Documentación completa — Ecos del Silencio

## 1. Resumen

**Ecos del Silencio** es una experiencia web educativa y narrativa ambientada
en el año 2050. El usuario explora un archivo de objetos espaciales abandonados
o fuera de operación, consulta la historia de cada reliquia y, cuando existe
un minijuego, revive parte de su misión.

La interfaz está en español y utiliza una estética de terminal/radar:

- acceso inicial como terminal de archivo;
- radar esquemático del Sistema Solar;
- expedientes individuales;
- minijuegos dibujados principalmente sobre `<canvas>`;
- diseño adaptable para escritorio y dispositivos táctiles.

No existe backend, API, base de datos ni autenticación. Todo el catálogo y el
estado de la sesión viven en el cliente.

## 2. Arquitectura y flujo de navegación

El punto de entrada es [`src/main.tsx`](./src/main.tsx), que monta `App` dentro
de `StrictMode`. [`src/App.tsx`](./src/App.tsx) funciona como orquestador de
pantallas y estado global de la experiencia.

### Pantallas

El tipo `Screen` define cuatro estados:

| Estado | Función |
| --- | --- |
| `terminal` | Presentación inicial y botón **Iniciar escaneo**. |
| `radar` | Mapa, filtros de sector, buscador y tarjetas de reliquias. |
| `mission` | Expediente de la reliquia seleccionada y acción de expedición. |
| `game` | Uno de los tres minijuegos disponibles. |

Flujo normal:

1. El usuario inicia el escaneo desde la terminal.
2. Selecciona un sector o busca una reliquia en el radar.
3. Abre una señal desde el mapa o una tarjeta.
4. Consulta el expediente.
5. Inicia el minijuego, si existe, o consulta el expediente histórico.
6. Al completar la actividad vuelve al expediente marcado como completado.

El botón de marca en el radar devuelve a la terminal. Desde el expediente se
puede volver al radar. Abandonar un minijuego devuelve al expediente sin
guardar progreso de la partida.

### Estado principal de `App`

- `screen`: pantalla actual.
- `sector`: `all`, `moon`, `mars` o `deep-space`.
- `search`: texto de búsqueda.
- `selected`: reliquia actualmente abierta.
- `expeditionStarted`: indica que la actividad fue completada o que un
  expediente sin minijuego ya fue consultado.

El filtrado compara el texto normalizado contra `name` y `location`, y aplica
simultáneamente el sector seleccionado. El contador del radar muestra la
cantidad de resultados visibles.

## 3. Catálogo de reliquias

El catálogo está definido en
[`src/data/artifacts.ts`](./src/data/artifacts.ts), mediante la interfaz
`Artifact`:

```ts
{
  id: string;
  name: string;
  sector: "moon" | "mars" | "deep-space";
  year: number;
  location: string;
  status: string;
  description: string;
  objective: string;
  minigame: string;
}
```

### Sector lunar

| ID | Reliquia | Año | Ubicación | Actividad |
| --- | --- | ---: | --- | --- |
| `lunar-module` | Apollo Lunar Module | 1969 | Superficie lunar | Reconstrucción del módulo |
| `lunar-rover` | Lunar Roving Vehicle | 1971 | Superficie lunar | Exploración lunar |
| `alsep` | ALSEP Scientific Packages | 1969 | Superficie lunar | Análisis de señales |
| `surveyor` | Surveyor Landers | 1966 | Superficie lunar | Aterrizaje de precisión |

### Sector Marte

| ID | Reliquia | Año | Ubicación | Actividad |
| --- | --- | ---: | --- | --- |
| `sojourner` | Sojourner | 1997 | Marte | Exploración de rocas |
| `opportunity` | Opportunity | 2004 | Meridiani Planum, Marte | Gestión de energía |
| `spirit` | Spirit | 2004 | Cráter Gusev, Marte | Exploración marciana |
| `viking` | Viking 1 y 2 | 1975 | Superficie marciana | Análisis de muestras |
| `phoenix-insight` | Phoenix e InSight | 2008 | Superficie marciana | Investigación científica |
| `ingenuity` | Ingenuity | 2021 | Cráter Jezero, Marte | Simulación de vuelo |

### Espacio profundo

| ID | Reliquia | Año | Ubicación | Actividad |
| --- | --- | ---: | --- | --- |
| `dawn` | Dawn | 2007 | Órbita de Ceres | Navegación orbital |
| `near-shoemaker` | NEAR Shoemaker | 1996 | Asteroide Eros | Aterrizaje en asteroide |
| `pioneer-10` | Pioneer 10 | 1972 | Más allá de Neptuno | Travesía orbital y evasión de asteroides |
| `kepler` | Kepler | 2009 | Órbita heliocéntrica | Detección de exoplanetas |

Solo `lunar-rover`, `opportunity` y `pioneer-10` están conectados a un
minijuego. Las otras once reliquias muestran correctamente su expediente, pero
el botón informa que el minijuego estará disponible en una futura actualización.

## 4. Minijuego Lunar Roving Vehicle

Implementación:
[`src/games/lunar-rover/LunarRoverGame.tsx`](./src/games/lunar-rover/LunarRoverGame.tsx)
y estilos en
[`src/games/lunar-rover/lunar-rover.css`](./src/games/lunar-rover/lunar-rover.css).

### Objetivo

Conducir por una superficie lunar de `2600 × 1900`, recuperar cinco
componentes virtuales y reconstruir el legado del rover.

Componentes:

1. Antena de comunicaciones.
2. Panel de instrumentos.
3. Rueda de repuesto.
4. Sistema de navegación.
5. Unidad de energía.

Las posiciones se generan al cargar el módulo, buscando puntos que no estén
cerca del punto inicial, rocas, cráteres ni otros componentes.

### Controles

| Entrada | Acción |
| --- | --- |
| `W` / `ArrowUp` | Avanzar |
| `S` / `ArrowDown` | Retroceder |
| `A` / `ArrowLeft` | Girar a la izquierda |
| `D` / `ArrowRight` | Girar a la derecha |
| `Espacio` | Impulso; consume más batería |
| Controles táctiles | Equivalentes a flechas e impulso |

El rover tiene batería, velocidad, colisión con rocas y penalización de
velocidad dentro de cráteres. Al recoger una pieza aparece una transmisión
histórica temporal. El juego se actualiza con `requestAnimationFrame` y se
redibuja en un canvas con cámara que sigue al rover.

### Reconstrucción

Al recuperar las cinco piezas se pausa la exploración y se abre un rompecabezas.
El usuario selecciona una pieza y la coloca en el espacio con el mismo índice.
Al ensamblar las cinco, `onComplete` devuelve el control a `App` y marca la
expedición como completada.

## 5. Minijuego Opportunity

Implementación:
[`src/games/opportunity/OpportunityGame.tsx`](./src/games/opportunity/OpportunityGame.tsx)
y estilos en
[`src/games/opportunity/opportunity.css`](./src/games/opportunity/opportunity.css).

### Objetivo y controles

La mecánica es paralela a la lunar, pero se desarrolla en una superficie de
Marte de `2200 × 1500`. Se deben encontrar cinco componentes:

1. Sistema de comunicaciones.
2. Brazo robótico.
3. Panel solar.
4. Cámaras panorámicas.
5. Unidad científica.

Usa `WASD`, flechas, espacio para impulso y controles táctiles. La batería se
consume durante el movimiento, las rocas bloquean la ruta y los cráteres
reducen la velocidad.

### Narrativa y cierre

Cada componente activa uno de cinco fragmentos históricos sobre Opportunity.
El fragmento desaparece automáticamente después de 5,2 segundos. Tras el
quinto fragmento se abre la reconstrucción. Las cinco piezas deben colocarse
en su posición equivalente; la finalización llama a `onComplete`.

## 6. Minijuego Pioneer 10

Implementación:
[`src/games/pioneer-10/Pioneer10Game.tsx`](./src/games/pioneer-10/Pioneer10Game.tsx)
y estilos en
[`src/games/pioneer-10/pioneer-10.css`](./src/games/pioneer-10/pioneer-10.css).

### Mecánica

Es una travesía arcade en canvas. La nave se mueve hacia un objetivo y debe
evitar asteroides mientras avanza por una ruta de 0 a 100 %:

- tres escudos iniciales;
- los impactos consumen un escudo y conceden 1,8 segundos de invulnerabilidad;
- perder los tres escudos produce `gameover`;
- los asteroides que salen por la izquierda suman puntos;
- la puntuación también crece con el tiempo;
- el progreso avanza automáticamente;
- la dificultad aumenta al reducir el intervalo de generación de asteroides.

### Controles

| Entrada | Acción |
| --- | --- |
| Ratón o puntero sobre el canvas | Mueve el objetivo de la nave |
| `WASD` / flechas | Desplaza el objetivo |
| Pantalla táctil | El puntero funciona como objetivo |

### Sectores y piezas

La narración divide la ruta en cuatro sectores: ruta de lanzamiento, cinturón
de asteroides, órbita de Júpiter y espacio profundo. Diez piezas aparecen en
los progresos `3, 12, 21, 30, 39, 48, 57, 66, 75 y 84`. Antes de cada aparición
se muestra un aviso y cada pieza cae verticalmente; si sale de la pantalla se
pierde.

Para completar la misión se deben recuperar al menos seis de las diez piezas.
Al llegar al 100 % el resultado puede ser:

- `completed`: seis o más piezas, vuelve al expediente y lo marca completo;
- `failed`: menos de seis piezas;
- `gameover`: se agotaron los escudos antes del final.

El récord se guarda en `localStorage` con la clave `pioneer10HighScore`. Si el
navegador no permite guardar, la partida continúa, pero el récord no persiste.

## 7. Estilos, accesibilidad y recursos

- [`src/styles/global.css`](./src/styles/global.css) contiene el sistema visual
  compartido para terminal, radar, expedientes, tipografía, colores,
  responsive y componentes comunes.
- Cada minijuego tiene un stylesheet aislado.
- [`src/index.css`](./src/index.css) define los valores base del documento,
  tamaños mínimos, tipografía heredada y comportamiento de botones/inputs.
- [`src/App.css`](./src/App.css) existe, pero actualmente está vacío.
- [`src/assets/hero.png`](./src/assets/hero.png) y los SVG de `src/assets`
  provienen del arranque de Vite; la experiencia actual se dibuja con CSS,
  iconos y canvas.
- [`public/favicon.svg`](./public/favicon.svg) es el favicon.
- [`public/icons.svg`](./public/icons.svg) está disponible como recurso
  público.

Los botones del radar incluyen `aria-label` y los canvas tienen `aria-label`
con instrucciones básicas. Los controles táctiles aparecen como alternativa
visual para los minijuegos de conducción. La accesibilidad no sustituye una
interfaz textual completa del estado del canvas.

## 8. Configuración y herramientas

### Dependencias de ejecución

- React `19.3.1`
- React DOM `19.3.1`
- React Router DOM `7.18.5` (declarado, sin uso visible en el flujo actual)
- Lucide React `1.73.0`

### Dependencias de desarrollo

- Vite `8.3.6`
- TypeScript `~6.0.3`
- ESLint `10.14.0`
- `typescript-eslint`
- plugins de React Hooks y React Refresh

### Archivos de configuración

- [`package.json`](./package.json): scripts y dependencias.
- [`vite.config.ts`](./vite.config.ts): plugin oficial de React.
- [`eslint.config.js`](./eslint.config.js): ESLint recomendado para JavaScript,
  TypeScript, hooks y refresh.
- [`tsconfig.app.json`](./tsconfig.app.json): TypeScript de la aplicación,
  modo bundler, JSX React y comprobaciones de variables no usadas.
- [`tsconfig.node.json`](./tsconfig.node.json): TypeScript de Vite.
- [`index.html`](./index.html): documento HTML raíz, favicon y montaje en
  `#root`.

## 9. Desarrollo local y validación

Desde `ecos-del-silencio/`:

```bash
npm install
npm run dev
```

Antes de integrar cambios:

```bash
npm run lint
npm run build
```

`build` ejecuta primero `tsc -b` y después `vite build`, por lo que comprueba
tipos y genera el paquete de producción. No hay tests automatizados declarados
en `package.json`.

## 10. Organización del código

```text
ecos-del-silencio/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── data/
│   │   └── artifacts.ts
│   ├── games/
│   │   ├── lunar-rover/
│   │   ├── opportunity/
│   │   └── pioneer-10/
│   ├── services/
│   │   └── progress.service.ts
│   ├── styles/
│   │   └── global.css
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── eslint.config.js
├── tsconfig*.json
└── vite.config.ts
```

Los archivos [`src/services/progress.service.ts`](./src/services/progress.service.ts)
y [`src/games/lunar-rover/lunar-rover.engine.ts`](./src/games/lunar-rover/lunar-rover.engine.ts)
están presentes como puntos de extensión, pero no contienen implementación
actual. El estado de progreso se gestiona dentro de los componentes; la única
persistencia explícita es el récord de Pioneer 10.

## 11. Límites conocidos y extensión futura

1. Solo tres reliquias tienen minijuego conectado.
2. El progreso de Lunar Rover y Opportunity se pierde al salir o recargar.
3. No hay rutas URL ni deep linking; la navegación es estado local de `App`.
4. No hay backend para guardar expediciones, usuarios o estadísticas.
5. La interacción del canvas no expone todos sus cambios a tecnologías
   de asistencia.
6. La búsqueda solo considera nombre y ubicación.
7. El catálogo, posiciones del radar, textos históricos y objetivos están
   codificados en TypeScript.
8. `react-router-dom` está instalado, pero el flujo actual no utiliza un
   router.

Para añadir una nueva expedición:

1. Agregar el objeto a `artifacts` en `src/data/artifacts.ts`.
2. Añadir una posición en `artifactPositions` dentro de `App.tsx`.
3. Crear el componente del juego y su stylesheet.
4. Conectar el ID en `startExpedition` y en la rama de renderizado de `game`.
5. Implementar `onExit` y `onComplete`.
6. Añadir controles táctiles y etiquetas accesibles si usa canvas.
7. Ejecutar `npm run lint` y `npm run build`.

## 12. Licencia y atribución

El repositorio no declara una licencia en `package.json` ni incluye un archivo
de licencia en la estructura documentada. Antes de publicar o redistribuir,
debe definirse la licencia del proyecto y revisarse el origen/licencia de los
recursos gráficos y textos.
