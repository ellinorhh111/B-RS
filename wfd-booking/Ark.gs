/**
 * Lesing og skriving i regnearket.
 *
 * Arket leses én gang per kjøring inn i en «tabell». Endringer skrives celle for celle,
 * slik at det du selv skriver i andre celler samtidig ikke blir overskrevet.
 */

const LOGG_KOLONNER = ['Tidspunkt', 'Bedrift', 'Retning', 'Fra', 'Emne', 'Hva skjedde', 'Status før', 'Status etter', 'Gmail-tråd'];
const TRAD_KOLONNER = ['Tråd-ID', 'Nøkkel', 'Sist behandlet', 'Antall behandlet'];

function hentRegneark_() {
  const id = PropertiesService.getScriptProperties().getProperty('REGNEARK_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function hentEllerLagArk_(ss, navn, overskrifter) {
  let ark = ss.getSheetByName(navn);
  if (!ark) {
    ark = ss.insertSheet(navn);
  }
  if (overskrifter && ark.getLastRow() === 0) {
    ark.getRange(1, 1, 1, overskrifter.length).setValues([overskrifter]).setFontWeight('bold');
    ark.setFrozenRows(1);
  }
  return ark;
}

/** Leser «Bedrifter» og legger til kolonner som mangler. */
function lesBedrifter_() {
  const ss = hentRegneark_();
  const ark = hentEllerLagArk_(ss, KONFIG.ARK_BEDRIFTER, null);
  let sisteKol = Math.max(ark.getLastColumn(), 1);
  let overskrifter = ark.getRange(1, 1, 1, sisteKol).getValues()[0].map(v => String(v).trim());

  const kol = {};
  const mangler = [];
  Object.keys(KONFIG.KOLONNER).forEach(nokkel => {
    const navn = KONFIG.KOLONNER[nokkel];
    const i = overskrifter.findIndex(h => h.toLowerCase() === navn.toLowerCase());
    if (i >= 0) kol[nokkel] = i; else mangler.push(nokkel);
  });
  if (mangler.length) {
    // Første kolonne kan være helt tom i et nytt ark.
    let start = overskrifter.filter(h => h !== '').length === 0 ? 0 : sisteKol;
    mangler.forEach((nokkel, n) => { kol[nokkel] = start + n; });
    ark.getRange(1, start + 1, 1, mangler.length)
      .setValues([mangler.map(n => KONFIG.KOLONNER[n])]).setFontWeight('bold');
    ark.setFrozenRows(1);
    sisteKol = start + mangler.length;
    overskrifter = ark.getRange(1, 1, 1, sisteKol).getValues()[0].map(v => String(v).trim());
  }

  const antallRader = Math.max(ark.getLastRow() - 1, 0);
  const verdier = antallRader ? ark.getRange(2, 1, antallRader, sisteKol).getValues() : [];
  return { ark, kol, rader: verdier, antallKol: sisteKol };
}

function celle_(tabell, rad, nokkel) {
  const v = tabell.rader[rad][tabell.kol[nokkel]];
  return v === undefined || v === null ? '' : v;
}

/** Setter én celle (0-basert rad i tabellen) og skriver den til arket hvis verdien endret seg. */
function settCelle_(tabell, rad, nokkel, verdi) {
  const k = tabell.kol[nokkel];
  if (k === undefined) return;
  const gammel = tabell.rader[rad][k];
  const lik = (gammel instanceof Date && verdi instanceof Date)
    ? gammel.getTime() === verdi.getTime()
    : String(gammel) === String(verdi);
  if (lik) return;
  tabell.rader[rad][k] = verdi;
  tabell.ark.getRange(rad + 2, k + 1).setValue(verdi);
}

/** Lager en ny tom rad nederst og returnerer radnummeret i tabellen. */
function nyRad_(tabell) {
  const rad = new Array(tabell.antallKol).fill('');
  tabell.rader.push(rad);
  const i = tabell.rader.length - 1;
  settCelle_(tabell, i, 'status', KONFIG.STATUSER[0]);
  if (tabell.kol.las !== undefined) tabell.ark.getRange(i + 2, tabell.kol.las + 1).insertCheckboxes();
  return i;
}

/**
 * Finner raden for en motpart. Rekkefølge: eksakt e-post, domene, bedriftsnavn.
 * Returnerer -1 hvis ingen treff.
 */
function finnRad_(tabell, motpart, bedriftsnavn) {
  const epost = (motpart.epost || '').toLowerCase();
  for (let i = 0; i < tabell.rader.length; i++) {
    const liste = String(celle_(tabell, i, 'epost')).toLowerCase().split(/[,;\s]+/);
    if (epost && liste.indexOf(epost) >= 0) return i;
  }
  if (!motpart.privat && motpart.domene) {
    for (let i = 0; i < tabell.rader.length; i++) {
      const d = String(celle_(tabell, i, 'domene')).toLowerCase().trim();
      if (d && (d === motpart.domene || motpart.domene.endsWith('.' + d))) return i;
    }
    // Domene som står i e-postkolonnen (f.eks. «post@dnb.no»).
    for (let i = 0; i < tabell.rader.length; i++) {
      const e = String(celle_(tabell, i, 'epost')).toLowerCase();
      if (e && e.indexOf('@' + motpart.domene) >= 0) return i;
    }
  }
  const navn = normaliserNavn_(bedriftsnavn);
  if (navn) {
    for (let i = 0; i < tabell.rader.length; i++) {
      if (normaliserNavn_(celle_(tabell, i, 'bedrift')) === navn) return i;
    }
  }
  return -1;
}

function normaliserNavn_(navn) {
  return String(navn || '').toLowerCase()
    .replace(/\b(asa|as|sa|ab|ltd|inc|gruppen|group|norge|norway)\b/g, '')
    .replace(/[^a-z0-9æøå]/g, '');
}

function statusRang_(status) {
  return KONFIG.STATUSER.indexOf(String(status));
}

/** Ny status skal aldri flytte bedriften bakover, bortsett fra «Takket nei». */
function velgStatus_(gammel, foreslatt) {
  if (!foreslatt) return gammel || KONFIG.STATUSER[0];
  if (foreslatt === KONFIG.STATUS_NEI) return foreslatt;
  if (gammel === KONFIG.STATUS_NEI) return foreslatt === KONFIG.STATUS_NEI ? gammel : foreslatt;
  const g = statusRang_(gammel);
  const f = statusRang_(foreslatt);
  if (f < 0) return gammel || KONFIG.STATUSER[0];
  return f > g ? foreslatt : (gammel || KONFIG.STATUSER[0]);
}

function erLast_(tabell, rad) {
  const v = celle_(tabell, rad, 'las');
  return v === true || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'ja';
}

function loggHendelse_(rad) {
  const ark = hentEllerLagArk_(hentRegneark_(), KONFIG.ARK_LOGG, LOGG_KOLONNER);
  ark.appendRow(rad);
}

/** Siste hendelser for én bedrift fra loggen, eldste først. */
function hentLoggForBedrift_(bedrift, antall) {
  const ark = hentRegneark_().getSheetByName(KONFIG.ARK_LOGG);
  if (!ark || ark.getLastRow() < 2 || !bedrift) return [];
  const verdier = ark.getRange(2, 1, ark.getLastRow() - 1, LOGG_KOLONNER.length).getValues();
  return verdier.filter(r => String(r[1]) === String(bedrift)).slice(-antall);
}

/** Holder rede på hvor langt hver Gmail-tråd er behandlet. */
function lesTrader_() {
  const ark = hentEllerLagArk_(hentRegneark_(), KONFIG.ARK_TRADER, TRAD_KOLONNER);
  const kart = {};
  if (ark.getLastRow() >= 2) {
    ark.getRange(2, 1, ark.getLastRow() - 1, TRAD_KOLONNER.length).getValues().forEach((r, i) => {
      kart[String(r[0])] = { rad: i + 2, nokkel: r[1], sist: r[2] ? new Date(r[2]).getTime() : 0 };
    });
  }
  return { ark, kart };
}

function lagreTrad_(trader, tradId, nokkel, sistDato, antall) {
  const eks = trader.kart[tradId];
  const rad = [tradId, nokkel, sistDato, antall];
  if (eks) {
    trader.ark.getRange(eks.rad, 1, 1, rad.length).setValues([rad]);
    eks.sist = sistDato.getTime();
  } else {
    trader.ark.appendRow(rad);
    trader.kart[tradId] = { rad: trader.ark.getLastRow(), nokkel, sist: sistDato.getTime() };
  }
}
