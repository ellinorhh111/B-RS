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

const FANEFARGE = { oversikt: '#4F5BD5', booking: '#16A34A', liste: '#F59E0B', logg: '#9CA3AF' };

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
  plan.push('Fanene sorteres: Oversikt, ' + KONFIG.ARK_FJOR + ', Booking, Bedriftsliste, Logg');

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
  stilBooking_(tabell);
  stilLogg_(ss);
  lagOversikt_(ss, tabell);
  lagFjorFane_(ss, tabell);
  sorterFaner_(ss, tabell);

  // 4. Tomme faner: spør for seg, siden sletting ikke kan angres med Ctrl+Z.
  const tomme = ss.getSheets().filter(a => {
    const n = a.getName();
    if (n === tabell.ark.getName() || [KONFIG.ARK_LOGG, KONFIG.ARK_OVERSIKT, KONFIG.ARK_FJOR, KONFIG.ARK_TRADER].indexOf(n) >= 0) return false;
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
    [KONFIG.ARK_OVERSIKT, FANEFARGE.oversikt],
    [KONFIG.ARK_FJOR, FANEFARGE.oversikt],
    [tabell.ark.getName(), FANEFARGE.booking],
  ].concat((KONFIG.ANDRE_FANER || []).map(f => [f.til, FANEFARGE.liste]))
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

// ---------------------------------------------------------------------------
// Booking-fanen: bare systemets egne kolonner og fargeregler
// ---------------------------------------------------------------------------

function systemKolonner_(tabell) {
  const egne = ['status', 'pakke', 'trengerSvar', 'nesteSteg', 'oppfolging', 'sistKontakt', 'retning', 'oppsummering',
    'kontaktperson', 'telefon', 'interesse', 'domene', 'forsteKontakt', 'antall', 'trad', 'tradId', 'utkast', 'las'];
  return egne.filter(n => tabell.kol[n] !== undefined);
}

function stilBooking_(tabell) {
  const ark = tabell.ark;
  const maks = Math.max(ark.getMaxRows() - 1, 1);
  const kol = n => tabell.kol[n] + 1;

  // Overskrifter på systemkolonnene
  const bredder = {
    status: 120, pakke: 130, trengerSvar: 105, nesteSteg: 220, oppfolging: 110, sistKontakt: 105, retning: 120,
    oppsummering: 320, kontaktperson: 150, telefon: 110, interesse: 140, forsteKontakt: 110, antall: 90,
    trad: 95, utkast: 105, las: 55, domene: 120, tradId: 120,
  };
  systemKolonner_(tabell).forEach(n => {
    ark.getRange(1, kol(n))
      .setBackground(FARGE.indigoMork).setFontColor(FARGE.hvit).setFontWeight('bold')
      .setHorizontalAlignment('left').setVerticalAlignment('middle');
    ark.setColumnWidth(kol(n), bredder[n] || 120);
    ark.getRange(2, kol(n), maks, 1).setVerticalAlignment('middle').setFontColor(FARGE.tekst);
  });
  ark.getRange(1, kol('status')).setNote('Fylles ut automatisk fra Gmail. Du kan alltid endre den selv.');
  ['trengerSvar', 'sistKontakt', 'retning', 'las', 'utkast'].filter(n => tabell.kol[n] !== undefined)
    .forEach(n => ark.getRange(2, kol(n), maks, 1).setHorizontalAlignment('center'));
  ['oppsummering', 'nesteSteg'].filter(n => tabell.kol[n] !== undefined)
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
  ark.setColumnWidth(1, 220);
  if (sisteKol >= 2) ark.setColumnWidth(2, 360);
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
  const ark = hentEllerLagArk_(ss, KONFIG.ARK_OVERSIKT, null);
  ark.clear();
  ark.clearConditionalFormatRules();
  ark.getRange(1, 1, ark.getMaxRows(), ark.getMaxColumns()).breakApart();
  ark.setHiddenGridlines(true);

  const B = "'" + tabell.ark.getName() + "'!";
  const k = n => kolonneBokstav_(tabell.kol[n] + 1);
  const omr = n => B + k(n) + '2:' + k(n);
  const purrStatus = ['Kontaktet', 'Purret', 'I dialog', 'Interessert', 'Tilbud sendt'];
  const purrDager = KONFIG.PURR_ETTER_DAGER;

  // Rutenett: A er marg, B–M er tolv like kolonner.
  if (ark.getMaxColumns() < 14) ark.insertColumnsAfter(ark.getMaxColumns(), 14 - ark.getMaxColumns());
  ark.setColumnWidth(1, 28);
  for (let c = 2; c <= 13; c++) ark.setColumnWidth(c, 96);
  ark.setColumnWidth(14, 28);
  ark.getRange(1, 1, 80, 14).setFontColor(FARGE.tekst).setVerticalAlignment('middle');

  // Tittel
  ark.setRowHeight(1, 18);
  ark.setRowHeight(2, 36);
  ark.getRange('B2').setValue("Women's Finance Day 2027 · Booking").setFontSize(20).setFontWeight('bold');
  ark.getRange('B3').setFormula('="Oppdateres automatisk fra Gmail  ·  " & TEXT(NOW(), "d. mmm yyyy, hh:mm")')
    .setFontColor(FARGE.dempet).setFontSize(10);

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

/** Flytter «Pakke 2027» rett til høyre for Status hvis den ligger et annet sted. Returnerer tabellen på nytt. */
function plasserPakkeKolonne_(tabell) {
  if (tabell.kol.pakke === undefined || tabell.kol.status === undefined) return tabell;
  const fra = tabell.kol.pakke + 1;
  const etter = tabell.kol.status + 1;
  if (fra === etter + 1) return tabell;
  tabell.ark.moveColumns(tabell.ark.getRange(1, fra, 1, 1), etter + 1 > fra ? etter + 1 : etter + 1);
  return lesBedrifter_();
}

function lagFjorFane_(ss, tabell) {
  const ark = hentEllerLagArk_(ss, KONFIG.ARK_FJOR, null);
  ark.clear();
  ark.clearConditionalFormatRules();
  ark.getRange(1, 1, ark.getMaxRows(), ark.getMaxColumns()).breakApart();
  ark.setHiddenGridlines(true);
  if (ark.getMaxColumns() < 14) ark.insertColumnsAfter(ark.getMaxColumns(), 14 - ark.getMaxColumns());

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

  ark.setColumnWidth(1, 28);
  ark.setColumnWidth(2, 190);
  for (let c = 3; c <= 7; c++) ark.setColumnWidth(c, 140);
  ark.setColumnWidth(8, 240);
  for (let c = 9; c <= 13; c++) ark.setColumnWidth(c, 96);
  ark.getRange(1, 1, 80, 14).setFontColor(FARGE.tekst).setVerticalAlignment('middle');

  ark.setRowHeight(2, 36);
  ark.getRange('B2').setValue('WFD 2027 mot WFD 2026').setFontSize(20).setFontWeight('bold');
  ark.getRange('B3').setValue('Bekreftede Premium partnere og Partnere i år, sammenlignet med i fjor. ' +
    'Tallene for i fjor er hentet fra «(Premium)» og «(Partner)» i bedriftsnavnene. De gule cellene kan du overskrive.')
    .setFontColor(FARGE.dempet).setFontSize(10);

  // Hovedtabell
  const hode = 5;
  ark.getRange(hode, 2, 1, 7).setValues([['', 'I fjor (2026)', 'Bekreftet 2027', 'Endring', 'Andel av i fjor', 'Ikke bekreftet ennå', 'Fremdrift']]);
  ark.getRange(hode, 2, 1, 7).setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold').setHorizontalAlignment('center');
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
