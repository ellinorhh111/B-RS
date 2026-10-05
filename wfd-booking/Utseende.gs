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
  plan.push('Fanene sorteres: Oversikt, ' + KONFIG.ARK_GJOREMAL + ', ' + KONFIG.ARK_IKKE_KONTAKTET + ', ' + KONFIG.ARK_FJOR + ', ' + KONFIG.ARK_BEDRIFTSOVERSIKT + ', Booking, Bedriftsliste, Logg');

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
      KONFIG.ARK_IKKE_KONTAKTET, KONFIG.ARK_GJOREMAL, KONFIG.ARK_TRADER].indexOf(n) >= 0) return false;
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
  stilBooking_(tabell);
  stilLogg_(ss);
  (KONFIG.ANDRE_FANER || []).forEach(f => { const a = ss.getSheetByName(f.til); if (a) stilEnkelListe_(a); });
  lagOversikt_(ss, tabell);
  lagFjorFane_(ss, tabell);
  lagBedriftsoversikt_(ss, tabell);
  lagIkkeKontaktetFane_(ss);
  lagGjoremal_(ss);
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

  // To avkrysningslister side om side: B–G og H–M.
  const tittel = sist + 4;
  const hode = tittel + 1;
  if (hode !== oversiktListeHode_()) throw new Error('Oversikt: listehodet har flyttet seg – oppdater oversiktListeHode_().');
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
function oversiktListeHode_() {
  const antallStatuser = KONFIG.STATUSER.length + 1; // + «Takket nei»
  return 9 + antallStatuser - 1 + 5;
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

const IK_HODE = 6; // overskriftsraden i «Ikke kontaktet» (brukes også av onEdit)

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
  const ikke = `(${bedrift}<>"")*(${kategori}<>"")*(${host}="")*(${manuelt}<>TRUE)`;

  const ark = forberedRapport_(ss, KONFIG.ARK_IKKE_KONTAKTET, 'Ikke kontaktet i høst',
    'Bedrifter i «' + liste.getName() + '» uten e-post fra WFD-adressen i høst. Kryss av i ✓ når en bedrift er kontaktet ' +
    'på annen måte (telefon, LinkedIn, styret) – da forsvinner den herfra. Oransje = kontakt hentet fra nettet, sjekk før bruk.');

  ark.getRange('B4').setFormula(
    `=ARRAYFORMULA(SUM(${ikke}) & " ikke kontaktet   ·   " & SUM(${ikke}*(${gmail}<>"")) & " e-post fra Gmail   ·   " & ` +
    `SUM(${ikke}*(${gmail}="")*(${annen}<>"")*(${kilde}<>"")) & " hentet fra nett   ·   " & ` +
    `SUM(${ikke}*(${gmail}="")*(${annen}<>"")*(${kilde}="")) & " lagt inn selv   ·   " & ` +
    `SUM(${ikke}*(${gmail}="")*(${annen}="")) & " mangler kontaktperson")`)
    .setFontSize(12).setFontWeight('bold').setFontColor(FARGE.indigo);
  ark.setRowHeight(4, 28);

  const kolonner = [[OVERSIKT_HAKE, 44], ['Kategori', 140], ['Bedrift', 210], ['E-post / kontakt', 270], ['Kilde', 130],
    ['Kontaktet tidligere', 130], ['Siste relevante e-post', 340]];
  const hode = IK_HODE;
  ark.getRange(hode, 2, 1, kolonner.length).setValues([kolonner.map(k => k[0])]);
  stilTabellhode_(ark.getRange(hode, 2, 1, kolonner.length));
  ark.getRange(hode, 2).setHorizontalAlignment('center')
    .setNote('Kryss av når bedriften er kontaktet på annen måte. Da krysses «Har kontaktet» av i Bedriftsliste.');
  ark.setRowHeight(hode, 30);
  kolonner.forEach(([, b], i) => ark.setColumnWidth(2 + i, b));
  ark.setFrozenRows(hode);

  const visKontakt = `IF(${gmail}<>"",${gmail},IF(${annen}<>"",${annen},"– mangler kontaktperson –"))`;
  const visKilde = `IF(${gmail}<>"","Gmail",IF(${annen}="","",IF(${kilde}<>"","Fra nett – sjekk","Lagt inn selv")))`;
  ark.getRange(hode + 1, 3).setFormula(
    `=ARRAYFORMULA(IFERROR(SORT(` +
    `FILTER({${kategori},${bedrift},${visKontakt},${visKilde},${tidligere},${trad}},${ikke}),` +
    `FILTER((${gmail}="")*(${annen}=""),${ikke}),TRUE,FILTER(${gmail}="",${ikke}),TRUE,` +
    `FILTER(${kategori},${ikke}),TRUE,FILTER(${bedrift},${ikke}),TRUE),` +
    `"Alle er kontaktet 🎉"))`);

  const rader = 300;
  ark.getRange(hode + 1, 2, rader, 1).insertCheckboxes().setHorizontalAlignment('center');
  ark.getRange(hode + 1, 3, rader, 1).setFontColor(FARGE.dempet);
  ark.getRange(hode + 1, 4, rader, 1).setFontWeight('bold');
  ark.getRange(hode + 1, 5, rader, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  ark.getRange(hode + 1, 6, rader, 1).setFontColor(FARGE.dempet);
  ark.getRange(hode + 1, 7, rader, 1).setNumberFormat('d. mmm yyyy').setHorizontalAlignment('center');
  ark.getRange(hode + 1, 8, rader, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setFontColor(FARGE.dempet);
  ark.getRange(hode + 1, 2, rader, kolonner.length)
    .setBorder(null, null, null, null, null, true, FARGE.linje, SpreadsheetApp.BorderStyle.SOLID);

  const r0 = hode + 1;
  const regel = () => SpreadsheetApp.newConditionalFormatRule();
  const kontaktOmr = ark.getRange(r0, 5, rader, 1);
  const kontaktOgKilde = ark.getRange(r0, 5, rader, 2);
  ark.setConditionalFormatRules([
    regel().whenFormulaSatisfied(`=$D${r0}=""`).setFontColor(FARGE.hvit).setRanges([ark.getRange(r0, 2, rader, 1)]).build(),
    regel().whenTextEqualTo('– mangler kontaktperson –')
      .setBackground('#FEF3C7').setFontColor('#92400E').setItalic(true).setRanges([kontaktOmr]).build(),
    regel().whenFormulaSatisfied(`=$F${r0}="Fra nett – sjekk"`)
      .setBackground('#FFEDD5').setFontColor('#9A3412').setRanges([kontaktOgKilde]).build(),
    regel().whenFormulaSatisfied(`=$F${r0}="Gmail"`)
      .setBackground('#DCFCE7').setFontColor('#166534').setRanges([kontaktOmr]).build(),
    regel().whenFormulaSatisfied(`=$F${r0}="Lagt inn selv"`)
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
