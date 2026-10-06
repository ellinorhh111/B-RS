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

/** Alle navn en kolonne kan ha (første er det foretrukne). Tom liste hvis kolonnen er slått av. */
function kolonnenavn_(nokkel) {
  const v = KONFIG.KOLONNER[nokkel];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Arket med bedriftslisten: fanen du valgte under «Sett opp arket», ellers fanen som heter ARK_BEDRIFTER.
 * Finnes ingen av dem, stopper systemet i stedet for å gjette.
 */
function bedriftsark_(ss) {
  const valgt = PropertiesService.getScriptProperties().getProperty('BEDRIFTSARK');
  const ark = (valgt && ss.getSheetByName(valgt)) || ss.getSheetByName(KONFIG.ARK_BEDRIFTER);
  if (!ark) {
    throw new Error('Finner ikke fanen med bedriftslisten. Åpne fanen og velg WFD → «Sett opp arket og automatikk».');
  }
  return ark;
}

/**
 * Leser bedriftslisten og legger til systemets kolonner som mangler (bakerst).
 * Kolonner satt til null i KONFIG.KOLONNER brukes ikke.
 * tabell.alle gir indeksen til alle overskrifter i arket, også dine egne.
 */
function lesBedrifter_() {
  const ss = hentRegneark_();
  const ark = bedriftsark_(ss);
  let sisteKol = Math.max(ark.getLastColumn(), 1);
  let overskrifter = ark.getRange(1, 1, 1, sisteKol).getValues()[0].map(v => String(v).trim());

  const kol = {};
  const mangler = [];
  Object.keys(KONFIG.KOLONNER).forEach(nokkel => {
    const navn = kolonnenavn_(nokkel).map(n => n.toLowerCase());
    if (!navn.length) return;
    const i = overskrifter.findIndex(h => navn.indexOf(h.toLowerCase()) >= 0);
    if (i >= 0) kol[nokkel] = i; else mangler.push(nokkel);
  });
  // Mangler «Bedrift» i et ark som allerede er i bruk, har noen trolig skrevet over overskriften. Da lages
  // ingen ny tom kolonne (det ville gjort alle rapportene tomme) – i stedet kommer en tydelig feilmelding.
  if (mangler.indexOf('bedrift') >= 0 && overskrifter.filter(h => h !== '').length > 0 && ark.getLastRow() > 1) {
    throw new Error('Fant ikke kolonnen «' + kolonnenavn_('bedrift')[0] + '» i fanen «' + ark.getName() + '». ' +
      'Skriv «' + kolonnenavn_('bedrift')[0] + '» tilbake i overskriften over bedriftsnavnene (vanligvis A1).');
  }
  if (mangler.length) {
    // Første kolonne kan være helt tom i et nytt ark.
    const start = overskrifter.filter(h => h !== '').length === 0 ? 0 : sisteKol;
    mangler.forEach((nokkel, n) => { kol[nokkel] = start + n; });
    ark.getRange(1, start + 1, 1, mangler.length)
      .setValues([mangler.map(n => kolonnenavn_(n)[0])]).setFontWeight('bold');
    sisteKol = start + mangler.length;
    overskrifter = ark.getRange(1, 1, 1, sisteKol).getValues()[0].map(v => String(v).trim());
  }
  const alle = {};
  overskrifter.forEach((h, i) => { if (h) alle[h] = i; });

  // Bare rader med bedriftsnavn teller. Tomme avkrysningsbokser og nedtrekkslister lenger ned ignoreres.
  const antallRader = Math.max(ark.getLastRow() - 1, 0);
  let verdier = antallRader ? ark.getRange(2, 1, antallRader, sisteKol).getValues() : [];
  let siste = -1;
  verdier.forEach((r, i) => { if (String(r[kol.bedrift]).trim() !== '') siste = i; });
  verdier = verdier.slice(0, siste + 1);
  return { ark, kol, alle, rader: verdier, antallKol: sisteKol };
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
function finnRad_(tabell, motpart, bedriftsnavn, info) {
  info = info || {};
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
  // Domenet ligner bedriftsnavnet: nbim.no → «NBIM (Premium)», dnb.no → «DNB Carnegie», eqtpartners.com → «EQT (Partner)»,
  // odinfond.no → «Odin Forvaltning».
  if (!motpart.privat && motpart.domene) {
    // Usikkert: koblingen må godkjennes, og en avvist kobling brukes aldri igjen.
    for (let i = 0; i < tabell.rader.length; i++) {
      const b = celle_(tabell, i, 'bedrift');
      if (b && domeneLignerNavn_(motpart.domene, b) && !erAvvist_(koblingsNokkel_(motpart.domene, b))) {
        info.usikker = !tydeligDomene_(motpart.domene, b); // paretosec.com → Pareto er tydelig; clarksons.com → Clarksson er det ikke
        return i;
      }
    }
  }
  const navn = normaliserNavn_(bedriftsnavn);
  if (navn) {
    for (let i = 0; i < tabell.rader.length; i++) {
      const b = celle_(tabell, i, 'bedrift');
      if (normaliserNavn_(b) === navn && !erAvvist_(koblingsNokkel_(motpart.domene || motpart.epost, b))) {
        info.usikker = true;
        return i;
      }
    }
  }
  return -1;
}

function normaliserNavn_(navn) {
  return String(navn || '').toLowerCase()
    .replace(/\([^)]*\)/g, ' ')          // «(Premium)», «(Partner)»
    .replace(/^\s*[a-zæøå]{2,4}\s*:/, ' ')  // «SSE:»
    .replace(/\b(asa|as|sa|ab|ltd|inc|gruppen|group|norge|norway)\b/g, '')
    .replace(/[^a-z0-9æøå]/g, '');
}

function statusRang_(status) {
  return KONFIG.STATUSER.indexOf(String(status));
}

function koblingsNokkel_(domene, bedrift) {
  return 'kobling|' + String(domene).toLowerCase() + '|' + normaliserNavn_(bedrift);
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
  // Siste felt er lenken til tråden. Vis den som «Åpne» i stedet for en lang URL.
  const url = rad[rad.length - 1];
  if (/^https?:\/\//.test(String(url))) rad[rad.length - 1] = '=HYPERLINK("' + url + '","Åpne")';
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

/** Setter verdien i en av dine egne kolonner (KONFIG.SPEIL), bare hvis den står tom eller i listen «erstatt». */
function settEgenKolonne_(tabell, rad, overskrift, verdi, erstatt) {
  const k = tabell.alle[overskrift];
  if (k === undefined || !verdi) return;
  const naa = String(tabell.rader[rad][k] === undefined ? '' : tabell.rader[rad][k]).trim();
  if (naa === verdi) return;
  if (naa !== '' && (erstatt || []).map(x => x.toLowerCase()).indexOf(naa.toLowerCase()) < 0) return;
  try {
    tabell.ark.getRange(rad + 2, k + 1).setValue(verdi);
    tabell.rader[rad][k] = verdi;
  } catch (e) {
    console.warn('Kunne ikke skrive «' + verdi + '» i «' + overskrift + '»: ' + e.message);
  }
}

/** Oppdaterer dine egne statuskolonner ut fra systemets status. Overskriver aldri noe du har fylt inn selv. */
function speilStatus_(tabell, rad, status) {
  const sp = KONFIG.SPEIL;
  if (!sp) return;
  const r = statusRang_(status);
  const nei = status === KONFIG.STATUS_NEI;
  if (sp.invitasjonSendt && (r >= 1 || nei)) settEgenKolonne_(tabell, rad, sp.invitasjonSendt, sp.ja, [sp.nei]);
  if (sp.respons && (r >= statusRang_('I dialog') || nei)) settEgenKolonne_(tabell, rad, sp.respons, sp.ja, [sp.nei]);
  if (sp.med) {
    if (status === 'Bekreftet') settEgenKolonne_(tabell, rad, sp.med, sp.ja, [sp.venter]);
    else if (nei) settEgenKolonne_(tabell, rad, sp.med, sp.nei, [sp.venter]);
    else if (r >= statusRang_('Interessert')) settEgenKolonne_(tabell, rad, sp.med, sp.venter, []);
  }
}

/** Status utledet fra dine egne kolonner (Invitasjon sendt / Respons / Med). */
function statusFraEgneKolonner_(tabell, i) {
  const sp = KONFIG.SPEIL;
  if (!sp) return KONFIG.STATUSER[0];
  const verdi = overskrift => {
    const k = tabell.alle[overskrift];
    return k === undefined ? '' : String(tabell.rader[i][k]).trim().toLowerCase();
  };
  const ja = String(sp.ja).toLowerCase(), nei = String(sp.nei).toLowerCase(), venter = String(sp.venter).toLowerCase();
  const med = verdi(sp.med);
  if (med === ja) return 'Bekreftet';
  if (med === nei) return KONFIG.STATUS_NEI;
  if (med === venter) return 'Interessert';
  if (verdi(sp.respons) === ja) return 'I dialog';
  if (verdi(sp.invitasjonSendt) === ja) return 'Kontaktet';
  return KONFIG.STATUSER[0];
}

/**
 * Pakke ut fra det bedriften selv skriver («vi deltar gjerne som Premium Partner», «Vi blir gjerne med som partner»).
 * Bevisst strengt: bare tydelige formuleringer teller. Returnerer '' hvis usikkert.
 */
function pakkeFraEpost_(tekst) {
  const t = String(tekst || '');
  if (/premium[\s-]*partner/i.test(t)) return KONFIG.PAKKER.premium;
  if (/\b(som|as an?|as)\s+(en\s+)?partner\b/i.test(t)) return KONFIG.PAKKER.partner;
  return '';
}

/** Pakke ut fra notatene dine («Premium partner!», «Partner», «Premium. ønsker workshop»). */
function pakkeFraNotat_(tekst) {
  const t = String(tekst || '');
  if (/premium/i.test(t)) return KONFIG.PAKKER.premium;
  if (/\bpartner\b/i.test(t)) return KONFIG.PAKKER.partner;
  return '';
}

/** Fyller tomme «Pakke 2027» fra Veien videre. Overskriver aldri. */
function fyllPakkeFraNotater_(tabell) {
  if (tabell.kol.pakke === undefined || tabell.kol.notater === undefined) return;
  tabell.rader.forEach((_, i) => {
    if (celle_(tabell, i, 'pakke')) return;
    const p = pakkeFraNotat_(celle_(tabell, i, 'notater'));
    if (p) settCelle_(tabell, i, 'pakke', p);
  });
}

/**
 * Plukker ut setninger der bedriften sier hva den ønsker (workshop, dato, stand, panel osv.).
 * Hopper over hilsener, signaturer og lenker. Maks tre setninger.
 */
function onskerFraEpost_(tekst) {
  const ord = /(ønsk|workshop|\bstand\b|standplass|panel|foredrag|nettverks|presentasjon|internship|graduate|would like|wish|prefer|request|interested in)/i;
  const stoy = /(@|https?:|www\.|\+\d{2}|tlf|mobil|mvh|med vennlig|best regards|vänliga|hilsen|takk for invitasjon|thank you for the invitation)/i;
  const setninger = String(tekst || '')
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZÆØÅ])/)
    .map(x => x.replace(/\s+/g, ' ').trim())
    .filter(x => x.length >= 15 && x.length <= 300 && ord.test(x) && !stoy.test(x));
  return setninger.slice(0, 3);
}

/** Legger nye ønsker til i «Spesielle ønsker» uten å fjerne det som står der fra før. */
function leggTilOnsker_(tabell, rad, setninger) {
  if (tabell.kol.onsker === undefined || !setninger.length) return;
  const naa = String(celle_(tabell, rad, 'onsker')).trim();
  const nye = setninger.filter(x => naa.toLowerCase().indexOf(x.toLowerCase()) < 0);
  if (!nye.length) return;
  settCelle_(tabell, rad, 'onsker', (naa ? naa + ' | ' : '') + nye.join(' '));
}
