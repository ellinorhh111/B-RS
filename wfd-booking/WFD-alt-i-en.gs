// WFD booking-assistent – all koden i én fil. Lim inn i Kode.gs i Apps Script.
// Generert fra Konfig, Ark, AI, Innboks, Historikk, Oppfolging, Oppsett, Utseende, Bedriftsliste. Endre innstillingene i KONFIG øverst.

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
Women's Finance Day (WFD) 2027 ved NHH i Bergen. Arrangeres av Næringslivsutvalget, Finansgruppen og Femme Forvaltning ved NHH.
Mål: inspirere flere kvinner til en karriere i finans, og gi partnerne møte med dyktige studenter og synlighet som arbeidsgiver.
Workshops og hovedprogram er kun for kvinnelige studenter. Bedriftsstandene er åpne for alle NHH-studenter.

Datoer:
- Women's Finance Program (WFP): onsdag 3. mars 2027
- Women's Finance Day (WFD): torsdag 4. mars 2027
Svarfrist for bedrifter: fredag 16. oktober 2026.

Pakker: Partner og Premium partner. Priser og detaljer står i invitasjons-PDF-en (WFD_2027_NO.pdf / WFD_2027_ENG.pdf) – oppgi aldri priser i teksten, vis til PDF-en.
Premium partner kan i tillegg: arrangere egen nettverksøkt i forbindelse med WFD eller WFP, promotere internship- og graduate-stillinger gjennom våre kanaler, og holde workshop under WFD eller WFP.
Aktiviteter: stands, foredrag, paneldebatt, workshops og nettverksaktiviteter.

Resultater 2026: studentplassene ble fylt på under ett minutt, over 100 på venteliste, 84 % sa at WFD økte interessen for finans i stor grad.
`,

  // Signaturen som legges under alle utkast.
  SIGNATUR: `
Med vennlig hilsen

Ellinor Hangerhagen
Head of Booking
Women's Finance Day
+47 911 59 679 | wfd.booking@nhhs.no`,

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
  NOKKELORD: ['WFD', "Women's Finance Day", 'Women’s Finance Day', "Women's Finance Program", 'bedriftspresentasjon', 'standplass', 'samarbeidspartner', 'samarbeidsavtale', 'sponsor', 'partnerskap'],

  // Gmail-etiketter systemet bruker. Lages automatisk.
  ETIKETT: 'WFD',
  ETIKETT_SVAR_KLART: 'WFD/Svar klart',

  // Dine egne adresser (i tillegg til kontoen skriptet kjører på og Gmail-aliasene dine).
  // E-post fra disse regnes som «sendt av oss».
  EGNE_ADRESSER: ['wfd.booking@nhhs.no'],
  // Adressen all WFD-booking går gjennom. Brukes når Bedriftsliste oppdateres fra Gmail.
  WFD_ADRESSE: 'wfd.booking@nhhs.no',
  // Domener som er «oss» (f.eks. foreningens domene). E-post til/fra disse alene ignoreres.
  EGNE_DOMENER: ['nhh.no', 'student.nhh.no', 'nhhs.no'],

  // Private e-postdomener. For disse matches bedriften på hele e-postadressen i stedet for domenet.
  PRIVATE_DOMENER: ['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.no', 'outlook.com', 'live.com',
    'live.no', 'yahoo.com', 'yahoo.no', 'icloud.com', 'me.com', 'online.no'],

  // Avsendere som aldri er bedriftskontakter.
  IGNORER_AVSENDERE: ['noreply', 'no-reply', 'donotreply', 'mailer-daemon', 'notifications', 'calendar-notification'],

  // Svar til alle (avsender + kopimottakere) eller bare avsender.
  SVAR_TIL_ALLE: true,

  // --- Historikk (menyvalget «Importer historikk fra Gmail») ---
  HISTORIKK_FRA_DATO: '2026/08/01',
  // Hvilke e-poster historikken leser: alt som er sendt fra eller til WFD-adressen.
  HISTORIKK_SOK: '{from:wfd.booking@nhhs.no to:wfd.booking@nhhs.no cc:wfd.booking@nhhs.no}',
  // true: historikken oppdaterer bare bedrifter som allerede står i Booking (lager ingen nye rader).
  HISTORIKK_BARE_KJENTE: true,
  // true: AI leser hver gamle tråd og fyller inn status og oppsummering (krever API-nøkkel).
  HISTORIKK_MED_AI: false,

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
    // Flere navn = systemet godtar alle (det første brukes når kolonnen får nytt navn).
    bedrift: ['Bedrift', 'Column 1'],   // påkrevd
    epost: ['Kontakt', 'Column 2'],     // kontaktperson og e-post kan stå blandet her
    notater: 'Veien videre',      // systemet skriver aldri her, men AI-en leser det
    status: 'Status',             // påkrevd
    pakke: 'Pakke 2027',          // Premium partner / Partner – fylles fra e-post og notater, kan endres
    onsker: 'Spesielle ønsker',   // setninger om ønsker fra bedriftens e-post (workshop, dato, stand …), kan endres
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
    medIFjor: 'Med i fjor?',
    ja: 'Ja',
    nei: 'Nei',
    venter: 'venter',
  },

  // Statusene i rekkefølge. Systemet flytter aldri en bedrift bakover i listen
  // (unntak: «Takket nei»). Endrer du navnene her, gjør det før «Sett opp arket».
  STATUSER: ['Ikke kontaktet', 'Kontaktet', 'Purret', 'I dialog', 'Interessert', 'Tilbud sendt', 'Bekreftet'],
  STATUS_NEI: 'Takket nei',

  ARK_BEDRIFTER: 'Booking', // reserve hvis du ikke har valgt fane under «Sett opp arket»
  ARK_LOGG: 'Logg',

  // Brukes av «Gjør arbeidsboken ryddig og pen»: nye fanenavn og kolonneoverskrifter.
  // Fanen med booking-tabellen får navnet ARK_BEDRIFTER over.
  ANDRE_FANER: [
    { fra: 'Sheet1', til: 'Bedriftsliste', overskrifter: { 'Column 1': 'Bedrift', 'Column 2': 'Beskrivelse' } },
  ],
  ARK_OVERSIKT: 'Oversikt',
  ARK_FJOR: 'Mot fjoråret',
  ARK_BEDRIFTSOVERSIKT: 'Bedriftsoversikt',

  // Pakkene i år. Fjorårets pakke leses fra «(Premium)» / «(Partner)» i bedriftsnavnet.
  PAKKER: { premium: 'Premium partner', partner: 'Partner' },
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
        // nbim.no → «NBIM», dnb.no → «DNB Carnegie», paretosec.com → «Pareto»
        if (n && (n === stamme || n.indexOf(stamme) === 0 || (n.length >= 4 && stamme.indexOf(n) === 0))) return i;
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
  // Historikk uten AI for bare kjente bedrifter: hopp raskt over alt annet.
  if (rad < 0 && tilstand.historikk && KONFIG.HISTORIKK_BARE_KJENTE && !(KONFIG.HISTORIKK_MED_AI && harAI_())) {
    lagreTrad_(trader, tradId, motpart.nokkel, siste.getDate(), alle.length);
    return false;
  }
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
  if (ny && tilstand.historikk && KONFIG.HISTORIKK_BARE_KJENTE) {
    lagreTrad_(trader, tradId, motpart.nokkel, siste.getDate(), alle.length);
    return false;
  }
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
    if (tabell.kol.pakke !== undefined && !celle_(tabell, rad, 'pakke')) {
      const fraDem = alle.filter(m => !erFraOss_(m)).map(m => rensTekst_(m.getPlainBody())).join('\n');
      const pakke = pakkeFraEpost_(fraDem);
      if (pakke) settCelle_(tabell, rad, 'pakke', pakke);
    }
    const nyeFraDemTekst = nye.filter(m => !erFraOss_(m)).map(m => rensTekst_(m.getPlainBody())).join('\n');
    leggTilOnsker_(tabell, rad, onskerFraEpost_(nyeFraDemTekst));
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
  const skjult = [].concat.apply([], ['trad', 'tradId', 'utkast', 'las'].map(kolonnenavn_));
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

/**
 * Leser tidligere e-poster fra bedrifter som er bekreftet eller interessert, og fyller «Spesielle ønsker»
 * og tom «Pakke 2027». Brukes ved oppsett, så ønsker fra før systemet ble satt opp også kommer med.
 */
function hentOnskerFraGmail_(tabell, maksMs) {
  if (tabell.kol.onsker === undefined && tabell.kol.pakke === undefined) return 0;
  const start = Date.now();
  const sp = KONFIG.SPEIL || {};
  const medKol = tabell.alle[sp.med];
  let oppdatert = 0;
  for (let i = 0; i < tabell.rader.length; i++) {
    if (Date.now() - start > maksMs) break;
    const status = String(celle_(tabell, i, 'status'));
    const med = medKol !== undefined ? String(tabell.rader[i][medKol]) : '';
    if (!(med === (sp.ja || 'Ja') || ['Bekreftet', 'Tilbud sendt', 'Interessert'].indexOf(status) >= 0)) continue;

    const eposter = (String(celle_(tabell, i, 'epost')).match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
      .map(e => e.toLowerCase()).filter(e => !erEgenAdresse_(e));
    const domene = String(celle_(tabell, i, 'domene')).trim();
    const avsendere = eposter.concat(domene ? ['@' + domene] : []);
    if (!avsendere.length) continue;

    const sok = '{' + avsendere.map(a => 'from:' + a).join(' ') + '} after:' + KONFIG.HISTORIKK_FRA_DATO;
    const tekst = [];
    const fraBedriften = m => {
      const fra = (tolkAdresser_(m.getFrom())[0] || {}).epost || '';
      return eposter.indexOf(fra) >= 0 || (domene && (fra.endsWith('@' + domene) || fra.endsWith('.' + domene)));
    };
    GmailApp.search(sok, 0, 10).forEach(t => t.getMessages().forEach(m => {
      if (!m.isDraft() && !erFraOss_(m) && fraBedriften(m)) tekst.push(rensTekst_(m.getPlainBody()));
    }));
    if (!tekst.length) continue;
    const samlet = tekst.join('\n');
    const for_ = String(celle_(tabell, i, 'onsker')) + String(celle_(tabell, i, 'pakke'));
    if (tabell.kol.pakke !== undefined && !celle_(tabell, i, 'pakke')) {
      const p = pakkeFraEpost_(samlet);
      if (p) settCelle_(tabell, i, 'pakke', p);
    }
    leggTilOnsker_(tabell, i, onskerFraEpost_(samlet));
    if (String(celle_(tabell, i, 'onsker')) + String(celle_(tabell, i, 'pakke')) !== for_) oppdatert++;
  }
  return oppdatert;
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
    '\n\n' + (KONFIG.HISTORIKK_BARE_KJENTE
      ? 'Bare bedrifter som allerede står i Booking oppdateres. Ingen nye rader legges til. '
      : 'Bedrifter som ikke står i Booking legges til nederst. ') +
    (KONFIG.HISTORIKK_MED_AI && harAI_()
      ? 'AI leser hver tråd (koster noen øre per tråd). '
      : 'Sist kontakt, hvem som skrev sist, status og dine kolonner fylles ut. ') +
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
    .addItem('Oppdater Bedriftsliste fra Gmail', 'oppdaterBedriftsliste')
    .addItem('Gjør arbeidsboken ryddig og pen', 'ryddArbeidsbok')
    .addItem('Stopp all automatikk', 'stoppAutomatikk')
    .addItem('Rydd opp: fjern systemets kolonner fra denne fanen', 'ryddFane')
    .addToUi();
}

function settOpp() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const egenskaper = PropertiesService.getScriptProperties();
  // Er booking-fanen valgt før, brukes den alltid – uansett hvilken fane som er åpen.
  const tidligere = egenskaper.getProperty('BEDRIFTSARK');
  if (!(tidligere && ss.getSheetByName(tidligere))) {
    const aktiv = ss.getActiveSheet().getName();
    const interne = [KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_FJOR, KONFIG.ARK_BEDRIFTSOVERSIKT, KONFIG.ARK_TRADER];
    if (interne.indexOf(aktiv) >= 0) {
      ui.alert('Åpne fanen med booking-tabellen først, og velg menyvalget på nytt.');
      return;
    }
    const svar = ui.alert('Velg booking-fane',
      'Skal fanen «' + aktiv + '» brukes som booking-tabellen?\n\n' +
      'Systemet legger til sine kolonner til høyre for tabellen og leser e-postene inn hit. ' +
      'Valget huskes, så du får bare dette spørsmålet én gang. Er det feil fane, trykk Nei, åpne riktig fane og prøv igjen.',
      ui.ButtonSet.YES_NO);
    if (svar !== ui.Button.YES) return;
    egenskaper.setProperty('BEDRIFTSARK', aktiv);
  }
  egenskaper.setProperty('REGNEARK_ID', ss.getId());

  const tabell = plasserPakkeKolonne_(lesBedrifter_()); // legger til kolonner som mangler
  const ark = tabell.ark;
  const maksRad = Math.max(ark.getMaxRows(), 500);
  if (ark.getMaxRows() < maksRad) ark.insertRowsAfter(ark.getMaxRows(), maksRad - ark.getMaxRows());
  const kolonne = n => ark.getRange(2, tabell.kol[n] + 1, maksRad - 1, 1);
  const har = n => tabell.kol[n] !== undefined;

  const alleStatuser = KONFIG.STATUSER.concat([KONFIG.STATUS_NEI]);
  kolonne('status').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(alleStatuser, true).setAllowInvalid(true).build());
  if (har('pakke')) {
    kolonne('pakke').setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList([KONFIG.PAKKER.premium, KONFIG.PAKKER.partner], true).setAllowInvalid(true).build());
    fyllPakkeFraNotater_(tabell);
  }
  try {
    hentOnskerFraGmail_(tabell, 90 * 1000);
  } catch (e) {
    console.warn('Ønsker fra Gmail: ' + e.message);
  }
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

  // Logg, tråder og oversikt
  hentEllerLagArk_(ss, KONFIG.ARK_LOGG, LOGG_KOLONNER);
  hentEllerLagArk_(ss, KONFIG.ARK_TRADER, TRAD_KOLONNER).hideSheet();
  stilAlleFaner_(ss, tabell);
  ss.setActiveSheet(tabell.ark);

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
  ['sjekkInnboks', 'dagligOppsummering', 'fortsettHistorikk', 'fortsettBedriftsliste'].forEach(slettTriggere_);
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
  if ([KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_FJOR, KONFIG.ARK_BEDRIFTSOVERSIKT, KONFIG.ARK_TRADER].indexOf(ark.getName()) >= 0) {
    ui.alert('Du står i fanen «' + ark.getName() + '». Klikk på fanen som skal ryddes (f.eks. Sheet1), og velg menyvalget på nytt.');
    return;
  }
  const sisteKol = Math.max(ark.getLastColumn(), 1);
  const overskrifter = ark.getRange(1, 1, 1, sisteKol).getValues()[0].map(v => String(v).trim());

  const systemNokler = ['status', 'pakke', 'onsker', 'trengerSvar', 'nesteSteg', 'oppfolging', 'sistKontakt', 'retning', 'oppsummering',
    'kontaktperson', 'telefon', 'interesse', 'domene', 'forsteKontakt', 'antall', 'trad', 'tradId', 'utkast', 'las'];
  const systemNavn = [].concat.apply([], systemNokler.map(kolonnenavn_));
  const kanVaereDine = [].concat.apply([], ['bedrift', 'epost', 'notater'].map(kolonnenavn_));
  const antallRader = Math.max(ark.getLastRow() - 1, 0);
  const erTom = k => antallRader === 0 ||
    ark.getRange(2, k + 1, antallRader, 1).getValues().every(r => r[0] === '' || r[0] === false);

  const slett = [];
  overskrifter.forEach((h, k) => {
    if (systemNavn.indexOf(h) >= 0) slett.push(k);
    else if (kanVaereDine.indexOf(h) >= 0 && erTom(k) && k > 1) slett.push(k);
  });
  const fanerSomSlettes = []; // Logg, Oversikt og Mot fjoråret beholdes; de bygges opp på nytt av oppsettet.

  if (!slett.length && !fanerSomSlettes.length) {
    ui.alert('Fant ingen kolonner fra systemet i fanen «' + ark.getName() + '».');
    return;
  }
  const svar = ui.alert('Rydd opp i «' + ark.getName() + '»',
    'Dette slettes:\n\nKolonner: ' + (slett.length ? slett.map(k => kolonneBokstav_(k + 1) + ' (' + overskrifter[k] + ')').join(', ') : 'ingen') +
    '\n\nFortsette?', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;

  const egenskaper = PropertiesService.getScriptProperties();
  const varBooking = egenskaper.getProperty('BEDRIFTSARK') === ark.getName();
  if (varBooking) stoppAutomatikk(true); // ellers legger innboks-sjekken kolonnene tilbake
  // Fra høyre mot venstre, så kolonnenumrene ikke forskyves.
  slett.sort((a, b) => b - a).forEach(k => ark.deleteColumn(k + 1));
  // Fjern systemets fargeregler som pekte på de slettede kolonnene (hvis Sheets ikke allerede har gjort det).
  try {
    ark.setConditionalFormatRules(ark.getConditionalFormatRules().filter(r => !r.getRanges || r.getRanges().length > 0));
  } catch (e) {
    console.warn('Fargeregler: ' + e.message);
  }
  if (varBooking) {
    egenskaper.deleteProperty('BEDRIFTSARK');
    ui.alert('Ferdig. Åpne fanen med booking-tabellen og velg WFD → «1. Sett opp arket og automatikk».');
  } else {
    ui.alert('Ferdig.');
  }
}

// ===================== Utseende.gs =====================
/**
 * Utseende: fanenavn, farger, kolonnebredder og oversiktssiden.
 * Alt her er trygt å kjøre flere ganger. Det endrer bare formatering, systemets egne kolonner
 * og fanene Oversikt og Logg. Innholdet i tabellen din røres ikke.
 */

const FARGE = {
  indigo: '#4F5BD5',      // samme familie som tabellhodet ditt
  indigoMork: '#3B45A8',
  tekst: '#1F2937',
  dempet: '#6B7280',
  linje: '#E5E7EB',
  flate: '#F8FAFC',
  hvit: '#FFFFFF',
};

// Bakgrunn / tekstfarge per status.
const STATUSFARGE = {
  'Ikke kontaktet': ['#F3F4F6', '#6B7280'],
  'Kontaktet': ['#E0E7FF', '#3730A3'],
  'Purret': ['#FEF3C7', '#92400E'],
  'I dialog': ['#EDE9FE', '#5B21B6'],
  'Interessert': ['#FFEDD5', '#9A3412'],
  'Tilbud sendt': ['#CFFAFE', '#155E75'],
  'Bekreftet': ['#DCFCE7', '#166534'],
  'Takket nei': ['#FEE2E2', '#991B1B'],
};

// Fanefarger etter type: rapporter (indigo), data du jobber i (grønn), logg (grå).
const FANEFARGE = { rapport: '#4F5BD5', data: '#16A34A', logg: '#9CA3AF' };

// ---------------------------------------------------------------------------
// Menyvalget «Gjør arbeidsboken ryddig og pen»
// ---------------------------------------------------------------------------

function ryddArbeidsbok() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  let tabell;
  try {
    tabell = lesBedrifter_();
  } catch (e) {
    ui.alert('Kjør «1. Sett opp arket og automatikk» fra booking-fanen først.');
    return;
  }

  // 1. Lag en plan og vis den før noe endres.
  const plan = [];
  const bookingArk = tabell.ark;
  const bookingNavn = KONFIG.ARK_BEDRIFTER;
  if (bookingArk.getName() !== bookingNavn && !ss.getSheetByName(bookingNavn)) {
    plan.push('Fanen «' + bookingArk.getName() + '» får navnet «' + bookingNavn + '»');
  }
  ['bedrift', 'epost'].forEach(n => {
    const navn = kolonnenavn_(n);
    const naa = String(bookingArk.getRange(1, tabell.kol[n] + 1).getValue());
    if (navn.length && naa !== navn[0]) plan.push('Kolonnen «' + naa + '» i booking-tabellen får navnet «' + navn[0] + '»');
  });
  (KONFIG.ANDRE_FANER || []).forEach(f => {
    const ark = ss.getSheetByName(f.fra);
    if (!ark || ss.getSheetByName(f.til)) return;
    plan.push('Fanen «' + f.fra + '» får navnet «' + f.til + '»' +
      (f.overskrifter ? ' (overskrifter: ' + Object.keys(f.overskrifter).map(k => k + ' → ' + f.overskrifter[k]).join(', ') + ')' : ''));
  });
  plan.push('Systemkolonnene i booking-tabellen får farger, bredder og statusfarger. Domene og Tråd-ID skjules');
  plan.push('Oversikt blir et dashbord, «' + KONFIG.ARK_FJOR + '» sammenligner med fjoråret, og Logg får en ryddig tabell');
  plan.push('Fanene sorteres: Oversikt, ' + KONFIG.ARK_FJOR + ', ' + KONFIG.ARK_BEDRIFTSOVERSIKT + ', Booking, Bedriftsliste, Logg');

  const svar = ui.alert('Gjør arbeidsboken ryddig',
    'Dette blir gjort:\n\n• ' + plan.join('\n• ') + '\n\nInnholdet i tabellene dine endres ikke. Fortsette?', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;

  // 2. Fanenavn
  if (bookingArk.getName() !== bookingNavn && !ss.getSheetByName(bookingNavn)) {
    bookingArk.setName(bookingNavn);
    PropertiesService.getScriptProperties().setProperty('BEDRIFTSARK', bookingNavn);
  }
  const feil = [];
  ['bedrift', 'epost'].forEach(n => {
    const navn = kolonnenavn_(n);
    if (!navn.length) return;
    try {
      bookingArk.getRange(1, tabell.kol[n] + 1).setValue(navn[0]);
    } catch (e) {
      feil.push('Kunne ikke gi kolonnen nytt navn (' + navn[0] + '): ' + e.message);
    }
  });
  (KONFIG.ANDRE_FANER || []).forEach(f => {
    const ark = ss.getSheetByName(f.fra);
    if (!ark || ss.getSheetByName(f.til)) return;
    ark.setName(f.til);
    if (f.overskrifter) {
      const sisteKol = Math.max(ark.getLastColumn(), 1);
      const h = ark.getRange(1, 1, 1, sisteKol).getValues()[0];
      h.forEach((v, i) => { if (f.overskrifter[v]) ark.getRange(1, i + 1).setValue(f.overskrifter[v]); });
    }
    stilEnkelListe_(ark);
  });

  // 3. Utseende
  tabell = plasserPakkeKolonne_(lesBedrifter_());
  stilAlleFaner_(ss, tabell);

  // 4. Tomme faner: spør for seg, siden sletting ikke kan angres med Ctrl+Z.
  const tomme = ss.getSheets().filter(a => {
    const n = a.getName();
    if (n === tabell.ark.getName() || [KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_FJOR, KONFIG.ARK_BEDRIFTSOVERSIKT, KONFIG.ARK_TRADER].indexOf(n) >= 0) return false;
    if ((KONFIG.ANDRE_FANER || []).some(f => f.til === n)) return false;
    return a.getLastRow() <= 1;
  });
  if (tomme.length) {
    const s2 = ui.alert('Tomme faner',
      'Disse fanene har ingen innhold under overskriftsraden:\n\n• ' + tomme.map(a => a.getName()).join('\n• ') +
      '\n\nVil du slette dem?', ui.ButtonSet.YES_NO);
    if (s2 === ui.Button.YES) tomme.forEach(a => ss.deleteSheet(a));
  }

  ss.setActiveSheet(ss.getSheetByName(KONFIG.ARK_OVERSIKT));
  ui.alert('Ferdig!' + (feil.length ? '\n\nMerk:\n' + feil.join('\n') : ''));
}

function sorterFaner_(ss, tabell) {
  const rekkefolge = [
    [KONFIG.ARK_OVERSIKT, FANEFARGE.rapport],
    [KONFIG.ARK_FJOR, FANEFARGE.rapport],
    [KONFIG.ARK_BEDRIFTSOVERSIKT, FANEFARGE.rapport],
    [tabell.ark.getName(), FANEFARGE.data],
  ].concat((KONFIG.ANDRE_FANER || []).map(f => [f.til, FANEFARGE.data]))
    .concat([[KONFIG.ARK_LOGG, FANEFARGE.logg]]);
  let pos = 1;
  rekkefolge.forEach(([navn, farge]) => {
    const ark = ss.getSheetByName(navn);
    if (!ark) return;
    ark.setTabColor(farge);
    ss.setActiveSheet(ark);
    ss.moveActiveSheet(pos++);
  });
}

/** Felles utseende på alle faner. Trygt å kjøre så ofte du vil. */
function stilAlleFaner_(ss, tabell) {
  stilBooking_(tabell);
  stilLogg_(ss);
  (KONFIG.ANDRE_FANER || []).forEach(f => { const a = ss.getSheetByName(f.til); if (a) stilEnkelListe_(a); });
  lagOversikt_(ss, tabell);
  lagFjorFane_(ss, tabell);
  lagBedriftsoversikt_(ss, tabell);
  sorterFaner_(ss, tabell);
}

/** Tømmer en rapportfane og gir den felles oppsett: marg, skjult rutenett, tittel og undertittel. */
function forberedRapport_(ss, navn, tittel, undertittel) {
  const ark = hentEllerLagArk_(ss, navn, null);
  ark.clear();
  ark.clearConditionalFormatRules();
  ark.getRange(1, 1, ark.getMaxRows(), ark.getMaxColumns()).breakApart();
  ark.setHiddenGridlines(true);
  if (ark.getMaxColumns() < 14) ark.insertColumnsAfter(ark.getMaxColumns(), 14 - ark.getMaxColumns());
  ark.setColumnWidth(1, 28);
  ark.getRange(1, 1, 80, 14).setFontColor(FARGE.tekst).setVerticalAlignment('middle');
  ark.setRowHeight(1, 18);
  ark.setRowHeight(2, 36);
  ark.getRange('B2').setValue(tittel).setFontSize(20).setFontWeight('bold').setFontColor(FARGE.tekst);
  if (typeof undertittel === 'string') ark.getRange('B3').setValue(undertittel);
  ark.getRange('B3').setFontColor(FARGE.dempet).setFontSize(10);
  return ark;
}

/** Felles stil på en tabelloverskrift i en rapport. */
function stilTabellhode_(rng) {
  rng.setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold').setVerticalAlignment('middle');
}

// ---------------------------------------------------------------------------
// Booking-fanen: bare systemets egne kolonner og fargeregler
// ---------------------------------------------------------------------------

function systemKolonner_(tabell) {
  const egne = ['status', 'pakke', 'onsker', 'trengerSvar', 'nesteSteg', 'oppfolging', 'sistKontakt', 'retning', 'oppsummering',
    'kontaktperson', 'telefon', 'interesse', 'domene', 'forsteKontakt', 'antall', 'trad', 'tradId', 'utkast', 'las'];
  return egne.filter(n => tabell.kol[n] !== undefined);
}

function stilBooking_(tabell) {
  const ark = tabell.ark;
  const maks = Math.max(ark.getMaxRows() - 1, 1);
  const kol = n => tabell.kol[n] + 1;

  // Overskrifter på systemkolonnene
  const bredder = {
    status: 120, pakke: 130, onsker: 280, trengerSvar: 105, nesteSteg: 220, oppfolging: 110, sistKontakt: 105, retning: 120,
    oppsummering: 320, kontaktperson: 150, telefon: 110, interesse: 140, forsteKontakt: 110, antall: 90,
    trad: 95, utkast: 105, las: 55, domene: 120, tradId: 120,
  };
  systemKolonner_(tabell).forEach(n => {
    ark.getRange(1, kol(n))
      .setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold')
      .setHorizontalAlignment('left').setVerticalAlignment('middle');
    ark.setColumnWidth(kol(n), bredder[n] || 120);
    ark.getRange(2, kol(n), maks, 1).setVerticalAlignment('middle').setFontColor(FARGE.tekst);
  });
  ark.getRange(1, kol('status')).setNote('Fylles ut automatisk fra Gmail. Du kan alltid endre den selv.');
  ['trengerSvar', 'sistKontakt', 'retning', 'las', 'utkast'].filter(n => tabell.kol[n] !== undefined)
    .forEach(n => ark.getRange(2, kol(n), maks, 1).setHorizontalAlignment('center'));
  ['oppsummering', 'nesteSteg', 'onsker'].filter(n => tabell.kol[n] !== undefined)
    .forEach(n => ark.getRange(2, kol(n), maks, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP));
  ['sistKontakt', 'utkast', 'oppfolging', 'forsteKontakt'].filter(n => tabell.kol[n] !== undefined)
    .forEach(n => ark.getRange(2, kol(n), maks, 1).setNumberFormat('d. mmm'));
  ['domene', 'tradId'].filter(n => tabell.kol[n] !== undefined).forEach(n => ark.hideColumns(kol(n)));

  // Fargeregler: fjern systemets gamle regler, behold dine egne.
  const systemKol = systemKolonner_(tabell).map(kol);
  const beholdes = ark.getConditionalFormatRules().filter(r => {
    const omr = r.getRanges ? r.getRanges() : [];
    if (!omr.length) return false;
    return !omr.every(o => o.getNumColumns() === 1 && systemKol.indexOf(o.getColumn()) >= 0);
  });
  const nye = [];
  const statusOmr = ark.getRange(2, kol('status'), maks, 1);
  Object.keys(STATUSFARGE).forEach(st => {
    nye.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(st)
      .setBackground(STATUSFARGE[st][0]).setFontColor(STATUSFARGE[st][1]).setRanges([statusOmr]).build());
  });
  const svarOmr = ark.getRange(2, kol('trengerSvar'), maks, 1);
  nye.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Ja')
    .setBackground('#FEE2E2').setFontColor('#B91C1C').setBold(true).setRanges([svarOmr]).build());
  nye.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Nei')
    .setFontColor('#9CA3AF').setRanges([svarOmr]).build());
  ark.setConditionalFormatRules(beholdes.concat(nye));

  ark.setFrozenRows(1);
  try { ark.setFrozenColumns(1); } catch (e) { /* tabeller kan nekte; ikke viktig */ }
}

/** Enkel, rolig stil på en vanlig liste (f.eks. Bedriftsliste). Endrer bare overskriftsraden og bredder. */
function stilEnkelListe_(ark) {
  const sisteKol = Math.max(ark.getLastColumn(), 1);
  ark.getRange(1, 1, 1, sisteKol).setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold');
  ark.setFrozenRows(1);
}

// ---------------------------------------------------------------------------
// Logg
// ---------------------------------------------------------------------------

function stilLogg_(ss) {
  const ark = hentEllerLagArk_(ss, KONFIG.ARK_LOGG, LOGG_KOLONNER);
  const n = LOGG_KOLONNER.length;
  ark.getRange(1, 1, 1, n).setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold')
    .setVerticalAlignment('middle');
  ark.setRowHeight(1, 30);
  ark.setFrozenRows(1);
  const bredder = [130, 170, 110, 200, 240, 380, 110, 110, 70];
  bredder.forEach((b, i) => ark.setColumnWidth(i + 1, b));
  const maks = Math.max(ark.getMaxRows() - 1, 1);
  ark.getRange(2, 1, maks, 1).setNumberFormat('d. mmm yyyy, hh:mm');
  ark.getRange(2, 1, maks, n).setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP)
    .setFontColor(FARGE.tekst);
  ark.getRange(2, n, maks, 1).setHorizontalAlignment('center');
  if (!ark.getBandings().length) {
    ark.getRange(1, 1, ark.getMaxRows(), n).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  }
}

// ---------------------------------------------------------------------------
// Oversikt (dashbord). Alt er formler, så det oppdaterer seg selv.
// ---------------------------------------------------------------------------

function lagOversikt_(ss, tabell) {
  const ark = forberedRapport_(ss, KONFIG.ARK_OVERSIKT, "Women's Finance Day 2027 · Booking", null);

  const B = "'" + tabell.ark.getName() + "'!";
  const k = n => kolonneBokstav_(tabell.kol[n] + 1);
  const omr = n => B + k(n) + '2:' + k(n);
  const purrStatus = ['Kontaktet', 'Purret', 'I dialog', 'Interessert', 'Tilbud sendt'];
  const purrDager = KONFIG.PURR_ETTER_DAGER;

  // Rutenett: A er marg, B–M er tolv like kolonner.
  for (let c = 2; c <= 13; c++) ark.setColumnWidth(c, 96);
  ark.setColumnWidth(14, 28);
  ark.getRange('B3').setFormula('="Oppdateres automatisk fra Gmail  ·  " & TEXT(NOW(), "d. mmm yyyy, hh:mm")');

  // Nøkkeltall: fire fliser à tre kolonner
  const fliser = [
    ['Bekreftet', `=COUNTIF(${omr('status')},"Bekreftet")`, '#166534', '#DCFCE7'],
    ['I prosess', `=COUNTIF(${omr('status')},"I dialog")+COUNTIF(${omr('status')},"Interessert")+COUNTIF(${omr('status')},"Tilbud sendt")`, '#5B21B6', '#EDE9FE'],
    ['Venter på svar fra deg', `=COUNTIF(${omr('trengerSvar')},"Ja")`, '#B91C1C', '#FEE2E2'],
    ['Bør purres', `=ARRAYFORMULA(SUM(COUNTIFS(${omr('retning')},"Oss",${omr('sistKontakt')},"<="&(TODAY()-${purrDager}),${omr('status')},{"${purrStatus.join('","')}"})))`, '#92400E', '#FEF3C7'],
  ];
  ark.setRowHeight(4, 12);
  ark.setRowHeight(5, 52);
  ark.setRowHeight(6, 24);
  fliser.forEach(([etikett, formel, tekst, bakgrunn], i) => {
    const fra = 2 + i * 3;
    const tall = ark.getRange(5, fra, 1, 3);
    const navn = ark.getRange(6, fra, 1, 3);
    tall.merge();
    navn.merge();
    tall.getCell(1, 1).setFormula(formel);
    tall.setFontSize(28).setFontWeight('bold').setFontColor(tekst).setBackground(bakgrunn).setHorizontalAlignment('center');
    navn.getCell(1, 1).setValue(etikett);
    navn.setFontSize(10).setFontColor(tekst).setBackground(bakgrunn).setHorizontalAlignment('center');
  });

  // Status-fordeling (B–H)
  const statuser = KONFIG.STATUSER.concat([KONFIG.STATUS_NEI]);
  ark.setRowHeight(7, 20);
  ark.getRange('B8').setValue('Status').setFontSize(13).setFontWeight('bold');
  const forste = 9;
  const sist = forste + statuser.length - 1;
  statuser.forEach((st, i) => {
    const r = forste + i;
    const [bg, fg] = STATUSFARGE[st] || ['#F3F4F6', '#374151'];
    const etikett = ark.getRange(r, 2, 1, 2);
    etikett.merge();
    etikett.getCell(1, 1).setValue(st);
    etikett.setBackground(bg).setFontColor(fg).setFontWeight('bold');
    ark.getRange(r, 4).setFormula(`=COUNTIF(${omr('status')},"${st}")`).setHorizontalAlignment('center').setFontWeight('bold');
    const strek = ark.getRange(r, 5, 1, 4);
    strek.merge();
    strek.getCell(1, 1).setFormula(
      `=SPARKLINE(D${r},{"charttype","bar";"max",MAX($D$${forste}:$D$${sist})+0.0001;"color1","${fg}"})`);
    ark.setRowHeight(r, 24);
  });
  const total = ark.getRange(sist + 1, 2, 1, 2);
  total.merge();
  total.getCell(1, 1).setValue('Bedrifter totalt');
  total.setFontColor(FARGE.dempet);
  ark.getRange(sist + 1, 4).setFormula(`=COUNTA(${omr('bedrift')})`).setFontColor(FARGE.dempet).setHorizontalAlignment('center');

  // To lister side om side: B–G og H–M. Dato i første kolonne, tekst flyter over de tomme cellene til høyre.
  const tittel = sist + 4;
  const hode = tittel + 1;
  ark.getRange(tittel, 2).setValue('Trenger svar fra deg').setFontSize(13).setFontWeight('bold');
  ark.getRange(tittel, 8).setValue('Bør purres  ·  ' + purrDager + '+ dager uten svar').setFontSize(13).setFontWeight('bold');
  [[2, 'Bedrift og siste hendelse'], [8, 'Bedrift og status']].forEach(([c, tekst]) => {
    ark.getRange(hode, c).setValue('Sist kontakt');
    const t = ark.getRange(hode, c + 1, 1, 5);
    t.merge();
    t.getCell(1, 1).setValue(tekst);
    ark.getRange(hode, c, 1, 6).setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold');
  });
  ark.setRowHeight(hode, 26);

  ark.getRange(hode + 1, 2).setFormula(
    `=ARRAYFORMULA(IFERROR(SORT(FILTER({${omr('sistKontakt')},${omr('bedrift')}&"  —  "&IF(LEN(${omr('oppsummering')})>90,LEFT(${omr('oppsummering')},90)&"…",${omr('oppsummering')})},${omr('trengerSvar')}="Ja"),1,FALSE),"Ingen akkurat nå 🎉"))`);
  ark.getRange(hode + 1, 8).setFormula(
    `=ARRAYFORMULA(IFERROR(SORT(FILTER({${omr('sistKontakt')},${omr('bedrift')}&"  ·  "&${omr('status')}},${omr('retning')}="Oss",${omr('sistKontakt')}<>"",${omr('sistKontakt')}<=TODAY()-${purrDager},REGEXMATCH(${omr('status')},"^(${purrStatus.join('|')})$")),1,TRUE),"Ingen akkurat nå 🎉"))`);
  [2, 8].forEach(c => {
    ark.getRange(hode + 1, c, 200, 1).setNumberFormat('d. mmm').setHorizontalAlignment('left').setFontColor(FARGE.dempet);
    ark.getRange(hode + 1, c + 1, 200, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.OVERFLOW);
  });
}

// ---------------------------------------------------------------------------
// «Mot fjoråret»: Premium partner og Partner i år mot i fjor
// ---------------------------------------------------------------------------

/** Plasserer «Pakke 2027» og «Spesielle ønsker» rett til høyre for Status. Returnerer tabellen på nytt. */
function plasserPakkeKolonne_(tabell) {
  [['pakke', 'status'], ['onsker', 'pakke']].forEach(([n, etter]) => {
    if (tabell.kol[n] === undefined || tabell.kol[etter] === undefined) return;
    if (tabell.kol[n] === tabell.kol[etter] + 1) return;
    tabell.ark.moveColumns(tabell.ark.getRange(1, tabell.kol[n] + 1, 1, 1), tabell.kol[etter] + 2);
    tabell = lesBedrifter_();
  });
  return tabell;
}

function lagFjorFane_(ss, tabell) {
  const ark = forberedRapport_(ss, KONFIG.ARK_FJOR, 'WFD 2027 mot WFD 2026',
    'Bekreftede Premium partnere og Partnere i år, sammenlignet med i fjor. ' +
    'Tallene for i fjor er hentet fra «(Premium)» og «(Partner)» i bedriftsnavnene. De gule cellene kan du overskrive.');

  const B = "'" + tabell.ark.getName() + "'!";
  const sp = KONFIG.SPEIL || {};
  const egen = navn => tabell.alle[navn] !== undefined ? B + kolonneBokstav_(tabell.alle[navn] + 1) + '2:' + kolonneBokstav_(tabell.alle[navn] + 1) : null;
  const sys = n => B + kolonneBokstav_(tabell.kol[n] + 1) + '2:' + kolonneBokstav_(tabell.kol[n] + 1);
  const bedrift = sys('bedrift');
  const pakke = sys('pakke');
  const status = sys('status');
  const med = egen(sp.med);
  const medIFjor = egen(sp.medIFjor);
  const ja = sp.ja || 'Ja';
  // Bekreftet i år: «Med = Ja» hvis kolonnen finnes, ellers status «Bekreftet».
  const bekreftet = med ? `${med},"${ja}"` : `${status},"Bekreftet"`;
  const fjorFilter = medIFjor ? `,${medIFjor},"${ja}"` : '';

  ark.setColumnWidth(2, 190);
  for (let c = 3; c <= 7; c++) ark.setColumnWidth(c, 140);
  ark.setColumnWidth(8, 240);
  for (let c = 9; c <= 13; c++) ark.setColumnWidth(c, 96);

  // Hovedtabell
  const hode = 5;
  ark.getRange(hode, 2, 1, 7).setValues([['', 'I fjor (2026)', 'Bekreftet 2027', 'Endring', 'Andel av i fjor', 'Ikke bekreftet ennå', 'Fremdrift']]);
  stilTabellhode_(ark.getRange(hode, 2, 1, 7));
  ark.getRange(hode, 2, 1, 7).setHorizontalAlignment('center');
  ark.setRowHeight(hode, 30);

  const rader = [
    ['Premium partner', '*(Premium)*', KONFIG.PAKKER.premium, '#EDE9FE', '#5B21B6'],
    ['Partner', '*(Partner)*', KONFIG.PAKKER.partner, '#E0E7FF', '#3730A3'],
  ];
  rader.forEach(([navn, monster, pakkeNavn, bg, fg], i) => {
    const r = hode + 1 + i;
    ark.setRowHeight(r, 34);
    ark.getRange(r, 2).setValue(navn).setFontWeight('bold').setBackground(bg).setFontColor(fg);
    ark.getRange(r, 3).setFormula(`=COUNTIFS(${bedrift},"${monster}"${fjorFilter})`)
      .setBackground('#FEF9C3').setNote('Regnet ut fra bedriftsnavnene. Skriv inn riktig tall her hvis det ikke stemmer.');
    ark.getRange(r, 4).setFormula(`=COUNTIFS(${pakke},"${pakkeNavn}",${bekreftet})`).setFontWeight('bold');
    ark.getRange(r, 5).setFormula(`=D${r}-C${r}`).setNumberFormat('+0;-0;0');
    ark.getRange(r, 6).setFormula(`=IFERROR(D${r}/C${r},"–")`).setNumberFormat('0%');
    ark.getRange(r, 7).setFormula(`=COUNTIFS(${pakke},"${pakkeNavn}")-D${r}`);
    ark.getRange(r, 8).setFormula(
      `=SPARKLINE(D${r},{"charttype","bar";"max",MAX(C${r},D${r},1);"color1","${fg}"})`);
    ark.getRange(r, 3, 1, 5).setFontSize(13).setHorizontalAlignment('center');
  });
  const tot = hode + 3;
  ark.setRowHeight(tot, 34);
  ark.getRange(tot, 2).setValue('Totalt').setFontWeight('bold');
  ark.getRange(tot, 3).setFormula(`=C${hode + 1}+C${hode + 2}`);
  ark.getRange(tot, 4).setFormula(`=D${hode + 1}+D${hode + 2}`);
  ark.getRange(tot, 5).setFormula(`=D${tot}-C${tot}`).setNumberFormat('+0;-0;0');
  ark.getRange(tot, 6).setFormula(`=IFERROR(D${tot}/C${tot},"–")`).setNumberFormat('0%');
  ark.getRange(tot, 7).setFormula(`=G${hode + 1}+G${hode + 2}`);
  ark.getRange(tot, 8).setFormula(`=SPARKLINE(D${tot},{"charttype","bar";"max",MAX(C${tot},D${tot},1);"color1","${FARGE.indigo}"})`);
  ark.getRange(tot, 2, 1, 7).setFontWeight('bold').setBorder(true, null, null, null, null, null, FARGE.tekst, SpreadsheetApp.BorderStyle.SOLID);
  ark.getRange(tot, 3, 1, 5).setFontSize(13).setHorizontalAlignment('center');

  // Grønn/rød differanse
  const diff = ark.getRange(hode + 1, 5, 3, 1);
  ark.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(-0.5).setFontColor('#166534').setRanges([diff]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(-0.5).setFontColor('#B91C1C').setRanges([diff]).build(),
  ]);

  // Lister
  const liste = tot + 3;
  ark.getRange(liste, 2).setValue('Fjorårets partnere som ikke har bekreftet ennå').setFontSize(13).setFontWeight('bold');
  ark.getRange(liste, 8).setValue('Nye i år').setFontSize(13).setFontWeight('bold');
  ark.getRange(liste + 1, 2, 1, 5).setValues([['Bedrift', 'Status', '', '', '']]);
  ark.getRange(liste + 1, 8, 1, 3).setValues([['Bedrift', 'Pakke 2027', '']]);
  [ark.getRange(liste + 1, 2, 1, 5), ark.getRange(liste + 1, 8, 1, 4)].forEach(r =>
    r.setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold'));
  if (medIFjor) {
    const ikkeBekreftet = med ? `${med}<>"${ja}"` : `${status}<>"Bekreftet"`;
    ark.getRange(liste + 2, 2).setFormula(
      `=IFERROR(SORT(FILTER({${bedrift},${status}},${medIFjor}="${ja}",${ikkeBekreftet},${bedrift}<>""),1,TRUE),"Alle er med 🎉")`);
    const erBekreftet = med ? `${med}="${ja}"` : `${status}="Bekreftet"`;
    ark.getRange(liste + 2, 8).setFormula(
      `=IFERROR(SORT(FILTER({${bedrift},${pakke}},${medIFjor}<>"${ja}",${erBekreftet}),1,TRUE),"Ingen ennå")`);
  } else {
    ark.getRange(liste + 2, 2).setValue('Fant ingen kolonne «' + (sp.medIFjor || 'Med i fjor?') + '» i fanen «' + tabell.ark.getName() + '». Er riktig fane valgt som booking-tabell?');
  }
  const statusOmr = ark.getRange(liste + 2, 3, 200, 1);
  ark.setConditionalFormatRules(ark.getConditionalFormatRules().concat(Object.keys(STATUSFARGE).map(st =>
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(st).setBackground(STATUSFARGE[st][0])
      .setFontColor(STATUSFARGE[st][1]).setRanges([statusOmr]).build())));
}

// ---------------------------------------------------------------------------
// «Bedriftsoversikt»: hvem er med, pakke og spesielle ønsker
// ---------------------------------------------------------------------------

const PAKKEFARGE = { 'Premium partner': ['#EDE9FE', '#5B21B6'], 'Partner': ['#E0E7FF', '#3730A3'] };

function lagBedriftsoversikt_(ss, tabell) {
  const ark = forberedRapport_(ss, KONFIG.ARK_BEDRIFTSOVERSIKT, 'Bedriftsoversikt',
    'Hvem er med i 2027, hvilken pakke de har og hva de ønsker. Bekreftede øverst, deretter de som er interessert. ' +
    'Oppdateres automatisk – endringer gjør du i Booking.');

  const B = "'" + tabell.ark.getName() + "'!";
  const sp = KONFIG.SPEIL || {};
  const omr = i => B + kolonneBokstav_(i + 1) + '2:' + kolonneBokstav_(i + 1);
  const sys = n => tabell.kol[n] !== undefined ? omr(tabell.kol[n]) : null;
  const bedrift = sys('bedrift');
  const status = sys('status');
  const pakke = sys('pakke') || `IF(${bedrift}="","","")`;
  const onsker = sys('onsker') || `IF(${bedrift}="","","")`;
  const notater = sys('notater') || `IF(${bedrift}="","","")`;
  const kontakt = sys('epost') || `IF(${bedrift}="","","")`;
  const med = tabell.alle[sp.med] !== undefined ? omr(tabell.alle[sp.med]) : null;
  const ja = sp.ja || 'Ja';
  const ventende = ['Tilbud sendt', 'Interessert'];

  // Vist status: «Med = Ja» teller som bekreftet selv om statuskolonnen ikke er oppdatert.
  const vistStatus = med ? `IF(${med}="${ja}","Bekreftet",${status})` : status;
  const betingelse = `(${bedrift}<>"")*(REGEXMATCH(${vistStatus},"^(Bekreftet|${ventende.join('|')})$"))`;
  const rekkefolge = `MATCH(${vistStatus},{"Bekreftet","${ventende.join('","')}"},0)`;

  // Nøkkeltall i én linje
  ark.getRange('B4').setFormula(
    `=ARRAYFORMULA(SUM((${vistStatus}="Bekreftet")*(${bedrift}<>"")) & " bekreftet   ·   " & ` +
    `SUM((${vistStatus}="Bekreftet")*(${pakke}="${KONFIG.PAKKER.premium}")) & " Premium partner   ·   " & ` +
    `SUM((${vistStatus}="Bekreftet")*(${pakke}="${KONFIG.PAKKER.partner}")) & " Partner   ·   " & ` +
    `SUM(REGEXMATCH(${vistStatus},"^(${ventende.join('|')})$")*(${bedrift}<>"")) & " venter på bekreftelse")`)
    .setFontSize(12).setFontWeight('bold').setFontColor(FARGE.indigo);
  ark.setRowHeight(4, 28);

  // Tabell
  const kolonner = [['Bedrift', 210], ['Status', 115], ['Pakke 2027', 130], ['Spesielle ønsker', 340], ['Notater (Veien videre)', 260], ['Kontakt', 260]];
  const hode = 6;
  ark.getRange(hode, 2, 1, kolonner.length).setValues([kolonner.map(k => k[0])]);
  stilTabellhode_(ark.getRange(hode, 2, 1, kolonner.length));
  ark.setRowHeight(hode, 30);
  kolonner.forEach(([, b], i) => ark.setColumnWidth(2 + i, b));
  ark.setFrozenRows(hode);

  ark.getRange(hode + 1, 2).setFormula(
    `=ARRAYFORMULA(IFERROR(SORT(` +
    `FILTER({${bedrift},${vistStatus},${pakke},${onsker},${notater},${kontakt}},${betingelse}),` +
    `FILTER(${rekkefolge},${betingelse}),TRUE,` +
    `FILTER(${pakke},${betingelse}),FALSE,` +
    `FILTER(${bedrift},${betingelse}),TRUE),"Ingen bekreftet ennå"))`);

  const rader = 200;
  ark.getRange(hode + 1, 2, rader, 1).setFontWeight('bold');
  ark.getRange(hode + 1, 5, rader, 2).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP).setVerticalAlignment('top');
  ark.getRange(hode + 1, 2, rader, 4).setVerticalAlignment('top');
  ark.getRange(hode + 1, 7, rader, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setFontColor(FARGE.dempet).setVerticalAlignment('top');
  // Tynne skillelinjer mellom radene
  ark.getRange(hode + 1, 2, rader, kolonner.length)
    .setBorder(null, null, null, null, null, true, FARGE.linje, SpreadsheetApp.BorderStyle.SOLID);

  // Farger på status og pakke
  const statusOmr = ark.getRange(hode + 1, 3, rader, 1);
  const pakkeOmr = ark.getRange(hode + 1, 4, rader, 1);
  ark.setConditionalFormatRules(
    Object.keys(STATUSFARGE).map(st => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(st)
      .setBackground(STATUSFARGE[st][0]).setFontColor(STATUSFARGE[st][1]).setRanges([statusOmr]).build())
      .concat(Object.keys(PAKKEFARGE).map(p => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(p)
        .setBackground(PAKKEFARGE[p][0]).setFontColor(PAKKEFARGE[p][1]).setRanges([pakkeOmr]).build())));
}

// ===================== Bedriftsliste.gs =====================
/**
 * Oppdaterer Bedriftsliste (listen over aktuelle bedrifter) med hva Gmail vet om hver bedrift:
 * om den er kontaktet i høst, om den har svart, når den ble kontaktet tidligere, e-postadresse og
 * lenke til siste relevante tråd.
 *
 * Bedriften finnes ved å søke etter navnet i e-post til og fra WFD-adressen. Kategorirader i fet skrift
 * (f.eks. «Investment Banks») hoppes over. Bare systemets egne kolonner skrives; dine kolonner røres ikke.
 * Kjører i porsjoner og fortsetter av seg selv til hele listen er gått gjennom.
 */

const BL_KOLONNER = {
  host: 'Kontaktet høst 2026',
  svar: 'Svar fra bedrift',
  tidligere: 'Kontaktet tidligere',
  epost: 'E-post (fra Gmail)',
  trad: 'Siste relevante e-post',
};

function bedriftslisteArk_(ss) {
  const navn = ((KONFIG.ANDRE_FANER || [])[0] || {}).til || 'Bedriftsliste';
  return ss.getSheetByName(navn) || ss.getSheetByName(((KONFIG.ANDRE_FANER || [])[0] || {}).fra || 'Sheet1');
}

function oppdaterBedriftsliste() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const ark = bedriftslisteArk_(ss);
  if (!ark) {
    ui.alert('Fant ikke fanen Bedriftsliste.');
    return;
  }
  const svar = ui.alert('Oppdater Bedriftsliste fra Gmail',
    'For hver bedrift i «' + ark.getName() + '» søkes det etter navnet i e-post til og fra ' + KONFIG.WFD_ADRESSE + '.\n\n' +
    'Disse kolonnene legges til (eller oppdateres) til høyre:\n• ' + Object.keys(BL_KOLONNER).map(k => BL_KOLONNER[k]).join('\n• ') +
    '\n\nKolonnene og innholdet ditt endres ikke. Det kan ta noen minutter; du får en e-post når det er ferdig. Fortsette?',
    ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().setProperty('BL_POS', '0');
  fortsettBedriftsliste();
}

function fortsettBedriftsliste() {
  slettTriggere_('fortsettBedriftsliste');
  const egenskaper = PropertiesService.getScriptProperties();
  let pos = Number(egenskaper.getProperty('BL_POS'));
  if (isNaN(pos)) return;
  const ss = hentRegneark_();
  const ark = bedriftslisteArk_(ss);
  if (!ark) return;

  const start = Date.now();
  const kol = sikreBlKolonner_(ark);
  const antall = Math.max(ark.getLastRow() - 1, 0);
  if (!antall) return;
  const navn = ark.getRange(2, 1, antall, 1).getValues().map(r => String(r[0]).trim());
  const fet = ark.getRange(2, 1, antall, 1).getFontWeights().map(r => r[0] === 'bold');
  const grense = KONFIG.HISTORIKK_FRA_DATO; // starten på høstens booking
  const tz = Session.getScriptTimeZone();

  while (pos < antall && Date.now() - start < MAKS_KJORETID_MS) {
    const rad = pos + 2;
    const bedrift = navn[pos];
    if (bedrift && !fet[pos]) {
      const host = sisteEpostOm_(bedrift, 'after:' + grense);
      const for_ = sisteEpostOm_(bedrift, 'before:' + grense);
      const nyest = host || for_;
      ark.getRange(rad, kol.host + 1).setValue(host ? host.dato : '');
      ark.getRange(rad, kol.svar + 1).setValue(host ? (host.svar ? 'Ja' : 'Nei') : '');
      ark.getRange(rad, kol.tidligere + 1).setValue(for_ ? for_.dato : '');
      ark.getRange(rad, kol.epost + 1).setValue(nyest && nyest.kontakt ? nyest.kontakt : '');
      const lenke = ark.getRange(rad, kol.trad + 1);
      if (nyest) {
        const tekst = Utilities.formatDate(nyest.dato, tz, 'd.M.yy') + ' · ' + nyest.emne;
        lenke.setRichTextValue(SpreadsheetApp.newRichTextValue().setText(tekst).setLinkUrl(nyest.url).build());
      } else {
        lenke.setValue('');
      }
    }
    pos++;
    egenskaper.setProperty('BL_POS', String(pos));
  }

  if (pos >= antall) {
    egenskaper.deleteProperty('BL_POS');
    GmailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'WFD: Bedriftsliste er oppdatert fra Gmail',
      'Alle ' + antall + ' rader er gått gjennom. Se fanen «' + ark.getName() + '»: ' + ss.getUrl());
  } else {
    ScriptApp.newTrigger('fortsettBedriftsliste').timeBased().after(60 * 1000).create();
  }
}

/** Finner (eller lager) systemets kolonner i Bedriftsliste og gir dem felles stil. */
function sikreBlKolonner_(ark) {
  let sisteKol = Math.max(ark.getLastColumn(), 1);
  const overskrifter = ark.getRange(1, 1, 1, sisteKol).getValues()[0].map(v => String(v).trim());
  const kol = {};
  const mangler = [];
  Object.keys(BL_KOLONNER).forEach(k => {
    const i = overskrifter.indexOf(BL_KOLONNER[k]);
    if (i >= 0) kol[k] = i; else mangler.push(k);
  });
  mangler.forEach((k, n) => { kol[k] = sisteKol + n; });
  if (mangler.length) {
    ark.getRange(1, sisteKol + 1, 1, mangler.length).setValues([mangler.map(k => BL_KOLONNER[k])]);
  }
  const bredder = { host: 140, svar: 120, tidligere: 140, epost: 230, trad: 360 };
  const maks = Math.max(ark.getMaxRows() - 1, 1);
  Object.keys(kol).forEach(k => {
    ark.getRange(1, kol[k] + 1).setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold');
    ark.setColumnWidth(kol[k] + 1, bredder[k]);
  });
  [kol.host, kol.tidligere].forEach(k => ark.getRange(2, k + 1, maks, 1).setNumberFormat('d. mmm yyyy').setHorizontalAlignment('center'));
  ark.getRange(2, kol.svar + 1, maks, 1).setHorizontalAlignment('center');
  ark.getRange(2, kol.trad + 1, maks, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  ark.getRange(2, kol.epost + 1, maks, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  // Farger: grønn = svart i høst, gul = kontaktet uten svar.
  const svarOmr = ark.getRange(2, kol.svar + 1, maks, 1);
  const beholdes = ark.getConditionalFormatRules().filter(r => {
    const omr = r.getRanges ? r.getRanges() : [];
    return !(omr.length && omr.every(o => o.getColumn() === kol.svar + 1 && o.getNumColumns() === 1));
  });
  ark.setConditionalFormatRules(beholdes.concat([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Ja').setBackground('#DCFCE7').setFontColor('#166534').setRanges([svarOmr]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Nei').setBackground('#FEF3C7').setFontColor('#92400E').setRanges([svarOmr]).build(),
  ]));
  return kol;
}

/** Rensker bedriftsnavnet for søk: fjerner «(Premium)», «SSE:» og anførselstegn. */
function sokeNavn_(navn) {
  return String(navn)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^\s*[A-Za-zÆØÅæøå]{2,4}\s*:/, ' ')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Siste tråd til/fra WFD-adressen som faktisk handler om bedriften.
 * periode: f.eks. «after:2026/08/01» eller «before:2026/08/01».
 *
 * Et navnesøk gir også treff der bedriften bare er nevnt (f.eks. i en liste over deltakere i en mail til
 * en annen bedrift). Derfor teller en tråd bare hvis minst ett av disse stemmer:
 *  - motpartens domene ligner navnet (nbim.no → NBIM), eller
 *  - første e-post inviterer bedriften ved navn («invitere Kistefos», «invite Goldman Sachs»), eller
 *  - navnet står i emnefeltet.
 * Returnerer {dato, emne, url, kontakt, svar} eller null.
 */
function sisteEpostOm_(bedrift, periode) {
  const navn = sokeNavn_(bedrift);
  if (navn.length < 3) return null;
  const adr = KONFIG.WFD_ADRESSE;
  const sok = '"' + navn + '" {from:' + adr + ' to:' + adr + ' cc:' + adr + '} ' + periode + ' -in:chats -in:spam -in:trash';
  const trader = GmailApp.search(sok, 0, 8);
  if (!trader.length) return null;

  const normNavn = normaliserNavn_(navn);
  const trygt = navn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const invitasjon = new RegExp('invit\\w*\\s+(til\\s+)?' + trygt, 'i');
  const iEmne = new RegExp(trygt, 'i');

  let best = null;
  trader.forEach(t => {
    const meldinger = t.getMessages().filter(m => !m.isDraft());
    if (!meldinger.length) return;
    const motpart = finnMotpart_(meldinger);
    let poeng = 0;
    if (motpart && !motpart.privat) {
      const stamme = normaliserNavn_(motpart.domene.split('.').slice(-2, -1)[0]);
      if (stamme.length >= 3 && (normNavn.indexOf(stamme) === 0 || (normNavn.length >= 4 && stamme.indexOf(normNavn) === 0))) poeng += 3;
    }
    if (invitasjon.test(meldinger[0].getPlainBody().slice(0, 3000))) poeng += 2;
    if (iEmne.test(meldinger[0].getSubject())) poeng += 1;
    if (!poeng) return;
    const dato = t.getLastMessageDate();
    if (!best || poeng > best.poeng || (poeng === best.poeng && dato > best.dato)) {
      best = {
        poeng, dato,
        emne: meldinger[0].getSubject() || '(uten emne)',
        url: tradUrl_(t.getId()),
        kontakt: motpart ? motpart.epost : '',
        svar: meldinger.some(m => !erFraOss_(m)),
      };
    }
  });
  return best;
}
