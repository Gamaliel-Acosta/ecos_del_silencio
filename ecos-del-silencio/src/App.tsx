
import "./styles/global.css";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  Crosshair,
  Globe,
  LockKeyhole,
  MapPin,
  Moon,
  Radio,
  Radar,
  Satellite,
  Search,
  Signal,
} from "lucide-react";

import { artifacts, type Artifact } from "./data/artifacts";
import LunarRoverGame from "./games/lunar-rover/LunarRoverGame";
import OpportunityGame from "./games/opportunity/OpportunityGame";
import Pioneer10Game from "./games/pioneer-10/Pioneer10Game";

import { audioService } from "./services/audio.service";
import { resetMissionProgress } from "./services/progress.service";

type Sector = "all" | "moon" | "mars" | "deep-space";
type Screen = "terminal" | "radar" | "mission" | "game";

const sectorNames: Record<Sector, string> = {
  all: "Todos los sectores",
  moon: "Sector lunar",
  mars: "Sector Marte",
  "deep-space": "Espacio profundo",
};

const artifactPositions: Record<string, { x: number; y: number }> = {
  "lunar-module": { x: 17, y: 25 },
  "lunar-rover": { x: 29, y: 39 },
  alsep: { x: 17, y: 55 },
  surveyor: { x: 30, y: 70 },

  sojourner: { x: 44, y: 19 },
  opportunity: { x: 54, y: 32 },
  spirit: { x: 46, y: 47 },
  viking: { x: 64, y: 56 },
  "phoenix-insight": { x: 53, y: 73 },
  ingenuity: { x: 70, y: 25 },

  dawn: { x: 78, y: 42 },
  "near-shoemaker": { x: 84, y: 61 },
  "pioneer-10": { x: 91, y: 23 },
  kepler: { x: 90, y: 78 },
};

function App() {
  const [screen, setScreen] = useState<Screen>("terminal");
  const [sector, setSector] = useState<Sector>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Artifact | null>(null);
  const [expeditionStarted, setExpeditionStarted] = useState(false);

  // ========================================
  // SISTEMA DE AUDIO
  // ========================================

  useEffect(() => {
    const track =
      screen === "terminal"
        ? "home"
        : screen === "radar"
          ? "radar"
          : "mission";

    void audioService.setMusic(track);
  }, [screen]);

  useEffect(() => {
    const unlockAudio = () => {
      void audioService.unlock();
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);

      audioService.stopAll();
    };
  }, []);

  // ========================================
  // FILTRADO DE RELIQUIAS
  // ========================================

  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((artifact) => {
      const matchesSector =
        sector === "all" || artifact.sector === sector;

      const normalizedSearch = search.toLowerCase().trim();

      const matchesSearch =
        artifact.name.toLowerCase().includes(normalizedSearch) ||
        artifact.location.toLowerCase().includes(normalizedSearch);

      return matchesSector && matchesSearch;
    });
  }, [sector, search]);

  // ========================================
  // NAVEGACIÓN
  // ========================================

  const openMission = (artifact: Artifact) => {
    setSelected(artifact);

    // Cada vez que se abre un expediente se inicia
    // una nueva sesión de consulta o expedición.
    setExpeditionStarted(false);

    setScreen("mission");
  };

  const startExpedition = () => {
    if (!selected) return;

    if (
      selected.id === "lunar-rover" ||
      selected.id === "opportunity" ||
      selected.id === "pioneer-10"
    ) {
      // Garantiza que una partida nueva comience
      // con la memoria de la misión reiniciada.
      resetMissionProgress(selected.id);

      setScreen("game");
      return;
    }

    setExpeditionStarted(true);
  };

  const returnToRadar = () => {
    setScreen("radar");
    setSelected(null);
    setExpeditionStarted(false);
  };

  const returnToTerminal = () => {
    setScreen("terminal");
    setSelected(null);
    setExpeditionStarted(false);
  };

  // ========================================
  // FINALIZACIÓN DE EXPEDICIÓN
  // ========================================

  const handleMissionComplete = () => {
    setExpeditionStarted(true);
    setScreen("mission");
  };

  // ========================================
  // PANTALLA 1: TERMINAL DE ACCESO
  // ========================================

  if (screen === "terminal") {
    return (
      <main className="terminal">
        <div className="terminal-header">
          <span>
            <Signal size={16} /> SISTEMA DE ARCHIVO
          </span>
          <span>YEAR 2050 // SYSTEM ONLINE</span>
        </div>

        <section className="terminal-content">
          <div className="terminal-radar">
            <div className="terminal-radar-circle">
              <div className="terminal-radar-sweep" />
              <Radar size={72} strokeWidth={1} />
            </div>
          </div>

          <p className="system-label">
            <Radio size={15} /> TRANSMISIÓN ENTRANTE
          </p>

          <h1>ECOS DEL SILENCIO</h1>
          <h2>ARCHIVO DE RELIQUIAS DEL SISTEMA SOLAR</h2>

          <p className="description">
            Se han detectado señales de objetos espaciales que permanecen
            dispersos por el Sistema Solar. Sus historias todavía esperan
            ser descubiertas.
          </p>

          <button
            className="start-button"
            onClick={() => setScreen("radar")}
          >
            INICIAR ESCANEO <ChevronRight size={18} />
          </button>

          <p className="footer-message">
            ARCHIVO CENTRAL // ACCESO AUTORIZADO
          </p>
        </section>
      </main>
    );
  }

  // ========================================
  // PANTALLA 2: MINIJUEGOS
  // ========================================

  if (screen === "game" && selected?.id === "lunar-rover") {
    return (
      <LunarRoverGame
        onExit={() => setScreen("mission")}
        onComplete={handleMissionComplete}
      />
    );
  }

  if (screen === "game" && selected?.id === "opportunity") {
    return (
      <OpportunityGame
        onExit={() => setScreen("mission")}
        onComplete={handleMissionComplete}
      />
    );
  }

  if (screen === "game" && selected?.id === "pioneer-10") {
    return (
      <Pioneer10Game
        onExit={() => setScreen("mission")}
        onComplete={handleMissionComplete}
      />
    );
  }

  // ========================================
  // PANTALLA 3: EXPEDIENTE DE MISIÓN
  // ========================================

  if (screen === "mission" && selected) {
    const hasMinigame =
      selected.id === "lunar-rover" ||
      selected.id === "opportunity" ||
      selected.id === "pioneer-10";

    const isPioneer = selected.id === "pioneer-10";

    return (
      <main className="mission-page">
        <header className="mission-topbar">
          <button
            className="mission-back"
            onClick={returnToRadar}
          >
            <ArrowLeft size={18} />
            VOLVER AL RADAR
          </button>

          <div className="mission-system-status">
            <span className="status-dot" />
            ARCHIVO CONECTADO
          </div>
        </header>

        <section className="mission-container">
          <div className="mission-heading">
            <p className="eyebrow">
              <Satellite size={15} />
              EXPEDIENTE DE EXPLORACIÓN
            </p>

            <h1>{selected.name}</h1>

            <p>
              PREPARACIÓN DE EXPEDICIÓN // ARCHIVO CENTRAL 2050
            </p>
          </div>

          <div className="mission-content">
            <section className="mission-main-card">
              <div
                className={`mission-artifact-visual sector-${selected.sector}`}
              >
                <Radar size={90} strokeWidth={1} />
                <span className="mission-signal-ring" />
                <small>SEÑAL IDENTIFICADA</small>
              </div>

              <div className="mission-description">
                <p className="eyebrow">
                  ANTECEDENTES DE LA MISIÓN
                </p>

                <h2>Una historia que merece ser recordada</h2>

                <p>{selected.description}</p>

                <div className="mission-objective">
                  <p className="eyebrow">
                    OBJETIVO ORIGINAL
                  </p>
                  <p>{selected.objective}</p>
                </div>
              </div>
            </section>

            <aside className="mission-info-card">
              <p className="eyebrow">
                DATOS DE LA RELIQUIA
              </p>

              <div className="mission-info-item">
                <small>SECTOR</small>
                <strong>{sectorNames[selected.sector]}</strong>
              </div>

              <div className="mission-info-item">
                <small>AÑO DE LANZAMIENTO</small>
                <strong>{selected.year}</strong>
              </div>

              <div className="mission-info-item">
                <small>UBICACIÓN</small>
                <strong>{selected.location}</strong>
              </div>

              <div className="mission-info-item">
                <small>ESTADO REGISTRADO</small>
                <strong>{selected.status}</strong>
              </div>

              <div className="mission-game-info">
                <Satellite size={21} />
                <div>
                  <small>TIPO DE EXPEDICIÓN</small>
                  <strong>{selected.minigame}</strong>
                </div>
              </div>
            </aside>
          </div>

          <section className="mission-launch">
            {!expeditionStarted ? (
              <>
                <div>
                  <p className="eyebrow">SIGUIENTE FASE</p>

                  <h2>
                    {hasMinigame
                      ? "¿Preparado para iniciar esta expedición?"
                      : "Expediente histórico disponible"}
                  </h2>

                  <p>
                    {isPioneer
                      ? "Pilota una nave a través de una representación arcade del cinturón de asteroides y revive los principales acontecimientos de Pioneer 10."
                      : hasMinigame
                        ? "Revive parte de su recorrido, supera los desafíos de la misión y recolecta componentes para reconstruirla."
                        : "Puedes consultar los antecedentes, el objetivo y el estado histórico de esta reliquia. Su minijuego todavía no está disponible."}
                  </p>
                </div>

                <button
                  className="mission-start-button"
                  onClick={startExpedition}
                >
                  {hasMinigame
                    ? "INICIAR EXPEDICIÓN"
                    : "CONSULTAR EXPEDIENTE"}
                  <ChevronRight size={19} />
                </button>
              </>
            ) : (
              <div className="expedition-ready">
                <Radio size={28} />

                <div>
                  <h2>
                    {isPioneer
                      ? "Travesía orbital completada"
                      : hasMinigame
                        ? "Expedición completada"
                        : "Expediente consultado"}
                  </h2>

                  <p>
                    {isPioneer
                      ? "Has completado la travesía orbital y recuperado el expediente histórico de Pioneer 10."
                      : hasMinigame
                        ? `Has recuperado los componentes virtuales y completado la reconstrucción de ${selected.name}. La expedición ha finalizado correctamente.`
                        : `Has consultado el expediente histórico de ${selected.name}. Su minijuego estará disponible en una futura actualización.`}
                  </p>
                </div>

                <button
                  className="mission-start-button"
                  onClick={returnToRadar}
                >
                  VOLVER AL RADAR
                </button>
              </div>
            )}
          </section>
        </section>
      </main>
    );
  }

  // ========================================
  // PANTALLA 4: RADAR DEL SISTEMA SOLAR
  // ========================================

  return (
    <main className="radar-page">
      <header className="topbar">
        <button className="brand" onClick={returnToTerminal}>
          <div className="brand-icon">
            <Radio size={21} />
          </div>

          <span>
            <strong>ECOS DEL SILENCIO</strong>
            <small>ARCHIVO CENTRAL // 2050</small>
          </span>
        </button>

        <div className="system-status">
          <span className="status-dot" />
          SISTEMA OPERATIVO
          <span className="topbar-divider" />
          <Signal size={16} />
          SEÑAL ESTABLE
        </div>
      </header>

      <section className="radar-layout">
        <div className="radar-heading">
          <div>
            <p className="eyebrow">
              <Crosshair size={15} /> SISTEMA DE DETECCIÓN
            </p>

            <h1>Radar del Sistema Solar</h1>

            <p className="section-description">
              Localiza las reliquias, consulta sus expedientes y descubre
              las misiones que marcaron la historia de la exploración espacial.
            </p>
          </div>

          <div className="signal-counter">
            <span>SEÑALES DETECTADAS</span>
            <strong>
              {filteredArtifacts.length.toString().padStart(2, "0")}
            </strong>
            <small>SEÑALES VISIBLES</small>
          </div>
        </div>

        <div className="radar-workspace">
          <section className="solar-map">
            <div className="map-topline">
              <span>
                <Radar size={16} /> MAPA DE SEÑALES
              </span>
              <span>
                ESCANEO ACTIVO <i />
              </span>
            </div>

            <div className={`solar-visual sector-view-${sector}`}>
              <div className="sector-zones" aria-hidden="true">
                <div className="zone zone-moon">
                  <span>SECTOR LUNAR</span>
                  <small>ÓRBITA TERRESTRE</small>
                </div>

                <div className="zone zone-mars">
                  <span>SECTOR MARTE</span>
                  <small>EXPLORACIÓN MARCIANA</small>
                </div>

                <div className="zone zone-deep">
                  <span>ESPACIO PROFUNDO</span>
                  <small>ASTEROIDES Y ÓRBITAS</small>
                </div>
              </div>

              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="orbit orbit-three" />
              <div className="orbit orbit-four" />

              <div className="sun">
                <div className="sun-core" />
              </div>

              <div className="planet planet-earth" title="Tierra">
                <div />
              </div>

              <div className="planet planet-mars" title="Marte">
                <div />
              </div>

              <div className="planet planet-jupiter" title="Júpiter">
                <div />
              </div>

              <div className="radar-beam" />

              <div className="map-label label-sun">SOL</div>
              <div className="map-label label-earth">TIERRA</div>
              <div className="map-label label-mars">MARTE</div>
              <div className="map-label label-jupiter">JÚPITER</div>

              {filteredArtifacts.map((artifact) => {
                const position = artifactPositions[artifact.id];
                if (!position) return null;

                return (
                  <button
                    key={artifact.id}
                    type="button"
                    className={`signal-point signal-${artifact.sector}`}
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                    }}
                    onClick={() => openMission(artifact)}
                    title={artifact.name}
                    aria-label={`Consultar expediente de ${artifact.name}`}
                  >
                    <span />
                    <small>{artifact.name}</small>
                  </button>
                );
              })}

              <div className="map-coordinates">
                SECTOR: {sectorNames[sector].toUpperCase()}
                <br />
                {filteredArtifacts.length} RELIQUIAS DETECTADAS
                <br />
                MAPA ESQUEMÁTICO // 2050
              </div>
            </div>

            <div className="map-legend">
              <span>
                <i className="legend-active" /> SEÑAL DETECTADA
              </span>
              <span>
                <i className="legend-orbit" /> TRAYECTORIA ORBITAL
              </span>
              <span>
                <i className="legend-planet" /> CUERPO CELESTE
              </span>
            </div>
          </section>

          <aside className="sector-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">NAVEGACIÓN</p>
                <h2>Sectores</h2>
              </div>
              <Globe size={22} />
            </div>

            <button
              className={`sector-option ${sector === "all" ? "active" : ""}`}
              onClick={() => setSector("all")}
            >
              <div className="sector-icon">
                <Globe size={19} />
              </div>
              <span>
                <strong>Todos</strong>
                <small>Sistema solar completo</small>
              </span>
              <b>{artifacts.length}</b>
            </button>

            <button
              className={`sector-option ${sector === "moon" ? "active" : ""}`}
              onClick={() => setSector("moon")}
            >
              <div className="sector-icon">
                <Moon size={19} />
              </div>
              <span>
                <strong>La Luna</strong>
                <small>Exploración lunar</small>
              </span>
              <b>{artifacts.filter((a) => a.sector === "moon").length}</b>
            </button>

            <button
              className={`sector-option ${sector === "mars" ? "active" : ""}`}
              onClick={() => setSector("mars")}
            >
              <div className="sector-icon">
                <Activity size={19} />
              </div>
              <span>
                <strong>Marte</strong>
                <small>Misiones marcianas</small>
              </span>
              <b>{artifacts.filter((a) => a.sector === "mars").length}</b>
            </button>

            <button
              className={`sector-option ${
                sector === "deep-space" ? "active" : ""
              }`}
              onClick={() => setSector("deep-space")}
            >
              <div className="sector-icon">
                <Satellite size={19} />
              </div>
              <span>
                <strong>Espacio profundo</strong>
                <small>Órbitas y asteroides</small>
              </span>
              <b>
                {artifacts.filter((a) => a.sector === "deep-space").length}
              </b>
            </button>

            <div className="panel-note">
              <LockKeyhole size={15} />
              <span>
                Los expedientes se desbloquean al completar cada expedición.
              </span>
            </div>
          </aside>
        </div>

        <section className="artifacts-section">
          <div className="artifacts-heading">
            <div>
              <p className="eyebrow">
                BASE DE DATOS // ARCHIVO HISTÓRICO
              </p>
              <h2>{sectorNames[sector]}</h2>
            </div>

            <label className="search-box">
              <Search size={17} />
              <input
                type="text"
                placeholder="Buscar reliquia..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="artifact-grid">
            {filteredArtifacts.map((artifact) => (
              <button
                className="artifact-card"
                key={artifact.id}
                onClick={() => openMission(artifact)}
              >
                <div className="artifact-card-top">
                  <span className="artifact-type">
                    {artifact.sector === "moon"
                      ? "LUNAR"
                      : artifact.sector === "mars"
                        ? "MARCIANO"
                        : "ESPACIO PROFUNDO"}
                  </span>
                  <Satellite size={19} />
                </div>

                <h3>{artifact.name}</h3>

                <p className="artifact-location">
                  <MapPin size={13} /> {artifact.location}
                </p>

                <div className="artifact-card-bottom">
                  <span>INICIO: {artifact.year}</span>
                  <span>
                    VER EXPEDIENTE <ChevronRight size={14} />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredArtifacts.length === 0 && (
            <div className="empty-results">
              No se encontraron reliquias con esos criterios.
            </div>
          )}
        </section>

        <footer className="radar-footer">
          <span>ECOS DEL SILENCIO © 2050</span>
          <span>ARCHIVO DE EXPLORACIÓN ESPACIAL</span>
          <span>
            CONEXIÓN ESTABLE <i />
          </span>
        </footer>
      </section>
    </main>
  );
}

export default App;
