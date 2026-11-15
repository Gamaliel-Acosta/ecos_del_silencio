
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ArrowLeft, Battery, Check, Compass, Gauge, Map,
    Radio, RotateCcw, Satellite, Zap,
} from "lucide-react";
import "./opportunity.css";

interface OpportunityGameProps {
    onExit: () => void;
    onComplete: () => void;
}

interface Part {
    id: number;
    name: string;
    x: number;
    y: number;
    collected: boolean;
}

interface Rover {
    x: number;
    y: number;
    angle: number;
    speed: number;
    battery: number;
}

const WORLD = { width: 2200, height: 1500 };

const STORIES = [
    {
        title: "EL COMIENZO DE LA MISIÓN",
        year: "2004",
        text: "Opportunity llegó a Marte el 25 de enero de 2004. Su misión inicial estaba planeada para durar solamente 90 soles marcianos.",
    },
    {
        title: "UN LABORATORIO SOBRE RUEDAS",
        year: "2004",
        text: "Equipado con cámaras, espectrómetros y un brazo robótico, Opportunity fue diseñado para estudiar las rocas y el suelo marciano.",
    },
    {
        title: "AGUA EN EL PASADO DE MARTE",
        year: "2004–2005",
        text: "Sus investigaciones encontraron evidencias de que el agua líquida estuvo presente en el pasado de Marte, una pista fundamental para comprender su historia.",
    },
    {
        title: "UN VIAJE EXTRAORDINARIO",
        year: "2005–2018",
        text: "Opportunity superó ampliamente su vida útil prevista. Recorrió más de 45 kilómetros y exploró lugares como el cráter Victoria y el cráter Endeavour.",
    },
    {
        title: "EL ÚLTIMO CONTACTO",
        year: "2018–2019",
        text: "Una intensa tormenta de polvo cubrió sus paneles solares. Su última comunicación llegó el 10 de junio de 2018. NASA declaró finalizada la misión el 13 de febrero de 2019.",
    },
];

const PART_NAMES = [
    "Sistema de comunicaciones",
    "Brazo robótico",
    "Panel solar",
    "Cámaras panorámicas",
    "Unidad científica",
];

const ROCKS = Array.from({ length: 75 }, (_, i) => ({
    x: 100 + ((i * 271) % 2000),
    y: 100 + ((i * 193) % 1300),
    radius: 13 + ((i * 17) % 27),
}));

const CRATERS = Array.from({ length: 15 }, (_, i) => ({
    x: 180 + ((i * 397) % 1850),
    y: 150 + ((i * 311) % 1200),
    radius: 45 + ((i * 23) % 65),
}));

const TARGETS = [
    { x: 380, y: 350 },
    { x: 1050, y: 220 },
    { x: 1830, y: 450 },
    { x: 1600, y: 1150 },
    { x: 500, y: 1200 },
];

function isSafe(x: number, y: number, existing: Part[]) {
    if (Math.hypot(x - 160, y - 160) < 180) return false;

    if (ROCKS.some(r => Math.hypot(x - r.x, y - r.y) < r.radius + 65)) {
        return false;
    }

    if (CRATERS.some(c => Math.hypot(x - c.x, y - c.y) < c.radius + 45)) {
        return false;
    }

    if (existing.some(p => Math.hypot(x - p.x, y - p.y) < 230)) {
        return false;
    }

    return true;
}

function createParts(): Part[] {
    const result: Part[] = [];

    TARGETS.forEach((target, id) => {
        let best: { x: number; y: number } | null = null;
        let bestDistance = Infinity;

        for (let y = 100; y < WORLD.height - 100; y += 30) {
            for (let x = 100; x < WORLD.width - 100; x += 30) {
                if (!isSafe(x, y, result)) continue;

                const distance = Math.hypot(x - target.x, y - target.y);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    best = { x, y };
                }
            }
        }

        result.push({
            id,
            name: PART_NAMES[id],
            x: best?.x ?? target.x,
            y: best?.y ?? target.y,
            collected: false,
        });
    });

    return result;
}

const INITIAL_PARTS = createParts();

export default function OpportunityGame({
    onExit,
    onComplete,
}: OpportunityGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const roverRef = useRef<Rover>({
        x: 160,
        y: 160,
        angle: 0,
        speed: 0,
        battery: 100,
    });

    const partsRef = useRef<Part[]>(
        INITIAL_PARTS.map(p => ({ ...p })),
    );

    const keysRef = useRef(new Set<string>());
    const frameRef = useRef(0);
    const completedRef = useRef(false);

    const [parts, setParts] = useState(INITIAL_PARTS);
    const [battery, setBattery] = useState(100);
    const [speed, setSpeed] = useState(0);
    const [boost, setBoost] = useState(false);
    const [message, setMessage] = useState(
        "SEÑAL DE OPPORTUNITY ESTABLECIDA",
    );
    const [paused, setPaused] = useState(false);

    const [storyIndex, setStoryIndex] = useState<number | null>(null);
    const [assembled, setAssembled] = useState<number[]>([]);
    const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
    const [puzzleOpen, setPuzzleOpen] = useState(false);

    const collectedCount = parts.filter(p => p.collected).length;

    // Coloca una pieza en su posición correspondiente.
    const handleAssembly = (slot: number) => {
        if (selectedPiece === null) return;

        if (selectedPiece === slot) {
            setAssembled(current =>
                current.includes(slot) ? current : [...current, slot],
            );
        }

        setSelectedPiece(null);
    };

    // Las notas históricas desaparecen automáticamente.
    useEffect(() => {
        if (storyIndex === null) return;

        const timeout = window.setTimeout(() => {
            setStoryIndex(null);

            // Después del quinto fragmento se abre la reconstrucción.
            if (collectedCount === 5) {
                setPuzzleOpen(true);
            }
        }, 5200);

        return () => window.clearTimeout(timeout);
    }, [storyIndex, collectedCount]);

    // Finalización automática al ensamblar las cinco piezas.
    useEffect(() => {
        if (
            assembled.length !== PART_NAMES.length ||
            !puzzleOpen ||
            completedRef.current
        ) {
            return;
        }

        const timeout = window.setTimeout(() => {
            if (completedRef.current) return;

            completedRef.current = true;
            keysRef.current.clear();
            setPuzzleOpen(false);
            onComplete();
        }, 900);

        return () => window.clearTimeout(timeout);
    }, [assembled, puzzleOpen, onComplete]);

    const resetGame = () => {
        roverRef.current = {
            x: 160,
            y: 160,
            angle: 0,
            speed: 0,
            battery: 100,
        };

        partsRef.current = INITIAL_PARTS.map(p => ({ ...p }));
        completedRef.current = false;
        keysRef.current.clear();

        setParts(INITIAL_PARTS.map(p => ({ ...p })));
        setBattery(100);
        setSpeed(0);
        setBoost(false);
        setStoryIndex(null);
        setAssembled([]);
        setSelectedPiece(null);
        setPuzzleOpen(false);
        setPaused(false);
        setMessage("NUEVA EXPEDICIÓN A MARTE");
    };

    const exitGame = useCallback(() => {
        keysRef.current.clear();
        onExit();
    }, [onExit]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        if (!canvas || !ctx) return;

        let width = 0;
        let height = 0;
        let lastTime = 0;
        let animationTime = 0;
        let hudCounter = 0;
        let collisionCooldown = 0;

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            width = rect.width;
            height = rect.height;

            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const drawBackground = (cameraX: number, cameraY: number) => {
            ctx.fillStyle = "#9b6246";
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            ctx.translate(-cameraX, -cameraY);

            // Polvo marciano.
            for (let i = 0; i < 600; i++) {
                const x = (i * 173) % WORLD.width;
                const y = (i * 293) % WORLD.height;

                ctx.fillStyle = i % 2 === 0
                    ? "rgba(255,205,155,.15)"
                    : "rgba(50,25,18,.13)";

                ctx.beginPath();
                ctx.arc(x, y, 1 + i % 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Cráteres.
            CRATERS.forEach(c => {
                const gradient = ctx.createRadialGradient(
                    c.x - 10,
                    c.y - 10,
                    5,
                    c.x,
                    c.y,
                    c.radius,
                );

                gradient.addColorStop(0, "#643e32");
                gradient.addColorStop(0.75, "#804d39");
                gradient.addColorStop(1, "#bd7954");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = "rgba(255,205,160,.3)";
                ctx.lineWidth = 5;
                ctx.stroke();
            });

            // Rocas.
            ROCKS.forEach(r => {
                ctx.fillStyle = "#603c30";
                ctx.beginPath();
                ctx.ellipse(
                    r.x + 5,
                    r.y + 8,
                    r.radius * 1.1,
                    r.radius * 0.75,
                    0,
                    0,
                    Math.PI * 2,
                );
                ctx.fill();

                ctx.fillStyle = "#c38b69";
                ctx.beginPath();
                ctx.moveTo(r.x - r.radius, r.y);
                ctx.lineTo(r.x - r.radius * 0.4, r.y - r.radius * 0.8);
                ctx.lineTo(r.x + r.radius * 0.4, r.y - r.radius);
                ctx.lineTo(r.x + r.radius, r.y - r.radius * 0.2);
                ctx.lineTo(r.x + r.radius * 0.6, r.y + r.radius * 0.8);
                ctx.lineTo(r.x - r.radius * 0.5, r.y + r.radius * 0.7);
                ctx.closePath();
                ctx.fill();
            });

            ctx.strokeStyle = "rgba(255,200,150,.35)";
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, WORLD.width, WORLD.height);

            ctx.restore();
        };

        const drawPart = (part: Part) => {
            if (part.collected) return;

            const pulse =
                1 + Math.sin(animationTime * 0.004 + part.id) * 0.15;

            ctx.save();
            ctx.translate(part.x, part.y);
            ctx.shadowColor = "#76efff";
            ctx.shadowBlur = 25;

            ctx.strokeStyle = "#8cf3ff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 23 * pulse, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = "#d5fcff";
            ctx.fillRect(-6, -6, 12, 12);

            ctx.restore();
        };

        const drawRover = (rover: Rover) => {
            ctx.save();
            ctx.translate(rover.x, rover.y);
            ctx.rotate(rover.angle);

            // Sombra.
            ctx.fillStyle = "rgba(0,0,0,.35)";
            ctx.beginPath();
            ctx.ellipse(0, 10, 34, 23, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ruedas.
            for (const x of [-23, 23]) {
                for (const y of [-22, 22]) {
                    ctx.fillStyle = "#292725";
                    ctx.fillRect(x - 7, y - 9, 14, 19);
                }
            }

            // Chasis.
            ctx.fillStyle = "#d2a56d";
            ctx.strokeStyle = "#f4d5a2";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-25, -18, 50, 36, 5);
            ctx.fill();
            ctx.stroke();

            // Panel superior.
            ctx.fillStyle = "#416b78";
            ctx.fillRect(-15, -12, 30, 24);

            // Cámara.
            ctx.fillStyle = "#d8f5ff";
            ctx.beginPath();
            ctx.arc(0, -24, 5, 0, Math.PI * 2);
            ctx.fill();

            // Brazo robótico.
            ctx.strokeStyle = "#e9c18b";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(20, 0);
            ctx.lineTo(37, 12);
            ctx.lineTo(43, 20);
            ctx.stroke();

            ctx.restore();
        };

        const drawRadar = (rover: Rover) => {
            const size = 135;
            const x = width - size - 20;
            const y = height - size - 20;

            ctx.save();

            ctx.fillStyle = "rgba(30,12,8,.85)";
            ctx.strokeStyle = "rgba(255,190,140,.8)";
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.arc(
                x + size / 2,
                y + size / 2,
                size / 2,
                0,
                Math.PI * 2,
            );
            ctx.fill();
            ctx.stroke();

            const mapX = (px: number) =>
                x + (px / WORLD.width) * size;

            const mapY = (py: number) =>
                y + (py / WORLD.height) * size;

            // Solo componentes pendientes.
            partsRef.current.forEach(part => {
                if (part.collected) return;

                ctx.fillStyle = "#8cf3ff";
                ctx.beginPath();
                ctx.arc(mapX(part.x), mapY(part.y), 3, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(mapX(rover.x), mapY(rover.y), 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        const draw = () => {
            const rover = roverRef.current;

            const cameraX = Math.max(
                0,
                Math.min(WORLD.width - width, rover.x - width / 2),
            );

            const cameraY = Math.max(
                0,
                Math.min(WORLD.height - height, rover.y - height / 2),
            );

            drawBackground(cameraX, cameraY);

            ctx.save();
            ctx.translate(-cameraX, -cameraY);

            partsRef.current.forEach(drawPart);
            drawRover(rover);

            ctx.restore();

            drawRadar(rover);
        };

        const update = (delta: number) => {
            // Las notas históricas NO detienen el juego.
            // Solo se detiene durante la reconstrucción.
            if (paused || puzzleOpen) return;

            const rover = roverRef.current;
            const keys = keysRef.current;
            const seconds = Math.min(delta / 16.67, 2);

            const forward =
                keys.has("w") || keys.has("arrowup");

            const backward =
                keys.has("s") || keys.has("arrowdown");

            const left =
                keys.has("a") || keys.has("arrowleft");

            const right =
                keys.has("d") || keys.has("arrowright");

            const turbo = keys.has(" ") && rover.battery > 1;

            const maxSpeed = turbo ? 5 : 3;

            if (forward) rover.speed += 0.12 * seconds;
            if (backward) rover.speed -= 0.10 * seconds;

            rover.speed *= Math.pow(0.965, seconds);
            rover.speed = Math.max(
                -1.8,
                Math.min(maxSpeed, rover.speed),
            );

            if (Math.abs(rover.speed) > 0.08) {
                if (right) rover.angle += 0.045 * seconds;
                if (left) rover.angle -= 0.045 * seconds;
            }

            const oldX = rover.x;
            const oldY = rover.y;

            rover.x += Math.cos(rover.angle) * rover.speed * seconds;
            rover.y += Math.sin(rover.angle) * rover.speed * seconds;

            rover.x = Math.max(
                35,
                Math.min(WORLD.width - 35, rover.x),
            );

            rover.y = Math.max(
                35,
                Math.min(WORLD.height - 35, rover.y),
            );

            // Colisiones.
            for (const rock of ROCKS) {
                if (
                    Math.hypot(
                        rover.x - rock.x,
                        rover.y - rock.y,
                    ) < rock.radius + 23
                ) {
                    rover.x = oldX;
                    rover.y = oldY;
                    rover.speed *= -0.25;

                    if (collisionCooldown <= 0) {
                        setMessage(
                            "OBSTÁCULO DETECTADO. BUSCA OTRA RUTA.",
                        );

                        collisionCooldown = 60;
                    }

                    break;
                }
            }

            // Consumo de energía.
            rover.battery = Math.max(
                0,
                rover.battery -
                    (turbo && forward ? 0.12 : 0.012) * seconds,
            );

            if (rover.battery <= 0) {
                rover.speed *= 0.9;
            }

            // Recuperación de componentes.
            const found = partsRef.current.find(
                p =>
                    !p.collected &&
                    Math.hypot(
                        rover.x - p.x,
                        rover.y - p.y,
                    ) < 48,
            );

            if (found) {
                found.collected = true;

                const nextParts = partsRef.current.map(p => ({ ...p }));

                setParts(nextParts);

                setMessage(
                    `COMPONENTE RECUPERADO: ${found.name.toUpperCase()}`,
                );

                // Cada pieza activa su fragmento histórico.
                setStoryIndex(found.id);
            }

            if (collisionCooldown > 0) {
                collisionCooldown--;
            }

            animationTime += delta;
            hudCounter++;

            if (hudCounter >= 8) {
                hudCounter = 0;

                setBattery(rover.battery);
                setSpeed(Math.abs(rover.speed) * 12);
                setBoost(turbo && forward);
            }
        };

        const loop = (time: number) => {
            const delta = lastTime
                ? time - lastTime
                : 16.67;

            lastTime = time;

            update(delta);
            draw();

            frameRef.current = requestAnimationFrame(loop);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (
                [
                    "arrowup",
                    "arrowdown",
                    "arrowleft",
                    "arrowright",
                    " ",
                ].includes(key)
            ) {
                event.preventDefault();
            }

            keysRef.current.add(key);
        };

        const onKeyUp = (event: KeyboardEvent) => {
            keysRef.current.delete(event.key.toLowerCase());
        };

        resize();

        window.addEventListener("resize", resize);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        frameRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(frameRef.current);

            window.removeEventListener("resize", resize);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);

            keysRef.current.clear();
        };
    }, [paused, puzzleOpen]);

    return (
        <main className="opportunity-game">
            <header className="opportunity-header">
                <button className="opp-exit" onClick={exitGame}>
                    <ArrowLeft size={17} />
                    ABANDONAR EXPEDICIÓN
                </button>

                <div className="opp-title">
                    <span>NASA // MARS EXPLORATION ROVER</span>
                    <strong>OPPORTUNITY</strong>
                </div>

                <div className="opp-live">
                    <i /> TRANSMISIÓN ACTIVA
                </div>
            </header>

            <section className="opp-hud">
                <div className="opp-stat">
                    <Battery size={19} />

                    <div>
                        <small>ENERGÍA</small>
                        <strong>{Math.ceil(battery)}%</strong>
                    </div>

                    <div className="opp-battery">
                        <span style={{ width: `${battery}%` }} />
                    </div>
                </div>

                <div className="opp-stat">
                    <Gauge size={19} />

                    <div>
                        <small>VELOCIDAD</small>
                        <strong>{Math.round(speed)} km/h</strong>
                    </div>
                </div>

                <div className="opp-stat">
                    <Satellite size={19} />

                    <div>
                        <small>COMPONENTES</small>
                        <strong>{collectedCount}/5</strong>
                    </div>
                </div>

                <div className="opp-progress">
                    <small>PROGRESO DE MISIÓN</small>

                    <div>
                        <i style={{ width: `${collectedCount * 20}%` }} />
                    </div>
                </div>
            </section>

            <section className="opp-game-area">
                <canvas
                    ref={canvasRef}
                    className="opp-canvas"
                    aria-label="Exploración de Marte. Usa WASD o las flechas para conducir."
                />

                <div className="opp-location">
                    <Map size={15} />
                    MARTE // MERIDIANI PLANUM
                </div>

                <div className="opp-message">
                    <Radio size={15} />
                    {message}
                </div>

                {boost && (
                    <div className="opp-boost">
                        <Zap size={15} />
                        IMPULSO ACTIVADO
                    </div>
                )}

                <div className="opp-controls">
                    <span>W A S D / FLECHAS</span>
                    <small>MOVER Y GIRAR</small>
                    <span>ESPACIO</span>
                    <small>IMPULSO</small>
                </div>

                {/* Nota histórica temporal */}
                {storyIndex !== null && (
                    <div className="opp-story-toast">
                        <section className="opp-story">
                            <div className="opp-story-kicker">
                                <Radio size={15} />
                                TRANSMISIÓN HISTÓRICA
                            </div>

                            <span className="opp-story-year">
                                {STORIES[storyIndex].year}
                            </span>

                            <h2>{STORIES[storyIndex].title}</h2>

                            <p>{STORIES[storyIndex].text}</p>

                            <div className="opp-story-counter">
                                FRAGMENTO {storyIndex + 1} DE 5
                            </div>

                            <div className="opp-story-timer">
                                <i />
                            </div>
                        </section>
                    </div>
                )}
            </section>

            <footer className="opp-footer">
                <div>
                    <Compass size={20} />

                    <section>
                        <small>OBJETIVO ACTUAL</small>
                        <strong>
                            Explora Marte y recupera los cinco componentes virtuales.
                        </strong>
                    </section>
                </div>

                <button onClick={resetGame}>
                    <RotateCcw size={16} />
                    REINICIAR
                </button>
            </footer>

            <div className="opp-touch">
                <button
                    onPointerDown={() => keysRef.current.add("arrowup")}
                    onPointerUp={() => keysRef.current.delete("arrowup")}
                    onPointerLeave={() => keysRef.current.delete("arrowup")}
                    onPointerCancel={() => keysRef.current.delete("arrowup")}
                >
                    ▲
                </button>

                <div>
                    <button
                        onPointerDown={() => keysRef.current.add("arrowleft")}
                        onPointerUp={() => keysRef.current.delete("arrowleft")}
                        onPointerLeave={() => keysRef.current.delete("arrowleft")}
                        onPointerCancel={() => keysRef.current.delete("arrowleft")}
                    >
                        ◀
                    </button>

                    <button
                        onPointerDown={() => keysRef.current.add("arrowdown")}
                        onPointerUp={() => keysRef.current.delete("arrowdown")}
                        onPointerLeave={() => keysRef.current.delete("arrowdown")}
                        onPointerCancel={() => keysRef.current.delete("arrowdown")}
                    >
                        ▼
                    </button>

                    <button
                        onPointerDown={() => keysRef.current.add("arrowright")}
                        onPointerUp={() => keysRef.current.delete("arrowright")}
                        onPointerLeave={() => keysRef.current.delete("arrowright")}
                        onPointerCancel={() => keysRef.current.delete("arrowright")}
                    >
                        ▶
                    </button>
                </div>

                <button
                    onPointerDown={() => keysRef.current.add(" ")}
                    onPointerUp={() => keysRef.current.delete(" ")}
                    onPointerLeave={() => keysRef.current.delete(" ")}
                    onPointerCancel={() => keysRef.current.delete(" ")}
                >
                    <Zap size={18} />
                </button>
            </div>

            {/* Reconstrucción final */}
            {puzzleOpen && (
                <div className="opp-story-backdrop">
                    <section className="opp-puzzle">
                        <div className="opp-story-kicker">
                            <Satellite size={17} />
                            FASE FINAL // RECONSTRUCCIÓN
                        </div>

                        <h2>RECONSTRUYE A OPPORTUNITY</h2>

                        <p>
                            Has recuperado los cinco componentes.
                            Selecciona cada pieza y colócala en su posición correspondiente.
                        </p>

                        <div className="opp-puzzle-board">
                            {PART_NAMES.map((name, index) => (
                                <button
                                    key={name}
                                    className={
                                        assembled.includes(index)
                                            ? "assembled"
                                            : ""
                                    }
                                    onClick={() => handleAssembly(index)}
                                >
                                    {assembled.includes(index)
                                        ? <Check />
                                        : String(index + 1).padStart(2, "0")}

                                    <small>{name}</small>
                                </button>
                            ))}
                        </div>

                        <div className="opp-puzzle-pieces">
                            {PART_NAMES.map((name, index) => (
                                <button
                                    key={name}
                                    disabled={assembled.includes(index)}
                                    className={
                                        selectedPiece === index
                                            ? "selected"
                                            : ""
                                    }
                                    onClick={() => setSelectedPiece(index)}
                                >
                                    <Satellite size={17} />
                                    PIEZA {index + 1}
                                </button>
                            ))}
                        </div>

                        <div className="opp-puzzle-count">
                            {assembled.length} / 5 COMPONENTES ENSAMBLADOS
                        </div>

                        {assembled.length === 5 && (
                            <div className="opp-complete-message">
                                <Check size={18} />
                                RECONSTRUCCIÓN COMPLETADA
                                <span>Regresando a la misión...</span>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </main>
    );
}
