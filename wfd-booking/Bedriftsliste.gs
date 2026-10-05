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
  // Tøm systemkolonnene først, inkludert gamle avkrysningsbokser, så kategorirader og tomme rader blir rene.
  const kol = sikreBlKolonner_(ark);
  const maks = Math.max(ark.getMaxRows() - 1, 1);
  BL_AUTO.forEach(k => ark.getRange(2, kol[k] + 1, maks, 1).clearDataValidations().clearContent());
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
    if (!bedrift || fet[i] || !epost || r[kol.host] || r[kol.manuelt] === true || r[kol.ikkeAktuell] === true) return;
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
    !r[kol.host] && r[kol.manuelt] !== true && r[kol.ikkeAktuell] !== true).map(r => String(r[0]).trim());
}

/** Kjøres automatisk hver natt, så «Ikke kontaktet» alltid er oppdatert. */
function nattligBedriftsliste() {
  try { leggBookingIBedriftsliste_(); } catch (e) { console.warn('Booking → Bedriftsliste: ' + e.message); }
  startBlKjoring_();
  fortsettBedriftsliste();
}


// ---------------------------------------------------------------------------
// Alle bedrifter skal stå i Bedriftsliste: bedrifter som bare står i Booking legges til
// ---------------------------------------------------------------------------

const NYE_FRA_BOOKING = 'Nye fra Booking – flytt til riktig kategori';

/** Bedrifter i Booking som ikke er koblet til (eller står med samme navn i) Bedriftsliste. */
function bareIBooking_(ss) {
  const liste = bedriftslisteArk_(ss);
  if (!liste) return { liste: null, mangler: [] };
  // Bare lesing her (ingen stil eller forslag), så planen kan vises før noe endres.
  const h = overskrifter_(liste);
  const kol = { bookingNavn: h.indexOf(BL_KOLONNER.bookingNavn) };
  const antall = Math.max(liste.getLastRow() - 1, 0);
  const v = antall ? liste.getRange(2, 1, antall, liste.getLastColumn()).getValues() : [];
  const koblet = {}, navn = {};
  v.forEach(r => {
    if (kol.bookingNavn >= 0 && String(r[kol.bookingNavn]).trim()) koblet[String(r[kol.bookingNavn]).trim()] = true;
    const n = utenAksent_(normaliserNavn_(sokeNavn_(String(r[0]))));
    if (n) navn[n] = true;
  });
  const tabell = lesBedrifter_();
  const mangler = [];
  tabell.rader.forEach((r, i) => {
    const b = String(celle_(tabell, i, 'bedrift')).trim();
    const n = utenAksent_(normaliserNavn_(sokeNavn_(b)));
    if (!b || koblet[b] || navn[n]) return;
    navn[n] = true;
    mangler.push({ booking: b, navn: sokeNavn_(b) });
  });
  return { liste, kol, mangler };
}

/** Legger bedriftene som bare står i Booking nederst i Bedriftsliste, under en egen kategori. Returnerer navnene. */
function leggBookingIBedriftsliste_() {
  const ss = hentRegneark_();
  const { liste, mangler } = bareIBooking_(ss);
  if (!liste || !mangler.length) return [];
  const kol = sikreBlKolonner_(liste);
  const navnA = liste.getRange(1, 1, Math.max(liste.getLastRow(), 1), 1).getValues().map(r => String(r[0]).trim());
  if (navnA.indexOf(NYE_FRA_BOOKING) < 0) {
    const r = liste.getLastRow() + 1;
    liste.getRange(r, 1).setValue(NYE_FRA_BOOKING).setFontWeight('bold');
  }
  const start = liste.getLastRow() + 1;
  const bredde = liste.getLastColumn();
  liste.getRange(start, 1, mangler.length, bredde).setValues(mangler.map(m => {
    const rad = new Array(bredde).fill('');
    rad[0] = m.navn;
    rad[kol.bookingNavn] = m.booking; // sikker kobling: raden kommer fra Booking
    return rad;
  })).setFontWeight('normal');
  sikreBlKolonner_(liste); // kategori, avkrysning, filter og farger for de nye radene
  return mangler.map(m => m.navn);
}

/** Menyvalg: legg bedrifter som bare står i Booking inn i Bedriftsliste. */
function leggBookingIBedriftslisteMeny() {
  const ui = SpreadsheetApp.getUi();
  const { mangler } = bareIBooking_(SpreadsheetApp.getActiveSpreadsheet());
  if (!mangler.length) { ui.alert('Alle bedriftene i Booking står allerede i Bedriftsliste. 🎉'); return; }
  const svar = ui.alert('Legg bedrifter fra Booking inn i Bedriftsliste',
    mangler.length + ' bedrifter står i Booking, men ikke i Bedriftsliste:\n\n• ' + mangler.map(m => m.navn).join('\n• ') +
    '\n\nDe legges nederst i Bedriftsliste under «' + NYE_FRA_BOOKING + '», koblet til raden sin i Booking. ' +
    'Flytt dem til riktig kategori når det passer (klipp ut og lim inn raden). Fortsette?', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;
  const lagt = leggBookingIBedriftsliste_();
  ui.alert(lagt.length + ' bedrifter er lagt til nederst i Bedriftsliste.');
}
