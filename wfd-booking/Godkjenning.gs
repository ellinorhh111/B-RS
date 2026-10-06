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
    if (rensNavn_(v[0]) === rensNavn_(navn)) ut.push(i + 2);
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
