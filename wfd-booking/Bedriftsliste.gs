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
  kategori: 'Kategori',   // skjult hjelpekolonne: hvilken kategori (fet rad over) bedriften hører til
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
  // Tøm systemkolonnene først, inkludert gamle avkrysningsbokser, så kategorirader og tomme rader blir rene.
  const kol = sikreBlKolonner_(ark);
  const maks = Math.max(ark.getMaxRows() - 1, 1);
  Object.keys(kol).forEach(k => ark.getRange(2, kol[k] + 1, maks, 1).clearDataValidations().clearContent());
  if (!ss.getSheetByName(KONFIG.ARK_IKKE_KONTAKTET)) lagIkkeKontaktetFane_(ss);
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

  // Kategori = nærmeste fete rad over (f.eks. «Private Equity»).
  const kategori = [];
  let gjeldende = 'Uten kategori';
  navn.forEach((n, i) => { if (n && fet[i]) gjeldende = n; kategori.push(gjeldende); });

  while (pos < antall && Date.now() - start < MAKS_KJORETID_MS) {
    const rad = pos + 2;
    const bedrift = navn[pos];
    ark.getRange(rad, kol.kategori + 1).setValue(bedrift && !fet[pos] ? kategori[pos] : '');
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
  const bredder = { host: 140, svar: 120, tidligere: 140, epost: 230, trad: 360, kategori: 140 };
  const maks = Math.max(ark.getMaxRows() - 1, 1);
  Object.keys(kol).forEach(k => {
    ark.getRange(1, kol[k] + 1).setBackground(FARGE.indigo).setFontColor(FARGE.hvit).setFontWeight('bold');
    ark.setColumnWidth(kol[k] + 1, bredder[k]);
  });
  [kol.host, kol.tidligere].forEach(k => ark.getRange(2, k + 1, maks, 1).setNumberFormat('d. mmm yyyy').setHorizontalAlignment('center'));
  ark.getRange(2, kol.svar + 1, maks, 1).setHorizontalAlignment('center');
  ark.getRange(2, kol.trad + 1, maks, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setHorizontalAlignment('left');
  ark.getRange(2, kol.epost + 1, maks, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP).setHorizontalAlignment('left');

  ark.hideColumns(kol.kategori + 1);

  // Filterknapper i overskriftsraden, så du kan filtrere og sortere selv.
  try {
    const sisteKolonne = Math.max(ark.getLastColumn(), kol.kategori + 1);
    const filter = ark.getFilter();
    if (filter && filter.getRange().getNumColumns() < sisteKolonne) filter.remove();
    if (!ark.getFilter()) ark.getRange(1, 1, Math.max(ark.getLastRow(), 2), sisteKolonne).createFilter();
  } catch (e) {
    console.warn('Filter i Bedriftsliste: ' + e.message);
  }

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
  const funnet = sokTraderOm_(navn, navn, periode, false);
  if (funnet) return funnet;
  // Reserve: første ord i navnet («ODIN Forvaltning» → «Odin»), men bare treff der domenet starter med ordet
  // (odinfond.no), så vi ikke får tilfeldige treff på vanlige ord.
  const forste = navn.split(/\s+/)[0];
  if (forste.length >= 4 && forste.toLowerCase() !== navn.toLowerCase()) return sokTraderOm_(forste, navn, periode, true);
  return null;
}

/** Domenet ligner navnet: nbim.no → NBIM, paretosec.com → Pareto, odinfond.no → ODIN Forvaltning. */
function domeneLignerNavn_(domene, navn) {
  const stamme = normaliserNavn_(String(domene).split('.').slice(-2, -1)[0]);
  const n = normaliserNavn_(navn);
  if (stamme.length < 3 || !n) return false;
  if (n.indexOf(stamme) === 0 || (n.length >= 4 && stamme.indexOf(n) === 0)) return true;
  const forste = normaliserNavn_(String(navn).split(/\s+/)[0]);
  return forste.length >= 4 && stamme.indexOf(forste) === 0;
}

function sokTraderOm_(sokeord, navn, periode, kunDomene) {
  const adr = KONFIG.WFD_ADRESSE;
  const sok = '"' + sokeord + '" {from:' + adr + ' to:' + adr + ' cc:' + adr + '} ' + periode + ' -in:chats -in:spam -in:trash';
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
    if (motpart && !motpart.privat && domeneLignerNavn_(motpart.domene, navn)) poeng += 3;
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
    const epost = String(r[kol.epost]).trim().toLowerCase();
    if (!bedrift || fet[i] || !epost || r[kol.host]) return;
    if (iBooking[normaliserNavn_(sokeNavn_(bedrift))]) return;
    if (utkastTil[epost]) return;
    utkastTil[epost] = true; // samme adresse kan stå på flere rader (f.eks. under to kategorier)
    ut.push({ rad: i + 2, bedrift: sokeNavn_(bedrift), epost, tidligere: r[kol.tidligere], norsk: erNorsk_(epost, r[kol.trad]) });
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

  const kandidater = invitasjonsKandidater_(ark);
  if (!kandidater.length) {
    ui.alert('Alle bedrifter på listen som vi har e-post til, er allerede kontaktet i høst (eller har et utkast). 🎉\n\n' +
      'Tips: Kjør «Oppdater Bedriftsliste fra Gmail» først hvis listen ikke er oppdatert.');
    return;
  }
  const svar = ui.alert('Lag invitasjonsutkast',
    kandidater.length + ' bedrifter er ikke kontaktet i høst, men vi har e-postadressen:\n\n• ' +
    kandidater.map(k => k.bedrift + '  (' + k.epost + ')').join('\n• ') +
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
  kandidater.forEach(k => {
    if (Date.now() - start > MAKS_KJORETID_MS) { igjen.push(k.bedrift); return; }
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
    (pdfNo || pdfEn ? '' : '\n\nMerk: Fant ikke invitasjons-PDF-en i sendt e-post, så den må legges ved manuelt.') +
    (igjen.length ? '\n\nTiden gikk ut før disse – kjør menyvalget én gang til:\n• ' + igjen.join('\n• ') : '') +
    '\n\nSe over, legg gjerne til en personlig setning, og send. Arket oppdateres automatisk når de er sendt.' +
    (uten.length ? '\n\nDisse er heller ikke kontaktet, men vi mangler e-post (finn en kontaktperson og skriv adressen i ' +
      '«' + BL_KOLONNER.epost + '»):\n• ' + uten.join('\n• ') : ''));
}

/** Bedrifter på listen uten e-post som heller ikke er kontaktet i høst – disse må du finne kontaktperson til. */
function utenKontaktperson_(ark) {
  const kol = sikreBlKolonner_(ark);
  const antall = Math.max(ark.getLastRow() - 1, 0);
  if (!antall) return [];
  const verdier = ark.getRange(2, 1, antall, ark.getLastColumn()).getValues();
  const fet = ark.getRange(2, 1, antall, 1).getFontWeights().map(r => r[0] === 'bold');
  return verdier.filter((r, i) => String(r[0]).trim() && !fet[i] && !r[kol.epost] && !r[kol.host]).map(r => String(r[0]).trim());
}

/** Kjøres automatisk hver natt, så «Ikke kontaktet» alltid er oppdatert. */
function nattligBedriftsliste() {
  PropertiesService.getScriptProperties().setProperty('BL_POS', '0');
  fortsettBedriftsliste();
}
