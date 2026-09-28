// Porteføljewidget for Übersicht.
// Leser data.json som Python-skriptet (fetcher) skriver. Widgeten henter
// aldri data fra nett selv – den viser bare det som ligger i cachen.
// Eneste skriving: skjemaet «+ Legg til kursmål», som kaller
// `python -m fetcher add-target` (Python validerer og skriver til CSV-filen).
import { css, run } from "uebersicht";

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

export const initialState = {
  data: null, parseError: null, pos: loadPos(),
  selected: null, // ticker som er åpnet i utvidet visning
  showHistory: false,
  form: null, // { busy, ok, msg }
};

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
    case "SELECT":
      return { ...prev, selected: prev.selected === event.ticker ? null : event.ticker, form: null, showHistory: false };
    case "TOGGLE_HISTORY":
      return { ...prev, showHistory: !prev.showHistory };
    case "FORM":
      return { ...prev, form: event.status };
    default:
      return prev;
  }
};

// ---------- formatering (norsk) ----------
const nf = (d) => new Intl.NumberFormat("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d });
const isNum = (v) => typeof v === "number" && isFinite(v);
const fmtNum = (v, d = 2) => (isNum(v) ? nf(d).format(v) : "–");
const fmtPct = (v, d = 1) =>
  isNum(v) ? (v > 0 ? "+" : v < 0 ? "−" : "") + nf(d).format(Math.abs(v)) + " %" : "–";
const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleString("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }) : "–";
const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("nb-NO", {
        timeZone: "Europe/Oslo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })
    : "–";
const fmtDate = (iso) => (iso ? iso.split("-").reverse().join(".") : "–");
const changeClass = (v) => (!isNum(v) ? "" : v > 0 ? "up" : v < 0 ? "down" : "");
const todayOslo = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" }); // YYYY-MM-DD
const get = (o, ...keys) => keys.reduce((a, k) => (a === null || a === undefined ? a : a[k]), o);

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

// ---------- skjema: nytt kursmål ----------
const refresh = (dispatch) =>
  run(command).then((output) => dispatch({ type: "UB/COMMAND_RAN", output }));

const submitTarget = (e, ticker, dispatch) => {
  e.preventDefault();
  const form = e.currentTarget;
  const f = form.elements;
  const payload = {
    ticker,
    dato: f.dato.value,
    meglerhus: f.meglerhus.value,
    kursmal: f.kursmal.value,
    anbefaling: f.anbefaling.value,
    forrige_kursmal: f.forrige.value,
    notat: f.notat.value,
  };
  // Base64 gjør at ingen tegn i skjemaet kan tolkes av shell (sikkert mot ' ; $ osv.).
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  dispatch({ type: "FORM", status: { busy: true, msg: "Lagrer …" } });
  run(`cd "${ROOT}" && .venv/bin/python -m fetcher add-target '${b64}' 2>/dev/null`)
    .then((out) => {
      let r;
      try {
        r = JSON.parse(String(out).trim().split("\n").pop());
      } catch (err) {
        r = { ok: false, feil: "Uventet svar fra Python: " + String(out).slice(0, 200) };
      }
      dispatch({ type: "FORM", status: { ok: r.ok, msg: r.ok ? r.melding : r.feil } });
      if (r.ok) {
        form.reset();
        f.dato.value = todayOslo();
        refresh(dispatch);
      }
    })
    .catch((err) => dispatch({ type: "FORM", status: { ok: false, msg: String(err) } }));
};

// ---------- stil ----------
export const className = `
  top: 0; left: 0;
  font-family: -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
`;

const box = css`
  position: absolute;
  width: 540px;
  color: #e4e4e6;
  background: rgba(22, 22, 24, 0.88);
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
  th { text-align: right; font-weight: 500; font-size: 11px; color: #8e8e93; padding: 6px 8px 3px; white-space: nowrap; }
  th:first-child, td:first-child { text-align: left; padding-left: 12px; }
  th:last-child, td:last-child { padding-right: 12px; }
  td { text-align: right; padding: 5px 8px; border-top: 1px solid rgba(255,255,255,0.04); white-space: nowrap; }
  tr.row { cursor: pointer; }
  tr.row:hover td { background: rgba(255,255,255,0.03); }
  tr.sel td { background: rgba(255,255,255,0.06); }
  .name { font-weight: 500; }
  .up { color: #7bc88f; }
  .down { color: #e88a8a; }
  .pill { display: inline-block; min-width: 50px; padding: 1px 6px; border-radius: 5px; text-align: right; }
  .gronn { color: #8fd6a2; background: rgba(111, 207, 151, 0.12); }
  .gul { color: #e6cb74; background: rgba(226, 195, 93, 0.12); }
  .rod { color: #f0a0a0; background: rgba(235, 122, 122, 0.13); }
  .foot { padding: 6px 12px 8px; font-size: 11px; color: #8e8e93; }
  .detail { border-top: 1px solid rgba(255,255,255,0.08); padding: 10px 12px 12px; background: rgba(255,255,255,0.015); }
  .dhead { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
  .dhead .name { font-size: 14px; }
  .x { cursor: pointer; color: #8e8e93; padding: 0 4px; }
  .x:hover { color: #e4e4e6; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
  .card { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 7px 9px; }
  .card .lbl { font-size: 11px; color: #8e8e93; margin-bottom: 2px; }
  .card .big { font-size: 15px; font-weight: 500; font-variant-numeric: tabular-nums; }
  .card .sub { font-size: 11px; color: #8e8e93; margin-top: 2px; }
  .sect { font-size: 11px; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.5px; margin: 10px 0 4px; }
  .detail table td, .detail table th { padding-left: 6px; padding-right: 6px; }
  .detail table td:first-child, .detail table th:first-child { padding-left: 0; }
  .detail table td:last-child, .detail table th:last-child { padding-right: 0; }
  .old { color: #e2c35d; }
  .link { color: #8ab4f8; cursor: pointer; font-size: 11px; }
  .empty { color: #8e8e93; font-size: 12px; padding: 4px 0; }
  form { display: grid; grid-template-columns: 110px 1fr 90px 90px; gap: 6px; margin-top: 4px; }
  input, select { font: inherit; font-size: 12px; color: #e4e4e6; background: rgba(255,255,255,0.06);
                  border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 4px 6px; min-width: 0; }
  input:focus, select:focus { outline: none; border-color: rgba(138,180,248,0.6); }
  button { font: inherit; font-size: 12px; color: #16161a; background: #d9d9de; border: 0; border-radius: 6px;
           padding: 4px 10px; cursor: pointer; }
  button:disabled { opacity: 0.5; cursor: default; }
  .fmsg { font-size: 12px; margin-top: 6px; }
  .fmsg.ok { color: #8fd6a2; }
  .fmsg.err { color: #f0a0a0; }
`;

// ---------- byggeklosser ----------
const Upside = ({ u, title }) =>
  u && isNum(u.oppside_pct) ? (
    <span className={"pill " + (u.farge || "")} title={title}>{fmtPct(u.oppside_pct)}</span>
  ) : (
    <span className="muted" title={title}>–</span>
  );

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

const consTitle = (c) => {
  const k = c.konsensus;
  if (!k) return "Ingen Yahoo-konsensus for denne aksjen";
  return `Yahoo-konsensus ${fmtNum(k.snitt)} ${c.valuta || ""} (${k.antall || "?"} analytikere)`;
};
const megTitle = (c) => {
  const m = c.megler;
  if (!m || !m.antall) return "Ingen meglerkursmål registrert – klikk for å legge til";
  return `Meglersnitt ${fmtNum(m.snitt)} ${c.valuta || ""} (${m.antall} meglerhus, ${m.antall_ferske} ferske)`;
};
const ownTitle = (c) =>
  c.mitt && isNum(c.mitt.kursmal) ? `Mitt kursmål ${fmtNum(c.mitt.kursmal)} ${c.valuta || ""}` : "Mitt kursmål er ikke satt (portfolio.csv)";

const Companies = ({ selskaper, selected, dispatch }) => (
  <table>
    <thead>
      <tr>
        <th>Selskap</th>
        <th>Kurs</th>
        <th>I dag</th>
        <th title="Oppside mot Yahoo-konsensus">Konsensus</th>
        <th title="Oppside mot snittet av dine meglerkursmål">Meglersnitt</th>
        <th title="Oppside mot ditt eget kursmål">Mitt</th>
      </tr>
    </thead>
    <tbody>
      {selskaper.map((c) => (
        <tr key={c.ticker} className={"row" + (selected === c.ticker ? " sel" : "")}
            onClick={() => dispatch({ type: "SELECT", ticker: c.ticker })} title="Klikk for detaljer">
          <td><span className="name">{c.navn}</span></td>
          <td>{fmtNum(c.kurs)} <span className="muted small">{c.valuta || ""}</span></td>
          <td className={changeClass(c.endring_pct)}>{fmtPct(c.endring_pct)}</td>
          <td><Upside u={c.konsensus} title={consTitle(c)} /></td>
          <td><Upside u={c.megler} title={megTitle(c)} /></td>
          <td><Upside u={c.mitt} title={ownTitle(c)} /></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Card = ({ label, value, currency, u, sub }) => (
  <div className="card">
    <div className="lbl">{label}</div>
    <div className="big">
      {isNum(value) ? fmtNum(value) : "–"} <span className="muted small">{isNum(value) ? currency : ""}</span>
    </div>
    <div className="sub">
      {u && isNum(u.oppside_pct) ? <span className={"pill " + (u.farge || "")}>{fmtPct(u.oppside_pct)}</span> : null}
      {sub ? <span> {sub}</span> : null}
    </div>
  </div>
);

const TargetRows = ({ rows, cur }) => (
  <table>
    <thead>
      <tr>
        <th>Meglerhus</th><th>Kursmål</th><th>Endring</th><th>Oppside</th><th>Anbef.</th><th>Dato</th><th>Alder</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={r.meglerhus + r.dato + i} title={r.notat || ""}>
          <td>{r.meglerhus}</td>
          <td>{fmtNum(r.kursmal)} <span className="muted small">{cur}</span></td>
          <td className={changeClass(r.endring_pct)}>{isNum(r.endring_pct) ? fmtPct(r.endring_pct) : "–"}</td>
          <td className={changeClass(r.oppside_pct)}>{fmtPct(r.oppside_pct)}</td>
          <td>{r.anbefaling || "–"}</td>
          <td>{fmtDate(r.dato)}</td>
          <td className={r.gammel ? "old" : "muted"} title={r.gammel ? "Eldre enn 90 dager" : ""}>
            {r.alder_dager} d{r.gammel ? " ⚠" : ""}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const TargetForm = ({ c, data, form, dispatch }) => {
  const prevByBroker = get(data, "forrige_per_megler", c.ticker) || {};
  const onBroker = (e) => {
    const prev = prevByBroker[e.target.value];
    const el = e.target.form.elements.forrige;
    el.placeholder = isNum(prev) ? `auto: ${fmtNum(prev)}` : "forrige (valgfri)";
  };
  return (
    <div>
      <form onSubmit={(e) => submitTarget(e, c.ticker, dispatch)}>
        <input name="dato" type="date" defaultValue={todayOslo()} required title="Dato for kursmålet" />
        <input name="meglerhus" list="meglerhus-liste" placeholder="Meglerhus" required onInput={onBroker} />
        <input name="kursmal" placeholder={`Kursmål (${c.valuta || ""})`} inputMode="decimal" required />
        <select name="anbefaling" defaultValue="">
          <option value="">Anbefaling</option>
          <option value="kjøp">Kjøp</option>
          <option value="hold">Hold</option>
          <option value="selg">Selg</option>
        </select>
        <input name="forrige" placeholder="forrige (valgfri)" inputMode="decimal"
               title="Tomt = hentes fra meglerhusets forrige kursmål i filen" />
        <input name="notat" placeholder="Notat (valgfritt)" style={{ gridColumn: "span 2" }} />
        <button type="submit" disabled={form && form.busy}>Lagre</button>
        <datalist id="meglerhus-liste">
          {(data.meglerhus || []).map((m) => <option key={m} value={m} />)}
        </datalist>
      </form>
      {form && form.msg ? <div className={"fmsg " + (form.busy ? "" : form.ok ? "ok" : "err")}>{form.msg}</div> : null}
    </div>
  );
};

const Detail = ({ c, data, state, dispatch }) => {
  const k = c.konsensus;
  const m = c.megler || { siste: [], historikk: [] };
  const cur = c.valuta || "";
  return (
    <div className="detail">
      <div className="dhead">
        <span>
          <span className="name">{c.navn}</span>{" "}
          <span className="muted small">{c.ticker} · {c.bors} · kurs {fmtNum(c.kurs)} {cur}</span>
        </span>
        <span className="x" onClick={() => dispatch({ type: "SELECT", ticker: c.ticker })} title="Lukk">✕</span>
      </div>

      <div className="cards">
        <Card label="Yahoo-konsensus" value={k && k.snitt} currency={cur} u={k}
              sub={k ? `${k.antall || "?"} analytikere${k.anbefaling ? " · " + k.anbefaling : ""}` : "ingen dekning"} />
        <Card label="Meglersnitt (mine)" value={m.snitt} currency={cur} u={m}
              sub={m.antall ? `${m.antall} meglerhus${m.antall_ferske < m.antall ? ` · ${m.antall - m.antall_ferske} gamle` : ""}` : "ingen registrert"} />
        <Card label="Mitt kursmål" value={get(c, "mitt", "kursmal")} currency={cur} u={c.mitt}
              sub={get(c, "mitt", "dato") ? fmtDate(c.mitt.dato) : isNum(get(c, "mitt", "kursmal")) ? "" : "sett i portfolio.csv"} />
      </div>
      {k && (isNum(k.lav) || isNum(k.hoy)) ? (
        <div className="muted small">
          Konsensus spenn {fmtNum(k.lav)}–{fmtNum(k.hoy)} {cur} · median {fmtNum(k.median)} · hentet {fmtDateTime(k.hentet)}
        </div>
      ) : null}

      <div className="sect">Siste kursmål per meglerhus</div>
      {m.siste && m.siste.length ? <TargetRows rows={m.siste} cur={cur} /> : <div className="empty">Ingen kursmål registrert ennå.</div>}
      {m.historikk && m.historikk.length > m.siste.length ? (
        <div style={{ marginTop: 4 }}>
          <span className="link" onClick={() => dispatch({ type: "TOGGLE_HISTORY" })}>
            {state.showHistory ? "Skjul historikk" : `Vis hele historikken (${m.historikk.length})`}
          </span>
          {state.showHistory ? <TargetRows rows={m.historikk} cur={cur} /> : null}
        </div>
      ) : null}

      <div className="sect">+ Legg til kursmål</div>
      <TargetForm c={c} data={data} form={state.form} dispatch={dispatch} />
    </div>
  );
};

// ---------- visning ----------
export const render = (state, dispatch) => {
  const { data, parseError, pos, selected } = state;
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

  const selskaper = data.selskaper || [];
  const sel = selskaper.find((c) => c.ticker === selected);
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
      <Companies selskaper={selskaper} selected={selected} dispatch={dispatch} />
      {sel ? <Detail c={sel} data={data} state={state} dispatch={dispatch} /> : null}
      <div className="foot">
        Oppside = (kursmål − kurs) / kurs · grønn &gt; 15 %, gul −5 til 15 %, rød &lt; −5 % · klikk et selskap for detaljer
        <br />
        Kurser fra Yahoo Finance (ca. 15 min forsinket) · {data.apningstid ? "børsen er åpen" : "børsen er stengt"}
      </div>
    </div>
  );
};
