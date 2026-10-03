// WFD booking-assistent – all koden i én fil. Lim inn i Kode.gs i Apps Script.
// Generert fra Konfig, Ark, AI, Innboks, Historikk, Oppfolging, Oppsett. Endre innstillingene i KONFIG øverst.

// ===================== Konfig.gs =====================
/**
 * WFD booking-assistent – innstillinger.
 *
 * Dette er den eneste filen du normalt trenger å endre.
 * API-nøkkelen til Claude legges IKKE her, men under
 * Prosjektinnstillinger → Skriptegenskaper (navn: ANTHROPIC_API_KEY).
 */
const KONFIG = {
  // --- Om arrangementet. AI-en bruker KUN denne teksten når den skriver svar. ---
  // Skriv inn alt en bedrift typisk spør om: dato, sted, pakker, priser, frister,
  // hva som er inkludert, hvem som er målgruppen. Det som ikke står her, får
  // [FYLL INN] i utkastet i stedet for å bli funnet på.
  ARRANGEMENT: `
WFD arrangeres på NHH i Bergen i mars 2027 (eksakt dato: [FYLL INN]).
Målgruppe: studenter ved NHH.
Pakker og priser: [FYLL INN – f.eks. stand, bedriftspresentasjon, hovedsamarbeidspartner].
Påmeldingsfrist for bedrifter: [FYLL INN].
Kontaktperson: Head of Booking.
`,

  // Signaturen som legges under alle utkast.
  SIGNATUR: `
Med vennlig hilsen
[Navn]
Head of Booking, WFD
NHH`,

  // Tone og stil i svarene.
  TONE: 'Profesjonell, vennlig og kortfattet. Svar på samme språk som bedriften skrev på (norsk eller engelsk). Avslutt med et tydelig neste steg.',

  // --- Gmail ---
  // Hvilke e-poster som sjekkes ved hver automatiske kjøring.
  // Inkluderer både innboks og sendt post, slik at svar du sender fra mobilen også registreres.
  INNBOKS_SOK: 'newer_than:3d -in:chats -category:promotions -category:social',

  // E-poster som ikke kommer fra en bedrift som allerede står i arket, tas bare med
  // hvis emne eller tekst inneholder ett av disse ordene (store/små bokstaver spiller ingen rolle),
  // eller hvis du selv har satt Gmail-etiketten under (ETIKETT) på tråden.
  // Legg gjerne til arrangementets fulle navn. Unngå vanlige ord (som «stand»), ellers kommer mye annet med.
  NOKKELORD: ['WFD', 'bedriftspresentasjon', 'standplass', 'samarbeidspartner', 'samarbeidsavtale', 'sponsor', 'partnerskap'],

  // Gmail-etiketter systemet bruker. Lages automatisk.
  ETIKETT: 'WFD',
  ETIKETT_SVAR_KLART: 'WFD/Svar klart',

  // Dine egne adresser (i tillegg til kontoen skriptet kjører på og Gmail-aliasene dine).
  // E-post fra disse regnes som «sendt av oss».
  EGNE_ADRESSER: [],
  // Domener som er «oss» (f.eks. foreningens domene). E-post til/fra disse alene ignoreres.
  EGNE_DOMENER: ['nhh.no', 'student.nhh.no'],

  // Private e-postdomener. For disse matches bedriften på hele e-postadressen i stedet for domenet.
  PRIVATE_DOMENER: ['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.no', 'outlook.com', 'live.com',
    'live.no', 'yahoo.com', 'yahoo.no', 'icloud.com', 'me.com', 'online.no'],

  // Avsendere som aldri er bedriftskontakter.
  IGNORER_AVSENDERE: ['noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'notifications', 'calendar-notification'],

  // Svar til alle (avsender + kopimottakere) eller bare avsender.
  SVAR_TIL_ALLE: true,

  // --- Historikk (menyvalget «Importer historikk fra Gmail») ---
  HISTORIKK_FRA_DATO: '2025/08/01',
  // Ekstra Gmail-søk for historikken. Tom tekst = bruk NOKKELORD.
  // Eksempel for å ta med alt du har sendt: 'in:sent'
  HISTORIKK_SOK: '',
  // true: AI leser hver gamle tråd og fyller inn status og oppsummering (koster litt per tråd).
  // false: bare dato, kontaktperson, antall e-poster og emne fylles inn.
  HISTORIKK_MED_AI: true,

  // --- Oppfølging ---
  PURR_ETTER_DAGER: 7,          // Når en bedrift ikke har svart på så mange dager, foreslås purring.
  DAGLIG_OPPSUMMERING_KL: 8,    // Klokkeslett for daglig oppsummering på e-post (0–23). null = av.
  SJEKK_HVERT_MINUTT: 10,       // Hvor ofte innboksen sjekkes (1, 5, 10, 15 eller 30).

  // --- AI (Claude) ---
  MODELL: 'claude-opus-5-5',
  INNSATS: 'medium',            // low | medium | high – høyere gir grundigere svar, men tregere og dyrere.
  MAKS_AI_KALL_PER_KJORING: 8,  // Resten tas ved neste kjøring.

  // --- Kolonner i bedriftsarket ---
  // Systemet finner kolonnene på overskriften i rad 1, så rekkefølgen er valgfri.
  // Venstre side er systemets navn, høyre side er overskriften i arket ditt.
  // Kolonner som ikke finnes, legges til bakerst. Sett til null for å droppe en kolonne.
  // Satt opp for arket «Claude WFD» (Column 1 = bedrift, Column 2 = kontakt/e-post, Veien videre = notater).
  KOLONNER: {
    bedrift: 'Column 1',          // påkrevd
    epost: 'Column 2',            // kontaktperson og e-post kan stå blandet her
    notater: 'Veien videre',      // systemet skriver aldri her, men AI-en leser det
    status: 'Status',             // påkrevd
    trengerSvar: 'Trenger svar',  // påkrevd
    sistKontakt: 'Sist kontakt',  // påkrevd
    retning: 'Siste e-post fra',  // påkrevd
    oppsummering: 'Siste hendelse',
    nesteSteg: 'Neste steg',
    domene: 'Domene',
    trad: 'Gmail-tråd',
    tradId: 'Tråd-ID',            // påkrevd
    utkast: 'Utkast laget',
    las: 'Lås',
    // Disse er slått av for å holde arket ryddig. Skriv inn et kolonnenavn for å slå dem på.
    kontaktperson: null,
    telefon: null,
    interesse: null,
    oppfolging: null,
    forsteKontakt: null,
    antall: null,
  },

  // Dine egne statuskolonner som systemet fyller ut automatisk.
  // Systemet fyller bare tomme celler (og «Nei»→«Ja», «venter»→«Ja»), og overskriver aldri noe annet du har skrevet.
  //   Invitasjon sendt = Ja når vi har sendt e-post
  //   Respons          = Ja når bedriften har svart
  //   Med              = venter (interessert), Ja (bekreftet), Nei (takket nei)
  // Sett SPEIL: null for å slå av.
  SPEIL: {
    invitasjonSendt: 'Invitasjon sendt',
    respons: 'Respons',
    med: 'Med',
    ja: 'Ja',
    nei: 'Nei',
    venter: 'venter',
  },

  // Statusene i rekkefølge. Systemet flytter aldri en bedrift bakover i listen
  // (unntak: «Takket nei»). Endrer du navnene her, gjør det før «Sett opp arket».
  STATUSER: ['Ikke kontaktet', 'Kontaktet', 'Purret', 'I dialog', 'Interessert', 'Tilbud sendt', 'Bekreftet'],
  STATUS_NEI: 'Takket nei',

  ARK_BEDRIFTER: 'Bedrifter', // reserve hvis du ikke har valgt fane under «Sett opp arket»
  ARK_LOGG: 'Logg',
  ARK_OVERSIKT: 'Oversikt',
  ARK_TRADER: '_Tråder',
};

// ===================== Ark.gs =====================
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
    const navn = KONFIG.KOLONNER[nokkel];
    if (!navn) return;
    const i = overskrifter.findIndex(h => h.toLowerCase() === navn.toLowerCase());
    if (i >= 0) kol[nokkel] = i; else mangler.push(nokkel);
  });
  if (mangler.length) {
    // Første kolonne kan være helt tom i et nytt ark.
    const start = overskrifter.filter(h => h !== '').length === 0 ? 0 : sisteKol;
    mangler.forEach((nokkel, n) => { kol[nokkel] = start + n; });
    ark.getRange(1, start + 1, 1, mangler.length)
      .setValues([mangler.map(n => KONFIG.KOLONNER[n])]).setFontWeight('bold');
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
  // Domenet ligner bedriftsnavnet: nbim.no → «NBIM (Premium)», dnb.no → «DNB Carnegie».
  if (!motpart.privat && motpart.domene) {
    const stamme = normaliserNavn_(motpart.domene.split('.').slice(-2, -1)[0]);
    if (stamme.length >= 3) {
      for (let i = 0; i < tabell.rader.length; i++) {
        const n = normaliserNavn_(celle_(tabell, i, 'bedrift'));
        if (n && (n === stamme || n.indexOf(stamme) === 0)) return i;
      }
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
    .replace(/\([^)]*\)/g, ' ')          // «(Premium)», «(Partner)»
    .replace(/^\s*[a-zæøå]{2,4}\s*:/, ' ')  // «SSE:»
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

// ===================== AI.gs =====================
/**
 * Kall til Claude (Anthropic Messages API) via UrlFetchApp.
 * Nøkkelen ligger i Skriptegenskaper som ANTHROPIC_API_KEY.
 */

function harAI_() {
  return !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
}

/** Sender ett kall og returnerer svaret som JSON-objekt etter skjemaet. Kaster feil ved problemer. */
function kallClaude_(system, brukertekst, skjema, maksTokens) {
  const nokkel = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!nokkel) throw new Error('ANTHROPIC_API_KEY mangler i Skriptegenskaper.');

  const kropp = {
    model: KONFIG.MODELL,
    max_tokens: maksTokens || 8000,
    system: system,
    messages: [{ role: 'user', content: brukertekst }],
    output_config: {
      effort: KONFIG.INNSATS,
      format: { type: 'json_schema', schema: skjema },
    },
    // Hvis modellen avslår en forespørsel, prøver API-et automatisk en annen modell.
    fallbacks: 'default',
  };
  const valg = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': nokkel,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    payload: JSON.stringify(kropp),
    muteHttpExceptions: true,
  };

  let svar;
  for (let forsok = 0; forsok < 3; forsok++) {
    svar = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', valg);
    const kode = svar.getResponseCode();
    if (kode === 200) break;
    if (kode === 429 || kode >= 500) {
      Utilities.sleep(2000 * Math.pow(2, forsok));
      continue;
    }
    throw new Error('Claude API svarte ' + kode + ': ' + svar.getContentText().slice(0, 500));
  }
  if (svar.getResponseCode() !== 200) {
    throw new Error('Claude API svarte ' + svar.getResponseCode() + ' etter flere forsøk.');
  }

  const data = JSON.parse(svar.getContentText());
  if (data.stop_reason === 'refusal') throw new Error('Claude avslo forespørselen.');
  if (data.stop_reason === 'max_tokens') throw new Error('Svaret fra Claude ble avkuttet (max_tokens).');
  const tekst = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(tekst);
}

const ANALYSE_SKJEMA = {
  type: 'object',
  properties: {
    relevant: { type: 'boolean', description: 'Gjelder tråden booking av bedrifter til WFD?' },
    bedrift: { type: 'string', description: 'Bedriftens navn, uten AS/ASA. Tom hvis ukjent.' },
    kontaktperson: { type: 'string' },
    kontakt_epost: { type: 'string' },
    telefon: { type: 'string' },
    status: { type: 'string', enum: [] }, // fylles inn i analyserTrad_
    interesse: { type: 'string', description: 'Hvilken pakke/deltakelse bedriften er interessert i. Tom hvis ukjent.' },
    oppsummering: { type: 'string', description: 'Én–to setninger om hva som skjedde i de nye e-postene.' },
    neste_steg: { type: 'string', description: 'Konkret neste steg for oss, kort.' },
    oppfolging_dato: { type: 'string', description: 'YYYY-MM-DD hvis noe må følges opp på en bestemt dato, ellers tom.' },
    trenger_svar: { type: 'boolean', description: 'Venter bedriften på svar fra oss?' },
    svarutkast: { type: 'string', description: 'Ferdig e-postsvar uten signatur. Tom hvis trenger_svar er false.' },
  },
  required: ['relevant', 'bedrift', 'kontaktperson', 'kontakt_epost', 'telefon', 'status', 'interesse',
    'oppsummering', 'neste_steg', 'oppfolging_dato', 'trenger_svar', 'svarutkast'],
  additionalProperties: false,
};

function systemPrompt_() {
  return [
    'Du er assistenten til Head of Booking for WFD, et arrangement på NHH.',
    'Målet er å få flest mulig bedrifter til å delta. Du leser e-posttråder med bedrifter,',
    'oppdaterer oversikten og skriver utkast til svar som Head of Booking leser gjennom før de sendes.',
    '',
    'Fakta om arrangementet (bruk BARE dette, aldri finn på datoer, priser eller løfter):',
    KONFIG.ARRANGEMENT.trim(),
    '',
    'Når svaret trenger informasjon som ikke står over, skriv [FYLL INN: hva som mangler] i teksten.',
    'Tone: ' + KONFIG.TONE,
    'Svarutkastet skal være ren tekst, starte med hilsen til kontaktpersonen og ikke inneholde signatur.',
    '',
    'Statusbetydning:',
    '- Kontaktet: vi har tatt kontakt, ingen reell dialog ennå.',
    '- Purret: vi har sendt påminnelse uten å få svar.',
    '- I dialog: bedriften har svart, men ikke sagt hva de vil.',
    '- Interessert: bedriften ønsker å delta eller vil vite mer om konkrete pakker.',
    '- Tilbud sendt: vi har sendt konkret tilbud/pris/avtale.',
    '- Bekreftet: bedriften har bekreftet deltakelse.',
    '- ' + KONFIG.STATUS_NEI + ': bedriften har sagt nei for i år.',
    'Automatiske fraværsmeldinger endrer ikke status og trenger ikke svar.',
  ].join('\n');
}

/**
 * Analyserer en tråd.
 * @param {Object} kontekst  { tradTekst, rad: {...gjeldende verdier}, historikk: [tekstlinjer], lagUtkast }
 */
function analyserTrad_(kontekst) {
  const skjema = JSON.parse(JSON.stringify(ANALYSE_SKJEMA));
  skjema.properties.status.enum = KONFIG.STATUSER.concat([KONFIG.STATUS_NEI]);

  const deler = [];
  deler.push('Dagens dato: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
  deler.push('');
  deler.push('Det vi vet om bedriften fra oversikten:');
  deler.push(JSON.stringify(kontekst.rad, null, 1));
  if (kontekst.historikk && kontekst.historikk.length) {
    deler.push('');
    deler.push('Tidligere hendelser (fra loggen, eldste først):');
    kontekst.historikk.forEach(l => deler.push('- ' + l));
  }
  deler.push('');
  deler.push('E-posttråden (eldste først). «OSS» = Head of Booking / WFD, «DEM» = bedriften:');
  deler.push(kontekst.tradTekst);
  deler.push('');
  deler.push(kontekst.lagUtkast
    ? 'Analyser tråden. Hvis bedriften venter på svar fra oss, skriv svarutkastet.'
    : 'Analyser tråden. Ikke skriv svarutkast (la feltet være tomt).');

  return kallClaude_(systemPrompt_(), deler.join('\n'), skjema, 8000);
}

const PURRING_SKJEMA = {
  type: 'object',
  properties: { utkast: { type: 'string' } },
  required: ['utkast'],
  additionalProperties: false,
};

function skrivPurring_(tradTekst, rad) {
  const tekst = [
    'Bedriften har ikke svart på vår siste e-post. Skriv en kort, vennlig påminnelse',
    '(maks 80 ord) som gjør det lett å svare, og som foreslår et konkret neste steg.',
    '',
    'Det vi vet om bedriften:',
    JSON.stringify(rad, null, 1),
    '',
    'Tråden (eldste først):',
    tradTekst,
  ].join('\n');
  return kallClaude_(systemPrompt_(), tekst, PURRING_SKJEMA, 4000).utkast;
}

// ===================== Innboks.gs =====================
/**
 * Leser Gmail-tråder, oppdaterer arket og lager svarutkast.
 * sjekkInnboks() kjøres automatisk hvert SJEKK_HVERT_MINUTT minutt.
 */

const MAKS_KJORETID_MS = 4.5 * 60 * 1000; // Apps Script stopper etter 6 minutter.
const MAKS_TEGN_PER_MELDING = 4000;
const MAKS_MELDINGER_TIL_AI = 12;

function sjekkInnboks() {
  const las = LockService.getScriptLock();
  if (!las.tryLock(10 * 1000)) return; // En annen kjøring holder på.
  try {
    const start = Date.now();
    const tabell = lesBedrifter_();
    const trader = lesTrader_();
    const tilstand = { aiIgjen: KONFIG.MAKS_AI_KALL_PER_KJORING, start, historikk: false };
    const traderGmail = GmailApp.search(KONFIG.INNBOKS_SOK, 0, 100);
    // Eldste først, så rekkefølgen i loggen blir riktig.
    traderGmail.sort((a, b) => a.getLastMessageDate() - b.getLastMessageDate());
    for (const trad of traderGmail) {
      if (Date.now() - start > MAKS_KJORETID_MS) break;
      try {
        behandleTrad_(trad, tabell, trader, tilstand);
      } catch (e) {
        console.error('Feil i tråd ' + trad.getId() + ': ' + (e.stack || e));
      }
    }
  } finally {
    las.releaseLock();
  }
}

// ---------- Hjelpere for adresser ----------

let EGNE_CACHE_ = null;
function egneAdresser_() {
  if (EGNE_CACHE_) return EGNE_CACHE_;
  const liste = [Session.getEffectiveUser().getEmail()]
    .concat(GmailApp.getAliases())
    .concat(KONFIG.EGNE_ADRESSER)
    .filter(Boolean)
    .map(a => a.toLowerCase());
  EGNE_CACHE_ = liste;
  return liste;
}

/** «"Hansen, Kari" <kari@dnb.no>, ola@dnb.no» → [{navn, epost}] */
function tolkAdresser_(tekst) {
  if (!tekst) return [];
  // Del på komma som ikke står inni anførselstegn.
  const deler = String(tekst).match(/(?:"[^"]*"|[^,])+/g) || [];
  const ut = [];
  deler.forEach(del => {
    const m = del.match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    if (!m) return;
    const navn = del.replace(/<[^>]*>/g, '').replace(m[0], '').replace(/["']/g, '').trim();
    ut.push({ navn, epost: m[0].toLowerCase() });
  });
  return ut;
}

function domeneAv_(epost) {
  return String(epost).split('@')[1] || '';
}

function erEgenAdresse_(epost) {
  const e = String(epost).toLowerCase();
  if (egneAdresser_().indexOf(e) >= 0) return true;
  const d = domeneAv_(e);
  return KONFIG.EGNE_DOMENER.some(x => d === x || d.endsWith('.' + x));
}

function erFraOss_(melding) {
  const fra = tolkAdresser_(melding.getFrom())[0];
  return fra ? erEgenAdresse_(fra.epost) : false;
}

function erIgnorert_(epost) {
  const lokal = String(epost).split('@')[0];
  return KONFIG.IGNORER_AVSENDERE.some(x => lokal.indexOf(x) >= 0);
}

/** Finner bedriftskontakten i tråden: første eksterne avsender, ellers første eksterne mottaker. */
function finnMotpart_(meldinger) {
  const kandidater = [];
  meldinger.forEach(m => { if (!erFraOss_(m)) kandidater.push.apply(kandidater, tolkAdresser_(m.getFrom())); });
  meldinger.forEach(m => {
    kandidater.push.apply(kandidater, tolkAdresser_(m.getTo()));
    kandidater.push.apply(kandidater, tolkAdresser_(m.getCc()));
  });
  const treff = kandidater.find(a => !erEgenAdresse_(a.epost) && !erIgnorert_(a.epost));
  if (!treff) return null;
  const domene = domeneAv_(treff.epost);
  const privat = KONFIG.PRIVATE_DOMENER.indexOf(domene) >= 0;
  return { navn: treff.navn, epost: treff.epost, domene, privat, nokkel: privat ? treff.epost : domene };
}

function navnFraDomene_(domene) {
  const del = String(domene).split('.').slice(-2, -1)[0] || domene;
  return del.charAt(0).toUpperCase() + del.slice(1);
}

// ---------- Tekst ----------

/** Fjerner sitert tekst fra tidligere e-poster i tråden. */
function rensTekst_(tekst) {
  const linjer = String(tekst || '').replace(/\r/g, '').split('\n');
  const ut = [];
  for (const l of linjer) {
    if (/^\s*(On .+ wrote:|Den .+ skrev .+:|.+ skrev følgende:|-----\s*Original Message|-----\s*Opprinnelig melding|From: .+|Fra: .+)\s*$/i.test(l)) break;
    if (/^\s*>/.test(l)) continue;
    ut.push(l);
  }
  let t = ut.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > MAKS_TEGN_PER_MELDING) t = t.slice(0, MAKS_TEGN_PER_MELDING) + '\n[… resten av e-posten er kuttet]';
  return t;
}

function tradTilTekst_(meldinger) {
  const utvalg = meldinger.slice(-MAKS_MELDINGER_TIL_AI);
  const deler = [];
  if (meldinger.length > utvalg.length) {
    deler.push('[' + (meldinger.length - utvalg.length) + ' eldre e-poster i tråden er utelatt]');
  }
  utvalg.forEach(m => {
    const tz = Session.getScriptTimeZone();
    deler.push('--- ' + (erFraOss_(m) ? 'OSS' : 'DEM') + ' | ' + Utilities.formatDate(m.getDate(), tz, 'yyyy-MM-dd HH:mm') +
      ' | Fra: ' + m.getFrom() + ' | Til: ' + m.getTo() + (m.getCc() ? ' | Kopi: ' + m.getCc() : '') +
      ' | Emne: ' + m.getSubject());
    deler.push(rensTekst_(m.getPlainBody()));
  });
  return deler.join('\n');
}

function inneholderNokkelord_(meldinger) {
  const tekst = meldinger.map(m => m.getSubject() + '\n' + m.getPlainBody().slice(0, 5000)).join('\n');
  return KONFIG.NOKKELORD.some(ord => {
    const trygt = ord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^A-Za-z0-9æøåÆØÅ])' + trygt + '($|[^A-Za-z0-9æøåÆØÅ])', 'i').test(tekst);
  });
}

function hentEtikett_(navn) {
  return GmailApp.getUserLabelByName(navn) || GmailApp.createLabel(navn);
}

function tradUrl_(tradId) {
  return 'https://mail.google.com/mail/u/0/#all/' + tradId;
}

// ---------- Kjernen ----------

/**
 * Behandler én tråd. tilstand: { aiIgjen, start, historikk }.
 * Returnerer true hvis tråden ble registrert i arket.
 */
function behandleTrad_(trad, tabell, trader, tilstand) {
  const tradId = trad.getId();
  const alle = trad.getMessages().filter(m => !m.isDraft() && !m.isInTrash());
  if (!alle.length) return false;
  const sistBehandlet = trader.kart[tradId] ? trader.kart[tradId].sist : 0;
  const nye = alle.filter(m => m.getDate().getTime() > sistBehandlet);
  if (!nye.length) return false;

  const siste = alle[alle.length - 1];
  const motpart = finnMotpart_(alle);
  if (!motpart) {
    // Bare intern e-post eller automatiske avsendere – merk som ferdig.
    lagreTrad_(trader, tradId, '', siste.getDate(), alle.length);
    return false;
  }

  let rad = finnRad_(tabell, motpart, '');
  const harEtikett = trad.getLabels().some(l => l.getName() === KONFIG.ETIKETT);
  if (rad < 0 && !harEtikett && !inneholderNokkelord_(alle)) return false;

  const sisteFraDem = !erFraOss_(siste);
  const nyeFraDem = nye.some(m => !erFraOss_(m));
  const brukAI = harAI_() && nyeFraDem && (!tilstand.historikk || KONFIG.HISTORIKK_MED_AI);
  if (brukAI && tilstand.aiIgjen <= 0) return false; // Tas ved neste kjøring.

  // ---- Analyse ----
  let analyse = null;
  if (brukAI) {
    tilstand.aiIgjen--;
    const naa = rad >= 0 ? radSomObjekt_(tabell, rad) : { merknad: 'Ny bedrift, ikke i oversikten ennå.' };
    const historikk = rad >= 0
      ? hentLoggForBedrift_(celle_(tabell, rad, 'bedrift'), 10).map(r =>
        Utilities.formatDate(new Date(r[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd') + ' ' + r[2] + ': ' + r[5])
      : [];
    analyse = analyserTrad_({
      tradTekst: tradTilTekst_(alle),
      rad: naa,
      historikk,
      lagUtkast: !tilstand.historikk && sisteFraDem,
    });
    if (!analyse.relevant && rad < 0) {
      lagreTrad_(trader, tradId, motpart.nokkel, siste.getDate(), alle.length);
      return false;
    }
  }

  // ---- Finn eller lag rad ----
  if (rad < 0 && analyse && analyse.bedrift) rad = finnRad_(tabell, motpart, analyse.bedrift);
  const ny = rad < 0;
  if (ny) {
    rad = nyRad_(tabell);
    settCelle_(tabell, rad, 'bedrift', (analyse && analyse.bedrift) || (motpart.privat ? motpart.navn || motpart.epost : navnFraDomene_(motpart.domene)));
    settCelle_(tabell, rad, 'forsteKontakt', alle[0].getDate());
  }
  if (!motpart.privat && !celle_(tabell, rad, 'domene')) settCelle_(tabell, rad, 'domene', motpart.domene);

  const bedrift = celle_(tabell, rad, 'bedrift');
  const statusFor = celle_(tabell, rad, 'status') || statusFraEgneKolonner_(tabell, rad);
  const last = erLast_(tabell, rad);
  const gammelSist = celle_(tabell, rad, 'sistKontakt');
  const erNyest = !(gammelSist instanceof Date) || siste.getDate() >= gammelSist;

  // Første kontakt kan være eldre enn det som står (f.eks. ved historikkimport).
  const forste = celle_(tabell, rad, 'forsteKontakt');
  if (!(forste instanceof Date) || alle[0].getDate() < forste) settCelle_(tabell, rad, 'forsteKontakt', alle[0].getDate());

  // ---- Status og felter ----
  let foreslatt;
  if (analyse) {
    foreslatt = analyse.status;
  } else if (nyeFraDem || alle.some(m => !erFraOss_(m))) {
    foreslatt = 'I dialog';
  } else {
    // Bare våre egne e-poster: to eller flere på rad uten svar = purret.
    foreslatt = alle.length >= 2 ? 'Purret' : 'Kontaktet';
  }
  const statusEtter = last ? statusFor : velgStatus_(statusFor, foreslatt);
  if (!last) {
    settCelle_(tabell, rad, 'status', statusEtter);
    speilStatus_(tabell, rad, statusEtter);
    if (analyse) {
      const kontaktperson = analyse.kontaktperson || (!erFraOss_(siste) ? motpart.navn : '');
      if (kontaktperson && !celle_(tabell, rad, 'kontaktperson')) settCelle_(tabell, rad, 'kontaktperson', kontaktperson);
      if (analyse.telefon && !celle_(tabell, rad, 'telefon')) settCelle_(tabell, rad, 'telefon', analyse.telefon);
      if (analyse.interesse) settCelle_(tabell, rad, 'interesse', analyse.interesse);
    } else if (motpart.navn && !celle_(tabell, rad, 'kontaktperson')) {
      settCelle_(tabell, rad, 'kontaktperson', motpart.navn);
    }
    leggTilEpost_(tabell, rad, (analyse && analyse.kontakt_epost) || motpart.epost);
  }

  settCelle_(tabell, rad, 'antall', (Number(celle_(tabell, rad, 'antall')) || 0) + nye.length);

  // ---- «Hvor står vi nå» – bare hvis denne tråden er den nyeste kontakten ----
  const oppsummering = analyse ? analyse.oppsummering : enkelOppsummering_(siste);
  if (erNyest) {
    settCelle_(tabell, rad, 'sistKontakt', siste.getDate());
    settCelle_(tabell, rad, 'retning', sisteFraDem ? 'Bedriften' : 'Oss');
    // Ved historikkimport regnes bare nylige e-poster som ubesvarte.
    const fersk = !tilstand.historikk || dagerSiden_(siste.getDate()) <= 14;
    settCelle_(tabell, rad, 'trengerSvar', sisteFraDem && fersk && (!analyse || analyse.trenger_svar) ? 'Ja' : 'Nei');
    settCelle_(tabell, rad, 'oppsummering', oppsummering);
    if (analyse && analyse.neste_steg) settCelle_(tabell, rad, 'nesteSteg', analyse.neste_steg);
    else if (!sisteFraDem) settCelle_(tabell, rad, 'nesteSteg', 'Vent på svar – purr etter ' + KONFIG.PURR_ETTER_DAGER + ' dager');
    if (analyse && /^\d{4}-\d{2}-\d{2}$/.test(analyse.oppfolging_dato)) {
      const [a, m, d] = analyse.oppfolging_dato.split('-').map(Number);
      settCelle_(tabell, rad, 'oppfolging', new Date(a, m - 1, d));
    }
    if (String(celle_(tabell, rad, 'tradId')) !== tradId) {
      settCelle_(tabell, rad, 'tradId', tradId);
      settLenke_(tabell, rad, 'trad', 'Åpne i Gmail', tradUrl_(tradId));
    }
  }

  // ---- Etiketter og utkast ----
  trad.addLabel(hentEtikett_(KONFIG.ETIKETT));
  if (!tilstand.historikk) {
    if (sisteFraDem && analyse && analyse.trenger_svar && analyse.svarutkast) {
      const laget = lagUtkast_(trad, siste, analyse.svarutkast);
      if (laget) {
        settCelle_(tabell, rad, 'utkast', new Date());
        trad.addLabel(hentEtikett_(KONFIG.ETIKETT_SVAR_KLART));
      } else {
        settCelle_(tabell, rad, 'nesteSteg', 'Du har allerede et eget utkast i tråden – ' + (analyse.neste_steg || 'svar bedriften'));
      }
    } else if (!sisteFraDem) {
      // Vi har svart: rydd bort systemets gamle utkast og etiketten.
      slettVarUtkast_(tradId);
      trad.removeLabel(hentEtikett_(KONFIG.ETIKETT_SVAR_KLART));
      settCelle_(tabell, rad, 'utkast', '');
    }
  }

  loggHendelse_([new Date(), bedrift, sisteFraDem ? 'Fra bedriften' : 'Fra oss', siste.getFrom(), siste.getSubject(),
    oppsummering, statusFor, statusEtter, tradUrl_(tradId)]);
  lagreTrad_(trader, tradId, motpart.nokkel, siste.getDate(), alle.length);
  return true;
}

/** Hele raden med overskrifter, også dine egne kolonner (f.eks. «Med i fjor?» og «Veien videre»), til AI-en. */
function radSomObjekt_(tabell, rad) {
  const skjult = ['trad', 'tradId', 'utkast', 'las'].map(n => KONFIG.KOLONNER[n]).filter(Boolean);
  const o = {};
  Object.keys(tabell.alle).forEach(h => {
    if (skjult.indexOf(h) >= 0) return;
    let v = tabell.rader[rad][tabell.alle[h]];
    if (v === undefined || v === null || v === '') return;
    if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    o[h] = v;
  });
  return o;
}

function enkelOppsummering_(melding) {
  const tekst = rensTekst_(melding.getPlainBody()).replace(/\s+/g, ' ').slice(0, 140);
  return (erFraOss_(melding) ? 'Vi sendte: ' : 'Bedriften skrev: ') + melding.getSubject() + ' – ' + tekst;
}

function leggTilEpost_(tabell, rad, epost) {
  if (!epost || erEgenAdresse_(epost)) return;
  const naa = String(celle_(tabell, rad, 'epost')).trim();
  const liste = naa ? naa.toLowerCase().split(/[,;\s]+/) : [];
  if (liste.indexOf(epost.toLowerCase()) >= 0) return;
  settCelle_(tabell, rad, 'epost', naa ? naa + ', ' + epost : epost);
}

function settLenke_(tabell, rad, nokkel, tekst, url) {
  const k = tabell.kol[nokkel];
  if (k === undefined) return;
  tabell.rader[rad][k] = tekst;
  tabell.ark.getRange(rad + 2, k + 1).setRichTextValue(
    SpreadsheetApp.newRichTextValue().setText(tekst).setLinkUrl(url).build());
}

// ---------- Utkast ----------
//
// Systemet husker hvilke utkast det selv har laget. Et utkast som du har redigert
// (lagret senere enn da det ble laget), blir aldri slettet eller erstattet automatisk.

/** Lager svarutkast i tråden. Returnerer false hvis du allerede har et eget eller redigert utkast der. */
function lagUtkast_(trad, siste, tekst) {
  const tradId = trad.getId();
  const egne = hentVarUtkast_(tradId);
  const utkastITraden = trad.getMessages().filter(m => m.isDraft());
  const fremmede = utkastITraden.filter(m => !egne || m.getId() !== egne.meldingId || erRedigert_(m, egne));
  if (fremmede.length) return false;

  slettVarUtkast_(tradId);
  const kropp = tekst.trim() + '\n' + KONFIG.SIGNATUR.replace(/^\n+/, '');
  const utkast = KONFIG.SVAR_TIL_ALLE ? siste.createDraftReplyAll(kropp) : siste.createDraftReply(kropp);
  const melding = utkast.getMessage();
  PropertiesService.getScriptProperties().setProperty('UTKAST_' + tradId, JSON.stringify({
    utkastId: utkast.getId(), meldingId: melding.getId(), lagret: melding.getDate().getTime(),
  }));
  return true;
}

function erRedigert_(melding, egne) {
  return melding.getDate().getTime() > (egne.lagret || 0) + 5000;
}

function hentVarUtkast_(tradId) {
  const v = PropertiesService.getScriptProperties().getProperty('UTKAST_' + tradId);
  return v ? JSON.parse(v) : null;
}

/** Sletter systemets utkast i tråden, men bare hvis du ikke har redigert det. */
function slettVarUtkast_(tradId) {
  const egne = hentVarUtkast_(tradId);
  if (!egne) return;
  try {
    const d = GmailApp.getDraft(egne.utkastId);
    if (d && !erRedigert_(d.getMessage(), egne)) d.deleteDraft();
  } catch (e) {
    // Utkastet er allerede sendt eller slettet.
  }
  PropertiesService.getScriptProperties().deleteProperty('UTKAST_' + tradId);
}

// ===================== Historikk.gs =====================
/**
 * Går gjennom gammel e-post og bygger opp arket med alle bedrifter vi har hatt kontakt med.
 * Kjører i porsjoner på ca. 4,5 minutter og fortsetter av seg selv til alt er gått gjennom.
 * Lager aldri svarutkast for gamle tråder.
 */

function historikkSok_() {
  const filter = KONFIG.HISTORIKK_SOK ||
    '{' + KONFIG.NOKKELORD.map(o => (/\s/.test(o) ? '"' + o + '"' : o)).join(' ') + '}';
  return 'after:' + KONFIG.HISTORIKK_FRA_DATO + ' ' + filter + ' -in:chats -in:spam -in:trash';
}

function importerHistorikk() {
  const ui = SpreadsheetApp.getUi();
  const svar = ui.alert('Importer historikk',
    'Går gjennom e-post fra ' + KONFIG.HISTORIKK_FRA_DATO + ' med søket:\n\n' + historikkSok_() +
    '\n\n' + (KONFIG.HISTORIKK_MED_AI && harAI_()
      ? 'AI leser hver tråd (koster noen øre per tråd). '
      : 'Uten AI: bare dato, kontakt og antall e-poster fylles inn. ') +
    'Det kan ta en stund. Du får en e-post når det er ferdig. Fortsette?', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().setProperty('HISTORIKK_POS', '0');
  fortsettHistorikk();
}

function fortsettHistorikk() {
  slettTriggere_('fortsettHistorikk');
  const egenskaper = PropertiesService.getScriptProperties();
  let pos = Number(egenskaper.getProperty('HISTORIKK_POS'));
  if (isNaN(pos)) return;

  const las = LockService.getScriptLock();
  if (!las.tryLock(30 * 1000)) {
    ScriptApp.newTrigger('fortsettHistorikk').timeBased().after(2 * 60 * 1000).create();
    return;
  }
  let ferdig = false;
  try {
    const start = Date.now();
    const tabell = lesBedrifter_();
    const trader = lesTrader_();
    const tilstand = { aiIgjen: 1000, start, historikk: true };
    while (Date.now() - start < MAKS_KJORETID_MS) {
      const porsjon = GmailApp.search(historikkSok_(), pos, 20);
      if (!porsjon.length) { ferdig = true; break; }
      for (const trad of porsjon) {
        if (Date.now() - start > MAKS_KJORETID_MS) break;
        try {
          behandleTrad_(trad, tabell, trader, tilstand);
        } catch (e) {
          console.error('Historikk, tråd ' + trad.getId() + ': ' + (e.stack || e));
        }
        pos++;
      }
      egenskaper.setProperty('HISTORIKK_POS', String(pos));
    }
  } finally {
    las.releaseLock();
  }

  if (ferdig) {
    egenskaper.deleteProperty('HISTORIKK_POS');
    GmailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'WFD: historikkimporten er ferdig',
      pos + ' tråder er gått gjennom. Se arket: ' + hentRegneark_().getUrl());
  } else {
    ScriptApp.newTrigger('fortsettHistorikk').timeBased().after(60 * 1000).create();
  }
}

function slettTriggere_(funksjon) {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === funksjon)
    .forEach(t => ScriptApp.deleteTrigger(t));
}

// ===================== Oppfolging.gs =====================
/**
 * Daglig oppsummering på e-post og purreutkast.
 */

function dagerSiden_(dato) {
  if (!(dato instanceof Date)) return null;
  return Math.floor((Date.now() - dato.getTime()) / (24 * 3600 * 1000));
}

/** Rader der vi skrev sist og bedriften ikke har svart innen PURR_ETTER_DAGER. */
function finnForfalte_(tabell) {
  const venter = ['Kontaktet', 'Purret', 'I dialog', 'Interessert', 'Tilbud sendt'];
  const ut = [];
  tabell.rader.forEach((_, i) => {
    const status = String(celle_(tabell, i, 'status'));
    const dager = dagerSiden_(celle_(tabell, i, 'sistKontakt'));
    if (venter.indexOf(status) >= 0 && celle_(tabell, i, 'retning') === 'Oss' &&
      dager !== null && dager >= KONFIG.PURR_ETTER_DAGER) {
      ut.push(i);
    }
  });
  return ut;
}

function dagligOppsummering() {
  const tabell = lesBedrifter_();
  const navn = i => celle_(tabell, i, 'bedrift');
  const idag = new Date();
  idag.setHours(23, 59, 59);

  const trengerSvar = [];
  const oppfolging = [];
  const tellinger = {};
  tabell.rader.forEach((_, i) => {
    if (!navn(i)) return;
    const s = String(celle_(tabell, i, 'status') || KONFIG.STATUSER[0]);
    tellinger[s] = (tellinger[s] || 0) + 1;
    if (celle_(tabell, i, 'trengerSvar') === 'Ja') {
      trengerSvar.push('• ' + navn(i) + ' – ' + celle_(tabell, i, 'oppsummering') +
        (celle_(tabell, i, 'utkast') ? ' (utkast klart i Gmail)' : ''));
    }
    const dato = celle_(tabell, i, 'oppfolging');
    if (dato instanceof Date && dato <= idag) {
      oppfolging.push('• ' + navn(i) + ' – ' + celle_(tabell, i, 'nesteSteg'));
    }
  });
  const forfalte = finnForfalte_(tabell).map(i =>
    '• ' + navn(i) + ' – ' + dagerSiden_(celle_(tabell, i, 'sistKontakt')) + ' dager uten svar (' + celle_(tabell, i, 'status') + ')');

  const alleStatuser = KONFIG.STATUSER.concat([KONFIG.STATUS_NEI]);
  const linjer = [];
  linjer.push('Status nå: ' + alleStatuser.map(s => s + ' ' + (tellinger[s] || 0)).join(' · '));
  linjer.push('');
  linjer.push('TRENGER SVAR FRA DEG (' + trengerSvar.length + ')');
  linjer.push(trengerSvar.length ? trengerSvar.join('\n') : 'Ingen 🎉');
  linjer.push('');
  linjer.push('OPPFØLGING I DAG ELLER FORFALT (' + oppfolging.length + ')');
  linjer.push(oppfolging.length ? oppfolging.join('\n') : 'Ingen');
  linjer.push('');
  linjer.push('BØR PURRES (' + forfalte.length + ')');
  linjer.push(forfalte.length ? forfalte.join('\n') + '\n\nTips: bruk menyen WFD → «Lag purreutkast» i arket.' : 'Ingen');
  linjer.push('');
  linjer.push('Arket: ' + hentRegneark_().getUrl());

  GmailApp.sendEmail(Session.getEffectiveUser().getEmail(),
    'WFD booking: ' + trengerSvar.length + ' trenger svar, ' + forfalte.length + ' bør purres',
    linjer.join('\n'));
}

/** Lager purreutkast i Gmail for alle forfalte bedrifter. */
function lagPurreutkast() {
  const ui = SpreadsheetApp.getUi();
  if (!harAI_()) {
    ui.alert('Purreutkast krever API-nøkkel til Claude. Se README.');
    return;
  }
  const tabell = lesBedrifter_();
  const forfalte = finnForfalte_(tabell);
  if (!forfalte.length) {
    ui.alert('Ingen bedrifter trenger purring nå.');
    return;
  }
  const start = Date.now();
  let laget = 0;
  const hoppetOver = [];
  for (const i of forfalte) {
    if (Date.now() - start > MAKS_KJORETID_MS) { hoppetOver.push('(tiden gikk ut – kjør igjen for resten)'); break; }
    const tradId = String(celle_(tabell, i, 'tradId'));
    const trad = tradId ? GmailApp.getThreadById(tradId) : null;
    if (!trad) { hoppetOver.push(celle_(tabell, i, 'bedrift') + ' (finner ikke tråden)'); continue; }
    const meldinger = trad.getMessages().filter(m => !m.isDraft());
    try {
      const tekst = skrivPurring_(tradTilTekst_(meldinger), radSomObjekt_(tabell, i));
      if (lagUtkast_(trad, meldinger[meldinger.length - 1], tekst)) {
        laget++;
        settCelle_(tabell, i, 'utkast', new Date());
        settCelle_(tabell, i, 'nesteSteg', 'Purreutkast klart i Gmail – se over og send');
        trad.addLabel(hentEtikett_(KONFIG.ETIKETT_SVAR_KLART));
      } else {
        hoppetOver.push(celle_(tabell, i, 'bedrift') + ' (har allerede et eget utkast)');
      }
    } catch (e) {
      hoppetOver.push(celle_(tabell, i, 'bedrift') + ' (feil: ' + e.message + ')');
    }
  }
  ui.alert(laget + ' purreutkast ligger klare i Gmail under etiketten «' + KONFIG.ETIKETT_SVAR_KLART + '».' +
    (hoppetOver.length ? '\n\nHoppet over:\n' + hoppetOver.join('\n') : ''));
}

// ===================== Oppsett.gs =====================
/**
 * Meny, oppsett av arket og automatiske kjøringer.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('WFD')
    .addItem('1. Sett opp arket og automatikk', 'settOpp')
    .addItem('2. Test AI-tilkoblingen', 'testAI')
    .addItem('3. Importer historikk fra Gmail', 'importerHistorikk')
    .addSeparator()
    .addItem('Sjekk innboksen nå', 'sjekkInnboksFraMeny')
    .addItem('Lag purreutkast', 'lagPurreutkast')
    .addItem('Send oppsummering nå', 'dagligOppsummering')
    .addSeparator()
    .addItem('Stopp all automatikk', 'stoppAutomatikk')
    .addItem('Rydd opp: fjern systemets kolonner fra denne fanen', 'ryddFane')
    .addToUi();
}

function settOpp() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const aktiv = ss.getActiveSheet().getName();
  const interne = [KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_TRADER];
  if (interne.indexOf(aktiv) >= 0) {
    ui.alert('Åpne fanen med bedriftslisten først, og velg menyvalget på nytt.');
    return;
  }
  const svar = ui.alert('Velg bedriftsliste',
    'Skal fanen «' + aktiv + '» brukes som bedriftslisten?\n\n' +
    'Systemet legger til sine kolonner til høyre for listen og leser e-postene inn hit. ' +
    'Er det feil fane, trykk Nei, åpne riktig fane og prøv igjen.', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;
  const egenskaper = PropertiesService.getScriptProperties();
  egenskaper.setProperty('REGNEARK_ID', ss.getId());
  egenskaper.setProperty('BEDRIFTSARK', aktiv);

  const tabell = lesBedrifter_(); // legger til kolonner som mangler
  const ark = tabell.ark;
  const maksRad = Math.max(ark.getMaxRows(), 500);
  if (ark.getMaxRows() < maksRad) ark.insertRowsAfter(ark.getMaxRows(), maksRad - ark.getMaxRows());
  const kolonne = n => ark.getRange(2, tabell.kol[n] + 1, maksRad - 1, 1);
  const har = n => tabell.kol[n] !== undefined;

  const alleStatuser = KONFIG.STATUSER.concat([KONFIG.STATUS_NEI]);
  kolonne('status').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(alleStatuser, true).setAllowInvalid(true).build());
  kolonne('trengerSvar').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['Ja', 'Nei'], true).setAllowInvalid(true).build());
  ['sistKontakt', 'forsteKontakt', 'oppfolging', 'utkast'].filter(har).forEach(n => kolonne(n).setNumberFormat('dd.mm.yyyy'));
  if (har('tradId')) ark.getRange(1, tabell.kol.tradId + 1).setNote('Brukes av systemet. Ikke endre.');
  if (har('las')) {
    ark.getRange(1, tabell.kol.las + 1).setNote('Kryss av for at systemet aldri skal endre status eller kontaktinfo på denne raden.');
    // Avkrysningsbokser bare på rader med bedrift, ellers ser arket ut som det har 500 rader.
    tabell.rader.forEach((_, i) => {
      if (String(celle_(tabell, i, 'bedrift')).trim() !== '') ark.getRange(i + 2, tabell.kol.las + 1).insertCheckboxes();
    });
  }

  // Startstatus ut fra dine egne kolonner for rader som ikke har status ennå.
  startStatusFraEgneKolonner_(tabell);

  // Fargekoding på systemets egne kolonner. Dine eksisterende regler beholdes.
  const bokstav = n => kolonneBokstav_(tabell.kol[n] + 1);
  const nye = [
    [`=$${bokstav('trengerSvar')}2="Ja"`, '#f4cccc', 'trengerSvar'],
    [`=$${bokstav('status')}2="Bekreftet"`, '#d9ead3', 'status'],
    [`=$${bokstav('status')}2="${KONFIG.STATUS_NEI}"`, '#eeeeee', 'status'],
  ];
  const formler = nye.map(r => r[0]);
  const beholdes = ark.getConditionalFormatRules().filter(r => {
    const b = r.getBooleanCondition && r.getBooleanCondition();
    const v = b && b.getCriteriaValues ? b.getCriteriaValues() : [];
    return !(v.length && formler.indexOf(String(v[0])) >= 0);
  });
  ark.setConditionalFormatRules(beholdes.concat(nye.map(([formel, farge, n]) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(formel).setBackground(farge).setRanges([kolonne(n)]).build())));

  // Logg, tråder og oversikt
  hentEllerLagArk_(ss, KONFIG.ARK_LOGG, LOGG_KOLONNER);
  hentEllerLagArk_(ss, KONFIG.ARK_TRADER, TRAD_KOLONNER).hideSheet();
  lagOversikt_(ss, tabell);

  // Gmail-etiketter
  hentEtikett_(KONFIG.ETIKETT);
  hentEtikett_(KONFIG.ETIKETT_SVAR_KLART);

  // Automatiske kjøringer
  stoppAutomatikk(true);
  ScriptApp.newTrigger('sjekkInnboks').timeBased().everyMinutes(KONFIG.SJEKK_HVERT_MINUTT).create();
  if (KONFIG.DAGLIG_OPPSUMMERING_KL !== null) {
    ScriptApp.newTrigger('dagligOppsummering').timeBased().everyDays(1)
      .atHour(KONFIG.DAGLIG_OPPSUMMERING_KL).nearMinute(0).create();
  }

  SpreadsheetApp.getUi().alert('Ferdig!\n\n' +
    '• Innboksen sjekkes hvert ' + KONFIG.SJEKK_HVERT_MINUTT + '. minutt.\n' +
    (KONFIG.DAGLIG_OPPSUMMERING_KL !== null ? '• Daglig oppsummering kl. ' + KONFIG.DAGLIG_OPPSUMMERING_KL + '.\n' : '') +
    (harAI_() ? '• AI er koblet til.\n' : '• AI er IKKE koblet til ennå (legg inn ANTHROPIC_API_KEY, se README).\n') +
    (harAI_() ? '\nNeste steg: «Test AI-tilkoblingen», deretter «Importer historikk fra Gmail».' : ''));
}

function lagOversikt_(ss, tabell) {
  const ark = hentEllerLagArk_(ss, KONFIG.ARK_OVERSIKT, null);
  ark.clear();
  const navn = "'" + tabell.ark.getName() + "'!";
  const s = kolonneBokstav_(tabell.kol.status + 1);
  const t = kolonneBokstav_(tabell.kol.trengerSvar + 1);
  const b = kolonneBokstav_(tabell.kol.bedrift + 1);
  const rader = [['Status', 'Antall']];
  KONFIG.STATUSER.concat([KONFIG.STATUS_NEI]).forEach(st => {
    rader.push([st, `=COUNTIF(${navn}${s}:${s},"${st}")`]);
  });
  rader.push(['', '']);
  rader.push(['Bedrifter totalt', `=COUNTA(${navn}${b}2:${b})`]);
  rader.push(['Trenger svar nå', `=COUNTIF(${navn}${t}:${t},"Ja")`]);
  const med = KONFIG.SPEIL && tabell.alle[KONFIG.SPEIL.med];
  if (med !== undefined && med !== null) {
    const m = kolonneBokstav_(med + 1);
    rader.push([KONFIG.SPEIL.med + ' = ' + KONFIG.SPEIL.ja, `=COUNTIF(${navn}${m}2:${m},"${KONFIG.SPEIL.ja}")`]);
    rader.push([KONFIG.SPEIL.med + ' = ' + KONFIG.SPEIL.venter, `=COUNTIF(${navn}${m}2:${m},"${KONFIG.SPEIL.venter}")`]);
  }
  ark.getRange(1, 1, rader.length, 2).setValues(rader);
  ark.getRange(1, 1, 1, 2).setFontWeight('bold');
  ark.autoResizeColumns(1, 2);
}

function kolonneBokstav_(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sjekkInnboksFraMeny() {
  sjekkInnboks();
  SpreadsheetApp.getActiveSpreadsheet().toast('Innboksen er sjekket.', 'WFD', 5);
}

function stoppAutomatikk(stille) {
  ['sjekkInnboks', 'dagligOppsummering', 'fortsettHistorikk'].forEach(slettTriggere_);
  PropertiesService.getScriptProperties().deleteProperty('HISTORIKK_POS');
  if (stille !== true) SpreadsheetApp.getUi().alert('All automatikk er stoppet. Velg «Sett opp arket og automatikk» for å starte igjen.');
}

function testAI() {
  const ui = SpreadsheetApp.getUi();
  if (!harAI_()) {
    ui.alert('Fant ingen API-nøkkel.\n\nGå til Utvidelser → Apps Script → Prosjektinnstillinger (tannhjulet) → ' +
      'Skriptegenskaper, og legg til ANTHROPIC_API_KEY.');
    return;
  }
  try {
    const svar = analyserTrad_({
      tradTekst: '--- DEM | 2026-10-01 09:12 | Fra: Kari Hansen <kari.hansen@eksempel.no> | Til: deg | Emne: Re: WFD 2027\n' +
        'Hei! Takk for henvendelsen. Vi er interessert i en stand på WFD. Hva koster det, og når er fristen?\n' +
        'Mvh Kari Hansen, HR-ansvarlig, Eksempel AS, tlf 900 00 000',
      rad: { Bedrift: 'Eksempel', Status: 'Kontaktet' },
      historikk: [],
      lagUtkast: true,
    });
    ui.alert('AI fungerer! Eksempel på resultat:\n\nStatus: ' + svar.status + '\nOppsummering: ' + svar.oppsummering +
      '\n\nUtkast:\n' + svar.svarutkast);
  } catch (e) {
    ui.alert('Noe gikk galt: ' + e.message);
  }
}

function startStatusFraEgneKolonner_(tabell) {
  tabell.rader.forEach((_, i) => {
    if (String(celle_(tabell, i, 'bedrift')).trim() === '') return;
    if (String(celle_(tabell, i, 'status')).trim() === '') settCelle_(tabell, i, 'status', statusFraEgneKolonner_(tabell, i));
  });
}

/**
 * Fjerner kolonnene systemet har lagt til i fanen du har åpen (f.eks. hvis oppsettet ble kjørt på feil fane),
 * pluss fanene Logg og Oversikt. Dine egne kolonner røres ikke. En kolonne som også kan være din egen
 * (f.eks. «Veien videre»), fjernes bare hvis den er helt tom.
 */
function ryddFane() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const ark = ss.getActiveSheet();
  const sisteKol = Math.max(ark.getLastColumn(), 1);
  const overskrifter = ark.getRange(1, 1, 1, sisteKol).getValues()[0].map(v => String(v).trim());

  const systemNokler = ['status', 'trengerSvar', 'nesteSteg', 'oppfolging', 'sistKontakt', 'retning', 'oppsummering',
    'kontaktperson', 'telefon', 'interesse', 'domene', 'forsteKontakt', 'antall', 'trad', 'tradId', 'utkast', 'las'];
  const systemNavn = systemNokler.map(n => KONFIG.KOLONNER[n]).filter(Boolean);
  const kanVaereDine = ['bedrift', 'epost', 'notater'].map(n => KONFIG.KOLONNER[n]).filter(Boolean);
  const antallRader = Math.max(ark.getLastRow() - 1, 0);
  const erTom = k => antallRader === 0 ||
    ark.getRange(2, k + 1, antallRader, 1).getValues().every(r => r[0] === '' || r[0] === false);

  const slett = [];
  overskrifter.forEach((h, k) => {
    if (systemNavn.indexOf(h) >= 0) slett.push(k);
    else if (kanVaereDine.indexOf(h) >= 0 && erTom(k) && k > 1) slett.push(k);
  });
  const fanerSomSlettes = [KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT].filter(n => ss.getSheetByName(n) && n !== ark.getName());

  if (!slett.length && !fanerSomSlettes.length) {
    ui.alert('Fant ingen kolonner fra systemet i fanen «' + ark.getName() + '».');
    return;
  }
  const svar = ui.alert('Rydd opp i «' + ark.getName() + '»',
    'Dette slettes:\n\nKolonner: ' + (slett.length ? slett.map(k => kolonneBokstav_(k + 1) + ' (' + overskrifter[k] + ')').join(', ') : 'ingen') +
    '\nFaner: ' + (fanerSomSlettes.length ? fanerSomSlettes.join(', ') : 'ingen') +
    '\n\nAutomatikken stoppes også. Fortsette?', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;

  stoppAutomatikk(true);
  // Fra høyre mot venstre, så kolonnenumrene ikke forskyves.
  slett.sort((a, b) => b - a).forEach(k => ark.deleteColumn(k + 1));
  // Fjern systemets fargeregler som pekte på de slettede kolonnene (hvis Sheets ikke allerede har gjort det).
  try {
    ark.setConditionalFormatRules(ark.getConditionalFormatRules().filter(r => !r.getRanges || r.getRanges().length > 0));
  } catch (e) {
    console.warn('Fargeregler: ' + e.message);
  }
  fanerSomSlettes.forEach(n => ss.deleteSheet(ss.getSheetByName(n)));
  const egenskaper = PropertiesService.getScriptProperties();
  if (egenskaper.getProperty('BEDRIFTSARK') === ark.getName()) egenskaper.deleteProperty('BEDRIFTSARK');

  ui.alert('Ferdig. Åpne fanen med booking-tabellen og velg WFD → «1. Sett opp arket og automatikk».');
}
