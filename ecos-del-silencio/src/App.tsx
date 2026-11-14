
import { Radio, Radar, Signal } from "lucide-react";
import "./styles/global.css";

function App() {
  return (
    <main className="terminal">
      <div className="terminal-header">
        <span><Signal size={16} /> SISTEMA DE ARCHIVO</span>
        <span>YEAR 2050 // SYSTEM ONLINE</span>
      </div>

      <section className="terminal-content">
        <div className="radar">
          <div className="radar-circle">
            <div className="radar-sweep" />
            <Radar size={65} strokeWidth={1} />
          </div>
        </div>

        <p className="system-label">
          <Radio size={15} /> TRANSMISIÓN ENTRANTE
        </p>

        <h1>ECOS DEL SILENCIO</h1>

        <h2>ARCHIVO DE RELIQUIAS DEL SISTEMA SOLAR</h2>

        <p className="description">
          Se han detectado señales de objetos espaciales
          que permanecen dispersos por el Sistema Solar.
          Su historia todavía espera ser descubierta.
        </p>

        <button
          className="start-button"
          onClick={() => alert("Iniciando escaneo...")}
        >
          INICIAR ESCANEO
        </button>

        <p className="footer-message">
          ARCHIVO CENTRAL // ACCESO AUTORIZADO
        </p>
      </section>
    </main>
  );
}

export default App;
