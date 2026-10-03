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
    .addToUi();
}

function settOpp() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('REGNEARK_ID', ss.getId());

  const tabell = lesBedrifter_(); // legger til kolonner som mangler
  const ark = tabell.ark;
  const maksRad = Math.max(ark.getMaxRows(), 500);
  if (ark.getMaxRows() < maksRad) ark.insertRowsAfter(ark.getMaxRows(), maksRad - ark.getMaxRows());
  const kolonne = n => ark.getRange(2, tabell.kol[n] + 1, maksRad - 1, 1);

  const alleStatuser = KONFIG.STATUSER.concat([KONFIG.STATUS_NEI]);
  kolonne('status').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(alleStatuser, true).setAllowInvalid(true).build());
  kolonne('trengerSvar').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['Ja', 'Nei'], true).setAllowInvalid(true).build());
  kolonne('las').insertCheckboxes();
  ['sistKontakt', 'forsteKontakt', 'oppfolging', 'utkast'].forEach(n => kolonne(n).setNumberFormat('dd.mm.yyyy'));
  ark.getRange(1, tabell.kol.tradId + 1).setNote('Brukes av systemet. Ikke endre.');
  ark.getRange(1, tabell.kol.las + 1).setNote('Kryss av for at systemet aldri skal endre status eller kontaktinfo på denne raden.');

  // Fargekoding
  const bokstav = n => kolonneBokstav_(tabell.kol[n] + 1);
  const helRad = ark.getRange(2, 1, maksRad - 1, tabell.antallKol);
  const regler = [
    [`=$${bokstav('trengerSvar')}2="Ja"`, '#f4cccc'],
    [`=$${bokstav('status')}2="Bekreftet"`, '#d9ead3'],
    [`=$${bokstav('status')}2="${KONFIG.STATUS_NEI}"`, '#eeeeee'],
  ].map(([formel, farge]) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(formel).setBackground(farge).setRanges([helRad]).build());
  ark.setConditionalFormatRules(regler);

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
    '\nNeste steg: «Test AI-tilkoblingen», deretter «Importer historikk fra Gmail».');
}

function lagOversikt_(ss, tabell) {
  const ark = hentEllerLagArk_(ss, KONFIG.ARK_OVERSIKT, null);
  ark.clear();
  const navn = "'" + KONFIG.ARK_BEDRIFTER + "'!";
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
