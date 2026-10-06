// WFD booking-assistent – all koden i én fil. Lim inn i Kode.gs i Apps Script.
// Generert fra Konfig, Ark, AI, Innboks, Historikk, Oppfolging, Oppsett, Utseende, Bedriftsliste, Nettkontakter, Avkryssing, Godkjenning. Endre innstillingene i KONFIG øverst.

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

  // --- Invitasjoner (menyvalget «Lag invitasjoner til de som ikke er kontaktet») ---
  // {navn} = «Hei Helene» / «Hei» (fornavn fra e-postadressen når det går), {bedrift} = bedriftsnavnet.
  // Norsk brukes til .no-adresser, engelsk ellers. PDF-en hentes fra en invitasjon du allerede har sendt.
  INVITASJON_EMNE_NO: "Invitasjon til Women's Finance Day ved Norges Handelshøyskole 2027",
  INVITASJON_EMNE_EN: 'Invitation to Women’s Finance Day 2027 at NHH',
  INVITASJON_PDF_NO: 'WFD_2027_NO.pdf',
  INVITASJON_PDF_EN: 'WFD_2027_ENG',
  INVITASJON_NO: `{navn},

Vi har gleden av å invitere {bedrift} til Women’s Finance Day 2027 ved NHH.

Women’s Finance Day samler kvinnelige NHH-studenter og finansbransjen. Arrangementet arrangeres av Næringslivsutvalget, Finansgruppen og Femme Forvaltning ved NHH. Målet er å inspirere flere kvinner til en karriere innen finans, samtidig som samarbeidspartnerne får møte dyktige studenter og styrke sin synlighet som arbeidsgiver.

WFD 2026 ble en stor suksess. Studentpåmeldingen ble fulltegnet på under ett minutt, med over 100 studenter på venteliste. I etterkant oppga 84 prosent av respondentene at WFD i stor grad hadde økt interessen deres for finans.

Gjennom stands, foredrag, paneldebatt, workshops og nettverksaktiviteter får samarbeidspartnerne møte studentene både bredt og i mindre, faglig orienterte grupper. Premium-partnere kan i tillegg arrangere en egen nettverksøkt i forbindelse med WFD eller WFP, samt promotere internship- og graduate-stillinger gjennom våre kanaler.

Datoene for 2027 er:

• Women’s Finance Program: onsdag 3. mars
• Women’s Finance Day: torsdag 4. mars

I den vedlagte invitasjonen finner dere mer informasjon om årets samarbeidsmuligheter, pakker og priser.

Dersom dere ønsker å delta, svar gjerne på denne e-posten innen fredag 16. oktober. Gi også beskjed dersom invitasjonen bør sendes til en annen person.

Vi håper å ønske {bedrift} velkommen til WFD 2027!`,
  INVITASJON_EN: `{navn},

We would be delighted to invite {bedrift} to Women’s Finance Day at NHH in Bergen next March.

Women’s Finance Day brings together female NHH students and the finance industry. The event is organised by the Business Committee, the Finance Group and Femme Forvaltning at NHH. Our aim is to inspire more women to explore careers in finance, while giving our partners the opportunity to meet talented students and strengthen their visibility as employers.

Our workshops and main programme are exclusively for female students, while the company stands are open to all NHH students.

In 2026, all student places were filled in less than one minute, with more than 100 students joining the waiting list. After the event, 84% of respondents said that WFD had significantly increased their interest in finance.

Through company stands, presentations, panel discussions, workshops and networking activities, our partners can meet students both broadly and in smaller, professionally focused groups. Premium partners may also host a separate networking session, promote internship and graduate opportunities through our channels, and organise a workshop during WFD or the Women’s Finance Program.

The dates for 2027 are:

• Women’s Finance Program: Wednesday, 3 March
• Women’s Finance Day: Thursday, 4 March

Please find attached an invitation with further information about the partnership opportunities, packages and prices.

If {bedrift} would like to participate, please reply by Friday, 16 October. Please also feel free to forward the invitation to the relevant colleague if someone else is responsible for partnerships or recruitment activities.

We hope to welcome {bedrift} to Women’s Finance Day 2027!`,
  SIGNATUR_EN: `
Best regards,
Ellinor Hangerhagen
Head of Booking
Women’s Finance Day
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
  // false: alle bedrifter WFD har skrevet med om Women's Finance Day siden HISTORIKK_FRA_DATO kommer med, så Booking
  // blir en fullstendig oversikt. Private adresser (gmail.com o.l.) blir aldri nye rader fra historikken.
  HISTORIKK_BARE_KJENTE: false,
  // true: AI leser hver gamle tråd og fyller inn status og oppsummering (krever API-nøkkel).
  HISTORIKK_MED_AI: false,

  // --- Oppfølging ---
  PURR_ETTER_DAGER: 7,          // Når en bedrift ikke har svart på så mange dager, foreslås purring.
  DAGLIG_OPPSUMMERING_KL: 8,
  BEDRIFTSLISTE_HVER_NATT_KL: 3, // Bedriftsliste oppdateres fra Gmail hver natt (0–23). null = av.    // Klokkeslett for daglig oppsummering på e-post (0–23). null = av.
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

  // Kolonner i Booking som skjules av «Gjør arbeidsboken ryddig og pen» fordi Status (og Trenger svar) viser det samme.
  // Før de skjules, får Status med det du har skrevet der. De oppdateres fortsatt i bakgrunnen.
  // Vis en igjen: marker kolonnene rundt, høyreklikk → «Vis kolonner». Sett til [] for å vise alt.
  SKJUL_I_BOOKING: ['Invitasjon sendt', 'Respons', 'Med', 'Siste e-post fra', 'Utkast laget', 'Lås'],

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
  ARK_IKKE_KONTAKTET: 'Ikke kontaktet',
  ARK_GJOREMAL: 'Gjøremål',
  ARK_GODKJENNING: 'Til godkjenning',

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

/**
 * Autosvar («Automatic reply», «Autosvar», fravær) og feilmeldinger fra e-postsystemet (mailer-daemon).
 * Slike regnes ikke som svar fra bedriften.
 */
function erAutomatisk_(melding) {
  const fra = (tolkAdresser_(melding.getFrom())[0] || {}).epost || '';
  if (fra && erIgnorert_(fra)) return true;
  return /^\s*(automatic reply|auto(matisk)?\s*svar|autosvar|automatiskt svar|out of office|fraværende|frånvarande|abwesend|undeliverable|delivery status notification|ikke levert|auto:)/i
    .test(melding.getSubject() || '');
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
  const alle = trad.getMessages().filter(m => !m.isDraft() && !m.isInTrash() && !erAutomatisk_(m));
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

  const treff = {};
  let rad = finnRad_(tabell, motpart, '', treff);
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
  if (rad < 0 && analyse && analyse.bedrift) rad = finnRad_(tabell, motpart, analyse.bedrift, treff);
  const ny = rad < 0;
  // Historikken lager aldri nye rader for private adresser (gmail.com o.l.) – det er som regel ikke bedrifter.
  if (ny && tilstand.historikk && (KONFIG.HISTORIKK_BARE_KJENTE || motpart.privat)) {
    lagreTrad_(trader, tradId, motpart.nokkel, siste.getDate(), alle.length);
    return false;
  }
  if (ny) {
    rad = nyRad_(tabell);
    // Navnet fra Bedriftsliste hvis bedriften står der (nysnoinvest.no → «Nysnø climate investments»), ellers fra domenet.
    settCelle_(tabell, rad, 'bedrift', (analyse && analyse.bedrift) || (motpart.privat ? motpart.navn || motpart.epost
      : navnFraBedriftsliste_(motpart.domene) || navnFraDomene_(motpart.domene)));
    settCelle_(tabell, rad, 'forsteKontakt', alle[0].getDate());
    foreslaa_(celle_(tabell, rad, 'bedrift'), 'Ny bedrift fra Gmail (lagt til i Booking)', '', celle_(tabell, rad, 'bedrift'),
      motpart.epost + ' – ' + siste.getSubject(), tradUrl_(tradId),
      { type: 'nyBedrift', nokkel: 'ny|' + (motpart.privat ? motpart.epost : motpart.domene) });
  } else if (treff.usikker) {
    const b = celle_(tabell, rad, 'bedrift');
    foreslaa_(b, 'E-post koblet til bedriften fordi domenet ligner navnet', motpart.epost, b,
      'Avvis hvis ' + motpart.domene + ' ikke er ' + b + ' – da kobles domenet aldri til bedriften igjen. ' + siste.getSubject(),
      tradUrl_(tradId), { type: 'kobling', domene: motpart.domene || motpart.epost, nokkel: koblingsNokkel_(motpart.domene || motpart.epost, b) });
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
  // Sikkert: at e-post er sendt/mottatt. Usikkert (tolket fra teksten): ja/nei/bekreftet – det går til godkjenning.
  const sisteDeres = alle.filter(m => !erFraOss_(m)).pop();
  const tolket = !analyse && sisteDeres ? tolkSvarUtenAI_(rensTekst_(sisteDeres.getPlainBody())) : null;
  const tolketStatus = analyse ? analyse.status : (tolket ? tolket.status : '');
  const faktisk = (nyeFraDem || sisteDeres) ? 'I dialog' : (alle.length >= 2 ? 'Purret' : 'Kontaktet');
  const foreslatt = tolketStatus && USIKRE_STATUSER.indexOf(tolketStatus) < 0 ? tolketStatus : faktisk;
  const statusEtter = last ? statusFor : velgStatus_(statusFor, foreslatt);
  let tilGodkjenning = '';
  if (!last && sisteDeres && USIKRE_STATUSER.indexOf(tolketStatus) >= 0 && velgStatus_(statusEtter, tolketStatus) !== statusEtter) {
    const tekstDeres = rensTekst_(sisteDeres.getPlainBody());
    const pakke = (tolket && tolket.pakke) || (tolketStatus === 'Bekreftet' ? pakkeFraEpost_(tekstDeres) : '');
    if (foreslaa_(bedrift, 'Status ut fra svaret' + (analyse ? ' (AI)' : ''), statusEtter, tolketStatus + (pakke ? ' · ' + pakke : ''),
      tekstDeres, tradUrl_(tradId), { type: 'status', verdi: tolketStatus, pakke, nesteSteg: NESTE_STEG_ETTER_SVAR[tolketStatus] || '',
        nokkel: 'status|' + normaliserNavn_(bedrift) + '|' + sisteDeres.getId() + '|' + tolketStatus }) ||
      forslagStatus_('status|' + normaliserNavn_(bedrift) + '|' + sisteDeres.getId() + '|' + tolketStatus) === VENTER) {
      tilGodkjenning = tolketStatus;
    }
  }
  if (!last) {
    settCelle_(tabell, rad, 'status', statusEtter);
    speilStatus_(tabell, rad, statusEtter);
    if (tabell.kol.pakke !== undefined && !celle_(tabell, rad, 'pakke')) {
      const fraDem = alle.filter(m => !erFraOss_(m)).map(m => rensTekst_(m.getPlainBody())).join('\n');
      const pakke = pakkeFraEpost_(fraDem);
      if (pakke && tilGodkjenning !== 'Bekreftet') {
        foreslaa_(bedrift, 'Pakke 2027 ut fra e-posten', '', pakke, setningMed_(fraDem, /premium|partner/i), tradUrl_(tradId),
          { type: 'pakke', nokkel: 'pakke|' + normaliserNavn_(bedrift) + '|' + pakke });
      }
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
  const oppsummering = (tilGodkjenning ? 'Forslag: ' + tilGodkjenning + ' (venter på godkjenning) · ' : '') +
    (analyse ? analyse.oppsummering : enkelOppsummering_(siste));
  if (erNyest) {
    settCelle_(tabell, rad, 'sistKontakt', siste.getDate());
    settCelle_(tabell, rad, 'retning', sisteFraDem ? 'Bedriften' : 'Oss');
    // Ved historikkimport regnes bare nylige e-poster som ubesvarte.
    const fersk = !tilstand.historikk || dagerSiden_(siste.getDate()) <= 14;
    settCelle_(tabell, rad, 'trengerSvar', sisteFraDem && fersk && (!analyse || analyse.trenger_svar) ? 'Ja' : 'Nei');
    settCelle_(tabell, rad, 'oppsummering', oppsummering);
    if (tilGodkjenning) settCelle_(tabell, rad, 'nesteSteg', 'Godkjenn eller avvis «' + tilGodkjenning + '» i fanen ' + KONFIG.ARK_GODKJENNING);
    else if (analyse && analyse.neste_steg) settCelle_(tabell, rad, 'nesteSteg', analyse.neste_steg);
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

/**
 * Gratis tolkning av svar uten AI: ser etter tydelige formuleringer i bedriftens siste e-post.
 * Returnerer { status, tekst } eller null hvis svaret ikke er tydelig (da blir status «I dialog»).
 * Bevisst forsiktig: et «nei» vinner over et «ja» («vi skulle gjerne vært med, men har dessverre ikke mulighet»).
 */
const SVAR_NEI = new RegExp([
  'takk(er|e)? nei', 'm[åa] (dessverre |nok )?(takke|si) nei', 'dessverre[^.!?]{0,80}\\b(ikke|ingen|vanskelig)\\b',
  '\\bikke (anledning|mulighet|kapasitet)', 'passer (dessverre |nok )?ikke', 'blir (nok |litt |dessverre )?(for )?vanskelig', 'vanskelig [åa] f[åa] (det )?til',
  'kan (dessverre |nok )?ikke (delta|stille|v[æa]re med)', '\\bavst[åa]r\\b', 'ikke (prioritere|delta i [åa]r)',
  'unfortunately', 'not be able to', 'unable to (join|attend|participate)', "won'?t be (able|joining|participating)",
  'will have to (decline|pass)', 'decline', 'not (participate|join|attend)', 'too far', 'tyv[äa]rr', 'inte (delta|m[öo]jlighet)',
].join('|'), 'i');
const SVAR_JA = new RegExp([
  'blir (gjerne|veldig gjerne|selvf[øo]lgelig) med', 'melder oss (gjerne )?p[åa]', '(vil|vi) (gjerne|selvf[øo]lgelig) (v[æa]re med|delta|stille)',
  '[øo]nsker (gjerne )?[åa] (delta|stille|v[æa]re med)', 'vi deltar', 'bekrefter (v[åa]r )?deltakelse', 'vil v[æa]re med',
  'v[æa]re med p[åa] dette', "we('d| would)? (love|be happy|be glad) to (join|participate|attend)", 'count us in',
  'happy to (join|participate)', 'we confirm', 'g[äa]rna (med|delta)',
].join('|'), 'i');

// Statuser systemet bare kan gjette ut fra teksten – de foreslås, aldri satt direkte.
const USIKRE_STATUSER = ['Takket nei', 'Interessert', 'Tilbud sendt', 'Bekreftet'];

/** Første setning i teksten som passer mønsteret (til «Grunnlag» i Til godkjenning). */
function setningMed_(tekst, monster) {
  const setninger = String(tekst || '').split(/\n+|(?<=[.!?])\s+/);
  return (setninger.find(x => monster.test(x)) || '').trim().slice(0, 250);
}

const NESTE_STEG_ETTER_SVAR = {
  'Takket nei': 'Send en kort takk, og spør om dere kan ta kontakt neste år',
  'Interessert': 'Bekreft plassen og avklar pakke (Premium partner / Partner)',
  'Bekreftet': 'Bekreft og send praktisk info',
};

function tolkSvarUtenAI_(tekst) {
  const t = String(tekst || '').replace(/\s+/g, ' ');
  if (!t) return null;
  if (SVAR_NEI.test(t)) return { status: KONFIG.STATUS_NEI, tekst: 'Takket nei' };
  if (SVAR_JA.test(t)) {
    const pakke = pakkeFraEpost_(t);
    return pakke ? { status: 'Bekreftet', tekst: 'Bekreftet som ' + pakke, pakke } : { status: 'Interessert', tekst: 'Vil gjerne være med' };
  }
  return null;
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
      const b = celle_(tabell, i, 'bedrift');
      if (p) foreslaa_(b, 'Pakke 2027 ut fra e-posten', '', p, setningMed_(samlet, /premium|partner/i), '',
        { type: 'pakke', nokkel: 'pakke|' + normaliserNavn_(b) + '|' + p });
    }
    leggTilOnsker_(tabell, i, onskerFraEpost_(samlet));
    if (String(celle_(tabell, i, 'onsker')) + String(celle_(tabell, i, 'pakke')) !== for_) oppdatert++;
  }
  return oppdatert;
}


/**
 * Leser bedriftenes siste svar på nytt (uten AI) og oppdaterer status der svaret tydelig er et ja eller nei.
 * For e-poster som kom før tolkningen fantes. Endrer bare fremover (unntatt «Takket nei»), og aldri låste rader.
 */
function lesSvarPaNytt() {
  const ui = SpreadsheetApp.getUi();
  const tabell = lesBedrifter_();
  const endret = [];
  const start = Date.now();
  tabell.rader.forEach((r, i) => {
    if (Date.now() - start > MAKS_KJORETID_MS) return;
    const tradId = String(celle_(tabell, i, 'tradId')).trim();
    const for_ = String(celle_(tabell, i, 'status'));
    if (!tradId || erLast_(tabell, i) || for_ === KONFIG.STATUS_NEI || for_ === 'Bekreftet') return;
    let trad;
    try { trad = GmailApp.getThreadById(tradId); } catch (e) { return; }
    if (!trad) return;
    const deres = trad.getMessages().filter(m => !m.isDraft() && !erAutomatisk_(m) && !erFraOss_(m)).pop();
    const tolket = deres ? tolkSvarUtenAI_(rensTekst_(deres.getPlainBody())) : null;
    if (!tolket) return;
    const etter = velgStatus_(for_, tolket.status);
    if (etter === for_) return;
    const bedrift = celle_(tabell, i, 'bedrift');
    const tekst = rensTekst_(deres.getPlainBody());
    const nokkel = 'status|' + normaliserNavn_(bedrift) + '|' + deres.getId() + '|' + tolket.status;
    if (!foreslaa_(bedrift, 'Status ut fra svaret', for_, tolket.status + (tolket.pakke ? ' · ' + tolket.pakke : ''), tekst,
      tradUrl_(tradId), { type: 'status', verdi: tolket.status, pakke: tolket.pakke || '',
        nesteSteg: NESTE_STEG_ETTER_SVAR[tolket.status] || '', nokkel })) return;
    settCelle_(tabell, i, 'nesteSteg', 'Godkjenn eller avvis «' + tolket.status + '» i fanen ' + KONFIG.ARK_GODKJENNING);
    endret.push(bedrift + ': ' + for_ + ' → ' + tolket.status + '?');
  });
  ui.alert(endret.length
    ? endret.length + ' forslag ligger nå i fanen «' + KONFIG.ARK_GODKJENNING + '». Ingenting er endret før du godkjenner:\n\n• ' +
      endret.join('\n• ')
    : 'Fant ingen nye tydelige ja- eller nei-svar.');
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
  const ventende = godkjenninger_().filter(g => g.status === VENTER);
  const linjer = [];
  if (ventende.length) {
    linjer.push('VENTER PÅ GODKJENNING (' + ventende.length + ') – se fanen «' + KONFIG.ARK_GODKJENNING + '»');
    linjer.push(ventende.slice(0, 15).map(g => '• ' + g.data.bedrift + ': ' + g.data.type + ' → ' + g.data.verdi).join('\n') +
      (ventende.length > 15 ? '\n• …' : ''));
    linjer.push('');
  }
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
    'WFD booking: ' + trengerSvar.length + ' trenger svar, ' + forfalte.length + ' bør purres' +
      (ventende.length ? ', ' + ventende.length + ' til godkjenning' : ''),
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
    .addItem('Les svarene og oppdater status (ja/nei)', 'lesSvarPaNytt')
    .addItem('Lag purreutkast', 'lagPurreutkast')
    .addItem('Send oppsummering nå', 'dagligOppsummering')
    .addSeparator()
    .addItem('Oppdater Bedriftsliste fra Gmail', 'oppdaterBedriftsliste')
    .addItem('Lag invitasjoner til de som ikke er kontaktet', 'lagInvitasjoner')
    .addItem('Gjør arbeidsboken ryddig og pen', 'ryddArbeidsbok')
    .addItem('Legg bedrifter fra Booking inn i Bedriftsliste', 'leggBookingIBedriftslisteMeny')
    .addItem('Fjern ekstra farger i Booking', 'fjernEkstraFarger')
    .addItem('Stopp all automatikk', 'stoppAutomatikk')
    .addItem('Rydd opp: fjern systemets kolonner fra denne fanen', 'ryddFane')
    .addSeparator()
    .addItem('Nytt år: arkiver Booking og start på nytt', 'nySesong')
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
    const interne = [KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_FJOR, KONFIG.ARK_BEDRIFTSOVERSIKT, KONFIG.ARK_IKKE_KONTAKTET,
      KONFIG.ARK_GJOREMAL, KONFIG.ARK_GODKJENNING, KONFIG.ARK_TRADER];
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
  if (KONFIG.BEDRIFTSLISTE_HVER_NATT_KL !== null && bedriftslisteArk_(ss)) {
    ScriptApp.newTrigger('nattligBedriftsliste').timeBased().everyDays(1)
      .atHour(KONFIG.BEDRIFTSLISTE_HVER_NATT_KL).nearMinute(0).create();
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
  ['sjekkInnboks', 'dagligOppsummering', 'fortsettHistorikk', 'fortsettBedriftsliste', 'nattligBedriftsliste'].forEach(slettTriggere_);
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
  if ([KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_FJOR, KONFIG.ARK_BEDRIFTSOVERSIKT, KONFIG.ARK_IKKE_KONTAKTET, KONFIG.ARK_TRADER].indexOf(ark.getName()) >= 0) {
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


/**
 * Nytt år (gjøres etter at årets WFD er ferdig): Booking arkiveres som en skjult kopi og tømmes, mens Bedriftsliste
 * beholdes med alle bedriftene. Årsspesifikke kolonner i Bedriftsliste (kontaktet i høst, svar, koblingen til Booking,
 * «Har kontaktet») tømmes; «Ikke aktuell», kontakter og dine egne kolonner blir stående.
 */
function nySesong() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const tabell = lesBedrifter_();
  const ar = new Date().getFullYear();
  const arkivNavn = tabell.ark.getName() + ' ' + ar + ' (arkiv)';
  const svar = ui.alert('Nytt år – start booking på nytt',
    'Dette gjøres:\n\n' +
    '• «' + tabell.ark.getName() + '» kopieres til en skjult fane «' + arkivNavn + '» (ingenting går tapt)\n' +
    '• Alle bedriftsradene i «' + tabell.ark.getName() + '» slettes (overskriftene blir stående)\n' +
    '• Bedriftsliste beholdes. Kolonnene for i år tømmes: kontaktet i høst, svar, siste e-post, «Navn i Booking» ' +
    'og «Har kontaktet». «Ikke aktuell», kontakter og dine egne kolonner blir stående\n' +
    '• Automatikken stoppes til du har kjørt «1. Sett opp» på nytt\n\n' +
    'Gjør dette først når årets WFD er ferdig. Fortsette?', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;
  const sikker = ui.alert('Er du helt sikker?', 'Booking tømmes for ' + tabell.rader.length + ' bedrifter (kopien beholdes i «' +
    arkivNavn + '»).', ui.ButtonSet.YES_NO);
  if (sikker !== ui.Button.YES) return;

  stoppAutomatikk(true);
  const kopi = tabell.ark.copyTo(ss).setName(arkivNavn);
  kopi.hideSheet();
  if (tabell.ark.getLastRow() > 1) tabell.ark.deleteRows(2, tabell.ark.getLastRow() - 1);

  const liste = bedriftslisteArk_(ss);
  if (liste && liste.getLastRow() > 1) {
    const h = overskrifter_(liste);
    BL_AUTO.concat(['bookingNavn', 'manuelt']).forEach(k => {
      const kol = h.indexOf(BL_KOLONNER[k]) + 1;
      if (kol) liste.getRange(2, kol, liste.getLastRow() - 1, 1).clearContent();
    });
  }
  const trader = ss.getSheetByName(KONFIG.ARK_TRADER);
  if (trader && trader.getLastRow() > 1) trader.deleteRows(2, trader.getLastRow() - 1);
  PropertiesService.getScriptProperties().deleteProperty('NETTKONTAKTER_FYLT');

  ui.alert('Ferdig. Booking er tom, og fjorårets ligger i den skjulte fanen «' + arkivNavn + '».\n\n' +
    'Før du starter igjen, oppdater i Konfig: ARRANGEMENT (datoer, pakker, priser), HISTORIKK_FRA_DATO, ' +
    'INVITASJON_NO/EN og kolonnenavnene «Pakke ' + (ar + 1) + '» og «Kontaktet høst ' + ar + '» (BL_KOLONNER). ' +
    'Kjør så «1. Sett opp arket og automatikk».');
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
  const tommeKol = tommeKolonner_(tabell);
  if (tommeKol.length) {
    plan.push('Tomme kolonner mellom tabellen din og systemkolonnene slettes: ' +
      tommeKol.map(k => kolonneBokstav_(k)).join(', '));
  }
  const skjul = (KONFIG.SKJUL_I_BOOKING || []).filter(n => kolonneMedNavn_(bookingArk, n) > 0);
  if (skjul.length) {
    plan.push('Status blir eneste statuskolonne. Først får Status med det du har skrevet i ' +
      skjul.filter(n => Object.values(KONFIG.SPEIL || {}).indexOf(n) >= 0).map(n => '«' + n + '»').join(', ') +
      '. Deretter skjules ' + skjul.map(n => '«' + n + '»').join(', ') + ' (de slettes ikke)');
  }
  plan.push('Systemkolonnene får samme skrift og overskriftsfarge som tabellen din. Domene og Tråd-ID skjules');
  const blArk = bedriftslisteArk_(ss);
  if (blArk) {
    plan.push('Bedriftsliste: Kategori, Kontaktstatus, «Har kontaktet» (avkrysning), e-post og «Annen kontakt» flyttes rett etter ' +
      'bedriftsnavnet. Kontakter hentet fra nettet legges i «Annen kontakt» og markeres oransje. Kategorirader utheves, ' +
      'og alle kolonnene får filterknapper');
  }
  const iBooking = blArk ? bareIBooking_(ss) : { mangler: [], kobles: [] };
  const bareBooking = iBooking.mangler;
  if (iBooking.kobles.length) plan.push(iBooking.kobles.length + ' bedrifter i Bedriftsliste kobles til raden sin i Booking (samme navn)');
  if (bareBooking.length) {
    plan.push(bareBooking.length + ' bedrifter som bare står i Booking legges nederst i Bedriftsliste («' + NYE_FRA_BOOKING +
      '»): ' + bareBooking.slice(0, 6).map(m => m.navn).join(', ') + (bareBooking.length > 6 ? ' …' : ''));
  }
  const nyeNavn = autonavnIBooking_(tabell);
  if (nyeNavn.length) {
    plan.push('Booking: ' + nyeNavn.length + ' bedrifter med navn laget av e-postdomenet får navnet fra Bedriftsliste (' +
      nyeNavn.slice(0, 4).map(p => p[0] + ' → ' + p[1]).join(', ') + (nyeNavn.length > 4 ? ' …' : '') + ')');
  }
  plan.push('Oversikt og «' + KONFIG.ARK_IKKE_KONTAKTET + '» får avkrysning: «Trenger svar» og «Bør purres» kan krysses av, ' +
    'og bedrifter kan merkes som kontaktet selv om Gmail ikke fanger det opp');
  if (!ss.getSheetByName(KONFIG.ARK_GJOREMAL)) {
    plan.push('Ny fane «' + KONFIG.ARK_GJOREMAL + '»: egne oppgaver med avkrysning, med de åpne oppgavene vi har nå');
  }
  plan.push('Oversikt blir et dashbord, «' + KONFIG.ARK_FJOR + '» sammenligner med fjoråret, og Logg får en ryddig tabell');
  plan.push('Ny fane «' + KONFIG.ARK_GODKJENNING + '»: alt systemet gjetter på (ja/nei-svar, pakke, nye bedrifter, usikre koblinger, ' +
    'kontakter fra nettet) venter der til du godkjenner eller avviser');
  plan.push('Fanene sorteres: Oversikt, ' + KONFIG.ARK_GODKJENNING + ', ' + KONFIG.ARK_GJOREMAL + ', ' + KONFIG.ARK_IKKE_KONTAKTET + ', ' + KONFIG.ARK_FJOR + ', ' + KONFIG.ARK_BEDRIFTSOVERSIKT + ', Booking, Bedriftsliste, Logg');

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

  // Tomme kolonner: slett fra høyre mot venstre så numrene ikke forskyves underveis.
  tommeKol.slice().sort((a, b) => b - a).forEach(k => bookingArk.deleteColumn(k));

  // 3. Status som eneste statuskolonne
  const oppdatertStatus = skjul.length ? synkStatusFraEgneKolonner_(lesBedrifter_()) : 0;

  // 4. Bedriftsliste og navn i Booking
  let nettFylt = 0;
  if (blArk) {
    const kolBl = ordneBedriftsliste_(blArk);
    nettFylt = fyllNettkontakter_(blArk, kolBl);
  }
  const omdopt = gjorOmAutonavn_(lesBedrifter_(), nyeNavn);
  const lagtTilListe = blArk ? leggBookingIBedriftsliste_().lagtTil : [];

  // 5. Utseende
  tabell = plasserPakkeKolonne_(lesBedrifter_());
  stilAlleFaner_(ss, tabell);
  skjul.forEach(n => {
    const k = kolonneMedNavn_(tabell.ark, n);
    if (k > 0) tabell.ark.hideColumns(k);
  });

  // 6. Tomme faner: spør for seg, siden sletting ikke kan angres med Ctrl+Z.
  const tomme = ss.getSheets().filter(a => {
    const n = a.getName();
    if (n === tabell.ark.getName() || [KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_FJOR, KONFIG.ARK_BEDRIFTSOVERSIKT,
      KONFIG.ARK_IKKE_KONTAKTET, KONFIG.ARK_GJOREMAL, KONFIG.ARK_GODKJENNING, KONFIG.ARK_TRADER].indexOf(n) >= 0) return false;
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
  ui.alert('Ferdig!' + (oppdatertStatus ? '\n\nStatus ble oppdatert på ' + oppdatertStatus + ' rader ut fra kolonnene dine.' : '') +
    (nettFylt ? '\n\n' + nettFylt + ' kontakter fra nettet er lagt inn i Bedriftsliste (oransje – sjekk før bruk).' : '') +
    (omdopt ? '\n\n' + omdopt + ' bedrifter i Booking fikk navnet fra Bedriftsliste.' : '') +
    (lagtTilListe.length ? '\n\n' + lagtTilListe.length + ' bedrifter fra Booking er lagt nederst i Bedriftsliste – flytt dem til riktig kategori.' : '') +
    (feil.length ? '\n\nMerk:\n' + feil.join('\n') : ''));
}

/**
 * Kolonner i booking-fanen som er helt tomme (også overskriften) og ligger før den første systemkolonnen,
 * f.eks. et mellomrom mellom tabellen din og Status. Returnerer kolonnenumre (1-basert).
 */
function tommeKolonner_(tabell) {
  const ark = tabell.ark;
  const system = systemKolonner_(tabell).map(n => tabell.kol[n] + 1);
  if (!system.length) return [];
  const forsteSystem = Math.min.apply(null, system);
  const hoyde = Math.max(ark.getLastRow(), 1);
  const verdier = ark.getRange(1, 1, hoyde, forsteSystem - 1 || 1).getValues();
  const ut = [];
  for (let k = 1; k < forsteSystem; k++) {
    if (verdier.every(rad => rad[k - 1] === '' || rad[k - 1] === null)) ut.push(k);
  }
  return ut;
}

/**
 * Bedrifter i Booking som har fått navn fra e-postdomenet (f.eks. «Fsncapital», «Nysnoinvest») og som finnes i
 * Bedriftsliste med et ordentlig navn. Returnerer [[gammelt, nytt], …]. Hopper over navn som allerede står i Booking.
 */
function autonavnIBooking_(tabell) {
  if (tabell.kol.domene === undefined) return [];
  const finnes = {};
  tabell.rader.forEach((r, i) => { finnes[String(celle_(tabell, i, 'bedrift')).trim().toLowerCase()] = true; });
  const ut = [];
  tabell.rader.forEach((r, i) => {
    const domene = String(celle_(tabell, i, 'domene')).trim().toLowerCase();
    const gammelt = String(celle_(tabell, i, 'bedrift')).trim();
    if (!domene || !gammelt || gammelt !== navnFraDomene_(domene)) return;
    const nytt = navnFraBedriftsliste_(domene);
    if (!nytt || nytt === gammelt || finnes[nytt.toLowerCase()]) return;
    finnes[nytt.toLowerCase()] = true;
    ut.push([gammelt, nytt]);
  });
  return ut;
}

/** Gir radene i Booking nye navn (og retter navnet i Logg, så historikken følger med). Returnerer antall. */
function gjorOmAutonavn_(tabell, par) {
  if (!par.length) return 0;
  const kart = {};
  par.forEach(([g, n]) => { kart[g] = n; });
  let antall = 0;
  tabell.rader.forEach((r, i) => {
    const nytt = kart[String(celle_(tabell, i, 'bedrift')).trim()];
    if (nytt) { settCelle_(tabell, i, 'bedrift', nytt); antall++; }
  });
  const logg = tabell.ark.getParent().getSheetByName(KONFIG.ARK_LOGG);
  if (logg && logg.getLastRow() > 1) {
    const omr = logg.getRange(2, 2, logg.getLastRow() - 1, 1);
    const v = omr.getValues();
    if (v.some(r => kart[String(r[0]).trim()])) omr.setValues(v.map(r => [kart[String(r[0]).trim()] || r[0]]));
  }
  return antall;
}

/** Formel for betinget formatering: venter et forslag for bedriften i cellen på godkjenning? */
function ventendeFormel_(celle) {
  const G_ = "'" + KONFIG.ARK_GODKJENNING + "'!";
  return `=COUNTIFS(INDIRECT("${G_}B:B"),$${celle.replace(/(\d+)$/, '')}${celle.match(/\d+$/)[0]},INDIRECT("${G_}J:J"),"${VENTER}")>0`;
}

/** Kolonnenummeret (1-basert) med denne overskriften i rad 1, eller 0. */
function kolonneMedNavn_(ark, navn) {
  const h = ark.getRange(1, 1, 1, Math.max(ark.getLastColumn(), 1)).getValues()[0].map(v => String(v).trim());
  return h.indexOf(navn) + 1;
}

/**
 * Tar med det du har skrevet i Invitasjon sendt / Respons / Med inn i Status, så Status alene er riktig
 * før de kolonnene skjules. Flytter bare fremover, og et «Takket nei» i Status røres ikke.
 */
function synkStatusFraEgneKolonner_(tabell) {
  let antall = 0;
  tabell.rader.forEach((r, i) => {
    if (!String(celle_(tabell, i, 'bedrift')).trim()) return;
    const gammel = String(celle_(tabell, i, 'status')).trim();
    if (gammel === KONFIG.STATUS_NEI) return;
    const fraEgne = statusFraEgneKolonner_(tabell, i);
    if (fraEgne === KONFIG.STATUSER[0]) return;
    const ny = velgStatus_(gammel, fraEgne);
    if (ny && ny !== gammel) {
      tabell.ark.getRange(i + 2, tabell.kol.status + 1).setValue(ny);
      antall++;
    }
  });
  return antall;
}

function sorterFaner_(ss, tabell) {
  const rekkefolge = [
    [KONFIG.ARK_OVERSIKT, FANEFARGE.rapport],
    [KONFIG.ARK_GODKJENNING, '#EA580C'],
    [KONFIG.ARK_GJOREMAL, FANEFARGE.rapport],
    [KONFIG.ARK_IKKE_KONTAKTET, FANEFARGE.rapport],
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
  godkjenningsArk_(ss); // må finnes før Oversikt og Booking viser hvor mange som venter
  stilBooking_(tabell);
  stilLogg_(ss);
  (KONFIG.ANDRE_FANER || []).forEach(f => { const a = ss.getSheetByName(f.til); if (a) stilEnkelListe_(a); });
  lagOversikt_(ss, tabell);
  lagFjorFane_(ss, tabell);
  lagBedriftsoversikt_(ss, tabell);
  lagIkkeKontaktetFane_(ss);
  lagGjoremal_(ss);
  stilGodkjenning_(godkjenningsArk_(ss));
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
  // Overskriftsfargen hentes fra tabellen din, så alt ser likt ut.
  const hodeFarge = (() => {
    const f = String(ark.getRange(1, 1).getBackground() || '').toLowerCase();
    return f && f !== '#ffffff' && f !== 'white' ? f : FARGE.indigo;
  })();
  systemKolonner_(tabell).forEach(n => {
    ark.getRange(1, kol(n))
      .setBackground(hodeFarge).setFontColor(FARGE.hvit).setFontWeight('bold')
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
  // Oransje status = et automatisk forslag for bedriften venter på godkjenning (står først, så den vinner).
  nye.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(ventendeFormel_(kolonneBokstav_(kol('bedrift')) + '2'))
    .setBackground('#FDBA74').setFontColor('#7C2D12').setBold(true).setRanges([statusOmr]).build());
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

  // Samme skrift og radhøyde i hele fanen som i tabellen din (kolonne A). Farger og innhold røres ikke.
  const mal = ark.getRange(2, 1);
  const skrift = mal.getFontFamily() || 'Calibri';
  const storrelse = mal.getFontSize() || 11;
  const antall = ark.getLastRow() - 1;
  if (antall > 0) {
    ark.getRange(2, 1, antall, ark.getLastColumn()).setFontFamily(skrift).setFontSize(storrelse);
    ark.setRowHeights(2, antall, 26);
  }
  ark.getRange(1, 1, 1, ark.getLastColumn()).setFontFamily(skrift).setFontSize(storrelse);

  // Én stil over hele fanen: overskrift, annenhver rad og filterknapper på alle kolonnene. Er bedriftene i en
  // Google-«tabell» (f.eks. Table2), har den sin egen stil og egne filterknapper; da får bare systemkolonnene stilen.
  let helFane = false;
  try {
    ark.getBandings().forEach(b => b.remove());
    ark.getRange(1, 1, Math.max(ark.getLastRow(), 2), ark.getLastColumn())
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
      .setHeaderRowColor(hodeFarge).setFirstRowColor('#FFFFFF').setSecondRowColor('#F8F9FA');
    ark.getRange(1, 1, 1, ark.getLastColumn()).setBackground(hodeFarge).setFontColor(FARGE.hvit).setFontWeight('bold')
      .setVerticalAlignment('middle');
    ark.setRowHeight(1, 32);
    if (!ark.getFilter()) ark.getRange(1, 1, Math.max(ark.getLastRow(), 2), ark.getLastColumn()).createFilter();
    helFane = true;
  } catch (e) {
    console.warn('Booking som én tabell: ' + e.message);
  }
  if (!helFane) try {
    const forsteSys = Math.min.apply(null, systemKolonner_(tabell).map(kol));
    const bredde = ark.getLastColumn() - forsteSys + 1;
    ark.getBandings().forEach(b => { if (b.getRange().getColumn() >= forsteSys) b.remove(); });
    if (bredde > 0) {
      ark.getRange(1, forsteSys, Math.max(ark.getLastRow(), 2), bredde)
        .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
        .setHeaderRowColor(hodeFarge).setFirstRowColor('#FFFFFF').setSecondRowColor('#F8F9FA');
    }
  } catch (e) {
    console.warn('Annenhver rad i Booking: ' + e.message);
  }

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

  // Rutenett: A er marg. B–G og H–M er to like halvdeler (avkrysning, dato, bedrift, tekst over tre kolonner).
  [34, 80, 170, 105, 105, 105, 34, 80, 170, 105, 105, 105].forEach((b, i) => ark.setColumnWidth(2 + i, b));
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
  // Varsel når automatiske forslag venter på godkjenning.
  ark.setRowHeight(7, 26);
  const varsel = ark.getRange(7, 2, 1, 12);
  varsel.merge();
  varsel.getCell(1, 1).setFormula(`=IFERROR(LET(n,COUNTIF('${KONFIG.ARK_GODKJENNING}'!J:J,"${VENTER}"),` +
    `IF(n=0,"✓ Ingen automatiske endringer venter på godkjenning","⚠ "&n&" automatiske endringer venter på godkjenning – se fanen «${KONFIG.ARK_GODKJENNING}»")),"")`);
  varsel.setFontWeight('bold').setHorizontalAlignment('left');
  ark.setConditionalFormatRules(ark.getConditionalFormatRules().concat([
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('⚠').setBackground('#FFEDD5').setFontColor('#9A3412')
      .setRanges([varsel]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('✓').setFontColor('#166534').setRanges([varsel]).build(),
  ]));
  // Fordeling av alle bedriftene i Bedriftsliste (status hentes fra Booking via «Navn i Booking»).
  const liste = bedriftslisteArk_(ss);
  const blStatusKol = liste ? kolonneMedNavn_(liste, BL_KOLONNER.kontaktstatus) : 0;
  const blNavnKol = liste ? kolonneMedNavn_(liste, BL_KOLONNER.bookingNavn) : 0;
  const L = liste ? "'" + liste.getName() + "'!" : '';
  const blOmr = k => L + kolonneBokstav_(k) + '2:' + kolonneBokstav_(k);
  ark.getRange('B8').setValue(blStatusKol ? 'Bedriftsliste – status' : 'Status').setFontSize(13).setFontWeight('bold');
  const forste = 9;
  const rekker = blStatusKol ? BL_STATUSER : statuser.map(st => [st].concat(STATUSFARGE[st] || ['#F3F4F6', '#374151']));
  const sist = forste + rekker.length - 1;
  rekker.forEach(([st, bg, fg], i) => {
    const r = forste + i;
    const etikett = ark.getRange(r, 2, 1, 2);
    etikett.merge();
    etikett.getCell(1, 1).setValue(st);
    etikett.setBackground(bg).setFontColor(fg).setFontWeight('bold');
    ark.getRange(r, 4).setFormula(blStatusKol ? `=COUNTIF(${blOmr(blStatusKol)},"${st}")` : `=COUNTIF(${omr('status')},"${st}")`)
      .setHorizontalAlignment('center').setFontWeight('bold');
    const strek = ark.getRange(r, 5, 1, 4);
    strek.merge();
    strek.getCell(1, 1).setFormula(
      `=SPARKLINE(D${r},{"charttype","bar";"max",MAX($D$${forste}:$D$${sist})+0.0001;"color1","${fg}"})`);
    ark.setRowHeight(r, 24);
  });
  const total = ark.getRange(sist + 1, 2, 1, 2);
  total.merge();
  total.setFontWeight('bold').setBorder(true, null, null, null, null, null, FARGE.tekst, SpreadsheetApp.BorderStyle.SOLID);
  ark.getRange(sist + 1, 4).setFontWeight('bold').setHorizontalAlignment('center')
    .setBorder(true, null, null, null, null, null, FARGE.tekst, SpreadsheetApp.BorderStyle.SOLID);
  if (blStatusKol) {
    total.getCell(1, 1).setValue('Bedrifter i Bedriftsliste');
    ark.getRange(sist + 1, 4).setFormula(`=COUNTIF(${blOmr(blStatusKol)},"?*")`);
    // Det som står i Booking, men ikke i Bedriftsliste – så ingenting faller utenfor.
    const utenfor = ark.getRange(sist + 2, 2, 1, 2);
    utenfor.merge();
    utenfor.getCell(1, 1).setValue('+ i Booking, ikke koblet til Bedriftsliste');
    utenfor.setFontColor(FARGE.dempet);
    ark.getRange(sist + 2, 4).setFormula(blNavnKol
      ? `=SUMPRODUCT((${omr('bedrift')}<>"")*(COUNTIF(${blOmr(blNavnKol)},${omr('bedrift')})=0))` : '=""')
      .setFontColor(FARGE.dempet).setHorizontalAlignment('center');
    ark.getRange(sist + 2, 5).setValue('WFD → «Legg bedrifter fra Booking inn i Bedriftsliste» viser hvilke (ofte duplikater i Booking)').setFontColor(FARGE.dempet)
      .setFontSize(9);
  } else {
    total.getCell(1, 1).setValue('Rader i Booking (alle statuser)');
    ark.getRange(sist + 1, 4).setFormula(`=COUNTA(${omr('bedrift')})`);
  }

  // To avkrysningslister side om side: B–G og H–M.
  const hode = oversiktListeHode_(); // fast rad, så avkrysningen (onEdit) alltid finner listene
  const tittel = hode - 1;
  ark.getRange(tittel, 2).setValue('Trenger svar fra deg').setFontSize(13).setFontWeight('bold');
  ark.getRange(tittel, 8).setValue('Bør purres  ·  ' + purrDager + '+ dager uten svar').setFontSize(13).setFontWeight('bold');
  [[2, 'Siste hendelse', 'Kryss av når du har svart, eller når bedriften ikke trenger svar. Da settes «Trenger svar» ' +
    'til Nei i Booking, og bedriften forsvinner fra listen.'],
   [8, 'Status', 'Kryss av når du har purret. Da får bedriften status «Purret» og «Sist kontakt» i dag i Booking, ' +
    'så den dukker opp igjen om ' + purrDager + ' dager hvis den ikke svarer.']].forEach(([c, tekst, merknad]) => {
    ark.getRange(hode, c, 1, 3).setValues([[OVERSIKT_HAKE, 'Sist kontakt', 'Bedrift']]);
    const t = ark.getRange(hode, c + 3, 1, 3);
    t.merge();
    t.getCell(1, 1).setValue(tekst);
    ark.getRange(hode, c, 1, 6).setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold');
    ark.getRange(hode, c).setHorizontalAlignment('center').setNote(merknad);
  });
  ark.setRowHeight(hode, 26);

  const kort = `IF(LEN(${omr('oppsummering')})>90,LEFT(${omr('oppsummering')},90)&"…",${omr('oppsummering')})`;
  ark.getRange(hode + 1, 3).setFormula(
    `=ARRAYFORMULA(IFERROR(SORT(FILTER({${omr('sistKontakt')},${omr('bedrift')},${kort}},${omr('trengerSvar')}="Ja"),1,FALSE),"Ingen akkurat nå 🎉"))`);
  ark.getRange(hode + 1, 9).setFormula(
    `=ARRAYFORMULA(IFERROR(SORT(FILTER({${omr('sistKontakt')},${omr('bedrift')},${omr('status')}},${omr('retning')}="Oss",${omr('sistKontakt')}<>"",${omr('sistKontakt')}<=TODAY()-${purrDager},REGEXMATCH(${omr('status')},"^(${purrStatus.join('|')})$")),1,TRUE),"Ingen akkurat nå 🎉"))`);
  const rader = OVERSIKT_RADER;
  const regler = [];
  [2, 8].forEach(c => {
    ark.getRange(hode + 1, c, rader, 1).insertCheckboxes().setHorizontalAlignment('center');
    ark.getRange(hode + 1, c + 1, rader, 1).setNumberFormat('d. mmm').setHorizontalAlignment('left').setFontColor(FARGE.dempet);
    ark.getRange(hode + 1, c + 2, rader, 1).setFontWeight('bold').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    ark.getRange(hode + 1, c + 3, rader, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.OVERFLOW).setFontColor(FARGE.dempet);
    ark.getRange(hode + 1, c, rader, 6)
      .setBorder(null, null, null, null, null, true, FARGE.linje, SpreadsheetApp.BorderStyle.SOLID);
    // Avkrysningen vises bare på rader med en bedrift (hvit boks på hvit bakgrunn ellers).
    regler.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=$${kolonneBokstav_(c + 2)}${hode + 1}=""`).setFontColor(FARGE.hvit)
      .setRanges([ark.getRange(hode + 1, c, rader, 1)]).build());
  });
  ark.setConditionalFormatRules(ark.getConditionalFormatRules().concat(regler));
}

/** Overskriftsraden til avkrysningslistene på Oversikt (brukes også av onEdit). */
const OVERSIKT_HAKE = '✓';
const OVERSIKT_RADER = 40;
// Plass til statusfordelingen (det største av Booking-statusene og Bedriftsliste-statusene).
const OVERSIKT_STATUSRADER = Math.max(KONFIG.STATUSER.length + 1, 6);
function oversiktListeHode_() {
  return 9 + OVERSIKT_STATUSRADER - 1 + 5;
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
  // Bekreftet i år: Status «Bekreftet» eller «Med = Ja».
  const erB = med ? `((${status}="Bekreftet")+(${med}="${ja}")>0)` : `(${status}="Bekreftet")`;
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
    ark.getRange(r, 4).setFormula(`=SUMPRODUCT((${pakke}="${pakkeNavn}")*${erB})`).setFontWeight('bold');
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
    const ikkeBekreftet = `${erB}=FALSE`;
    ark.getRange(liste + 2, 2).setFormula(
      `=IFERROR(SORT(FILTER({${bedrift},${status}},${medIFjor}="${ja}",${ikkeBekreftet},${bedrift}<>""),1,TRUE),"Alle er med 🎉")`);
    const erBekreftet = erB;
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

// ---------------------------------------------------------------------------
// «Ikke kontaktet»: bedrifter i Bedriftsliste uten kontakt i høst
// ---------------------------------------------------------------------------

const IK_HODE = 6;     // overskriftsraden i «Ikke kontaktet» (brukes også av onEdit)
const IK_BEDRIFT = 5;  // kolonnen med bedriftsnavnet: B = ✓ kontaktet, C = ✗ ikke aktuell, D = kategori, E = bedrift

function lagIkkeKontaktetFane_(ss) {
  const liste = bedriftslisteArk_(ss);
  if (!liste) return;
  // Bygges først når Bedriftsliste er oppdatert fra Gmail (ellers finnes ikke kolonnene den trenger).
  const overskrifter = liste.getRange(1, 1, 1, Math.max(liste.getLastColumn(), 1)).getValues()[0].map(v => String(v).trim());
  if (overskrifter.indexOf(BL_KOLONNER.host) < 0) return;
  const kol = sikreBlKolonner_(liste);
  const L = "'" + liste.getName() + "'!";
  const omr = i => L + kolonneBokstav_(i + 1) + '2:' + kolonneBokstav_(i + 1);
  const bedrift = L + 'A2:A';
  const kategori = omr(kol.kategori), host = omr(kol.host), gmail = omr(kol.epost), annen = omr(kol.annen),
    kilde = omr(kol.kilde), manuelt = omr(kol.manuelt), tidligere = omr(kol.tidligere), trad = omr(kol.trad);
  // Bedriftsrader har kategori (kategorirader og tomme rader har ikke). Avkrysset «Har kontaktet» teller som kontaktet.
  const ikke = `(${omr(kol.kontaktstatus)}="Ikke kontaktet")`;

  const ark = forberedRapport_(ss, KONFIG.ARK_IKKE_KONTAKTET, 'Ikke kontaktet i høst',
    'Bedrifter i «' + liste.getName() + '» som ikke er kontaktet i høst. Kryss av i ✓ når en bedrift er kontaktet på annen måte ' +
    '(telefon, LinkedIn, styret), eller i ✗ hvis den ikke er aktuell i år – da forsvinner den herfra. Oransje = kontakt fra nettet.');

  ark.getRange('B4').setFormula(
    `=ARRAYFORMULA(SUM(${ikke}) & " ikke kontaktet   ·   " & SUM(${ikke}*(${gmail}<>"")) & " e-post fra Gmail   ·   " & ` +
    `SUM(${ikke}*(${gmail}="")*(${annen}<>"")*(${kilde}<>"")) & " hentet fra nett   ·   " & ` +
    `SUM(${ikke}*(${gmail}="")*(${annen}<>"")*(${kilde}="")) & " lagt inn selv   ·   " & ` +
    `SUM(${ikke}*(${gmail}="")*(${annen}="")) & " mangler kontaktperson")`)
    .setFontSize(12).setFontWeight('bold').setFontColor(FARGE.indigo);
  ark.setRowHeight(4, 28);

  const kolonner = [[OVERSIKT_HAKE, 44], ['✗', 44], ['Kategori', 140], ['Bedrift', 210], ['E-post / kontakt', 270], ['Kilde', 130],
    ['Kontaktet tidligere', 130], ['Siste relevante e-post', 340]];
  const hode = IK_HODE;
  ark.getRange(hode, 2, 1, kolonner.length).setValues([kolonner.map(k => k[0])]);
  stilTabellhode_(ark.getRange(hode, 2, 1, kolonner.length));
  ark.getRange(hode, 2).setHorizontalAlignment('center')
    .setNote('Kryss av når bedriften er kontaktet på annen måte. Da krysses «Har kontaktet» av i Bedriftsliste.');
  ark.getRange(hode, 3).setHorizontalAlignment('center')
    .setNote('Kryss av hvis bedriften ikke er aktuell i år. Da krysses «Ikke aktuell» av i Bedriftsliste.');
  ark.setRowHeight(hode, 30);
  kolonner.forEach(([, b], i) => ark.setColumnWidth(2 + i, b));
  ark.setFrozenRows(hode);

  const visKontakt = `IF(${gmail}<>"",${gmail},IF(${annen}<>"",${annen},"– mangler kontaktperson –"))`;
  const visKilde = `IF(${gmail}<>"","Gmail",IF(${annen}="","",IF(${kilde}<>"","Fra nett – sjekk","Lagt inn selv")))`;
  ark.getRange(hode + 1, IK_BEDRIFT - 1).setFormula(
    `=ARRAYFORMULA(IFERROR(SORT(` +
    `FILTER({${kategori},${bedrift},${visKontakt},${visKilde},${tidligere},${trad}},${ikke}),` +
    `FILTER((${gmail}="")*(${annen}=""),${ikke}),TRUE,FILTER(${gmail}="",${ikke}),TRUE,` +
    `FILTER(${kategori},${ikke}),TRUE,FILTER(${bedrift},${ikke}),TRUE),` +
    `"Alle er kontaktet 🎉"))`);

  const rader = 300;
  const r0 = hode + 1;
  const K = IK_BEDRIFT; // bedrift-kolonnen (E); kategori er til venstre, kontakt og kilde til høyre
  ark.getRange(r0, 2, rader, 2).insertCheckboxes().setHorizontalAlignment('center');
  ark.getRange(r0, K - 1, rader, 1).setFontColor(FARGE.dempet);
  ark.getRange(r0, K, rader, 1).setFontWeight('bold');
  ark.getRange(r0, K + 1, rader, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  ark.getRange(r0, K + 2, rader, 1).setFontColor(FARGE.dempet);
  ark.getRange(r0, K + 3, rader, 1).setNumberFormat('d. mmm yyyy').setHorizontalAlignment('center');
  ark.getRange(r0, K + 4, rader, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setFontColor(FARGE.dempet);
  ark.getRange(r0, 2, rader, kolonner.length)
    .setBorder(null, null, null, null, null, true, FARGE.linje, SpreadsheetApp.BorderStyle.SOLID);

  const regel = () => SpreadsheetApp.newConditionalFormatRule();
  const B_ = kolonneBokstav_(K), Ki = kolonneBokstav_(K + 2);
  const kontaktOmr = ark.getRange(r0, K + 1, rader, 1);
  const kontaktOgKilde = ark.getRange(r0, K + 1, rader, 2);
  ark.setConditionalFormatRules([
    regel().whenFormulaSatisfied(`=$${B_}${r0}=""`).setFontColor(FARGE.hvit).setRanges([ark.getRange(r0, 2, rader, 2)]).build(),
    regel().whenTextEqualTo('– mangler kontaktperson –')
      .setBackground('#FEF3C7').setFontColor('#92400E').setItalic(true).setRanges([kontaktOmr]).build(),
    regel().whenFormulaSatisfied(`=$${Ki}${r0}="Fra nett – sjekk"`)
      .setBackground('#FFEDD5').setFontColor('#9A3412').setRanges([kontaktOgKilde]).build(),
    regel().whenFormulaSatisfied(`=$${Ki}${r0}="Gmail"`)
      .setBackground('#DCFCE7').setFontColor('#166534').setRanges([kontaktOmr]).build(),
    regel().whenFormulaSatisfied(`=$${Ki}${r0}="Lagt inn selv"`)
      .setBackground('#E0F2FE').setFontColor('#075985').setRanges([kontaktOmr]).build(),
  ]);
}

// ---------------------------------------------------------------------------
// «Gjøremål»: egne oppgaver med avkrysning. Lages én gang og tømmes aldri av systemet.
// ---------------------------------------------------------------------------

const GJOREMAL_HODE = 5;

function lagGjoremal_(ss) {
  let ark = ss.getSheetByName(KONFIG.ARK_GJOREMAL);
  if (!ark) {
    ark = forberedRapport_(ss, KONFIG.ARK_GJOREMAL, 'Gjøremål',
      'Egne oppgaver for booking. Kryss av når noe er gjort – raden blir grå. Skriv nye oppgaver i første ledige rad. ' +
      'Svar og purringer til bedriftene står på Oversikt.');
    ark.getRange(GJOREMAL_HODE + 1, 3, GJOREMAL_START.length, 5).setValues(GJOREMAL_START.map(r => [
      r[0], r[1], r[2] ? new Date(r[2] + 'T12:00:00') : '', r[3], r[4]]));
  }
  stilGjoremal_(ark);
  return ark;
}

function stilGjoremal_(ark) {
  const hode = GJOREMAL_HODE;
  const kolonner = [[OVERSIKT_HAKE, 44], ['Oppgave', 380], ['Bedrift', 200], ['Frist', 90], ['Ansvarlig', 110], ['Notat', 420]];
  ark.getRange(hode, 2, 1, kolonner.length).setValues([kolonner.map(k => k[0])]);
  stilTabellhode_(ark.getRange(hode, 2, 1, kolonner.length));
  ark.getRange(hode, 2).setHorizontalAlignment('center');
  ark.setRowHeight(hode, 30);
  kolonner.forEach(([, b], i) => ark.setColumnWidth(2 + i, b));
  ark.setFrozenRows(hode);

  const r0 = hode + 1;
  const rader = 200;
  ark.getRange(r0, 2, rader, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build())
    .setHorizontalAlignment('center');
  ark.getRange(r0, 3, rader, 1).setFontWeight('bold').setWrap(true);
  ark.getRange(r0, 5, rader, 1).setNumberFormat('d. mmm').setHorizontalAlignment('center');
  ark.getRange(r0, 7, rader, 1).setWrap(true).setFontColor(FARGE.dempet);
  ark.getRange(r0, 2, rader, kolonner.length).setVerticalAlignment('middle')
    .setBorder(null, null, null, null, null, true, FARGE.linje, SpreadsheetApp.BorderStyle.SOLID);

  const regel = () => SpreadsheetApp.newConditionalFormatRule();
  ark.setConditionalFormatRules([
    regel().whenFormulaSatisfied(`=$C${r0}=""`).setFontColor(FARGE.hvit).setRanges([ark.getRange(r0, 2, rader, 1)]).build(),
    regel().whenFormulaSatisfied(`=$B${r0}=TRUE`).setFontColor('#9CA3AF').setStrikethrough(true)
      .setBackground('#F9FAFB').setRanges([ark.getRange(r0, 3, rader, 5)]).build(),
    regel().whenFormulaSatisfied(`=AND($B${r0}<>TRUE,$E${r0}<>"",$E${r0}<TODAY())`).setFontColor('#B91C1C').setBold(true)
      .setRanges([ark.getRange(r0, 5, rader, 1)]).build(),
  ]);
}

/** Oppgavene «Gjøremål» starter med (oktober 2026). [oppgave, bedrift, frist (ÅÅÅÅ-MM-DD), ansvarlig, notat] */
const GJOREMAL_START = [
  ['Legg ved invitasjons-PDF og send de 10 nye utkastene i Gmail', 'Equip, Morgan Stanley, J.P. Morgan m.fl.', '2026-10-07', 'Ellinor',
    'Utkastene ble laget 5.10 uten vedlegg: legg ved WFD_2027_NO.pdf (norske) eller WFD_2027_ENG (engelske)'],
  ['Svar FSN Capital på spørsmålene deres', 'FSN Capital', '2026-10-06', 'Ellinor',
    'Helene Wekre skrev 5.10 med noen spørsmål før de bestemmer seg'],
  ['Avklar i styret om konsulentselskapene skal inviteres', 'Bain, McKinsey, Kearney, Oliver Wyman, BCG, EY, PwC, Rystad', '2026-10-06', 'Styret',
    'Utkast til Bain, McKinsey, Kearney og Oliver Wyman ligger usendt i Gmail'],
  ['Sjekk med Amalie hva som er avtalt med ABG', 'ABG', '2026-10-06', 'Ellinor',
    'Styret har hatt egne møter med ABG (27.8 og 29.9)'],
  ['Send DNB Carnegies workshop-ønske til workshopansvarlig', 'DNB Carnegie', '2026-10-07', 'Ellinor',
    'Ønsker workshop på WFD 4. mars. Send til wfd.workshop@nhhs.no'],
  ['Finn ny kontaktperson i Summa Equity', 'Summa Equity', '2026-10-09', 'Ellinor',
    'E-posten til Tuva Prestegard kom i retur'],
  ['Sjekk de oransje kontaktene i «Ikke kontaktet» før de brukes', '', '', 'Ellinor',
    'Hentet fra nettet og kan være gamle. Skriv over med riktig adresse, så blir de blå («lagt inn selv»)'],
  ['Rydd Bedriftsliste: slett duplikater og rader som er kategorier', '', '', 'Ellinor',
    'Carnegie (= DNB Carnegie), Alliance Venture og Hadean Ventures står to ganger. Formuesforvaltning, Kapitalforvaltning og Venture capital ser ut som kategorier'],
  ['Rett opp i Booking', 'Summa Equity, Danske Bank, EY', '', 'Ellinor',
    'Summa: Status «Kontaktet», Trenger svar «Nei». Danske Bank står to ganger. EY: skriv ey.com i Domene'],
  ['Purr dem som ikke har svart', '', '2026-10-19', 'Ellinor', 'Fristen for bedriftene er 16. oktober. Se «Bør purres» på Oversikt'],
];

/**
 * Fjerner farger i Booking som ikke kommer fra systemet: bakgrunnsfarger satt for hånd og egne fargeregler.
 * Systemets egne farger på Status og Trenger svar legges på igjen etterpå. Innholdet røres ikke.
 */
function fjernEkstraFarger() {
  const ui = SpreadsheetApp.getUi();
  let tabell;
  try {
    tabell = lesBedrifter_();
  } catch (e) {
    ui.alert('Kjør «1. Sett opp arket og automatikk» fra booking-fanen først.');
    return;
  }
  const ark = tabell.ark;
  const systemKol = systemKolonner_(tabell).map(n => tabell.kol[n] + 1);
  const egneRegler = ark.getConditionalFormatRules().filter(r => {
    const omr = r.getRanges ? r.getRanges() : [];
    return !omr.length || !omr.every(o => o.getNumColumns() === 1 && systemKol.indexOf(o.getColumn()) >= 0);
  });
  const svar = ui.alert('Fjern ekstra farger i «' + ark.getName() + '»',
    'Dette fjerner bakgrunnsfarger satt for hånd på bedriftsradene, og ' + egneRegler.length +
    ' egne fargeregler. Systemets farger på Status og Trenger svar beholdes. Innholdet endres ikke.\n\n' +
    'Kan angres med Rediger → Angre eller versjonsloggen. Fortsette?', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;

  const antall = ark.getLastRow() - 1;
  if (antall > 0) ark.getRange(2, 1, antall, ark.getLastColumn()).setBackground(null);
  ark.setConditionalFormatRules([]);
  stilBooking_(tabell); // legger systemets fargeregler på igjen
  ui.alert('Ferdig. Bare Status og Trenger svar har farger nå.');
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
  kategori: 'Kategori',             // fra nærmeste fete rad over (f.eks. «Private Equity»)
  kontaktstatus: 'Kontaktstatus',   // formel: se BL_STATUSER (henter status fra Booking via «Navn i Booking»)
  manuelt: 'Har kontaktet',         // avkrysning: kontaktet på annen måte (telefon, LinkedIn, styret) – fylles aldri av systemet
  ikkeAktuell: 'Ikke aktuell',      // avkrysning: skal ikke kontaktes i år – fylles aldri av systemet
  bookingNavn: 'Navn i Booking',    // raden i Booking bedriften hører til (fylles automatisk; usikre koblinger til godkjenning)
  epost: 'E-post (fra Gmail)',
  annen: 'Annen kontakt',           // e-post/telefon du har funnet selv, eller hentet fra nettet (oransje)
  svar: 'Svar fra bedrift',
  host: 'Kontaktet høst 2026',
  tidligere: 'Kontaktet tidligere',
  trad: 'Siste relevante e-post',
  kilde: 'Hentet fra',              // skjult: kilden når «Annen kontakt» er hentet fra nettet
};
// Kolonnene «Oppdater Bedriftsliste fra Gmail» tømmer og fyller på nytt. De andre røres aldri av den.
const BL_AUTO = ['host', 'svar', 'tidligere', 'epost', 'trad'];
// Rekkefølgen rett etter bedriftsnavnet når «Gjør arbeidsboken ryddig og pen» kjøres.
const BL_REKKEFOLGE = ['kategori', 'kontaktstatus', 'manuelt', 'ikkeAktuell', 'epost', 'annen', 'bookingNavn', 'svar', 'host',
  'tidligere', 'trad'];
// Kontaktstatus i Bedriftsliste (og fordelingen på Oversikt). [navn, bakgrunn, tekst]
const BL_STATUSER = [
  ['Bekreftet', '#DCFCE7', '#166534'],
  ['I dialog', '#EDE9FE', '#5B21B6'],
  ['Kontaktet – venter på svar', '#E0E7FF', '#3730A3'],
  ['Takket nei', '#F3F4F6', '#6B7280'],
  ['Ikke kontaktet', '#FEE2E2', '#B91C1C'],
  ['Ikke aktuell', '#F9FAFB', '#9CA3AF'],
];

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
  // Kolonnene tømmes ikke på forhånd: hver rad skrives over når den er sjekket. Stopper kjøringen underveis,
  // står de gamle opplysningene igjen i stedet for at alle bedriftene ser ukontaktet ut.
  sikreBlKolonner_(ark);
  if (!ss.getSheetByName(KONFIG.ARK_IKKE_KONTAKTET)) lagIkkeKontaktetFane_(ss);
  startBlKjoring_();
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
      const host = sjekketTreff_(bedrift, sisteEpostOm_(bedrift, 'after:' + grense));
      const for_ = sjekketTreff_(bedrift, sisteEpostOm_(bedrift, 'before:' + grense));
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
  const sisteKol = Math.max(ark.getLastColumn(), 1);
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
  stilBedriftsliste_(ark, kol);
  return kol;
}

let LISTENAVN_ = null;

/**
 * Bedriftsnavnet i Bedriftsliste for et e-postdomene: først via e-postadressene som står i listen, ellers om
 * domenet ligner navnet (nysnoinvest.no → «Nysnø climate investments»). Tom tekst hvis ingen treff.
 */
function navnFraBedriftsliste_(domene) {
  domene = String(domene || '').toLowerCase();
  if (!domene) return '';
  if (!LISTENAVN_) {
    LISTENAVN_ = { domener: {}, navn: [] };
    try {
      const ark = bedriftslisteArk_(hentRegneark_());
      const antall = ark ? ark.getLastRow() - 1 : 0;
      if (antall > 0) {
        const h = ark.getRange(1, 1, 1, ark.getLastColumn()).getValues()[0].map(v => String(v).trim());
        const epostKol = [h.indexOf(BL_KOLONNER.epost), h.indexOf(BL_KOLONNER.annen)].filter(i => i >= 0);
        const verdier = ark.getRange(2, 1, antall, h.length).getValues();
        const fet = ark.getRange(2, 1, antall, 1).getFontWeights().map(r => r[0] === 'bold');
        verdier.forEach((r, i) => {
          const navn = sokeNavn_(String(r[0]).trim());
          if (!navn || fet[i]) return;
          LISTENAVN_.navn.push(navn);
          epostKol.forEach(j => (String(r[j]).match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).forEach(e => {
            const d = domeneAv_(e);
            if (d && !LISTENAVN_.domener[d]) LISTENAVN_.domener[d] = navn;
          }));
        });
      }
    } catch (e) { /* uten liste brukes domenenavnet */ }
  }
  return LISTENAVN_.domener[domene] || LISTENAVN_.navn.find(n => domeneLignerNavn_(domene, n)) || '';
}

/**
 * Kategori = nærmeste fete rad over (f.eks. «Private Equity»). Kategorirader og tomme rader får tom kategori.
 * Bare tomme celler fylles, så kategorien følger raden hvis du sorterer listen, og du kan endre den selv.
 */
function skrivKategorier_(ark, kol) {
  const antall = Math.max(ark.getLastRow() - 1, 0);
  if (!antall) return;
  const navn = ark.getRange(2, 1, antall, 1).getValues().map(r => String(r[0]).trim());
  const fet = ark.getRange(2, 1, antall, 1).getFontWeights().map(r => r[0] === 'bold');
  const naa = ark.getRange(2, kol.kategori + 1, antall, 1).getValues().map(r => String(r[0]).trim());
  let gjeldende = 'Uten kategori';
  const ut = navn.map((n, i) => {
    if (n && fet[i]) { gjeldende = n; return ['']; }
    if (!n) return [''];
    return [naa[i] || gjeldende];
  });
  ark.getRange(2, kol.kategori + 1, antall, 1).setValues(ut);
  return { navn, fet };
}

/**
 * Felles stil på Bedriftsliste: kategori synlig, kontaktstatus med farger, avkrysning for «Har kontaktet»,
 * oransje «Annen kontakt» når den er hentet fra nettet, kategorirader uthevet og filterknapper på alt.
 */
function stilBedriftsliste_(ark, kol) {
  const bokstav = k => kolonneBokstav_(kol[k] + 1);
  const omr = k => bokstav(k) + '2:' + bokstav(k);
  const maks = Math.max(ark.getMaxRows() - 1, 1);
  const sisteKol = Math.max(ark.getLastColumn(), 1);

  const bredder = { kategori: 140, kontaktstatus: 190, manuelt: 105, ikkeAktuell: 95, bookingNavn: 170, epost: 230, annen: 230, svar: 110, host: 130,
    tidligere: 130, trad: 340, kilde: 120 };
  Object.keys(kol).forEach(k => {
    ark.getRange(1, kol[k] + 1).setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold');
    ark.setColumnWidth(kol[k] + 1, bredder[k] || 130);
  });
  ark.getRange(1, 1).setNote('Bedriftsliste = alle relevante bedrifter: hvem de er, hvordan dere når dem og hvor langt ' +
    'dere har kommet. Notater, pakke og ønsker skrives i Booking.\n\n' +
    'Søk: Ctrl/Cmd + F, eller klikk filterknappen i en overskrift og skriv i søkefeltet.\n' +
    'Nye bedrifter: legg dem inn her (under riktig fet kategori). Bedrifter som bare står i Booking legges til automatisk ' +
    'hver natt, nederst under «' + NYE_FRA_BOOKING + '».');
  [kol.host, kol.tidligere].forEach(k => ark.getRange(2, k + 1, maks, 1).setNumberFormat('d. mmm yyyy').setHorizontalAlignment('center'));
  [kol.svar, kol.manuelt, kol.ikkeAktuell].forEach(k => ark.getRange(2, k + 1, maks, 1).setHorizontalAlignment('center'));
  ark.getRange(2, kol.bookingNavn + 1, maks, 1).setFontColor(FARGE.dempet);
  ark.getRange(1, kol.bookingNavn + 1).setNote('Raden i Booking bedriften hører til. Status hentes derfra (Bekreftet, I dialog, ' +
    'Takket nei …). Fylles automatisk; usikre koblinger går til «' + KONFIG.ARK_GODKJENNING + '». Du kan skrive inn selv.');
  [kol.trad, kol.epost, kol.annen].forEach(k =>
    ark.getRange(2, k + 1, maks, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setHorizontalAlignment('left'));
  ark.getRange(2, kol.kategori + 1, maks, 1).setFontColor(FARGE.dempet);

  // Kontaktstatus regnes ut av formelen i overskriften: «Ikke aktuell» → status fra Booking → kontaktet i høst → ikke kontaktet.
  let fraBooking = '""';
  try {
    const t = lesBedrifter_();
    const Bk = "'" + t.ark.getName() + "'!";
    const bk = n => Bk + kolonneBokstav_(t.kol[n] + 1) + '2:' + kolonneBokstav_(t.kol[n] + 1);
    fraBooking = `IF(${omr('bookingNavn')}="","",IFERROR(VLOOKUP(${omr('bookingNavn')},{${bk('bedrift')},${bk('status')}},2,FALSE),""))`;
  } catch (e) { /* ingen booking-fane ennå */ }
  ark.getRange(1, kol.kontaktstatus + 1).setFormula(
    `={"${BL_KOLONNER.kontaktstatus}";ARRAYFORMULA(IF((A2:A="")+(${omr('kategori')}=""),"",` +
    `IF(${omr('ikkeAktuell')}=TRUE,"Ikke aktuell",LET(bs,${fraBooking},` +
    `IF(bs="Bekreftet","Bekreftet",IF(bs="${KONFIG.STATUS_NEI}","Takket nei",` +
    `IF(REGEXMATCH(bs,"^(I dialog|Interessert|Tilbud sendt)$"),"I dialog",` +
    `IF((bs="Kontaktet")+(bs="Purret")+(${omr('host')}<>"")+(${omr('manuelt')}=TRUE),"Kontaktet – venter på svar",` +
    `"Ikke kontaktet"))))))))}`);

  const info = skrivKategorier_(ark, kol);
  if (info) {
    // Avkrysning bare på bedriftsrader (ikke på kategorirader og tomme rader).
    const boks = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    [kol.manuelt, kol.ikkeAktuell].forEach(k => ark.getRange(2, k + 1, info.navn.length, 1)
      .setDataValidations(info.navn.map((n, i) => [n && !info.fet[i] ? boks : null])));
    koblTilBooking_(ark, kol, info);
  }

  ark.hideColumns(kol.kilde + 1);
  try { ark.showColumns(kol.kategori + 1); } catch (e) { /* allerede synlig */ }
  ark.setFrozenRows(1);
  try { ark.setFrozenColumns(1); } catch (e) { /* ikke viktig */ }

  // Filterknapper i overskriftsraden over alle kolonnene.
  try {
    const filter = ark.getFilter();
    if (filter && (filter.getRange().getNumColumns() < sisteKol || filter.getRange().getNumRows() < ark.getLastRow())) filter.remove();
    if (!ark.getFilter()) ark.getRange(1, 1, Math.max(ark.getLastRow(), 2), sisteKol).createFilter();
  } catch (e) {
    console.warn('Filter i Bedriftsliste: ' + e.message);
  }

  // Farger. Egne regler beholdes; systemets lages på nytt.
  const regel = () => SpreadsheetApp.newConditionalFormatRule();
  const kolOmr = k => ark.getRange(2, kol[k] + 1, maks, 1);
  const systemKol = Object.keys(kol).map(k => kol[k] + 1);
  const kategoriFormel = `=AND($A2<>"",$${bokstav('kategori')}2="")`;
  const beholdes = ark.getConditionalFormatRules().filter(r => {
    const o = r.getRanges ? r.getRanges() : [];
    if (o.length && o.every(x => x.getNumColumns() === 1 && systemKol.indexOf(x.getColumn()) >= 0)) return false;
    try {
      const v = r.getBooleanCondition() && r.getBooleanCondition().getCriteriaValues();
      if (v && /^=AND\(\$A2<>"",\$[A-Z]+2=""\)$/.test(String(v[0]))) return false;
    } catch (e) { /* ikke en formelregel */ }
    return true;
  });
  const status = kolOmr('kontaktstatus');
  ark.setConditionalFormatRules(beholdes.concat([
    regel().whenFormulaSatisfied(kategoriFormel).setBackground('#EEF2FF').setFontColor('#3730A3').setBold(true)
      .setRanges([ark.getRange(2, 1, maks, sisteKol)]).build(),
    regel().whenFormulaSatisfied(ventendeFormel_('A2')).setBackground('#FDBA74').setFontColor('#7C2D12').setBold(true)
      .setRanges([status]).build(),
    ...BL_STATUSER.map(([navn, bg, fg]) => regel().whenTextEqualTo(navn).setBackground(bg).setFontColor(fg)
      .setItalic(navn === 'Ikke aktuell').setRanges([status]).build()),
    regel().whenFormulaSatisfied(`=$${bokstav('kilde')}2<>""`).setBackground('#FFEDD5').setFontColor('#9A3412')
      .setRanges([kolOmr('annen')]).build(),
    regel().whenTextEqualTo('Ja').setBackground('#DCFCE7').setFontColor('#166534').setRanges([kolOmr('svar')]).build(),
    regel().whenTextEqualTo('Nei').setBackground('#FEF3C7').setFontColor('#92400E').setRanges([kolOmr('svar')]).build(),
  ]));
}

/**
 * Fyller «Navn i Booking»: hvilken rad i Booking bedriften hører til. Sikre koblinger (samme navn, eller samme
 * e-postdomene som står i begge fanene) skrives rett inn. Koblinger der domenet bare ligner navnet går til godkjenning.
 * Fylles bare der cellen er tom, så det du skriver selv blir stående.
 */
function koblTilBooking_(ark, kol, info) {
  let tabell;
  try { tabell = lesBedrifter_(); } catch (e) { return; }
  const booking = tabell.rader.map((r, i) => {
    const navn = String(celle_(tabell, i, 'bedrift')).trim();
    const domener = [String(celle_(tabell, i, 'domene')).toLowerCase().trim()]
      .concat((String(celle_(tabell, i, 'epost')).match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map(domeneAv_))
      .filter(Boolean);
    return { navn, nokkel: utenAksent_(normaliserNavn_(sokeNavn_(navn))), domener };
  }).filter(b => b.navn);
  const antall = info.navn.length;
  const naa = ark.getRange(2, kol.bookingNavn + 1, antall, 1).getValues();
  const eposter = ark.getRange(2, 1, antall, ark.getLastColumn()).getValues();
  const ut = naa.map(r => [r[0]]);
  const finnes = {};
  booking.forEach(b => { finnes[b.navn] = true; });
  let endret = false;
  info.navn.forEach((n, i) => {
    const naaNavn = String(naa[i][0]).trim();
    if (!n || info.fet[i] || (naaNavn && finnes[naaNavn])) return;
    if (naaNavn) { ut[i] = ['']; endret = true; } // raden i Booking har fått nytt navn eller er slettet: koble på nytt
    const nokkel = utenAksent_(normaliserNavn_(sokeNavn_(n)));
    let treff = booking.find(b => b.nokkel && b.nokkel === nokkel);
    if (!treff) {
      const d = [eposter[i][kol.epost], eposter[i][kol.annen]].join(' ')
        .match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
      const dom = d.map(domeneAv_).filter(Boolean);
      treff = booking.find(b => b.domener.some(x => dom.indexOf(x) >= 0));
    }
    if (treff) { ut[i] = [treff.navn]; endret = true; return; }
    const lik = booking.find(b => b.domener.some(x => domeneLignerNavn_(x, n)) || domeneLignerNavn_(b.navn.replace(/\s+/g, '') + '.x', n));
    if (lik) {
      foreslaa_(sokeNavn_(n), 'Bedriftsliste: hører til denne raden i Booking?', '', lik.navn,
        'Navnene ligner (' + n + ' / ' + lik.navn + '). Godkjenn, så hentes status fra Booking.', '',
        { type: 'blBooking', nokkel: 'blBooking|' + nokkel + '|' + lik.nokkel });
    }
  });
  if (endret) ark.getRange(2, kol.bookingNavn + 1, antall, 1).setValues(ut);
}

/** Flytter systemkolonnene rett etter bedriftsnavnet, i rekkefølgen BL_REKKEFOLGE. Dine egne kolonner kommer etter. */
function ordneBedriftsliste_(ark) {
  sikreBlKolonner_(ark); // alle kolonnene må finnes før de flyttes
  try { if (ark.getFilter()) ark.getFilter().remove(); } catch (e) { /* ingen filter */ }
  BL_REKKEFOLGE.forEach((k, i) => {
    const naa = kolonneMedNavn_(ark, BL_KOLONNER[k]);
    const mal = 2 + i;
    if (naa > 0 && naa !== mal) ark.moveColumns(ark.getRange(1, naa, 1, 1), mal);
  });
  return sikreBlKolonner_(ark);
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
/**
 * Usikre Gmail-treff (navnet står ikke tydelig i domenet) går til godkjenning. Avviste treff regnes ikke med.
 * Venter treffet på godkjenning, regnes det med i mellomtiden (så bedriften ikke inviteres to ganger).
 */
function sjekketTreff_(bedrift, treff) {
  if (!treff || !treff.usikker) return treff;
  const domene = domeneAv_(treff.kontakt || '') || 'ukjent';
  const nokkel = 'bl|' + normaliserNavn_(bedrift) + '|' + domene;
  if (erAvvist_(nokkel)) return null;
  foreslaa_(sokeNavn_(bedrift), 'Bedriftsliste: Gmail-treff der navnet bare ligner', '', treff.kontakt || '(ingen adresse)',
    'Emne: ' + treff.emne + '. Avvis hvis e-posten ikke gjelder denne bedriften – da vises den som ikke kontaktet.', treff.url,
    { type: 'blKobling', domene, nokkel });
  return treff;
}

/** Tydelig treff: domenet er navnet (nbim.no → NBIM, paretosec.com → Pareto), ikke bare ligner det. */
function tydeligDomene_(domene, navn) {
  const stamme = utenAksent_(normaliserNavn_(String(domene).split('.').slice(-2, -1)[0] || ''));
  const n = utenAksent_(normaliserNavn_(navn));
  if (stamme.length < 3 || !n) return false;
  return stamme === n || n.indexOf(stamme) === 0 || (n.length >= 4 && stamme.indexOf(n) === 0);
}

function sisteEpostOm_(bedrift, periode) {
  const navn = sokeNavn_(bedrift);
  if (navn.length < 3) return null;
  // Kjent domene som ikke ligner navnet (NETTKONTAKTER), f.eks. «SpareBank1 Markets» → sb1markets.no.
  const hint = typeof nettkontakt_ === 'function' ? nettkontakt_(bedrift) : null;
  if (hint && hint.domene) {
    const d = hint.domene;
    const f = sokTraderOm_('{from:' + d + ' to:' + d + ' cc:' + d + '}', navn, periode, true, d);
    if (f) return f;
  }
  const funnet = sokTraderOm_('"' + navn + '"', navn, periode, false);
  if (funnet) {
    funnet.usikker = !tydeligDomene_(domeneAv_(funnet.kontakt || ''), navn);
    return funnet;
  }
  // Reserve 1: første ord i navnet («ODIN Forvaltning» → «Odin»), men bare treff der domenet ligner navnet
  // (odinfond.no), så vi ikke får tilfeldige treff på vanlige ord.
  const forste = navn.split(/\s+/)[0];
  if (forste.length >= 4 && forste.toLowerCase() !== navn.toLowerCase()) {
    const f = sokTraderOm_('"' + forste + '"', navn, periode, true);
    if (f) { f.usikker = !tydeligDomene_(domeneAv_(f.kontakt || ''), navn); return f; }
  }
  // Reserve 2: navnet står ikke i e-posten i det hele tatt, eller er stavet annerledes i arket
  // («Clarksson» → clarksons.com, «EQT group» → eqtpartners.com, «Søderberg & Partners» → soderbergpartnerswealth.no).
  // Søk på domenene WFD faktisk har skrevet med i perioden, som ligner navnet.
  const domener = domenerIPeriode_(periode).filter(d => domeneLignerNavn_(d, navn)).slice(0, 5);
  if (!domener.length) return null;
  const f2 = sokTraderOm_('{' + domener.map(d => 'from:' + d + ' to:' + d + ' cc:' + d).join(' ') + '}', navn, periode, true);
  if (f2) f2.usikker = !tydeligDomene_(domeneAv_(f2.kontakt || ''), navn);
  return f2;
}

/** Små bokstaver uten aksenter: «Søderberg» → «soderberg», så navn kan sammenlignes med domener. */
function utenAksent_(tekst) {
  return String(tekst).toLowerCase().replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/å/g, 'a')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Domenet ligner navnet: nbim.no → NBIM, paretosec.com → Pareto, odinfond.no → ODIN Forvaltning,
 * eqtpartners.com → EQT group, soderbergpartnerswealth.no → Søderberg & Partners, clarksons.com → Clarksson (skrivefeil).
 */
function domeneLignerNavn_(domene, navn) {
  const stamme = utenAksent_(normaliserNavn_(String(domene).split('.').slice(-2, -1)[0]));
  const n = utenAksent_(normaliserNavn_(navn));
  if (stamme.length < 3 || !n) return false;
  if (n.indexOf(stamme) === 0 || (n.length >= 3 && stamme.indexOf(n) === 0)) return true;
  const forste = utenAksent_(normaliserNavn_(String(navn).split(/\s+/)[0]));
  // Vanlige ord som første ord sier ikke noe om bedriften («Norges Bank» ≠ norgesgruppen.no).
  if (VANLIGE_FORSTEORD.indexOf(forste) >= 0) return false;
  if (forste.length >= 4 && stamme.indexOf(forste) === 0) return true;
  // Skrivefeil i arket: lange navn som deler de første seks bokstavene og er omtrent like lange.
  let felles = 0;
  while (felles < forste.length && forste[felles] === stamme[felles]) felles++;
  return felles >= 6 && Math.abs(stamme.length - forste.length) <= 2;
}

const VANLIGE_FORSTEORD = ['norges', 'norsk', 'norske', 'norwegian', 'nordic', 'nordisk', 'first', 'global', 'bank',
  'capital', 'kapital', 'invest', 'start', 'venture', 'women', 'kvinner', 'finans', 'finance'];

/** Ny kjøring av Bedriftsliste: start øverst og bygg domenelisten på nytt (så dagens e-post kommer med). */
function startBlKjoring_() {
  const egenskaper = PropertiesService.getScriptProperties();
  egenskaper.setProperty('BL_POS', '0');
  egenskaper.setProperty('BL_KJORING', String(Date.now()));
}

const DOMENEINDEKS_ = {};

/**
 * Alle bedriftsdomener WFD-adressen har skrevet med i perioden. Bygges én gang per kjøring og huskes i
 * skriptets cache, så porsjonene som fortsetter av seg selv slipper å gå gjennom e-posten på nytt.
 */
function domenerIPeriode_(periode) {
  if (DOMENEINDEKS_[periode]) return DOMENEINDEKS_[periode];
  const nokkel = 'BL_DOM_' + (PropertiesService.getScriptProperties().getProperty('BL_KJORING') || '') + '_' +
    periode.replace(/\W/g, '');
  let cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) { /* uten cache bygges listen per porsjon */ }
  const lagret = cache && cache.get(nokkel);
  if (lagret) return (DOMENEINDEKS_[periode] = JSON.parse(lagret));

  const adr = KONFIG.WFD_ADRESSE;
  const sok = '{from:' + adr + ' to:' + adr + ' cc:' + adr + '} ' + periode + ' -in:chats -in:spam -in:trash';
  const sett = {};
  for (let start = 0; start < 2000; start += 500) {
    const trader = GmailApp.search(sok, start, 500);
    GmailApp.getMessagesForThreads(trader).forEach(meldinger => meldinger.forEach(m => {
      if (m.isDraft() || erAutomatisk_(m)) return;
      [m.getFrom(), m.getTo(), m.getCc()].forEach(felt => tolkAdresser_(felt).forEach(a => {
        if (erEgenAdresse_(a.epost) || erIgnorert_(a.epost)) return;
        const d = domeneAv_(a.epost);
        if (d && KONFIG.PRIVATE_DOMENER.indexOf(d) < 0) sett[d] = true;
      }));
    }));
    if (trader.length < 500) break;
  }
  const liste = Object.keys(sett);
  try { if (cache) cache.put(nokkel, JSON.stringify(liste), 6 * 60 * 60); } catch (e) { /* for stor for cachen */ }
  return (DOMENEINDEKS_[periode] = liste);
}

function sokTraderOm_(sokeord, navn, periode, kunDomene, ekstraDomene) {
  const adr = KONFIG.WFD_ADRESSE;
  const sok = sokeord + ' {from:' + adr + ' to:' + adr + ' cc:' + adr + '} ' + periode + ' -in:chats -in:spam -in:trash';
  const trader = GmailApp.search(sok, 0, 8);
  if (!trader.length) return null;

  const trygt = navn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const invitasjon = new RegExp('invit\\w*\\s+(til\\s+)?' + trygt, 'i');
  const iEmne = new RegExp(trygt, 'i');

  let best = null;
  trader.forEach(t => {
    const meldinger = t.getMessages().filter(m => !m.isDraft() && !erAutomatisk_(m));
    if (!meldinger.length) return;
    const motpart = finnMotpart_(meldinger);
    let poeng = 0;
    if (motpart && !motpart.privat &&
      (domeneLignerNavn_(motpart.domene, navn) || (ekstraDomene && motpart.domene === ekstraDomene))) poeng += 3;
    if (!kunDomene) {
      if (invitasjon.test(meldinger[0].getPlainBody().slice(0, 3000))) poeng += 2;
      if (iEmne.test(meldinger[0].getSubject())) poeng += 1;
    }
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

// ---------------------------------------------------------------------------
// Invitasjonsutkast til bedrifter på Bedriftsliste som ikke er kontaktet i høst
// ---------------------------------------------------------------------------

const GENERISKE_ADRESSER = ['post', 'info', 'hr', 'kontakt', 'contact', 'mail', 'office', 'firmapost', 'recruitment',
  'rekruttering', 'careers', 'career', 'talent', 'jobs', 'campus', 'admin', 'hello', 'hei', 'events', 'marketing'];

/** «helene.wekre@…» → «Helene». Tom tekst når adressen ikke ser ut som et navn. */
function fornavnFraEpost_(epost) {
  const lokal = String(epost).split('@')[0].toLowerCase();
  const forste = lokal.split(/[._-]/)[0];
  if (!/^[a-zæøåäöé]{3,}$/.test(forste) || GENERISKE_ADRESSER.indexOf(forste) >= 0) return '';
  // Uten skilletegn vet vi ikke om det er et fornavn («clangdalen@», «haha@»), så bruk bare «Hei».
  if (lokal.indexOf('.') < 0 && lokal.indexOf('_') < 0 && lokal.indexOf('-') < 0) return '';
  return forste.charAt(0).toUpperCase() + forste.slice(1);
}

/** Bedrifter i Booking som allerede er invitert eller i dialog (normaliserte navn). */
function alleredeInvitertIBooking_() {
  const ut = {};
  try {
    const tabell = lesBedrifter_();
    const sp = KONFIG.SPEIL || {};
    const inv = tabell.alle[sp.invitasjonSendt];
    tabell.rader.forEach((r, i) => {
      const status = String(celle_(tabell, i, 'status'));
      const sendt = inv !== undefined && String(r[inv]).toLowerCase() === String(sp.ja || 'Ja').toLowerCase();
      if (sendt || (status && status !== KONFIG.STATUSER[0])) ut[normaliserNavn_(sokeNavn_(celle_(tabell, i, 'bedrift')))] = true;
    });
  } catch (e) { /* ingen booking-fane valgt ennå */ }
  return ut;
}

/**
 * Ikke kontaktet = Kontaktstatus sier «Ikke kontaktet» (den tar med status fra Booking, «Har kontaktet» og «Ikke aktuell»).
 * Uten Kontaktstatus: ingen e-post i høst, ikke avkrysset.
 */
function erIkkeKontaktet_(r, kol) {
  const status = kol.kontaktstatus !== undefined ? String(r[kol.kontaktstatus]).trim() : '';
  if (status) return status === 'Ikke kontaktet';
  return !r[kol.host] && r[kol.manuelt] !== true && r[kol.ikkeAktuell] !== true;
}

/** Finner kandidatene: ikke kontaktet i høst, har e-post, ikke invitert i Booking, ingen utkast fra før. */
function invitasjonsKandidater_(ark) {
  const kol = sikreBlKolonner_(ark);
  const antall = Math.max(ark.getLastRow() - 1, 0);
  if (!antall) return [];
  const verdier = ark.getRange(2, 1, antall, ark.getLastColumn()).getValues();
  const fet = ark.getRange(2, 1, antall, 1).getFontWeights().map(r => r[0] === 'bold');
  const iBooking = alleredeInvitertIBooking_();
  const utkastTil = {};
  GmailApp.getDrafts().forEach(d => {
    try { tolkAdresser_(d.getMessage().getTo()).forEach(a => { utkastTil[a.epost] = true; }); } catch (e) { /* hopp over */ }
  });
  const ut = [];
  verdier.forEach((r, i) => {
    const bedrift = String(r[0]).trim();
    const annen = (String(r[kol.annen]).match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [''])[0];
    const epost = (String(r[kol.epost]).trim() || annen).toLowerCase();
    const fraNett = !String(r[kol.epost]).trim() && !!String(r[kol.kilde]).trim();
    if (!bedrift || fet[i] || !epost || !erIkkeKontaktet_(r, kol)) return;
    if (iBooking[normaliserNavn_(sokeNavn_(bedrift))]) return;
    if (utkastTil[epost]) return;
    utkastTil[epost] = true; // samme adresse kan stå på flere rader (f.eks. under to kategorier)
    ut.push({ rad: i + 2, bedrift: sokeNavn_(bedrift), epost, fraNett, tidligere: r[kol.tidligere], norsk: erNorsk_(epost, r[kol.trad]) });
  });
  return ut;
}

/**
 * Norsk eller engelsk? Først ut fra emnet i forrige e-post med bedriften (FSN Capital har .com, men dere har
 * skrevet sammen på norsk), deretter ut fra domenet.
 */
function erNorsk_(epost, forrigeEmne) {
  const emne = String(forrigeEmne || '');
  if (/invitasjon|handelshøyskole|\b(sv|vs|vb):/i.test(emne)) return true;
  if (/invitation|\b(fw|fwd):/i.test(emne)) return false;
  return /\.(no|as)$/.test(String(epost));
}

/** Henter invitasjons-PDF-en fra en invitasjon du har sendt tidligere (filnavnet må begynne med «filnavn»). */
function hentInvitasjonsPdf_(filnavn) {
  const prefiks = filnavn.replace(/\.pdf$/i, '').toLowerCase();
  const sok = 'from:' + KONFIG.WFD_ADRESSE + ' has:attachment filename:pdf {subject:Invitasjon subject:Invitation} after:' + KONFIG.HISTORIKK_FRA_DATO;
  for (const t of GmailApp.search(sok, 0, 20)) {
    for (const m of t.getMessages()) {
      const vedlegg = m.getAttachments().filter(a => a.getName().toLowerCase().indexOf(prefiks) === 0);
      if (vedlegg.length) return vedlegg[0].copyBlob().setName(vedlegg[0].getName());
    }
  }
  return null;
}

function lagInvitasjoner() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const ark = bedriftslisteArk_(ss);
  if (!ark) { ui.alert('Fant ikke fanen Bedriftsliste.'); return; }
  if (PropertiesService.getScriptProperties().getProperty('BL_POS') !== null) {
    ui.alert('Bedriftsliste oppdateres fra Gmail akkurat nå, så listen over hvem som er kontaktet er ikke komplett. ' +
      'Vent til du får e-posten «Bedriftsliste er oppdatert fra Gmail», og prøv igjen.');
    return;
  }

  // Kontakter hentet fra nettet (oransje) brukes ikke før du har sjekket dem og skrevet dem inn selv.
  const alle = invitasjonsKandidater_(ark);
  const fraNett = alle.filter(k => k.fraNett).map(k => k.bedrift);
  const kandidater = alle.filter(k => !k.fraNett);
  const nettTekst = fraNett.length ? '\n\nIkke tatt med fordi kontakten er hentet fra nettet og ikke sjekket ennå (oransje i «' +
    KONFIG.ARK_IKKE_KONTAKTET + '»):\n• ' + fraNett.join('\n• ') +
    '\nNår du har sjekket en, skriv adressen inn på nytt i «' + BL_KOLONNER.annen + '» i Bedriftsliste, så tas den med.' : '';
  if (!kandidater.length) {
    ui.alert('Alle bedrifter på listen som vi har e-post til, er allerede kontaktet i høst (eller har et utkast). 🎉\n\n' +
      'Tips: Kjør «Oppdater Bedriftsliste fra Gmail» først hvis listen ikke er oppdatert.' + nettTekst);
    return;
  }
  const svar = ui.alert('Lag invitasjonsutkast',
    kandidater.length + ' bedrifter er ikke kontaktet i høst, men vi har e-postadressen:\n\n• ' +
    kandidater.map(k => k.bedrift + '  (' + k.epost + ')').join('\n• ') + nettTekst +
    '\n\nDet lages et utkast med invitasjons-PDF til hver av dem i Gmail. Ingenting sendes – du ser over og sender selv. Fortsette?',
    ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;

  const uten = utenKontaktperson_(ark);
  const pdfNo = hentInvitasjonsPdf_(KONFIG.INVITASJON_PDF_NO);
  const pdfEn = hentInvitasjonsPdf_(KONFIG.INVITASJON_PDF_EN);
  const fra = GmailApp.getAliases().map(a => a.toLowerCase()).indexOf(KONFIG.WFD_ADRESSE.toLowerCase()) >= 0 ? KONFIG.WFD_ADRESSE : null;
  const start = Date.now();
  let laget = 0;
  const igjen = [];
  const alleredeSendt = [];
  kandidater.forEach(k => {
    if (Date.now() - start > MAKS_KJORETID_MS) { igjen.push(k.bedrift); return; }
    // Siste sjekk mot Gmail: er det sendt noe til denne adressen siden august (f.eks. i dag, før listen er oppdatert)?
    if (GmailApp.search('to:' + k.epost + ' from:' + KONFIG.WFD_ADRESSE + ' after:' + KONFIG.HISTORIKK_FRA_DATO, 0, 1).length) {
      alleredeSendt.push(k.bedrift);
      return;
    }
    const norsk = k.norsk;
    const fornavn = fornavnFraEpost_(k.epost);
    const hilsen = norsk ? (fornavn ? 'Hei ' + fornavn : 'Hei') : (fornavn ? 'Hi ' + fornavn : 'Hi');
    const tekst = (norsk ? KONFIG.INVITASJON_NO : KONFIG.INVITASJON_EN)
      .replace(/\{navn\}/g, hilsen).replace(/\{bedrift\}/g, k.bedrift);
    const kropp = tekst + '\n' + (norsk ? KONFIG.SIGNATUR : KONFIG.SIGNATUR_EN).replace(/^\n+/, '\n');
    const valg = {};
    const pdf = norsk ? (pdfNo || pdfEn) : (pdfEn || pdfNo);
    if (pdf) valg.attachments = [pdf];
    if (fra) valg.from = fra;
    GmailApp.createDraft(k.epost, norsk ? KONFIG.INVITASJON_EMNE_NO : KONFIG.INVITASJON_EMNE_EN, kropp, valg);
    laget++;
  });

  ui.alert(laget + ' invitasjonsutkast ligger nå under «Utkast» i Gmail.' +
    (alleredeSendt.length ? '\n\nHoppet over fordi de allerede har fått e-post i høst:\n• ' + alleredeSendt.join('\n• ') : '') +
    (pdfNo || pdfEn ? '' : '\n\nMerk: Fant ikke invitasjons-PDF-en i sendt e-post, så den må legges ved manuelt.') +
    (igjen.length ? '\n\nTiden gikk ut før disse – kjør menyvalget én gang til:\n• ' + igjen.join('\n• ') : '') +
    '\n\nSe over, legg gjerne til en personlig setning, og send. Arket oppdateres automatisk når de er sendt.' +
    (uten.length ? '\n\nDisse er heller ikke kontaktet, men vi mangler e-post (finn en kontaktperson og skriv adressen i ' +
      '«' + BL_KOLONNER.annen + '»):\n• ' + uten.join('\n• ') : ''));
}

/** Bedrifter på listen uten e-post som heller ikke er kontaktet i høst – disse må du finne kontaktperson til. */
function utenKontaktperson_(ark) {
  const kol = sikreBlKolonner_(ark);
  const antall = Math.max(ark.getLastRow() - 1, 0);
  if (!antall) return [];
  const verdier = ark.getRange(2, 1, antall, ark.getLastColumn()).getValues();
  const fet = ark.getRange(2, 1, antall, 1).getFontWeights().map(r => r[0] === 'bold');
  return verdier.filter((r, i) => String(r[0]).trim() && !fet[i] && !r[kol.epost] && !/@/.test(String(r[kol.annen])) &&
    erIkkeKontaktet_(r, kol)).map(r => String(r[0]).trim());
}

/** Kjøres automatisk hver natt, så «Ikke kontaktet» alltid er oppdatert. */
function nattligBedriftsliste() {
  try { leggBookingIBedriftsliste_(); } catch (e) { console.warn('Booking → Bedriftsliste: ' + e.message); } // kobler og legger til
  startBlKjoring_();
  fortsettBedriftsliste();
}


// ---------------------------------------------------------------------------
// Alle bedrifter skal stå i Bedriftsliste: bedrifter som bare står i Booking legges til
// ---------------------------------------------------------------------------

const NYE_FRA_BOOKING = 'Nye fra Booking – flytt til riktig kategori';

/**
 * Bedrifter i Booking som ikke er koblet til en rad i Bedriftsliste (via «Navn i Booking»), delt i:
 *   kobles     – står i Bedriftsliste med samme navn, men er ikke koblet ennå (koblingen er sikker og gjøres direkte)
 *   mangler    – står ikke i Bedriftsliste og må legges til
 *   duplikater – samme bedrift står flere ganger i Booking (bare én rad kan kobles; slett/slå sammen de andre)
 *   venter     – en usikker kobling venter i «Til godkjenning»
 * Bare lesing her, så planen kan vises før noe endres.
 */
function bareIBooking_(ss) {
  const liste = bedriftslisteArk_(ss);
  const tom = { liste, mangler: [], kobles: [], duplikater: [], venter: [] };
  if (!liste) return tom;
  const h = overskrifter_(liste);
  const kN = h.indexOf(BL_KOLONNER.bookingNavn);
  const antall = Math.max(liste.getLastRow() - 1, 0);
  const v = antall ? liste.getRange(2, 1, antall, liste.getLastColumn()).getValues() : [];
  const fet = antall ? liste.getRange(2, 1, antall, 1).getFontWeights().map(r => r[0] === 'bold') : [];
  const koblet = {};
  const blPaaNavn = {}; // normalisert navn → første rad (2-basert) og nåværende kobling
  v.forEach((r, i) => {
    const lenke = kN >= 0 ? String(r[kN]).trim() : '';
    if (lenke) koblet[lenke] = true;
    const n = utenAksent_(normaliserNavn_(sokeNavn_(String(r[0]))));
    if (n && !fet[i] && !blPaaNavn[n]) blPaaNavn[n] = { rad: i + 2, lenke };
  });
  const venterPaa = {};
  godkjenninger_().forEach(g => { if (g.status === VENTER && g.data.type === 'blBooking') venterPaa[g.data.verdi] = true; });

  const tabell = lesBedrifter_();
  const brukt = {};
  tabell.rader.forEach((r, i) => {
    const b = String(celle_(tabell, i, 'bedrift')).trim();
    if (!b || koblet[b]) return;
    const n = utenAksent_(normaliserNavn_(sokeNavn_(b)));
    if (venterPaa[b]) { tom.venter.push(b); return; }
    const bl = blPaaNavn[n];
    if (bl && !bl.lenke && !brukt[n]) { tom.kobles.push({ booking: b, rad: bl.rad }); brukt[n] = true; return; }
    if (bl || brukt[n]) { tom.duplikater.push({ booking: b, andre: bl && bl.lenke ? bl.lenke : '' }); return; }
    brukt[n] = true;
    tom.mangler.push({ booking: b, navn: sokeNavn_(b) });
  });
  return tom;
}

/** Kobler og legger til det som mangler. Returnerer { lagtTil, koblet }. */
function leggBookingIBedriftsliste_() {
  const ss = hentRegneark_();
  const { liste, mangler, kobles } = bareIBooking_(ss);
  if (!liste || (!mangler.length && !kobles.length)) return { lagtTil: [], koblet: [] };
  const kol = sikreBlKolonner_(liste);
  kobles.forEach(k => liste.getRange(k.rad, kol.bookingNavn + 1).setValue(k.booking));
  if (mangler.length) {
    const navnA = liste.getRange(1, 1, Math.max(liste.getLastRow(), 1), 1).getValues().map(r => String(r[0]).trim());
    if (navnA.indexOf(NYE_FRA_BOOKING) < 0) {
      liste.getRange(liste.getLastRow() + 1, 1).setValue(NYE_FRA_BOOKING).setFontWeight('bold');
    }
    const start = liste.getLastRow() + 1;
    const bredde = liste.getLastColumn();
    liste.getRange(start, 1, mangler.length, bredde).setValues(mangler.map(m => {
      const rad = new Array(bredde).fill('');
      rad[0] = m.navn;
      rad[kol.bookingNavn] = m.booking; // sikker kobling: raden kommer fra Booking
      return rad;
    })).setFontWeight('normal');
  }
  sikreBlKolonner_(liste); // kategori, avkrysning, filter og farger
  return { lagtTil: mangler.map(m => m.navn), koblet: kobles.map(k => k.booking) };
}

/** Menyvalg: legg bedrifter som bare står i Booking inn i Bedriftsliste. */
function leggBookingIBedriftslisteMeny() {
  const ui = SpreadsheetApp.getUi();
  const { mangler, kobles, duplikater, venter } = bareIBooking_(SpreadsheetApp.getActiveSpreadsheet());
  const deler = [];
  if (kobles.length) deler.push(kobles.length + ' står allerede i Bedriftsliste og kobles til raden sin i Booking:\n• ' +
    kobles.map(k => k.booking).join('\n• '));
  if (mangler.length) deler.push(mangler.length + ' legges nederst i Bedriftsliste under «' + NYE_FRA_BOOKING + '»:\n• ' +
    mangler.map(m => m.navn).join('\n• '));
  const info = [];
  if (duplikater.length) info.push('Står to ganger i Booking (bare én rad kan kobles – slett eller slå sammen den andre):\n• ' +
    duplikater.map(d => d.booking + (d.andre ? '  (samme som «' + d.andre + '»)' : '')).join('\n• '));
  if (venter.length) info.push('Venter på godkjenning i «' + KONFIG.ARK_GODKJENNING + '»:\n• ' + venter.join('\n• '));
  if (!deler.length) {
    ui.alert(info.length ? 'Ingenting å legge til.\n\n' + info.join('\n\n') : 'Alle bedriftene i Booking står i Bedriftsliste. 🎉');
    return;
  }
  const svar = ui.alert('Legg bedrifter fra Booking inn i Bedriftsliste',
    deler.join('\n\n') + (info.length ? '\n\n' + info.join('\n\n') : '') + '\n\nFortsette?', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;
  const r = leggBookingIBedriftsliste_();
  ui.alert(r.koblet.length + ' koblet og ' + r.lagtTil.length + ' lagt til i Bedriftsliste.' +
    (r.lagtTil.length ? ' Flytt de nye til riktig kategori når det passer.' : '') +
    (info.length ? '\n\nGjenstår:\n' + info.join('\n\n') : ''));
}

// ===================== Nettkontakter.gs =====================
/**
 * Kontakter funnet på nettet for bedrifter i Bedriftsliste som manglet kontaktperson (oktober 2026).
 * Skrives inn i kolonnen «Annen kontakt» (bare der den er tom) og markeres oransje, så du ser at de er hentet
 * fra nettet og bør sjekkes før de brukes. Kilden står i en merknad på cellen.
 *
 * domene: e-postdomenet bedriften bruker, når det ikke ligner navnet i listen (f.eks. «SpareBank1 Markets» →
 * sb1markets.no). Da finner «Oppdater Bedriftsliste fra Gmail» e-postene til bedriften likevel.
 *
 * Navnet til venstre må være skrevet som i kolonne A i Bedriftsliste (store/små bokstaver og æøå spiller ingen rolle).
 */
const NETTKONTAKTER = {
  'Alfred Berg': { kontakt: 'kundesenter.no@alfredberg.com', merknad: 'Generell kundeadresse, ingen HR-kontakt funnet', kilde: 'https://prospeo.io/c/alfred-berg-kapitalforvaltning' },
  'Alliance Venture': { kontakt: 'hello@alliance.vc', merknad: 'Generell adresse (brukes mye til pitcher)', kilde: 'https://superscout.co/investor/alliance-vc' },
  'Eviny ventures': { kontakt: 'andreas.engelsen@eviny.no', merknad: 'Andreas Engelsen, daglig leder. Utkast laget 5.10', kilde: 'https://ventures.eviny.no/andreas-engelsen-en' },
  'Fondsfinans': { kontakt: 'Tlf. 23 11 30 00', merknad: 'Ingen e-post funnet. Daglig leder Nils Erling Ødegaard', kilde: 'https://prospeo.io/c/fondsfinans-kapitalforvaltning' },
  'norcap': { kontakt: 'Tlf. 67 58 22 80', merknad: 'Ingen e-post funnet. Sjekk at det er riktig Norcap (Lysaker)', kilde: 'https://oljelandet.no/bedrift/norcap-as/informasjon' },
  'Reitan Kapital': { kontakt: 'Tlf. 73 89 10 00', merknad: 'Ingen e-post funnet (Reitan-sentralbord). Leder: Magnus Reitan', kilde: 'https://snl.no/Reitangruppen' },
  'Blackstone': { kontakt: 'Ingen e-post – prøv LinkedIn', merknad: 'EMEA campus recruiting. Studentside: blackstone.com/careers/students', kilde: 'https://www.blackstone.com/careers/students/' },
  'JP Morgan': { domene: 'jpmchase.com', kontakt: 'amanda.house@jpmchase.com', merknad: 'Amanda House, EMEA Early Careers (dialog i 2025). Utkast laget 5.10', kilde: 'Gmail' },
  'KKR': { kontakt: 'Ingen e-post – prøv LinkedIn', merknad: 'Kun sentralbord London +44 20 7839 9800', kilde: 'https://www.kkr.com/contact' },
  'Rothschild': { kontakt: 'perolov.bergstrom@rothschild.com', merknad: 'Per-Olov Bergström, Head of Nordic (ikke HR). Fra offentlige dokumenter, kan være gammel', kilde: 'https://www.rothschildandco.com/en/office-listing/nordic/' },
  'Vanguard': { kontakt: 'careers@vanguard.com', merknad: 'Generell rekrutteringsadresse', kilde: 'https://www.vanguardjobs.com/privacy-policy-eu/' },
  'ABG': { kontakt: 'thea.klausen@abgsc.no', merknad: 'Fra NU-portalen, kan være gammel. Styret (Amalie) har egen dialog med ABG – sjekk først', kilde: 'https://nu.nhhs.no/companies/12' },
  'Bank of America': { domene: 'bofa.com', kontakt: 'thomas.makinen@bofa.com', merknad: 'Invitert 5.10 (Thomas Makinen og Pippa Jones)', kilde: 'Gmail' },
  'Carnegie': { kontakt: 'Duplikat av DNB Carnegie', merknad: 'Slett denne raden', kilde: '' },
  'Morgen Stanley': { domene: 'morganstanley.com', kontakt: 'erik.tregaard@morganstanley.com', merknad: 'Erik Tregaard (dialog i 2025). Utkast laget 5.10. Generell: graduaterecruitmenteurope@morganstanley.com', kilde: 'Gmail' },
  'SpareBank1 Markets': { domene: 'sb1markets.no', kontakt: 'Petter.Kongslie@sb1markets.no', merknad: 'Petter Kongslie, Head of Research. Takket nei i 2026 og 2025 pga. dato', kilde: 'Gmail' },
  'Finans Norge': { kontakt: 'firmapost@finansnorge.no', merknad: 'Generell adresse', kilde: 'https://www.finansnorge.no/om-finans-norge/kontakt-oss/' },
  'Kvinner i finans': { domene: 'futureboards.no', kontakt: 'turid.solvang@futureboards.no', merknad: 'Turid Solvang, FutureBoards (driver Kvinner i Finans Charter). Utkast laget 5.10', kilde: 'https://www.futureboards.no/contact' },
  'WIC': { kontakt: 'wic@nbim.no', merknad: "Women's Investment Club (NBIM)", kilde: 'https://www.nbim.no/en/about-us/women-in-finance/womens-investment-club/' },
  'AKO Capital': { kontakt: 'jobs@akocapital.com', merknad: 'Rekrutteringsadresse (de tar ikke imot åpne søknader nå)', kilde: 'https://www.akocapital.com/careers/' },
  'EquipCapital': { kontakt: 'hs@equip.no', merknad: 'Hanna Skolt (var med på workshop i 2026). Utkast laget 5.10', kilde: 'Gmail' },
  'Ferd': { kontakt: 'afo@ferd.no', merknad: 'Anniken (takket nei til 2026 etter telefonsamtale). Generell: post@ferd.no', kilde: 'Gmail' },
  'Grieg Capital': { kontakt: 'information@grieg.no', merknad: 'Grieg-gruppen, Bergen. Grieg Kapital: dealflow@grieg.no', kilde: 'https://griegkapital.no/contact/' },
  'Hadean Ventures': { kontakt: 'ingrid.beyer@hadeanventures.com', merknad: 'Ingrid Beyer, Head of IR & BD. Utkast laget 5.10', kilde: 'https://hadeanventures.com/ingrid-beyer-3/' },
  'Herkules Capital': { kontakt: 'post@herkules.no', merknad: 'Generell adresse, kan være gammel', kilde: 'https://herkulescapital.no/' },
  'Hitec vision': { domene: 'hitecvision.com', kontakt: 'hshansen@hitecvision.com', merknad: 'Hilde Søraas Hansen, Head of People (dialog i 2023)', kilde: 'Gmail' },
  'Kistefos': { kontakt: 'Tlf. 23 11 70 00', merknad: 'Ingen HR- eller generell e-post funnet', kilde: 'https://kistefos.no/' },
  'nordover kapital': { kontakt: 'contact@nordoverkapital.no', merknad: 'Generell adresse (search fund)', kilde: 'https://nordoverkapital.no/contact' },
  'Reiten & Co': { kontakt: 'post@reitenco.no', merknad: 'Fra 2017, kan være gammel', kilde: 'https://reitenco.com/' },
  'Antler': { kontakt: 'kristian@antler.co', merknad: 'Kristian Jul Røsjø, Partner Oslo. Utkast laget 5.10', kilde: 'https://www.antler.co/norway' },
  'Idekapital': { kontakt: 'kristian@idekapital.com', merknad: 'Kristian Øvsthus, Managing Partner (Oslo). Utkast laget 5.10', kilde: 'https://idek.no/team/' },
  'northzone': { kontakt: 'press@northzone.com', merknad: 'Bare presseadresse funnet', kilde: 'https://northzone.com/contact/' },
  'Skagerak capital': { kontakt: 'espen@skagerakcapital.com', merknad: 'Espen Kjeldsen, Partner. Utkast laget 5.10', kilde: 'https://www.skagerakcapital.com/contact' },
  'Start up lab': { kontakt: 'christina@startuplab.no', merknad: 'Christina Wiig, Head of Corporate Partnerships (Bergen: erlend@startuplab.no). Utkast laget 5.10', kilde: 'https://www.startuplab.no/team' },
  'Formuesforvaltning': { kontakt: 'Ser ut som en kategori', merknad: 'Ikke en bedrift? Gjør raden fet (kategori) eller slett den', kilde: '' },
  'Kapitalforvaltning': { kontakt: 'Ser ut som en kategori', merknad: 'Ikke en bedrift? Gjør raden fet (kategori) eller slett den', kilde: '' },
  'Venture capital': { kontakt: 'Ser ut som en kategori', merknad: 'Ikke en bedrift? Gjør raden fet (kategori) eller slett den', kilde: '' },
};

/** Oppslag i NETTKONTAKTER uten hensyn til store/små bokstaver, mellomrom og æøå. */
function nettkontakt_(bedrift) {
  const nokkel = utenAksent_(normaliserNavn_(sokeNavn_(bedrift)));
  if (!nokkel) return null;
  if (!NETTKONTAKT_INDEKS_) {
    NETTKONTAKT_INDEKS_ = {};
    Object.keys(NETTKONTAKTER).forEach(n => { NETTKONTAKT_INDEKS_[utenAksent_(normaliserNavn_(n))] = NETTKONTAKTER[n]; });
  }
  return NETTKONTAKT_INDEKS_[nokkel] || null;
}
let NETTKONTAKT_INDEKS_ = null;

/**
 * Fyller «Annen kontakt» fra NETTKONTAKTER der cellen er tom, og bare én gang per bedrift (sletter du en, kommer
 * den ikke tilbake). Hentede kontakter får kilden i den skjulte kolonnen «Hentet fra», som gjør dem oransje.
 * Returnerer antall som ble fylt inn.
 */
function fyllNettkontakter_(ark, kol) {
  const antall = Math.max(ark.getLastRow() - 1, 0);
  if (!antall) return 0;
  const egenskaper = PropertiesService.getScriptProperties();
  const fylt = JSON.parse(egenskaper.getProperty('NETTKONTAKTER_FYLT') || '{}');
  const tidligereFylt = Object.assign({}, fylt); // samme navn på flere rader (to kategorier) fylles i samme kjøring
  const navn = ark.getRange(2, 1, antall, 1).getValues().map(r => String(r[0]).trim());
  const annen = ark.getRange(2, kol.annen + 1, antall, 1).getValues();
  let n = 0;
  navn.forEach((b, i) => {
    const k = b && nettkontakt_(b);
    const nokkel = utenAksent_(normaliserNavn_(b));
    if (!k || tidligereFylt[nokkel] || String(annen[i][0]).trim()) return;
    const rad = i + 2;
    ark.getRange(rad, kol.annen + 1).setValue(k.kontakt)
      .setNote((k.merknad || '') + (k.kilde ? '\nKilde: ' + k.kilde : ''));
    ark.getRange(rad, kol.kilde + 1).setValue(k.kilde || 'nett');
    if (/@/.test(k.kontakt)) {
      foreslaa_(sokeNavn_(b), 'Kontakt hentet fra nettet', '', k.kontakt, (k.merknad || '') + (k.kilde ? ' · Kilde: ' + k.kilde : ''), '',
        { type: 'nett', nokkel: 'nett|' + nokkel + '|' + k.kontakt.toLowerCase() });
    }
    fylt[nokkel] = true;
    n++;
  });
  egenskaper.setProperty('NETTKONTAKTER_FYLT', JSON.stringify(fylt));
  return n;
}

// ===================== Avkryssing.gs =====================
/**
 * Avkrysninger i rapportfanene som oppdaterer Booking og Bedriftsliste:
 *
 *  Oversikt → «Trenger svar fra deg» ✓   «Trenger svar» settes til Nei i Booking (du har svart / trenger ikke svar).
 *  Oversikt → «Bør purres» ✓              Status blir «Purret» og «Sist kontakt» i dag i Booking.
 *  Ikke kontaktet ✓ / ✗                   «Har kontaktet» / «Ikke aktuell» krysses av i Bedriftsliste.
 *  Bedriftsliste → «Annen kontakt»        Skriver du inn en kontakt selv, er den ikke lenger «hentet fra nett» (oransje).
 *  Til godkjenning → Godkjenn / Avvis     Forslaget skrives inn (eller forkastes). Se Godkjenning.gs.
 *
 * onEdit er en enkel trigger: den kjører av seg selv når noen endrer en celle, uten oppsett. Den bruker bare
 * regnearket som er åpent (ikke Gmail), og hver endring logges i Logg.
 */
function onEdit(e) {
  try {
    if (!e || !e.range || e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;
    const navn = e.range.getSheet().getName();
    if (navn === KONFIG.ARK_OVERSIKT) return hakeOversikt_(e);
    if (navn === KONFIG.ARK_IKKE_KONTAKTET) return hakeIkkeKontaktet_(e);
    if (navn === KONFIG.ARK_GODKJENNING) return hakeGodkjenning_(e);
    const liste = bedriftslisteArk_(e.source);
    if (liste && navn === liste.getName()) return endretBedriftsliste_(e, liste);
  } catch (feil) {
    console.error('onEdit: ' + feil.message);
  }
}

function erAvkrysset_(e) {
  return String(e.value).toUpperCase() === 'TRUE';
}

/** Kolonnenummer (1-basert) for en av Bookings kolonner, funnet på overskriften. 0 hvis den mangler. */
function bookingKol_(overskrifter, nokkel) {
  const navn = kolonnenavn_(nokkel).map(n => n.toLowerCase());
  return overskrifter.findIndex(h => navn.indexOf(String(h).trim().toLowerCase()) >= 0) + 1;
}

function bookingArkFra_(ss) {
  const ark = ss.getSheetByName(KONFIG.ARK_BEDRIFTER);
  if (ark) return ark;
  try {
    const navn = PropertiesService.getScriptProperties().getProperty('BEDRIFTSARK');
    return navn ? ss.getSheetByName(navn) : null;
  } catch (e) {
    return null;
  }
}

function loggManuelt_(ss, bedrift, hva, for_, etter) {
  const logg = ss.getSheetByName(KONFIG.ARK_LOGG);
  if (logg) logg.appendRow([new Date(), bedrift, 'Manuelt', '', '', hva, for_ || '', etter || '', '']);
}

function hakeOversikt_(e) {
  if (!erAvkrysset_(e)) return;
  const c = e.range.getColumn();
  const r = e.range.getRow();
  if (r <= oversiktListeHode_() || (c !== 2 && c !== 8)) return;
  const bedrift = String(e.range.getSheet().getRange(r, c + 2).getValue()).trim();
  e.range.setValue(false);
  if (!bedrift) return;

  const ss = e.source;
  const booking = bookingArkFra_(ss);
  if (!booking || booking.getLastRow() < 2) return;
  const h = booking.getRange(1, 1, 1, booking.getLastColumn()).getValues()[0];
  const kBedrift = bookingKol_(h, 'bedrift');
  if (!kBedrift) return;
  const navn = booking.getRange(2, kBedrift, booking.getLastRow() - 1, 1).getValues().map(v => String(v[0]).trim());
  const i = navn.indexOf(bedrift);
  if (i < 0) return;
  const rad = i + 2;

  if (c === 2) {
    const k = bookingKol_(h, 'trengerSvar');
    if (k) booking.getRange(rad, k).setValue('Nei');
    loggManuelt_(ss, bedrift, 'Krysset av på Oversikt: svart / trenger ikke svar');
  } else {
    const kStatus = bookingKol_(h, 'status');
    const kSist = bookingKol_(h, 'sistKontakt');
    const for_ = kStatus ? String(booking.getRange(rad, kStatus).getValue()) : '';
    const etter = for_ === 'Kontaktet' || for_ === KONFIG.STATUSER[0] ? 'Purret' : for_;
    if (kStatus && etter !== for_) booking.getRange(rad, kStatus).setValue(etter);
    if (kSist) booking.getRange(rad, kSist).setValue(new Date());
    loggManuelt_(ss, bedrift, 'Krysset av på Oversikt: purret', for_, etter);
  }
}

function hakeIkkeKontaktet_(e) {
  if (!erAvkrysset_(e)) return;
  const c = e.range.getColumn();
  if ((c !== 2 && c !== 3) || e.range.getRow() <= IK_HODE) return;
  const bedrift = String(e.range.getSheet().getRange(e.range.getRow(), IK_BEDRIFT).getValue()).trim();
  e.range.setValue(false);
  if (!bedrift) return;

  const liste = bedriftslisteArk_(e.source);
  if (!liste || liste.getLastRow() < 2) return;
  const h = liste.getRange(1, 1, 1, liste.getLastColumn()).getValues()[0].map(v => String(v).trim());
  const kol = h.indexOf(c === 2 ? BL_KOLONNER.manuelt : BL_KOLONNER.ikkeAktuell) + 1;
  if (!kol) return;
  const navn = liste.getRange(2, 1, liste.getLastRow() - 1, 1).getValues().map(v => String(v[0]).trim());
  let funnet = 0;
  navn.forEach((n, i) => {
    if (n !== bedrift) return;
    liste.getRange(i + 2, kol).setValue(true); // alle rader med samme navn (bedriften kan stå under to kategorier)
    funnet++;
  });
  if (funnet) loggManuelt_(e.source, bedrift, 'Krysset av i «' + KONFIG.ARK_IKKE_KONTAKTET + '»: ' +
    (c === 2 ? 'kontaktet på annen måte' : 'ikke aktuell i år'));
}

/** Skriver du selv i «Annen kontakt», er kontakten ikke lenger hentet fra nettet: fjern kilden (og den oransje fargen). */
function endretBedriftsliste_(e, liste) {
  const h = liste.getRange(1, 1, 1, liste.getLastColumn()).getValues()[0].map(v => String(v).trim());
  if (e.range.getColumn() !== h.indexOf(BL_KOLONNER.annen) + 1 || e.range.getRow() < 2) return;
  const kKilde = h.indexOf(BL_KOLONNER.kilde) + 1;
  if (kKilde) liste.getRange(e.range.getRow(), kKilde).clearContent();
  // Et ventende «kontakt fra nett»-forslag for bedriften er da avgjort av deg.
  const gArk = e.source.getSheetByName(KONFIG.ARK_GODKJENNING);
  const bedrift = String(liste.getRange(e.range.getRow(), 1).getValue()).trim();
  if (gArk && gArk.getLastRow() > 1 && bedrift) {
    const v = gArk.getRange(2, 1, gArk.getLastRow() - 1, GODKJENNING_KOLONNER.length).getValues();
    v.forEach((r, i) => {
      if (String(r[G.status - 1]) === VENTER && /"type":"nett"/.test(r[G.data - 1]) &&
        normaliserNavn_(r[G.bedrift - 1]) === normaliserNavn_(bedrift)) {
        gArk.getRange(i + 2, G.status).setValue('Endret selv i Bedriftsliste');
      }
    });
  }
}

// ===================== Godkjenning.gs =====================
/**
 * «Til godkjenning»: alt systemet gjetter på, havner her i stedet for å bli skrevet rett inn.
 *
 *   Sikkert (skrives rett inn):  datoer, hvem som skrev sist, Trenger svar, at e-post er sendt/mottatt
 *                                (Kontaktet / Purret / I dialog), og det du har skrevet selv.
 *   Usikkert (til godkjenning):  status tolket fra teksten (Takket nei, Interessert, Bekreftet …), pakke fra e-post,
 *                                nye bedrifter fra Gmail, e-post koblet til en bedrift fordi domenet bare ligner navnet,
 *                                og kontakter hentet fra nettet.
 *
 * Du krysser av i «Godkjenn» eller «Avvis». Godkjent blir skrevet inn i Booking/Bedriftsliste med en gang, avvist
 * blir ikke gjort (og foreslås ikke igjen). Så lenge noe venter, er Status-cellen til bedriften oransje, og Oversikt
 * viser hvor mange som venter.
 */

const GODKJENNING_KOLONNER = ['Lagt til', 'Bedrift', 'Hva', 'Nå', 'Forslag', 'Grunnlag', 'Gmail', 'Godkjenn', 'Avvis', 'Status', 'Data'];
const G = { tid: 1, bedrift: 2, hva: 3, naa: 4, forslag: 5, grunnlag: 6, gmail: 7, ja: 8, nei: 9, status: 10, data: 11 };
const VENTER = 'Venter';

function godkjenningsArk_(ss) {
  const navn = KONFIG.ARK_GODKJENNING;
  let ark = ss.getSheetByName(navn);
  if (!ark) {
    ark = ss.insertSheet(navn);
    ark.getRange(1, 1, 1, GODKJENNING_KOLONNER.length).setValues([GODKJENNING_KOLONNER]);
    stilGodkjenning_(ark);
  }
  return ark;
}

function stilGodkjenning_(ark) {
  const n = GODKJENNING_KOLONNER.length;
  ark.getRange(1, 1, 1, n).setBackground('#C2410C').setFontColor('#FFFFFF').setFontWeight('bold').setVerticalAlignment('middle');
  ark.setRowHeight(1, 30);
  ark.setFrozenRows(1);
  [95, 170, 210, 130, 170, 380, 70, 80, 70, 110, 60].forEach((b, i) => ark.setColumnWidth(i + 1, b));
  ark.getRange(1, G.ja).setNote('Kryss av for å godkjenne. Endringen skrives inn i Booking/Bedriftsliste med en gang.');
  ark.getRange(1, G.nei).setNote('Kryss av for å avvise. Endringen blir ikke gjort, og systemet foreslår den ikke igjen.');
  ark.hideColumns(G.data);
  const maks = Math.max(ark.getMaxRows() - 1, 1);
  ark.getRange(2, G.tid, maks, 1).setNumberFormat('d. mmm hh:mm').setFontColor('#6B7280');
  ark.getRange(2, G.bedrift, maks, 1).setFontWeight('bold');
  ark.getRange(2, G.grunnlag, maks, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setFontColor('#6B7280');
  ark.getRange(2, G.ja, maks, 2).setHorizontalAlignment('center');
  const regel = () => SpreadsheetApp.newConditionalFormatRule();
  const rader = ark.getRange(2, 1, maks, G.status);
  ark.setConditionalFormatRules([
    regel().whenFormulaSatisfied('=AND($B2<>"",$J2<>"' + VENTER + '")').setFontColor('#9CA3AF').setRanges([rader]).build(),
    regel().whenTextEqualTo(VENTER).setBackground('#FFEDD5').setFontColor('#9A3412').setBold(true)
      .setRanges([ark.getRange(2, G.status, maks, 1)]).build(),
    regel().whenFormulaSatisfied('=$J2="' + VENTER + '"').setBackground('#FFF7ED').setRanges([ark.getRange(2, G.forslag, maks, 1)]).build(),
  ]);
  try { if (!ark.getFilter()) ark.getRange(1, 1, Math.max(ark.getLastRow(), 2), n).createFilter(); } catch (e) { /* ikke viktig */ }
}

let GODKJENNINGER_ = null; // per kjøring: alle forslag (for å unngå dobbelt og for å respektere avvisninger)

function godkjenninger_() {
  if (GODKJENNINGER_) return GODKJENNINGER_;
  GODKJENNINGER_ = [];
  try {
    const ark = hentRegneark_().getSheetByName(KONFIG.ARK_GODKJENNING);
    if (ark && ark.getLastRow() > 1) {
      ark.getRange(2, 1, ark.getLastRow() - 1, GODKJENNING_KOLONNER.length).getValues().forEach(r => {
        let data = {};
        try { data = JSON.parse(r[G.data - 1] || '{}'); } catch (e) { /* hopp over */ }
        GODKJENNINGER_.push({ status: String(r[G.status - 1]), data });
      });
    }
  } catch (e) { /* ingen fane ennå */ }
  return GODKJENNINGER_;
}

/** Finnes det allerede et forslag med samme nøkkel (venter, godkjent eller avvist)? Returnerer statusen eller ''. */
function forslagStatus_(nokkel) {
  const f = godkjenninger_().filter(g => g.data.nokkel === nokkel).pop();
  return f ? f.status : '';
}

function erAvvist_(nokkel) {
  return /^Avvist/.test(forslagStatus_(nokkel));
}

/**
 * Legger et forslag i «Til godkjenning» (hvis det ikke finnes fra før). data.nokkel må være unik for forslaget.
 * data.type: status | pakke | nyBedrift | kobling | blKobling | nett
 */
function foreslaa_(bedrift, hva, naa, forslag, grunnlag, gmailUrl, data) {
  if (!data || !data.nokkel || forslagStatus_(data.nokkel)) return false;
  data.bedrift = bedrift;
  data.verdi = data.verdi === undefined ? forslag : data.verdi;
  const ark = godkjenningsArk_(hentRegneark_());
  const rad = Math.max(ark.getLastRow(), 1) + 1;
  ark.getRange(rad, 1, 1, GODKJENNING_KOLONNER.length).setValues([[new Date(), bedrift, hva, naa || '', forslag || '',
    String(grunnlag || '').replace(/\s+/g, ' ').slice(0, 300), '', false, false, VENTER, JSON.stringify(data)]]);
  if (gmailUrl) ark.getRange(rad, G.gmail).setFormula('=HYPERLINK("' + gmailUrl + '","Åpne")');
  ark.getRange(rad, G.ja, 1, 2).insertCheckboxes();
  godkjenninger_().push({ status: VENTER, data });
  return true;
}

// ---------------------------------------------------------------------------
// Avkrysning i «Til godkjenning» (kalles fra onEdit, uten Gmail)
// ---------------------------------------------------------------------------

function hakeGodkjenning_(e) {
  if (String(e.value).toUpperCase() !== 'TRUE') return;
  const c = e.range.getColumn();
  const r = e.range.getRow();
  if (r < 2 || (c !== G.ja && c !== G.nei)) return;
  const ark = e.range.getSheet();
  const rad = ark.getRange(r, 1, 1, GODKJENNING_KOLONNER.length).getValues()[0];
  if (String(rad[G.status - 1]) !== VENTER) { e.range.setValue(false); return; }
  let data = {};
  try { data = JSON.parse(rad[G.data - 1] || '{}'); } catch (err) { /* tom */ }
  const godkjent = c === G.ja;
  let merknad = '';
  try {
    merknad = utforBeslutning_(e.source, data, godkjent) || '';
  } catch (err) {
    merknad = 'Feil: ' + err.message;
  }
  const dato = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd.M');
  ark.getRange(r, G.status).setValue((godkjent ? 'Godkjent ' : 'Avvist ') + dato + (merknad ? ' – ' + merknad : ''));
  ark.getRange(r, godkjent ? G.nei : G.ja).setValue(false);
  loggManuelt_(e.source, data.bedrift || rad[G.bedrift - 1], (godkjent ? 'Godkjent: ' : 'Avvist: ') + rad[G.hva - 1] + ' → ' + rad[G.forslag - 1],
    rad[G.naa - 1], godkjent ? rad[G.forslag - 1] : rad[G.naa - 1]);
}

/** Gjør det som er godkjent (eller rydder opp etter en avvisning). Returnerer en kort merknad eller ''. */
function utforBeslutning_(ss, data, godkjent) {
  const booking = bookingArkFra_(ss);
  const liste = bedriftslisteArk_(ss);
  const bRad = () => finnRadPaaNavn_(booking, bookingKol_(overskrifter_(booking), 'bedrift'), data.bedrift);

  switch (data.type) {
    case 'status': {
      if (!godkjent) return '';
      const h = overskrifter_(booking);
      const r = bRad();
      if (!r) return 'fant ikke bedriften i Booking';
      settHvis_(booking, r, bookingKol_(h, 'status'), data.verdi);
      if (data.pakke) settHvisTom_(booking, r, bookingKol_(h, 'pakke'), data.pakke);
      if (data.nesteSteg) settHvis_(booking, r, bookingKol_(h, 'nesteSteg'), data.nesteSteg);
      speilEgneKolonner_(booking, h, r, data.verdi);
      return '';
    }
    case 'pakke': {
      if (!godkjent) return '';
      const r = bRad();
      if (!r) return 'fant ikke bedriften i Booking';
      settHvis_(booking, r, bookingKol_(overskrifter_(booking), 'pakke'), data.verdi);
      return '';
    }
    case 'nyBedrift': {
      if (godkjent) return '';
      const r = bRad();
      if (!r) return '';
      booking.deleteRow(r);
      return 'raden er slettet fra Booking';
    }
    case 'kobling': {
      if (godkjent) return '';
      // Fjern domenet fra raden, så e-post fra dette domenet ikke kobles til bedriften igjen.
      const h = overskrifter_(booking);
      const r = bRad();
      const k = bookingKol_(h, 'domene');
      if (r && k && String(booking.getRange(r, k).getValue()).toLowerCase() === String(data.domene).toLowerCase()) {
        booking.getRange(r, k).clearContent();
      }
      return 'sjekk Sist kontakt og Siste hendelse for bedriften';
    }
    case 'blKobling': {
      if (godkjent || !liste) return '';
      // Tøm Gmail-kolonnene for bedriften, så den vises som ikke kontaktet til neste oppdatering.
      const h = overskrifter_(liste);
      const rader = raderPaaNavn_(liste, 1, data.bedrift);
      ['host', 'svar', 'tidligere', 'epost', 'trad'].forEach(k => {
        const kol = h.indexOf(BL_KOLONNER[k]) + 1;
        if (kol) rader.forEach(r => liste.getRange(r, kol).clearContent());
      });
      return '';
    }
    case 'blBooking': {
      if (!godkjent || !liste) return '';
      const k = overskrifter_(liste).indexOf(BL_KOLONNER.bookingNavn) + 1;
      if (k) raderPaaNavn_(liste, 1, data.bedrift).forEach(r => liste.getRange(r, k).setValue(data.verdi));
      return '';
    }
    case 'nett': {
      if (!liste) return '';
      const h = overskrifter_(liste);
      const kKilde = h.indexOf(BL_KOLONNER.kilde) + 1;
      const kAnnen = h.indexOf(BL_KOLONNER.annen) + 1;
      raderPaaNavn_(liste, 1, data.bedrift).forEach(r => {
        if (kKilde) liste.getRange(r, kKilde).clearContent(); // godkjent: blir «lagt inn selv» (blå)
        if (!godkjent && kAnnen && String(liste.getRange(r, kAnnen).getValue()) === String(data.verdi)) {
          liste.getRange(r, kAnnen).clearContent();
        }
      });
      return '';
    }
  }
  return '';
}

function overskrifter_(ark) {
  return ark ? ark.getRange(1, 1, 1, Math.max(ark.getLastColumn(), 1)).getValues()[0].map(v => String(v).trim()) : [];
}

function raderPaaNavn_(ark, kol, navn) {
  if (!ark || !kol || ark.getLastRow() < 2) return [];
  const ut = [];
  ark.getRange(2, kol, ark.getLastRow() - 1, 1).getValues().forEach((v, i) => {
    if (String(v[0]).trim() === String(navn).trim()) ut.push(i + 2);
  });
  return ut;
}

function finnRadPaaNavn_(ark, kol, navn) {
  return raderPaaNavn_(ark, kol, navn)[0] || 0;
}

function settHvis_(ark, rad, kol, verdi) {
  if (ark && rad && kol && verdi !== undefined && verdi !== '') ark.getRange(rad, kol).setValue(verdi);
}

function settHvisTom_(ark, rad, kol, verdi) {
  if (ark && rad && kol && !String(ark.getRange(rad, kol).getValue()).trim()) ark.getRange(rad, kol).setValue(verdi);
}

/** Speiler en godkjent status til Invitasjon sendt / Respons / Med (bare tomme celler, som ellers). */
function speilEgneKolonner_(ark, h, rad, status) {
  const sp = KONFIG.SPEIL;
  if (!sp) return;
  const kol = navn => h.indexOf(navn) + 1;
  const nei = status === KONFIG.STATUS_NEI;
  const sett = (navn, verdi, erstatt) => {
    const k = kol(navn);
    if (!k) return;
    const naa = String(ark.getRange(rad, k).getValue()).trim();
    if (!naa || erstatt.indexOf(naa) >= 0) ark.getRange(rad, k).setValue(verdi);
  };
  sett(sp.invitasjonSendt, sp.ja, [sp.nei]);
  if (status !== 'Kontaktet') sett(sp.respons, sp.ja, [sp.nei]);
  if (status === 'Bekreftet') sett(sp.med, sp.ja, [sp.venter]);
  else if (nei) sett(sp.med, sp.nei, [sp.venter]);
  else if (status === 'Interessert' || status === 'Tilbud sendt') sett(sp.med, sp.venter, []);
}
