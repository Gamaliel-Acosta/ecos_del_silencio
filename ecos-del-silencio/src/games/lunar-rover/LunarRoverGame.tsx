
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ArrowLeft,
    Battery,
    Check,
    Compass,
    Gauge,
    Map,
    Radio,
    RotateCcw,
    Satellite,
    Zap,
} from "lucide-react";

import {
    getMissionProgress,
    updateMissionProgress,
    completeMission,
} from "../../services/progress.service";

import "./lunar-rover.css";

interface LunarRoverGameProps {
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

const WORLD = { width: 2600, height: 1900 };

const PART_NAMES = [
    "Antena de comunicaciones",
    "Panel de instrumentos",
    "Rueda de repuesto",
    "Sistema de navegación",
    "Unidad de energía",
];

const LUNAR_STORIES = [
    {
        title: "EL NACIMIENTO DEL ROVER",
        text: "El Lunar Roving Vehicle fue desarrollado para ampliar la distancia que los astronautas podían explorar en la superficie lunar.",
    },
    {
        title: "APOLLO 15: EL PRIMER VIAJE",
        text: "En 1971, durante Apollo 15, el vehículo fue utilizado por primera vez en la Luna. Permitió explorar la región de Hadley-Apennine.",
    },
    {
        title: "TECNOLOGÍA PARA LA LUNA",
        text: "El rover era un vehículo eléctrico de cuatro ruedas, diseñado para transportar astronautas, herramientas y muestras sobre el terreno lunar.",
    },
    {
        title: "TRES MISIONES LUNARES",
        text: "El Lunar Roving Vehicle participó en Apollo 15, Apollo 16 y Apollo 17. Gracias a él, las tripulaciones pudieron explorar zonas más alejadas de sus módulos lunares.",
    },
    {
        title: "UN LEGADO EN LA SUPERFICIE LUNAR",
        text: "Al finalizar Apollo 17, el último rover quedó en la Luna. Las misiones no contemplaban recuperarlo y traerlo de vuelta a la Tierra.",
    },
];

const ROCKS = Array.from({ length: 95 }, (_, i) => ({
    x: 100 + ((i * 347) % (WORLD.width - 200)),
    y: 100 + ((i * 239) % (WORLD.height - 200)),
    radius: 10 + ((i * 17) % 28),
    rotation: (i * 13) % 6,
}));

const CRATERS = Array.from({ length: 25 }, (_, i) => ({
    x: 180 + ((i * 521) % (WORLD.width - 360)),
    y: 150 + ((i * 397) % (WORLD.height - 300)),
    radius: 35 + ((i * 29) % 75),
}));

const PART_TARGETS = [
    { x: 420, y: 350 },
    { x: 1120, y: 290 },
    { x: 2030, y: 520 },
    { x: 1730, y: 1320 },
    { x: 650, y: 1480 },
];

function isSafePartPosition(
    x: number,
    y: number,
    existingParts: Part[],
): boolean {
    if (
        x < 100 ||
        y < 100 ||
        x > WORLD.width - 100 ||
        y > WORLD.height - 100
    ) {
        return false;
    }

    if (Math.hypot(x - 180, y - 180) < 170) {
        return false;
    }

    const nearRock = ROCKS.some((rock) => {
        const distance = Math.hypot(x - rock.x, y - rock.y);
        return distance < rock.radius + 65;
    });

    if (nearRock) return false;

    const nearCrater = CRATERS.some((crater) => {
        const distance = Math.hypot(x - crater.x, y - crater.y);
        return distance < crater.radius + 45;
    });

    if (nearCrater) return false;

    const nearAnotherPart = existingParts.some((part) => {
        return Math.hypot(x - part.x, y - part.y) < 220;
    });

    if (nearAnotherPart) return false;

    return true;
}

function generateInitialParts(): Part[] {
    const generatedParts: Part[] = [];

    PART_TARGETS.forEach((target, index) => {
        let bestPosition: { x: number; y: number } | null = null;
        let bestDistance = Infinity;

        for (let y = 100; y < WORLD.height - 100; y += 25) {
            for (let x = 100; x < WORLD.width - 100; x += 25) {
                if (!isSafePartPosition(x, y, generatedParts)) {
                    continue;
                }

                const distance = Math.hypot(
                    x - target.x,
                    y - target.y,
                );

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestPosition = { x, y };
                }
            }
        }

        const position = bestPosition ?? {
            x: 180 + index * 400,
            y: 500 + index * 250,
        };

        generatedParts.push({
            id: index,
            name: PART_NAMES[index],
            x: position.x,
            y: position.y,
            collected: false,
        });
    });

    return generatedParts;
}

const INITIAL_PARTS: Part[] = generateInitialParts();

function getInitialMissionParts(): Part[] {
    const progress = getMissionProgress("lunar-rover");

    return INITIAL_PARTS.map((part, index) => ({
        ...part,
        collected: index < progress.collectedParts,
    }));
}

function LunarRoverGame({
    onExit,
    onComplete,
}: LunarRoverGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const roverRef = useRef<Rover>({
        x: 180,
        y: 180,
        angle: 0,
        speed: 0,
        battery: 100,
    });

    const partsRef = useRef<Part[]>(getInitialMissionParts());
    const keysRef = useRef<Set<string>>(new Set());
    const frameRef = useRef<number>(0);
    const completedRef = useRef(false);

    const [parts, setParts] = useState<Part[]>(() =>
        getInitialMissionParts()
    );

    const [battery, setBattery] = useState(100);
    const [speed, setSpeed] = useState(0);
    const [boost, setBoost] = useState(false);
    const [puzzleOpen, setPuzzleOpen] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
    const [assembled, setAssembled] = useState<number[]>([]);
    const [message, setMessage] = useState("SEÑAL LUNAR ESTABLECIDA");

    const [activeStory, setActiveStory] = useState<{
        title: string;
        text: string;
    } | null>(null);

    const [paused, setPaused] = useState(false);

    const collectedCount = parts.filter(
        (part) => part.collected
    ).length;

    const exitGame = useCallback(() => {
        keysRef.current.clear();
        onExit();
    }, [onExit]);

    const completePuzzle = useCallback(() => {
        if (assembled.length !== PART_NAMES.length) return;

        completeMission("lunar-rover");

        setPuzzleOpen(false);
        onComplete();
    }, [assembled, onComplete]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        if (!canvas || !ctx) return;

        let width = 0;
        let height = 0;
        let lastTime = 0;
        let animationTime = 0;
        let notificationTimer = 0;
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

        const notify = (text: string) => {
            setMessage(text);
            notificationTimer = 180;
        };

        const drawBackground = (
            cameraX: number,
            cameraY: number,
        ) => {
            ctx.fillStyle = "#171b20";
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            ctx.translate(-cameraX, -cameraY);

            for (let i = 0; i < 520; i++) {
                const x = (i * 173) % WORLD.width;
                const y = (i * 293) % WORLD.height;

                ctx.fillStyle = i % 3 === 0
                    ? "rgba(230,220,194,.10)"
                    : "rgba(5,10,15,.16)";

                ctx.beginPath();
                ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
                ctx.fill();
            }

            CRATERS.forEach((crater) => {
                ctx.fillStyle = "rgba(0,0,0,.19)";
                ctx.beginPath();
                ctx.arc(
                    crater.x + 5,
                    crater.y + 8,
                    crater.radius,
                    0,
                    Math.PI * 2,
                );
                ctx.fill();

                const gradient = ctx.createRadialGradient(
                    crater.x - crater.radius * 0.2,
                    crater.y - crater.radius * 0.25,
                    crater.radius * 0.1,
                    crater.x,
                    crater.y,
                    crater.radius,
                );

                gradient.addColorStop(0, "#55514a");
                gradient.addColorStop(0.72, "#393b3a");
                gradient.addColorStop(1, "#252a2c");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(
                    crater.x,
                    crater.y,
                    crater.radius,
                    0,
                    Math.PI * 2,
                );
                ctx.fill();

                ctx.strokeStyle = "rgba(213,201,175,.16)";
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(
                    crater.x,
                    crater.y,
                    crater.radius * 0.91,
                    Math.PI * 1.05,
                    Math.PI * 1.9,
                );
                ctx.stroke();
            });

            ROCKS.forEach((rock) => {
                ctx.save();
                ctx.translate(rock.x, rock.y);
                ctx.rotate(rock.rotation);

                ctx.fillStyle = "#171c20";
                ctx.beginPath();
                ctx.ellipse(
                    5,
                    8,
                    rock.radius * 1.1,
                    rock.radius * 0.72,
                    0,
                    0,
                    Math.PI * 2,
                );
                ctx.fill();

                ctx.fillStyle = "#77746a";
                ctx.beginPath();
                ctx.moveTo(-rock.radius, 0);
                ctx.lineTo(-rock.radius * 0.5, -rock.radius * 0.7);
                ctx.lineTo(rock.radius * 0.3, -rock.radius);
                ctx.lineTo(rock.radius, -rock.radius * 0.25);
                ctx.lineTo(rock.radius * 0.7, rock.radius * 0.65);
                ctx.lineTo(-rock.radius * 0.4, rock.radius * 0.8);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = "rgba(255,255,255,.13)";
                ctx.beginPath();
                ctx.moveTo(-rock.radius * 0.5, -rock.radius * 0.7);
                ctx.lineTo(rock.radius * 0.3, -rock.radius);
                ctx.lineTo(rock.radius * 0.12, -rock.radius * 0.25);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            });

            ctx.strokeStyle = "rgba(89,211,232,.25)";
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, WORLD.width, WORLD.height);

            ctx.restore();
        };

        const drawPart = (part: Part) => {
            if (part.collected) return;

            const pulse =
                1 + Math.sin(animationTime * 0.004 + part.id) * 0.12;

            ctx.save();
            ctx.translate(part.x, part.y);

            ctx.shadowColor = "#62eaff";
            ctx.shadowBlur = 24;

            ctx.strokeStyle = "#72edff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 23 * pulse, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = "rgba(28,190,220,.2)";
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#baf8ff";
            ctx.fillRect(-5, -5, 10, 10);

            ctx.restore();
        };

        const drawRover = (rover: Rover) => {
            ctx.save();
            ctx.translate(rover.x, rover.y);
            ctx.rotate(rover.angle);

            ctx.fillStyle = "rgba(0,0,0,.4)";
            ctx.beginPath();
            ctx.ellipse(2, 10, 34, 22, 0, 0, Math.PI * 2);
            ctx.fill();

            for (const x of [-22, 22]) {
                for (const y of [-22, 22]) {
                    ctx.fillStyle = "#101519";
                    ctx.fillRect(x - 6, y - 8, 13, 17);

                    ctx.strokeStyle = "#a9a99c";
                    ctx.lineWidth = 2;

                    for (let i = -5; i <= 5; i += 5) {
                        ctx.beginPath();
                        ctx.moveTo(x - 5, y + i);
                        ctx.lineTo(x + 6, y + i);
                        ctx.stroke();
                    }
                }
            }

            ctx.fillStyle = "#d4c69f";
            ctx.strokeStyle = "#f2e7c6";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-25, -18, 50, 36, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#454c4b";
            ctx.fillRect(-10, -13, 20, 26);

            ctx.fillStyle = "#d9a94e";
            ctx.fillRect(-5, -8, 10, 16);

            ctx.strokeStyle = "#a8efff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.lineTo(0, -34);
            ctx.stroke();

            ctx.fillStyle = "#76eaff";
            ctx.beginPath();
            ctx.arc(0, -35, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#b9f8ff";
            ctx.shadowColor = "#7cecff";
            ctx.shadowBlur = 12;
            ctx.fillRect(-17, -21, 7, 4);
            ctx.fillRect(10, -21, 7, 4);

            ctx.restore();
        };

        const drawRadar = (
            rover: Rover,
            visibleParts: Part[],
        ) => {
            const radarSize = 132;
            const x = width - radarSize - 22;
            const y = height - radarSize - 22;

            ctx.save();

            ctx.fillStyle = "rgba(4,13,20,.82)";
            ctx.strokeStyle = "rgba(104,225,244,.65)";
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.arc(
                x + radarSize / 2,
                y + radarSize / 2,
                radarSize / 2,
                0,
                Math.PI * 2,
            );
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(
                x + radarSize / 2,
                y + radarSize / 2,
                42,
                0,
                Math.PI * 2,
            );
            ctx.strokeStyle = "rgba(104,225,244,.2)";
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x + radarSize / 2, y + 8);
            ctx.lineTo(x + radarSize / 2, y + radarSize - 8);
            ctx.moveTo(x + 8, y + radarSize / 2);
            ctx.lineTo(x + radarSize - 8, y + radarSize / 2);
            ctx.stroke();

            const mapX = (px: number) =>
                x + (px / WORLD.width) * radarSize;

            const mapY = (py: number) =>
                y + (py / WORLD.height) * radarSize;

            visibleParts.forEach((part) => {
                if (part.collected) return;

                ctx.fillStyle = "#6ff0ff";
                ctx.beginPath();
                ctx.arc(mapX(part.x), mapY(part.y), 3, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "#fff";
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.arc(mapX(rover.x), mapY(rover.y), 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        };

        const draw = (_time: number) => {
            const rover = roverRef.current;
            const visibleParts = partsRef.current;

            const cameraX = Math.max(
                0,
                Math.min(
                    WORLD.width - width,
                    rover.x - width / 2,
                ),
            );

            const cameraY = Math.max(
                0,
                Math.min(
                    WORLD.height - height,
                    rover.y - height / 2,
                ),
            );

            drawBackground(cameraX, cameraY);

            ctx.save();
            ctx.translate(-cameraX, -cameraY);

            visibleParts.forEach(drawPart);
            drawRover(rover);

            const lightX =
                rover.x + Math.cos(rover.angle) * 55;

            const lightY =
                rover.y + Math.sin(rover.angle) * 55;

            const light = ctx.createRadialGradient(
                lightX,
                lightY,
                2,
                lightX,
                lightY,
                105,
            );

            light.addColorStop(0, "rgba(185,242,255,.17)");
            light.addColorStop(1, "rgba(185,242,255,0)");

            ctx.fillStyle = light;
            ctx.beginPath();
            ctx.arc(lightX, lightY, 105, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            drawRadar(rover, visibleParts);
        };

        const update = (delta: number) => {
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

            const turbo =
                keys.has(" ") && rover.battery > 1;

            const maxSpeed = turbo ? 5.2 : 3.1;

            if (forward) rover.speed += 0.12 * seconds;
            if (backward) rover.speed -= 0.10 * seconds;

            rover.speed *= Math.pow(0.965, seconds);
            rover.speed = Math.max(
                -1.8,
                Math.min(maxSpeed, rover.speed),
            );

            if (Math.abs(rover.speed) > 0.08) {
                rover.angle +=
                    (right ? 1 : 0) * 0.045 * seconds;

                rover.angle -=
                    (left ? 1 : 0) * 0.045 * seconds;
            }

            const oldX = rover.x;
            const oldY = rover.y;

            rover.x +=
                Math.cos(rover.angle) * rover.speed * seconds;

            rover.y +=
                Math.sin(rover.angle) * rover.speed * seconds;

            rover.x = Math.max(
                35,
                Math.min(WORLD.width - 35, rover.x),
            );

            rover.y = Math.max(
                35,
                Math.min(WORLD.height - 35, rover.y),
            );

            for (const rock of ROCKS) {
                const dx = rover.x - rock.x;
                const dy = rover.y - rock.y;
                const distance = Math.hypot(dx, dy);
                const minimum = rock.radius + 23;

                if (distance < minimum) {
                    rover.x = oldX;
                    rover.y = oldY;
                    rover.speed *= -0.28;

                    if (collisionCooldown <= 0) {
                        notify("¡OBSTÁCULO! RUTA BLOQUEADA");
                        collisionCooldown = 60;
                    }

                    break;
                }
            }

            const inCrater = CRATERS.some(
                (crater) =>
                    Math.hypot(
                        rover.x - crater.x,
                        rover.y - crater.y,
                    ) < crater.radius * 0.72,
            );

            if (inCrater) rover.speed *= 0.96;

            if (turbo && forward) {
                rover.battery = Math.max(
                    0,
                    rover.battery - 0.12 * seconds,
                );
            } else {
                rover.battery = Math.max(
                    0,
                    rover.battery - 0.012 * seconds,
                );
            }

            if (rover.battery <= 0) {
                rover.speed *= 0.9;
            }

            // Recolección y registro persistente de componentes.
            partsRef.current.forEach((part) => {
                if (part.collected) return;

                if (
                    Math.hypot(
                        rover.x - part.x,
                        rover.y - part.y,
                    ) < 48
                ) {
                    part.collected = true;

                    const collected = partsRef.current.filter(
                        (item) => item.collected,
                    ).length;

                    updateMissionProgress(
                        "lunar-rover",
                        collected,
                    );

                    setParts(
                        partsRef.current.map((item) => ({
                            ...item,
                        })),
                    );

                    setActiveStory(LUNAR_STORIES[part.id]);

                    notify(
                        `COMPONENTE RECUPERADO: ${part.name.toUpperCase()}`,
                    );
                }
            });

            if (notificationTimer > 0) notificationTimer--;
            if (collisionCooldown > 0) collisionCooldown--;

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
            draw(time);

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

    useEffect(() => {
        if (
            collectedCount === PART_NAMES.length &&
            !completedRef.current
        ) {
            completedRef.current = true;
            setPaused(true);
            setMessage("TODOS LOS COMPONENTES RECUPERADOS");
            setPuzzleOpen(true);
        }
    }, [collectedCount]);

    useEffect(() => {
        if (!activeStory) return;

        const timer = window.setTimeout(() => {
            setActiveStory(null);
        }, 8500);

        return () => window.clearTimeout(timer);
    }, [activeStory]);

    const handleAssembly = (slot: number) => {
        if (selectedPiece === null) return;

        if (selectedPiece === slot) {
            setAssembled((current) =>
                current.includes(slot)
                    ? current
                    : [...current, slot],
            );

            setSelectedPiece(null);
        } else {
            setMessage("ESA PIEZA NO CORRESPONDE A ESTA POSICIÓN");
            setSelectedPiece(null);
        }
    };

    const resetGame = () => {
        // Reinicia el contador de piezas de esta misión.
        updateMissionProgress("lunar-rover", 0);

        roverRef.current = {
            x: 180,
            y: 180,
            angle: 0,
            speed: 0,
            battery: 100,
        };

        partsRef.current = INITIAL_PARTS.map((part) => ({
            ...part,
            collected: false,
        }));

        completedRef.current = false;

        setParts(
            INITIAL_PARTS.map((part) => ({
                ...part,
                collected: false,
            })),
        );

        setBattery(100);
        setSpeed(0);
        setAssembled([]);
        setSelectedPiece(null);
        setPuzzleOpen(false);
        setPaused(false);
        setBoost(false);
        setMessage("NUEVA EXPEDICIÓN INICIADA");
        setActiveStory(null);
    };

    return (
        <main className="lunar-game">
            <header className="lunar-header">
                <button className="lunar-exit" onClick={exitGame}>
                    <ArrowLeft size={17} /> ABANDONAR EXPEDICIÓN
                </button>

                <div className="lunar-title">
                    <span>NASA // APOLLO PROGRAM</span>
                    <strong>LUNAR ROVING VEHICLE</strong>
                </div>

                <div className="lunar-live">
                    <i /> TRANSMISIÓN ACTIVA
                </div>
            </header>

            <section className="lunar-hud">
                <div className="lunar-stat">
                    <Battery size={18} />

                    <div>
                        <small>ENERGÍA</small>
                        <strong>{Math.ceil(battery)}%</strong>
                    </div>

                    <div className="battery-track">
                        <span style={{ width: `${battery}%` }} />
                    </div>
                </div>

                <div className="lunar-stat">
                    <Gauge size={18} />

                    <div>
                        <small>VELOCIDAD</small>
                        <strong>{Math.round(speed)} km/h</strong>
                    </div>
                </div>

                <div className="lunar-stat">
                    <Satellite size={18} />

                    <div>
                        <small>COMPONENTES</small>
                        <strong>{collectedCount}/5</strong>
                    </div>
                </div>

                <div className="lunar-progress">
                    <span>PROGRESO DE MISIÓN</span>

                    <div>
                        <i
                            style={{
                                width: `${(collectedCount / 5) * 100}%`,
                            }}
                        />
                    </div>
                </div>
            </section>

            <section className="lunar-game-area">
                <canvas
                    ref={canvasRef}
                    className="lunar-canvas"
                    aria-label="Superficie lunar. Usa WASD o las flechas para conducir el rover."
                />

                <div className="lunar-location">
                    <Map size={15} />
                    <span>REGIÓN DE EXPLORACIÓN // LUNA</span>
                </div>

                <div className="lunar-message">
                    <Radio size={15} />
                    {message}
                </div>

                {activeStory && (
                    <aside
                        className="lunar-story-transmission"
                        role="status"
                    >
                        <div className="story-transmission-header">
                            <Radio size={16} />
                            <span>TRANSMISIÓN HISTÓRICA</span>
                            <i />
                        </div>

                        <strong>{activeStory.title}</strong>

                        <p>{activeStory.text}</p>

                        <small>ARCHIVO NASA // APOLLO PROGRAM</small>
                    </aside>
                )}

                {boost && (
                    <div className="lunar-boost-indicator">
                        <Zap size={15} /> IMPULSO ACTIVADO
                    </div>
                )}

                <div className="lunar-controls-hint">
                    <span>W A S D / FLECHAS</span>
                    <small>MOVER Y GIRAR</small>
                    <span>ESPACIO</span>
                    <small>IMPULSO</small>
                </div>
            </section>

            <footer className="lunar-footer">
                <div className="lunar-objective">
                    <Compass size={19} />

                    <div>
                        <small>OBJETIVO ACTUAL</small>
                        <strong>
                            Localiza y recupera los cinco componentes virtuales
                        </strong>
                    </div>
                </div>

                <button
                    className="lunar-reset"
                    onClick={resetGame}
                    title="Reiniciar expedición"
                >
                    <RotateCcw size={16} /> REINICIAR
                </button>
            </footer>

            <div className="lunar-touch-controls">
                <button
                    onPointerDown={() => keysRef.current.add("arrowup")}
                    onPointerUp={() => keysRef.current.delete("arrowup")}
                    onPointerLeave={() => keysRef.current.delete("arrowup")}
                >
                    ▲
                </button>

                <div>
                    <button
                        onPointerDown={() => keysRef.current.add("arrowleft")}
                        onPointerUp={() => keysRef.current.delete("arrowleft")}
                        onPointerLeave={() => keysRef.current.delete("arrowleft")}
                    >
                        ◀
                    </button>

                    <button
                        onPointerDown={() => keysRef.current.add("arrowdown")}
                        onPointerUp={() => keysRef.current.delete("arrowdown")}
                        onPointerLeave={() => keysRef.current.delete("arrowdown")}
                    >
                        ▼
                    </button>

                    <button
                        onPointerDown={() => keysRef.current.add("arrowright")}
                        onPointerUp={() => keysRef.current.delete("arrowright")}
                        onPointerLeave={() => keysRef.current.delete("arrowright")}
                    >
                        ▶
                    </button>
                </div>

                <button
                    className="touch-boost"
                    onPointerDown={() => keysRef.current.add(" ")}
                    onPointerUp={() => keysRef.current.delete(" ")}
                    onPointerLeave={() => keysRef.current.delete(" ")}
                >
                    <Zap size={18} />
                </button>
            </div>

            {puzzleOpen && (
                <div className="lunar-puzzle-backdrop">
                    <section className="lunar-puzzle">
                        <div className="puzzle-kicker">
                            <Satellite size={17} />
                            FASE FINAL // RECONSTRUCCIÓN
                        </div>

                        <h2>RECONSTRUYE EL LEGADO</h2>

                        <p>
                            Has recuperado los cinco componentes de la expedición.
                            Selecciona cada pieza y colócala en su posición correspondiente.
                        </p>

                        <div className="puzzle-board">
                            {PART_NAMES.map((name, index) => (
                                <button
                                    key={name}
                                    className={`puzzle-slot ${
                                        assembled.includes(index)
                                            ? "assembled"
                                            : ""
                                    } ${
                                        selectedPiece === index
                                            ? "selected"
                                            : ""
                                    }`}
                                    onClick={() => handleAssembly(index)}
                                >
                                    {assembled.includes(index) ? (
                                        <Check size={22} />
                                    ) : (
                                        <span>
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                    )}

                                    <small>{name}</small>
                                </button>
                            ))}
                        </div>

                        <div className="puzzle-pieces">
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
                                    <Satellite size={20} />
                                    PIEZA {index + 1}
                                </button>
                            ))}
                        </div>

                        <div className="puzzle-progress">
                            <span>
                                {assembled.length} / 5 PIEZAS ENSAMBLADAS
                            </span>

                            <div>
                                <i
                                    style={{
                                        width: `${(assembled.length / 5) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            className="puzzle-finish"
                            disabled={assembled.length !== 5}
                            onClick={completePuzzle}
                        >
                            FINALIZAR RECONSTRUCCIÓN <Check size={18} />
                        </button>
                    </section>
                </div>
            )}
        </main>
    );
}

export default LunarRoverGame;
