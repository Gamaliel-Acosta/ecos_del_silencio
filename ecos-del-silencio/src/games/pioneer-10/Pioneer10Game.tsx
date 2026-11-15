
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

import {
    ArrowLeft,
    ArrowUp,
    ChevronRight,
    Heart,
    RotateCcw,
    Trophy,
    Package,
    AlertTriangle,
} from "lucide-react";

import {
    getMissionProgress,
    updateMissionProgress,
    completeMission,
} from "../../services/progress.service";

import { speechService } from "../../services/speech.service";

import "./pioneer-10.css";

interface Pioneer10GameProps {
    onExit: () => void;
    onComplete: () => void;
}

type GameStatus = "playing" | "gameover" | "failed" | "completed";

interface Asteroid {
    x: number;
    y: number;
    radius: number;
    speed: number;
    rotation: number;
    rotationSpeed: number;
    sides: number;
    points: number[];
}

interface Collectible {
    x: number;
    y: number;
    size: number;
    speed: number;
    rotation: number;
    pulse: number;
    storyIndex: number;
}

interface PendingDrop {
    x: number;
    timer: number;
    storyIndex: number;
}

interface Star {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    speed: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
}

interface Narrative {
    title: string;
    date: string;
    text: string;
}

interface GameData {
    playerX: number;
    playerY: number;
    targetX: number;
    targetY: number;
    asteroids: Asteroid[];
    collectibles: Collectible[];
    pendingDrop: PendingDrop | null;
    particles: Particle[];
    stars: Star[];
    shields: number;
    progress: number;
    score: number;
    spawnTimer: number;
    invulnerability: number;
    lastNarrative: number;
    collectedComponents: number;
    spawnedComponents: number;
    nextDropIndex: number;
    completed: boolean;
}

const NARRATIVES: Narrative[] = [
    {
        title: "EL COMIENZO DE UNA TRAVESÍA",
        date: "2 DE MARZO DE 1972",
        text: "Pioneer 10 fue lanzada desde Cabo Cañaveral con una misión histórica: viajar hasta Júpiter y estudiar por primera vez de cerca el planeta gigante.",
    },
    {
        title: "ATRAVESANDO EL CINTURÓN",
        date: "1972 – 1973",
        text: "La sonda llegó al cinturón de asteroides en julio de 1972 y lo atravesó durante los meses siguientes. La región resultó menos peligrosa de lo que se temía.",
    },
    {
        title: "EL ENCUENTRO CON JÚPITER",
        date: "4 DE DICIEMBRE DE 1973",
        text: "Pioneer 10 realizó el primer sobrevuelo cercano de Júpiter. Estudió su atmósfera, magnetosfera y el intenso entorno de radiación que rodea al planeta.",
    },
    {
        title: "MÁS ALLÁ DE LOS PLANETAS",
        date: "1983 – 2003",
        text: "La sonda continuó su viaje hacia el espacio profundo. En 1983 cruzó la órbita de Neptuno y siguió transmitiendo datos durante años, hasta que su última señal llegó en enero de 2003.",
    },
];

const COMPONENT_STORIES: Narrative[] = [
    {
        title: "EL SISTEMA DE PROPULSIÓN",
        date: "REGISTRO RECUPERADO 01",
        text: "Pioneer 10 utilizaba pequeños propulsores para controlar su orientación. Estos permitían ajustar la posición de la nave y mantener su antena dirigida hacia la Tierra.",
    },
    {
        title: "LA ANTENA DE ALTA GANANCIA",
        date: "REGISTRO RECUPERADO 02",
        text: "Su antena parabólica de alta ganancia enviaba señales de radio a enormes distancias. Fue esencial para recibir instrucciones y transmitir los datos científicos de la misión.",
    },
    {
        title: "LOS GENERADORES DE RADIOISÓTOPOS",
        date: "REGISTRO RECUPERADO 03",
        text: "Pioneer 10 utilizaba cuatro generadores termoeléctricos de radioisótopos. Transformaban el calor del plutonio-238 en electricidad para alimentar sus sistemas.",
    },
    {
        title: "EL CONTROL DE ORIENTACIÓN",
        date: "REGISTRO RECUPERADO 04",
        text: "La nave debía conservar una orientación precisa durante su viaje. Su sistema de control ayudaba a mantener la antena apuntando hacia nuestro planeta.",
    },
    {
        title: "LOS INSTRUMENTOS CIENTÍFICOS",
        date: "REGISTRO RECUPERADO 05",
        text: "La sonda transportaba instrumentos para estudiar campos magnéticos, partículas energéticas, radiación y otras características del entorno de Júpiter.",
    },
    {
        title: "LA PLACA PIONEER",
        date: "REGISTRO RECUPERADO 06",
        text: "Pioneer 10 llevaba una placa de aluminio anodizado en oro. Incluía representaciones simbólicas de dos seres humanos y referencias a la ubicación de nuestro Sistema Solar.",
    },
    {
        title: "EL MAGNETÓMETRO",
        date: "REGISTRO RECUPERADO 07",
        text: "El magnetómetro permitió estudiar los campos magnéticos durante el viaje y el encuentro con Júpiter. Sus mediciones ayudaron a comprender mejor el entorno magnético del planeta.",
    },
    {
        title: "EL DETECTOR DE METEOROIDES",
        date: "REGISTRO RECUPERADO 08",
        text: "Durante el cruce del cinturón de asteroides, los detectores permitieron registrar impactos de partículas pequeñas. La nave atravesó esta región con menos problemas de los que se habían previsto.",
    },
    {
        title: "EL TELESCOPIO DE RAYOS CÓSMICOS",
        date: "REGISTRO RECUPERADO 09",
        text: "Entre sus instrumentos había equipos para estudiar partículas de alta energía. Estas observaciones ayudaron a investigar la radiación presente en el espacio interplanetario.",
    },
    {
        title: "EL FOTOPOLARÍMETRO DE IMAGEN",
        date: "REGISTRO RECUPERADO 10",
        text: "El fotopolarímetro de imagen obtuvo observaciones de Júpiter y sus lunas. Sus registros contribuyeron al estudio de las nubes y características visibles del planeta gigante.",
    },
];

const SECTOR_NAMES = [
    "RUTA DE LANZAMIENTO",
    "CINTURÓN DE ASTEROIDES",
    "ÓRBITA DE JÚPITER",
    "ESPACIO PROFUNDO",
];

const HIGH_SCORE_KEY = "pioneer10HighScore";
const TOTAL_COMPONENTS = COMPONENT_STORIES.length;
const REQUIRED_COMPONENTS = 6;
const DROP_PROGRESS = [3, 12, 21, 30, 39, 48, 57, 66, 75, 84];

function createAsteroid(width: number, height: number): Asteroid {
    const radius = 13 + Math.random() * 22;
    const sides = 7 + Math.floor(Math.random() * 4);

    return {
        x: width + radius + 10,
        y: 35 + Math.random() * (height - 70),
        radius,
        speed: 190 + Math.random() * 150,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 2,
        sides,
        points: Array.from(
            { length: sides },
            () => 0.72 + Math.random() * 0.45,
        ),
    };
}

function createCollectible(x: number, storyIndex: number): Collectible {
    return {
        x,
        y: -35,
        size: 13 + Math.random() * 3,
        speed: 115 + Math.random() * 35,
        rotation: Math.random() * Math.PI,
        pulse: Math.random() * Math.PI * 2,
        storyIndex,
    };
}

function createStars(width: number, height: number): Star[] {
    return Array.from({ length: 110 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.5 + Math.random() * 1.7,
        alpha: 0.2 + Math.random() * 0.8,
        speed: 15 + Math.random() * 65,
    }));
}

function createGameData(
    width: number,
    height: number,
    savedComponents = 0,
): GameData {
    return {
        playerX: width * 0.18,
        playerY: height * 0.5,
        targetX: width * 0.18,
        targetY: height * 0.5,
        asteroids: [],
        collectibles: [],
        pendingDrop: null,
        particles: [],
        stars: createStars(width, height),
        shields: 3,
        progress: 0,
        score: 0,
        spawnTimer: 0,
        invulnerability: 0,
        lastNarrative: -1,
        collectedComponents: savedComponents,
        spawnedComponents: savedComponents,
        nextDropIndex: savedComponents,
        completed: false,
    };
}

function drawShip(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    invulnerable: boolean,
) {
    ctx.save();
    ctx.translate(x, y);

    if (invulnerable) {
        ctx.globalAlpha = 0.45 + Math.sin(Date.now() * 0.025) * 0.3;
    }

    const flameLength = 13 + Math.random() * 10;
    const flame = ctx.createLinearGradient(
        -27,
        0,
        -27 - flameLength,
        0,
    );

    flame.addColorStop(0, "#a5f3fc");
    flame.addColorStop(1, "rgba(34, 211, 238, 0)");

    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-22, -6);
    ctx.lineTo(-22 - flameLength, 0);
    ctx.lineTo(-22, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#dbeafe";
    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(27, 0);
    ctx.lineTo(-14, -13);
    ctx.lineTo(-22, -7);
    ctx.lineTo(-22, 7);
    ctx.lineTo(-14, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0e7490";
    ctx.beginPath();
    ctx.ellipse(7, 0, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#64748b";
    ctx.fillRect(-9, -19, 18, 5);
    ctx.fillRect(-9, 14, 18, 5);

    ctx.restore();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid) {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.rotation);

    const gradient = ctx.createRadialGradient(
        -asteroid.radius * 0.3,
        -asteroid.radius * 0.3,
        2,
        0,
        0,
        asteroid.radius,
    );

    gradient.addColorStop(0, "#94a3b8");
    gradient.addColorStop(0.55, "#475569");
    gradient.addColorStop(1, "#1e293b");

    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;

    ctx.beginPath();

    for (let i = 0; i < asteroid.sides; i++) {
        const angle = (i / asteroid.sides) * Math.PI * 2;
        const distance = asteroid.radius * asteroid.points[i];
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.beginPath();
    ctx.arc(
        -asteroid.radius * 0.25,
        asteroid.radius * 0.2,
        asteroid.radius * 0.18,
        0,
        Math.PI * 2,
    );
    ctx.fill();

    ctx.restore();
}

function drawCollectible(ctx: CanvasRenderingContext2D, item: Collectible) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);

    const pulse = 1 + Math.sin(item.pulse) * 0.12;
    ctx.scale(pulse, pulse);

    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 22;

    ctx.fillStyle = "rgba(8, 145, 178, 0.2)";
    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, item.size + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#164e63";

    ctx.beginPath();
    ctx.arc(0, 0, item.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#cffafe";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(6, -5);
    ctx.lineTo(6, 5);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-3, -9);
    ctx.lineTo(-3, -5);
    ctx.moveTo(3, 5);
    ctx.lineTo(3, 9);
    ctx.stroke();

    ctx.restore();
}

function drawDropWarning(ctx: CanvasRenderingContext2D, drop: PendingDrop) {
    const pulse = 0.65 + Math.sin(Date.now() * 0.012) * 0.25;
    const warningY = 58;

    ctx.save();

    ctx.globalAlpha = 0.35 + pulse * 0.3;
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);

    ctx.beginPath();
    ctx.moveTo(drop.x, warningY + 12);
    ctx.lineTo(drop.x, 180);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.globalAlpha = 1;
    ctx.shadowColor = "#facc15";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(drop.x, warningY, 17 + pulse * 5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ALERTA", drop.x, warningY - 27);

    ctx.font = "10px Arial";
    ctx.fillStyle = "#fef3c7";
    ctx.fillText("COMPONENTE", drop.x, warningY + 35);

    ctx.restore();
}

function drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    stars: Star[],
    delta: number,
) {
    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#020617");
    background.addColorStop(0.5, "#071426");
    background.addColorStop(1, "#030712");

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const nebula = ctx.createRadialGradient(
        width * 0.72,
        height * 0.3,
        10,
        width * 0.72,
        height * 0.3,
        width * 0.45,
    );

    nebula.addColorStop(0, "rgba(8, 145, 178, 0.12)");
    nebula.addColorStop(1, "rgba(8, 145, 178, 0)");

    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);

    for (const star of stars) {
        star.x -= star.speed * delta;

        if (star.x < 0) {
            star.x = width;
            star.y = Math.random() * height;
        }

        ctx.globalAlpha =
            star.alpha * (0.7 + Math.sin(Date.now() * 0.002 + star.x) * 0.25);

        ctx.fillStyle = "#e0f2fe";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    for (const particle of particles) {
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = "#67e8f9";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

export default function Pioneer10Game({
    onExit,
    onComplete,
}: Pioneer10GameProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const gameRef = useRef<GameData | null>(null);
    const keysRef = useRef<Record<string, boolean>>({});
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef(0);
    const completionCalledRef = useRef(false);

    const [status, setStatus] = useState<GameStatus>("playing");
    const [progress, setProgress] = useState(0);
    const [shields, setShields] = useState(3);
    const [score, setScore] = useState(0);

    const [collectedComponents, setCollectedComponents] = useState(
        () => getMissionProgress("pioneer-10").collectedParts,
    );

    const [highScore, setHighScore] = useState(() => {
        try {
            return Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
        } catch {
            return 0;
        }
    });

    const [sectorIndex, setSectorIndex] = useState(0);
    const [narrative, setNarrative] = useState(NARRATIVES[0]);
    const [showNarrative, setShowNarrative] = useState(true);

    const [touchTarget, setTouchTarget] = useState<{
        x: number;
        y: number;
    } | null>(null);

    const createResumedGame = (width: number, height: number) => {
        const saved = getMissionProgress("pioneer-10").collectedParts;

        return createGameData(
            width,
            height,
            Math.min(saved, TOTAL_COMPONENTS),
        );
    };

    const startGame = () => {
        speechService.stop();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const width = canvas.clientWidth || 1000;
        const height = canvas.clientHeight || 560;

        const saved = getMissionProgress("pioneer-10").collectedParts;

        gameRef.current = createGameData(
            width,
            height,
            Math.min(saved, TOTAL_COMPONENTS),
        );

        keysRef.current = {};
        lastTimeRef.current = 0;
        completionCalledRef.current = false;

        setProgress(0);
        setShields(3);
        setScore(0);
        setCollectedComponents(Math.min(saved, TOTAL_COMPONENTS));
        setSectorIndex(0);
        setNarrative(NARRATIVES[0]);
        setShowNarrative(true);
        setTouchTarget(null);
        setStatus("playing");
    };

    const handleExit = () => {
        speechService.stop();
        onExit();
    };

    const handlePointerMove = (
        event: PointerEvent<HTMLCanvasElement>,
    ) => {
        const canvas = canvasRef.current;
        const game = gameRef.current;

        if (!canvas || !game || status !== "playing") return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        game.targetX = Math.max(45, Math.min(rect.width - 45, x));
        game.targetY = Math.max(35, Math.min(rect.height - 35, y));

        setTouchTarget({ x, y });
    };

    const handlePointerLeave = () => {
        setTouchTarget(null);
    };

    useEffect(() => {
        if (status !== "playing") return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        if (!canvas || !ctx) return;

        let width = canvas.clientWidth;
        let height = canvas.clientHeight;
        let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        const resizeCanvas = () => {
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

            canvas.width = Math.floor(width * pixelRatio);
            canvas.height = Math.floor(height * pixelRatio);

            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

            if (!gameRef.current) {
                gameRef.current = createResumedGame(width, height);
            }
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (
                ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)
            ) {
                event.preventDefault();
            }

            keysRef.current[key] = true;
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            keysRef.current[event.key.toLowerCase()] = false;
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        const finishGame = () => {
            const game = gameRef.current;
            if (!game || game.completed) return;

            game.completed = true;
            speechService.stop();

            const finalScore = Math.floor(game.score + game.progress * 10);
            setScore(finalScore);
            setProgress(100);

            const newHighScore = Math.max(finalScore, highScore);

            if (newHighScore > highScore) {
                setHighScore(newHighScore);

                try {
                    localStorage.setItem(HIGH_SCORE_KEY, String(newHighScore));
                } catch {
                    // El juego continúa aunque no se pueda guardar el récord.
                }
            }

            if (game.collectedComponents >= REQUIRED_COMPONENTS) {
                completeMission("pioneer-10");
                setStatus("completed");
            } else {
                setStatus("failed");
            }
        };

        const loseShield = (game: GameData) => {
            if (game.invulnerability > 0) return;

            game.shields -= 1;
            game.invulnerability = 1.8;
            setShields(game.shields);

            for (let i = 0; i < 18; i++) {
                game.particles.push({
                    x: game.playerX,
                    y: game.playerY,
                    vx: (Math.random() - 0.5) * 230,
                    vy: (Math.random() - 0.5) * 230,
                    life: 0.6 + Math.random() * 0.4,
                    maxLife: 1,
                });
            }

            if (game.shields <= 0) {
                speechService.stop();
                setStatus("gameover");
            }
        };

        const createCollectionEffect = (game: GameData) => {
            for (let i = 0; i < 16; i++) {
                const angle = (Math.PI * 2 * i) / 16;
                const speed = 65 + Math.random() * 100;

                game.particles.push({
                    x: game.playerX,
                    y: game.playerY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.5 + Math.random() * 0.35,
                    maxLife: 0.85,
                });
            }
        };

        const animate = (time: number) => {
            const game = gameRef.current;
            if (!game) return;

            const delta = lastTimeRef.current
                ? Math.min((time - lastTimeRef.current) / 1000, 0.04)
                : 0;

            lastTimeRef.current = time;

            drawBackground(ctx, width, height, game.stars, delta);

            const keys = keysRef.current;
            const keyboardSpeed = 390;

            if (keys["arrowup"] || keys["w"]) {
                game.targetY -= keyboardSpeed * delta;
            }

            if (keys["arrowdown"] || keys["s"]) {
                game.targetY += keyboardSpeed * delta;
            }

            if (keys["arrowleft"] || keys["a"]) {
                game.targetX -= keyboardSpeed * delta;
            }

            if (keys["arrowright"] || keys["d"]) {
                game.targetX += keyboardSpeed * delta;
            }

            game.targetX = Math.max(40, Math.min(width - 40, game.targetX));
            game.targetY = Math.max(35, Math.min(height - 35, game.targetY));

            game.playerX +=
                (game.targetX - game.playerX) * Math.min(1, delta * 8);

            game.playerY +=
                (game.targetY - game.playerY) * Math.min(1, delta * 8);

            game.progress += delta * 1.35;
            game.progress = Math.min(game.progress, 100);
            game.score += delta * 12;

            const currentSector = Math.min(
                3,
                Math.floor(game.progress / 25),
            );

            if (currentSector !== game.lastNarrative) {
                game.lastNarrative = currentSector;
                setSectorIndex(currentSector);
                setNarrative(NARRATIVES[currentSector]);
                setShowNarrative(true);
            }

            game.spawnTimer -= delta;

            if (game.spawnTimer <= 0) {
                game.asteroids.push(createAsteroid(width, height));
                game.spawnTimer = Math.max(
                    0.32,
                    0.9 - game.progress * 0.004,
                );
            }

            for (let i = game.asteroids.length - 1; i >= 0; i--) {
                const asteroid = game.asteroids[i];

                asteroid.x -= asteroid.speed * delta;
                asteroid.rotation += asteroid.rotationSpeed * delta;

                const dx = asteroid.x - game.playerX;
                const dy = asteroid.y - game.playerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (
                    distance < asteroid.radius + 18 &&
                    game.invulnerability <= 0
                ) {
                    game.asteroids.splice(i, 1);
                    loseShield(game);
                    continue;
                }

                if (asteroid.x < -asteroid.radius * 2) {
                    game.asteroids.splice(i, 1);
                    game.score += 15;
                    continue;
                }

                drawAsteroid(ctx, asteroid);
            }

            if (
                game.nextDropIndex < TOTAL_COMPONENTS &&
                game.pendingDrop === null &&
                game.progress >= DROP_PROGRESS[game.nextDropIndex]
            ) {
                const margin = Math.min(90, width * 0.12);
                const x = margin + Math.random() * (width - margin * 2);

                game.pendingDrop = {
                    x,
                    timer: 2.5,
                    storyIndex: game.nextDropIndex,
                };

                game.nextDropIndex += 1;
            }

            if (game.pendingDrop) {
                game.pendingDrop.timer -= delta;
                drawDropWarning(ctx, game.pendingDrop);

                if (game.pendingDrop.timer <= 0) {
                    game.collectibles.push(
                        createCollectible(
                            game.pendingDrop.x,
                            game.pendingDrop.storyIndex,
                        ),
                    );

                    game.spawnedComponents += 1;
                    game.pendingDrop = null;
                }
            }

            for (let i = game.collectibles.length - 1; i >= 0; i--) {
                const item = game.collectibles[i];

                item.y += item.speed * delta;
                item.rotation += delta * 1.4;
                item.pulse += delta * 5;

                const dx = item.x - game.playerX;
                const dy = item.y - game.playerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < item.size + 25) {
                    game.collectibles.splice(i, 1);

                    game.collectedComponents += 1;
                    game.score += 100;

                    const newCount = Math.min(
                        game.collectedComponents,
                        TOTAL_COMPONENTS,
                    );

                    setCollectedComponents(newCount);
                    setScore(Math.floor(game.score));

                    updateMissionProgress("pioneer-10", newCount);

                    createCollectionEffect(game);

                    setNarrative(COMPONENT_STORIES[item.storyIndex]);
                    setShowNarrative(true);

                    continue;
                }

                if (item.y > height + item.size) {
                    game.collectibles.splice(i, 1);
                    continue;
                }

                drawCollectible(ctx, item);
            }

            game.invulnerability = Math.max(
                0,
                game.invulnerability - delta,
            );

            for (let i = game.particles.length - 1; i >= 0; i--) {
                const particle = game.particles[i];

                particle.x += particle.vx * delta;
                particle.y += particle.vy * delta;
                particle.life -= delta;

                if (particle.life <= 0) {
                    game.particles.splice(i, 1);
                }
            }

            drawParticles(ctx, game.particles);

            drawShip(
                ctx,
                game.playerX,
                game.playerY,
                game.invulnerability > 0,
            );

            ctx.fillStyle = "rgba(148, 163, 184, 0.2)";
            ctx.fillRect(0, height - 4, width, 4);

            ctx.fillStyle = "#22d3ee";
            ctx.fillRect(
                0,
                height - 4,
                width * (game.progress / 100),
                4,
            );

            if (game.progress >= 100 && !game.completed) {
                finishGame();
                return;
            }

            setProgress(Math.floor(game.progress));
            setScore(Math.floor(game.score));

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current !== null) {
                cancelAnimationFrame(animationRef.current);
            }

            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [status, highScore]);

    // Lectura automática de los registros históricos y componentes recuperados.
    useEffect(() => {
        if (!showNarrative || status !== "playing") {
            speechService.stop();
            return;
        }

        void speechService.read(narrative.text);

        return () => {
            speechService.stop();
        };
    }, [showNarrative, narrative, status]);

    // Mantiene visible cada registro durante 15 segundos.
    useEffect(() => {
        if (!showNarrative || status !== "playing") return;

        const timeout = window.setTimeout(() => {
            setShowNarrative(false);
        }, 15000);

        return () => window.clearTimeout(timeout);
    }, [showNarrative, status, sectorIndex, narrative]);

    // Detiene cualquier narración al desmontar el minijuego.
    useEffect(() => {
        return () => {
            speechService.stop();
        };
    }, []);

    const handleComplete = () => {
        if (status !== "completed" || completionCalledRef.current) return;

        speechService.stop();
        completionCalledRef.current = true;
        onComplete();
    };

    const currentSectorName = SECTOR_NAMES[sectorIndex];

    return (
        <main className="pioneer-game">
            <header className="pioneer-topbar">
                <button
                    className="pioneer-back-button"
                    onClick={handleExit}
                    type="button"
                >
                    <ArrowLeft size={18} />
                    SALIR DE LA MISIÓN
                </button>

                <div className="pioneer-brand">
                    <span className="pioneer-status-dot" />
                    ARCHIVO DE EXPLORACIÓN // PIONEER 10
                </div>

                <div className="pioneer-topbar-right">
                    <span>NASA // 1972</span>
                </div>
            </header>

            <section className="pioneer-game-content">
                <div className="pioneer-heading">
                    <div>
                        <p className="pioneer-eyebrow">
                            <span /> MISIÓN DE ESPACIO PROFUNDO
                        </p>
                        <h1>PIONEER 10</h1>
                        <p>
                            TRAVESÍA ORBITAL <span>//</span> EXPLORACIÓN DEL SISTEMA SOLAR
                        </p>
                    </div>

                    <div className="pioneer-mission-code">
                        <small>IDENTIFICADOR</small>
                        <strong>P10-1972</strong>
                    </div>
                </div>

                <div className="pioneer-game-frame">
                    <div className="pioneer-canvas-wrap">
                        <canvas
                            ref={canvasRef}
                            className="pioneer-canvas"
                            onPointerMove={handlePointerMove}
                            onPointerLeave={handlePointerLeave}
                            aria-label="Juego de evasión y recolección espacial de Pioneer 10"
                        />

                        {status === "playing" && (
                            <>
                                <div className="pioneer-hud">
                                    <div className="pioneer-hud-item">
                                        <small>ESCUDOS</small>
                                        <div className="pioneer-lives">
                                            {Array.from({ length: 3 }).map((_, index) => (
                                                <Heart
                                                    key={index}
                                                    size={18}
                                                    fill={
                                                        index < shields
                                                            ? "#22d3ee"
                                                            : "transparent"
                                                    }
                                                    color={
                                                        index < shields
                                                            ? "#22d3ee"
                                                            : "#475569"
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pioneer-hud-item pioneer-hud-sector">
                                        <small>SECTOR ACTUAL</small>
                                        <strong>{currentSectorName}</strong>
                                    </div>

                                    <div className="pioneer-hud-item">
                                        <small>PIEZAS RECUPERADAS</small>
                                        <div className="pioneer-component-counter">
                                            <Package size={17} />
                                            <strong>
                                                {collectedComponents}/{TOTAL_COMPONENTS}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="pioneer-hud-item pioneer-hud-score">
                                        <small>PUNTUACIÓN</small>
                                        <strong>{score.toString().padStart(5, "0")}</strong>
                                    </div>
                                </div>

                                <div className="pioneer-progress">
                                    <div className="pioneer-progress-label">
                                        <span>PROGRESO DE TRAVESÍA</span>
                                        <strong>{progress}%</strong>
                                    </div>
                                    <div className="pioneer-progress-track">
                                        <div
                                            className="pioneer-progress-fill"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="pioneer-collection-requirement">
                                    <span>
                                        OBJETIVO: RECUPERA {REQUIRED_COMPONENTS} DE {TOTAL_COMPONENTS}
                                    </span>
                                    <strong>
                                        {Math.min(collectedComponents, REQUIRED_COMPONENTS)}/
                                        {REQUIRED_COMPONENTS}
                                    </strong>
                                </div>

                                {showNarrative && (
                                    <div className="pioneer-narrative">
                                        <div className="pioneer-narrative-line" />
                                        <div>
                                            <small>
                                                REGISTRO HISTÓRICO // {narrative.date}
                                            </small>
                                            <h3>{narrative.title}</h3>
                                            <p>{narrative.text}</p>
                                        </div>
                                    </div>
                                )}

                                {touchTarget && (
                                    <div
                                        className="pioneer-touch-indicator"
                                        style={{
                                            left: touchTarget.x,
                                            top: touchTarget.y,
                                        }}
                                    />
                                )}
                            </>
                        )}

                        {status === "gameover" && (
                            <div className="pioneer-overlay">
                                <div className="pioneer-result-card">
                                    <div className="pioneer-result-icon danger">
                                        <Heart size={30} />
                                    </div>

                                    <p className="pioneer-eyebrow">SEÑAL INTERRUMPIDA</p>
                                    <h2>Fin de la travesía</h2>

                                    <p>
                                        La nave ha perdido todos sus escudos antes de completar
                                        la ruta. La misión todavía puede intentarse de nuevo.
                                    </p>

                                    <div className="pioneer-final-score">
                                        <small>PUNTUACIÓN OBTENIDA</small>
                                        <strong>{score}</strong>
                                        <span>
                                            PIEZAS: {collectedComponents}/{TOTAL_COMPONENTS}
                                        </span>
                                        <span>RÉCORD: {highScore}</span>
                                    </div>

                                    <button
                                        className="pioneer-primary-button"
                                        onClick={startGame}
                                        type="button"
                                    >
                                        <RotateCcw size={18} />
                                        REINTENTAR MISIÓN
                                    </button>

                                    <button
                                        className="pioneer-secondary-button"
                                        onClick={handleExit}
                                        type="button"
                                    >
                                        VOLVER AL EXPEDIENTE
                                    </button>
                                </div>
                            </div>
                        )}

                        {status === "failed" && (
                            <div className="pioneer-overlay">
                                <div className="pioneer-result-card">
                                    <div className="pioneer-result-icon danger">
                                        <AlertTriangle size={32} />
                                    </div>

                                    <p className="pioneer-eyebrow">
                                        RECUPERACIÓN INSUFICIENTE
                                    </p>

                                    <h2>Objetivo no alcanzado</h2>

                                    <p>
                                        Has llegado al final de la ruta, pero no recuperaste las
                                        6 piezas necesarias para completar el archivo de Pioneer 10.
                                        Puedes repetir la travesía e intentar recoger más registros.
                                    </p>

                                    <div className="pioneer-final-score">
                                        <small>PIEZAS RECUPERADAS</small>
                                        <strong>
                                            {collectedComponents}/{TOTAL_COMPONENTS}
                                        </strong>
                                        <span>
                                            NECESARIAS PARA COMPLETAR: {REQUIRED_COMPONENTS}
                                        </span>
                                        <span>PUNTUACIÓN: {score}</span>
                                    </div>

                                    <button
                                        className="pioneer-primary-button"
                                        onClick={startGame}
                                        type="button"
                                    >
                                        <RotateCcw size={18} />
                                        REINTENTAR MISIÓN
                                    </button>

                                    <button
                                        className="pioneer-secondary-button"
                                        onClick={handleExit}
                                        type="button"
                                    >
                                        VOLVER AL EXPEDIENTE
                                    </button>
                                </div>
                            </div>
                        )}

                        {status === "completed" && (
                            <div className="pioneer-overlay">
                                <div className="pioneer-result-card">
                                    <div className="pioneer-result-icon success">
                                        <Trophy size={32} />
                                    </div>

                                    <p className="pioneer-eyebrow">
                                        REGISTRO DE MISIÓN COMPLETADO
                                    </p>

                                    <h2>Travesía finalizada</h2>

                                    <p>
                                        Has completado la ruta de Pioneer 10 y recuperado suficientes
                                        registros históricos. La sonda atravesó el cinturón de
                                        asteroides, visitó Júpiter y continuó su viaje hacia el
                                        espacio profundo.
                                    </p>

                                    <div className="pioneer-final-score">
                                        <small>PUNTUACIÓN FINAL</small>
                                        <strong>{score}</strong>
                                        <span>
                                            PIEZAS RECUPERADAS: {collectedComponents}/{TOTAL_COMPONENTS}
                                        </span>
                                        <span>RÉCORD: {highScore}</span>
                                    </div>

                                    <button
                                        className="pioneer-primary-button"
                                        onClick={handleComplete}
                                        type="button"
                                    >
                                        FINALIZAR Y VER EXPEDIENTE
                                        <ChevronRight size={19} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pioneer-bottom-info">
                    <div className="pioneer-bottom-card">
                        <div className="pioneer-bottom-icon">
                            <ArrowUp size={19} />
                        </div>
                        <div>
                            <strong>CONTROLES</strong>
                            <span>WASD, flechas o movimiento táctil</span>
                        </div>
                    </div>

                    <div className="pioneer-bottom-card">
                        <div className="pioneer-bottom-icon">
                            <Package size={19} />
                        </div>
                        <div>
                            <strong>RECOLECCIÓN</strong>
                            <span>Recupera al menos 6 de los 10 registros</span>
                        </div>
                    </div>

                    <div className="pioneer-bottom-card">
                        <div className="pioneer-bottom-icon">
                            <Trophy size={19} />
                        </div>
                        <div>
                            <strong>RÉCORD PERSONAL</strong>
                            <span>{highScore} puntos</span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
