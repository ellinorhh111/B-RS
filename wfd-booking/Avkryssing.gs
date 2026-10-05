/**
 * Avkrysninger i rapportfanene som oppdaterer Booking og Bedriftsliste:
 *
 *  Oversikt → «Trenger svar fra deg» ✓   «Trenger svar» settes til Nei i Booking (du har svart / trenger ikke svar).
 *  Oversikt → «Bør purres» ✓              Status blir «Purret» og «Sist kontakt» i dag i Booking.
 *  Ikke kontaktet ✓                       «Har kontaktet» krysses av i Bedriftsliste (kontaktet på annen måte).
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
  if (e.range.getColumn() !== 2 || e.range.getRow() <= IK_HODE) return;
  const bedrift = String(e.range.getSheet().getRange(e.range.getRow(), 4).getValue()).trim();
  e.range.setValue(false);
  if (!bedrift) return;

  const liste = bedriftslisteArk_(e.source);
  if (!liste || liste.getLastRow() < 2) return;
  const h = liste.getRange(1, 1, 1, liste.getLastColumn()).getValues()[0].map(v => String(v).trim());
  const kManuelt = h.indexOf(BL_KOLONNER.manuelt) + 1;
  if (!kManuelt) return;
  const navn = liste.getRange(2, 1, liste.getLastRow() - 1, 1).getValues().map(v => String(v[0]).trim());
  let funnet = 0;
  navn.forEach((n, i) => {
    if (n !== bedrift) return;
    liste.getRange(i + 2, kManuelt).setValue(true); // alle rader med samme navn (bedriften kan stå under to kategorier)
    funnet++;
  });
  if (funnet) loggManuelt_(e.source, bedrift, 'Krysset av i «' + KONFIG.ARK_IKKE_KONTAKTET + '»: kontaktet på annen måte');
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
