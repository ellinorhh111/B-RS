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

  // --- Kolonner i arket «Bedrifter». ---
  // Systemet finner kolonnene på overskriften i rad 1, så rekkefølgen er valgfri,
  // og du kan ha egne kolonner i tillegg. Har du allerede et ark med andre overskrifter,
  // endrer du teksten til høyre slik at den matcher dine overskrifter.
  KOLONNER: {
    bedrift: 'Bedrift',
    status: 'Status',
    trengerSvar: 'Trenger svar',
    nesteSteg: 'Neste steg',
    oppfolging: 'Oppfølging dato',
    sistKontakt: 'Sist kontakt',
    retning: 'Siste e-post fra',
    oppsummering: 'Siste hendelse',
    interesse: 'Interesse / pakke',
    kontaktperson: 'Kontaktperson',
    epost: 'E-post',
    telefon: 'Telefon',
    domene: 'Domene',
    forsteKontakt: 'Første kontakt',
    antall: 'Antall e-poster',
    trad: 'Gmail-tråd',
    tradId: 'Tråd-ID',
    utkast: 'Utkast laget',
    notater: 'Notater',
    las: 'Lås',
  },

  // Statusene i rekkefølge. Systemet flytter aldri en bedrift bakover i listen
  // (unntak: «Takket nei»). Endrer du navnene her, gjør det før «Sett opp arket».
  STATUSER: ['Ikke kontaktet', 'Kontaktet', 'Purret', 'I dialog', 'Interessert', 'Tilbud sendt', 'Bekreftet'],
  STATUS_NEI: 'Takket nei',

  ARK_BEDRIFTER: 'Bedrifter',
  ARK_LOGG: 'Logg',
  ARK_OVERSIKT: 'Oversikt',
  ARK_TRADER: '_Tråder',
};
