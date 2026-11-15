
export interface Artifact {
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

export const artifacts: Artifact[] = [
    {
        id: "lunar-module",
        name: "Apollo Lunar Module",
        sector: "moon",
        year: 1969,
        location: "Superficie lunar",
        status: "Etapas de descenso abandonadas",
        description: "Módulos utilizados durante las misiones Apollo para transportar astronautas entre la órbita y la superficie lunar.",
        objective: "Permitir el descenso y ascenso de astronautas en la Luna.",
        minigame: "Reconstrucción del módulo"
    },
    {
        id: "lunar-rover",
        name: "Lunar Roving Vehicle",
        sector: "moon",
        year: 1971,
        location: "Superficie lunar",
        status: "Abandonado en la Luna",
        description: "Vehículo eléctrico utilizado por los astronautas durante Apollo 15, 16 y 17.",
        objective: "Facilitar la exploración de mayores distancias en la superficie lunar.",
        minigame: "Exploración lunar"
    },
    {
        id: "alsep",
        name: "ALSEP Scientific Packages",
        sector: "moon",
        year: 1969,
        location: "Superficie lunar",
        status: "Experimentos desactivados",
        description: "Conjuntos de instrumentos científicos instalados por astronautas para estudiar la Luna.",
        objective: "Obtener información científica sobre el entorno lunar.",
        minigame: "Análisis de señales"
    },
    {
        id: "surveyor",
        name: "Surveyor Landers",
        sector: "moon",
        year: 1966,
        location: "Superficie lunar",
        status: "Sondas fuera de operación",
        description: "Sondas robóticas que demostraron la viabilidad de realizar aterrizajes suaves en la Luna.",
        objective: "Estudiar la superficie lunar y preparar futuras misiones tripuladas.",
        minigame: "Aterrizaje de precisión"
    },
    {
        id: "sojourner",
        name: "Sojourner",
        sector: "mars",
        year: 1997,
        location: "Marte",
        status: "Fuera de operación",
        description: "Primer vehículo explorador que operó en la superficie de Marte.",
        objective: "Analizar rocas y estudiar el terreno marciano.",
        minigame: "Exploración de rocas"
    },
    {
        id: "opportunity",
        name: "Opportunity",
        sector: "mars",
        year: 2004,
        location: "Meridiani Planum, Marte",
        status: "Misión finalizada",
        description: "Rover que investigó Marte durante casi 15 años y realizó importantes descubrimientos.",
        objective: "Buscar evidencias de agua en el pasado marciano.",
        minigame: "Gestión de energía"
    },
    {
        id: "spirit",
        name: "Spirit",
        sector: "mars",
        year: 2004,
        location: "Cráter Gusev, Marte",
        status: "Misión finalizada",
        description: "Rover gemelo de Opportunity que exploró el terreno marciano.",
        objective: "Investigar la historia geológica y ambiental de Marte.",
        minigame: "Exploración marciana"
    },
    {
        id: "viking",
        name: "Viking 1 y 2",
        sector: "mars",
        year: 1975,
        location: "Superficie marciana",
        status: "Aterrizadores fuera de operación",
        description: "Primeros aterrizadores estadounidenses que operaron exitosamente en Marte.",
        objective: "Estudiar el suelo, la atmósfera y posibles indicios de vida.",
        minigame: "Análisis de muestras"
    },
    {
        id: "phoenix-insight",
        name: "Phoenix e InSight",
        sector: "mars",
        year: 2008,
        location: "Superficie marciana",
        status: "Misiones finalizadas",
        description: "Misiones que estudiaron el hielo, el suelo y la actividad sísmica de Marte.",
        objective: "Investigar el agua y la estructura interna marciana.",
        minigame: "Investigación científica"
    },
    {
        id: "ingenuity",
        name: "Ingenuity",
        sector: "mars",
        year: 2021,
        location: "Cráter Jezero, Marte",
        status: "Misión finalizada",
        description: "Helicóptero que realizó el primer vuelo propulsado y controlado en otro planeta.",
        objective: "Demostrar la viabilidad del vuelo motorizado en Marte.",
        minigame: "Simulación de vuelo"
    },
    {
        id: "dawn",
        name: "Dawn",
        sector: "deep-space",
        year: 2007,
        location: "Órbita de Ceres",
        status: "Sin combustible de orientación",
        description: "Sonda que estudió los cuerpos Vesta y Ceres.",
        objective: "Investigar los primeros cuerpos del Sistema Solar.",
        minigame: "Navegación orbital"
    },
    {
        id: "near-shoemaker",
        name: "NEAR Shoemaker",
        sector: "deep-space",
        year: 1996,
        location: "Asteroide Eros",
        status: "Misión finalizada",
        description: "Primera nave en orbitar un asteroide y posteriormente aterrizar en él.",
        objective: "Estudiar la composición y características de Eros.",
        minigame: "Aterrizaje en asteroide"
    },
    {
        id: "pioneer-10",
        name: "Pioneer 10",
        sector: "deep-space",
        year: 1972,
        location: "Espacio profundo, más allá de la órbita de Neptuno",
        status: "Sin comunicación desde el 23 de enero de 2003",
        description:
            "Sonda espacial lanzada el 2 de marzo de 1972. Fue la primera nave en atravesar el cinturón de asteroides y sobrevolar Júpiter, obteniendo información sobre el planeta y su entorno.",
        objective:
            "Estudiar Júpiter, su atmósfera, magnetosfera y entorno de radiación, además de explorar las regiones exteriores del Sistema Solar.",
        minigame: "Travesía orbital y evasión de asteroides"
    },
    {
        id: "kepler",
        name: "Kepler",
        sector: "deep-space",
        year: 2009,
        location: "Órbita heliocéntrica",
        status: "Misión finalizada",
        description: "Telescopio espacial que descubrió miles de candidatos a exoplanetas.",
        objective: "Buscar planetas fuera del Sistema Solar.",
        minigame: "Detección de exoplanetas"
    }
];
