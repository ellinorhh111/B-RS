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
    const interne = [KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_FJOR, KONFIG.ARK_TRADER];
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
  stilBooking_(tabell);
  stilLogg_(ss);
  lagOversikt_(ss, tabell);
  lagFjorFane_(ss, tabell);
  sorterFaner_(ss, tabell);
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
  if ([KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_FJOR, KONFIG.ARK_TRADER].indexOf(ark.getName()) >= 0) {
    ui.alert('Du står i fanen «' + ark.getName() + '». Klikk på fanen som skal ryddes (f.eks. Sheet1), og velg menyvalget på nytt.');
    return;
  }
  const sisteKol = Math.max(ark.getLastColumn(), 1);
  const overskrifter = ark.getRange(1, 1, 1, sisteKol).getValues()[0].map(v => String(v).trim());

  const systemNokler = ['status', 'pakke', 'trengerSvar', 'nesteSteg', 'oppfolging', 'sistKontakt', 'retning', 'oppsummering',
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
