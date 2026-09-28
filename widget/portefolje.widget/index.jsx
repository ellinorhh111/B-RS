// Porteføljewidget for Übersicht.
// Leser data.json som Python-skriptet (fetcher) skriver. Widgeten henter
// aldri data fra nett selv – den viser bare det som ligger i cachen.
import { css } from "uebersicht";

// Prosjektmappen. Endre her hvis du har lagt koden et annet sted.
const ROOT = "$HOME/portefolje-widget";

export const command = `cat "${ROOT}/data/data.json" 2>/dev/null || echo '{"mangler": true}'`;
export const refreshFrequency = 60 * 1000; // leser filen hvert minutt (billig)

const POS_KEY = "portefolje-widget-pos";
const loadPos = () => {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY));
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  } catch (e) {}
  return { x: 40, y: 60 };
};

export const initialState = { data: null, parseError: null, pos: loadPos() };

export const updateState = (event, prev) => {
  switch (event.type) {
    case "UB/COMMAND_RAN": {
      if (event.error) return { ...prev, parseError: String(event.error) };
      try {
        return { ...prev, data: JSON.parse(event.output), parseError: null };
      } catch (e) {
        return { ...prev, parseError: "Kunne ikke lese data.json" };
      }
    }
    case "MOVE":
      return { ...prev, pos: event.pos };
    case "MOVE_END":
      try { localStorage.setItem(POS_KEY, JSON.stringify(prev.pos)); } catch (e) {}
      return prev;
    default:
      return prev;
  }
};

// ---------- formatering (norsk) ----------
const nf = (d) => new Intl.NumberFormat("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtNum = (v, d = 2) => (v === null || v === undefined ? "–" : nf(d).format(v));
const fmtPct = (v, d = 1) =>
  v === null || v === undefined ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + nf(d).format(Math.abs(v)) + " %";
const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleString("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }) : "–";
const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("nb-NO", {
        timeZone: "Europe/Oslo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    : "–";
const changeClass = (v) => (v === null || v === undefined ? "" : v > 0 ? "up" : v < 0 ? "down" : "");

// ---------- dra for å flytte ----------
const startDrag = (e, dispatch, pos) => {
  if (e.button !== 0) return;
  e.preventDefault();
  const dx = e.clientX - pos.x;
  const dy = e.clientY - pos.y;
  const move = (ev) =>
    dispatch({ type: "MOVE", pos: { x: Math.max(0, ev.clientX - dx), y: Math.max(0, ev.clientY - dy) } });
  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    dispatch({ type: "MOVE_END" });
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
};

// ---------- stil ----------
export const className = `
  top: 0; left: 0;
  font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
`;

const box = css`
  position: absolute;
  width: 420px;
  color: #e4e4e6;
  background: rgba(22, 22, 24, 0.86);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  font-size: 13px;
  line-height: 1.35;
  overflow: hidden;
  .head { display: flex; justify-content: space-between; align-items: baseline;
          padding: 9px 12px 7px; cursor: grab; user-select: none;
          border-bottom: 1px solid rgba(255,255,255,0.06); }
  .head:active { cursor: grabbing; }
  .title { font-weight: 600; font-size: 13px; letter-spacing: 0.2px; }
  .muted { color: #8e8e93; }
  .small { font-size: 11px; }
  .banner { padding: 6px 12px; font-size: 12px; background: rgba(235, 87, 87, 0.18); color: #ffb3b3; }
  .warn { padding: 5px 12px; font-size: 11px; color: #e2c35d; background: rgba(226, 195, 93, 0.08); }
  table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
  th { text-align: right; font-weight: 500; font-size: 11px; color: #8e8e93; padding: 6px 12px 3px; }
  th:first-child, td:first-child { text-align: left; }
  td { text-align: right; padding: 5px 12px; border-top: 1px solid rgba(255,255,255,0.04); }
  .name { font-weight: 500; }
  .tick { font-size: 11px; color: #8e8e93; margin-left: 5px; }
  .up { color: #7bc88f; }
  .down { color: #e88a8a; }
  .foot { padding: 6px 12px 8px; font-size: 11px; color: #8e8e93; }
`;

// ---------- visning ----------
const SourceWarnings = ({ kilder }) => {
  const bad = (kilder || []).filter((k) => !k.ok);
  if (!bad.length) return null;
  return (
    <div className="warn">
      {bad.map((k) => (
        <div key={k.navn}>
          ⚠ {k.label} feilet ({fmtDateTime(k.sist_forsok)}): {k.feil || "ukjent feil"}
          {k.sist_ok ? ` – viser data fra ${fmtDateTime(k.sist_ok)}` : ""}
        </div>
      ))}
    </div>
  );
};

const Companies = ({ selskaper }) => (
  <table>
    <thead>
      <tr>
        <th>Selskap</th>
        <th>Kurs</th>
        <th>I dag</th>
      </tr>
    </thead>
    <tbody>
      {selskaper.map((c) => (
        <tr key={c.ticker}>
          <td>
            <span className="name">{c.navn}</span>
            <span className="tick">{c.ticker.split(".")[0]}</span>
          </td>
          <td>
            {fmtNum(c.kurs)} <span className="muted small">{c.valuta || ""}</span>
          </td>
          <td className={changeClass(c.endring_pct)}>{fmtPct(c.endring_pct)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const render = (state, dispatch) => {
  const { data, parseError, pos } = state;
  const style = { left: pos.x + "px", top: pos.y + "px" };
  const head = (
    <div className="head" onMouseDown={(e) => startDrag(e, dispatch, pos)}>
      <span className="title">Portefølje</span>
      <span className="muted small">{data && data.siste_henting ? `oppdatert ${fmtTime(data.siste_henting)}` : ""}</span>
    </div>
  );

  if (parseError || !data || data.mangler) {
    return (
      <div className={box} style={style}>
        {head}
        <div className="banner">
          {parseError || "Ingen data ennå. Kjør: cd ~/portefolje-widget && .venv/bin/python -m fetcher run --force"}
        </div>
      </div>
    );
  }

  const stale = data.utdatert_etter && Date.now() > new Date(data.utdatert_etter).getTime();
  return (
    <div className={box} style={style}>
      {head}
      {stale && (
        <div className="banner">
          Data er utdatert – siste henting {fmtDateTime(data.siste_henting)}. Sjekk data/logs/fetcher.log.
        </div>
      )}
      <SourceWarnings kilder={data.kilder} />
      <Companies selskaper={data.selskaper || []} />
      <div className="foot">
        Kurser fra Yahoo Finance (ca. 15 min forsinket) · {data.apningstid ? "børsen er åpen" : "børsen er stengt"}
      </div>
    </div>
  );
};
