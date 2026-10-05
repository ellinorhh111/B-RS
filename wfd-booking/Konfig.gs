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
  HISTORIKK_BARE_KJENTE: true,
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

  // Pakkene i år. Fjorårets pakke leses fra «(Premium)» / «(Partner)» i bedriftsnavnet.
  PAKKER: { premium: 'Premium partner', partner: 'Partner' },
  ARK_TRADER: '_Tråder',
};
