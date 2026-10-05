/**
 * Leser Gmail-tråder, oppdaterer arket og lager svarutkast.
 * sjekkInnboks() kjøres automatisk hvert SJEKK_HVERT_MINUTT minutt.
 */

const MAKS_KJORETID_MS = 4.5 * 60 * 1000; // Apps Script stopper etter 6 minutter.
const MAKS_TEGN_PER_MELDING = 4000;
const MAKS_MELDINGER_TIL_AI = 12;

function sjekkInnboks() {
  const las = LockService.getScriptLock();
  if (!las.tryLock(10 * 1000)) return; // En annen kjøring holder på.
  try {
    const start = Date.now();
    const tabell = lesBedrifter_();
    const trader = lesTrader_();
    const tilstand = { aiIgjen: KONFIG.MAKS_AI_KALL_PER_KJORING, start, historikk: false };
    const traderGmail = GmailApp.search(KONFIG.INNBOKS_SOK, 0, 100);
    // Eldste først, så rekkefølgen i loggen blir riktig.
    traderGmail.sort((a, b) => a.getLastMessageDate() - b.getLastMessageDate());
    for (const trad of traderGmail) {
      if (Date.now() - start > MAKS_KJORETID_MS) break;
      try {
        behandleTrad_(trad, tabell, trader, tilstand);
      } catch (e) {
        console.error('Feil i tråd ' + trad.getId() + ': ' + (e.stack || e));
      }
    }
  } finally {
    las.releaseLock();
  }
}

// ---------- Hjelpere for adresser ----------

let EGNE_CACHE_ = null;
function egneAdresser_() {
  if (EGNE_CACHE_) return EGNE_CACHE_;
  const liste = [Session.getEffectiveUser().getEmail()]
    .concat(GmailApp.getAliases())
    .concat(KONFIG.EGNE_ADRESSER)
    .filter(Boolean)
    .map(a => a.toLowerCase());
  EGNE_CACHE_ = liste;
  return liste;
}

/** «"Hansen, Kari" <kari@dnb.no>, ola@dnb.no» → [{navn, epost}] */
function tolkAdresser_(tekst) {
  if (!tekst) return [];
  // Del på komma som ikke står inni anførselstegn.
  const deler = String(tekst).match(/(?:"[^"]*"|[^,])+/g) || [];
  const ut = [];
  deler.forEach(del => {
    const m = del.match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    if (!m) return;
    const navn = del.replace(/<[^>]*>/g, '').replace(m[0], '').replace(/["']/g, '').trim();
    ut.push({ navn, epost: m[0].toLowerCase() });
  });
  return ut;
}

function domeneAv_(epost) {
  return String(epost).split('@')[1] || '';
}

function erEgenAdresse_(epost) {
  const e = String(epost).toLowerCase();
  if (egneAdresser_().indexOf(e) >= 0) return true;
  const d = domeneAv_(e);
  return KONFIG.EGNE_DOMENER.some(x => d === x || d.endsWith('.' + x));
}

function erFraOss_(melding) {
  const fra = tolkAdresser_(melding.getFrom())[0];
  return fra ? erEgenAdresse_(fra.epost) : false;
}

/**
 * Autosvar («Automatic reply», «Autosvar», fravær) og feilmeldinger fra e-postsystemet (mailer-daemon).
 * Slike regnes ikke som svar fra bedriften.
 */
function erAutomatisk_(melding) {
  const fra = (tolkAdresser_(melding.getFrom())[0] || {}).epost || '';
  if (fra && erIgnorert_(fra)) return true;
  return /^\s*(automatic reply|auto(matisk)?\s*svar|autosvar|automatiskt svar|out of office|fraværende|frånvarande|abwesend|undeliverable|delivery status notification|ikke levert|auto:)/i
    .test(melding.getSubject() || '');
}

function erIgnorert_(epost) {
  const lokal = String(epost).split('@')[0];
  return KONFIG.IGNORER_AVSENDERE.some(x => lokal.indexOf(x) >= 0);
}

/** Finner bedriftskontakten i tråden: første eksterne avsender, ellers første eksterne mottaker. */
function finnMotpart_(meldinger) {
  const kandidater = [];
  meldinger.forEach(m => { if (!erFraOss_(m)) kandidater.push.apply(kandidater, tolkAdresser_(m.getFrom())); });
  meldinger.forEach(m => {
    kandidater.push.apply(kandidater, tolkAdresser_(m.getTo()));
    kandidater.push.apply(kandidater, tolkAdresser_(m.getCc()));
  });
  const treff = kandidater.find(a => !erEgenAdresse_(a.epost) && !erIgnorert_(a.epost));
  if (!treff) return null;
  const domene = domeneAv_(treff.epost);
  const privat = KONFIG.PRIVATE_DOMENER.indexOf(domene) >= 0;
  return { navn: treff.navn, epost: treff.epost, domene, privat, nokkel: privat ? treff.epost : domene };
}

function navnFraDomene_(domene) {
  const del = String(domene).split('.').slice(-2, -1)[0] || domene;
  return del.charAt(0).toUpperCase() + del.slice(1);
}

// ---------- Tekst ----------

/** Fjerner sitert tekst fra tidligere e-poster i tråden. */
function rensTekst_(tekst) {
  const linjer = String(tekst || '').replace(/\r/g, '').split('\n');
  const ut = [];
  for (const l of linjer) {
    if (/^\s*(On .+ wrote:|Den .+ skrev .+:|.+ skrev følgende:|-----\s*Original Message|-----\s*Opprinnelig melding|From: .+|Fra: .+)\s*$/i.test(l)) break;
    if (/^\s*>/.test(l)) continue;
    ut.push(l);
  }
  let t = ut.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > MAKS_TEGN_PER_MELDING) t = t.slice(0, MAKS_TEGN_PER_MELDING) + '\n[… resten av e-posten er kuttet]';
  return t;
}

function tradTilTekst_(meldinger) {
  const utvalg = meldinger.slice(-MAKS_MELDINGER_TIL_AI);
  const deler = [];
  if (meldinger.length > utvalg.length) {
    deler.push('[' + (meldinger.length - utvalg.length) + ' eldre e-poster i tråden er utelatt]');
  }
  utvalg.forEach(m => {
    const tz = Session.getScriptTimeZone();
    deler.push('--- ' + (erFraOss_(m) ? 'OSS' : 'DEM') + ' | ' + Utilities.formatDate(m.getDate(), tz, 'yyyy-MM-dd HH:mm') +
      ' | Fra: ' + m.getFrom() + ' | Til: ' + m.getTo() + (m.getCc() ? ' | Kopi: ' + m.getCc() : '') +
      ' | Emne: ' + m.getSubject());
    deler.push(rensTekst_(m.getPlainBody()));
  });
  return deler.join('\n');
}

function inneholderNokkelord_(meldinger) {
  const tekst = meldinger.map(m => m.getSubject() + '\n' + m.getPlainBody().slice(0, 5000)).join('\n');
  return KONFIG.NOKKELORD.some(ord => {
    const trygt = ord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^A-Za-z0-9æøåÆØÅ])' + trygt + '($|[^A-Za-z0-9æøåÆØÅ])', 'i').test(tekst);
  });
}

function hentEtikett_(navn) {
  return GmailApp.getUserLabelByName(navn) || GmailApp.createLabel(navn);
}

function tradUrl_(tradId) {
  return 'https://mail.google.com/mail/u/0/#all/' + tradId;
}

// ---------- Kjernen ----------

/**
 * Behandler én tråd. tilstand: { aiIgjen, start, historikk }.
 * Returnerer true hvis tråden ble registrert i arket.
 */
function behandleTrad_(trad, tabell, trader, tilstand) {
  const tradId = trad.getId();
  const alle = trad.getMessages().filter(m => !m.isDraft() && !m.isInTrash() && !erAutomatisk_(m));
  if (!alle.length) return false;
  const sistBehandlet = trader.kart[tradId] ? trader.kart[tradId].sist : 0;
  const nye = alle.filter(m => m.getDate().getTime() > sistBehandlet);
  if (!nye.length) return false;

  const siste = alle[alle.length - 1];
  const motpart = finnMotpart_(alle);
  if (!motpart) {
    // Bare intern e-post eller automatiske avsendere – merk som ferdig.
    lagreTrad_(trader, tradId, '', siste.getDate(), alle.length);
    return false;
  }

  let rad = finnRad_(tabell, motpart, '');
  // Historikk uten AI for bare kjente bedrifter: hopp raskt over alt annet.
  if (rad < 0 && tilstand.historikk && KONFIG.HISTORIKK_BARE_KJENTE && !(KONFIG.HISTORIKK_MED_AI && harAI_())) {
    lagreTrad_(trader, tradId, motpart.nokkel, siste.getDate(), alle.length);
    return false;
  }
  const harEtikett = trad.getLabels().some(l => l.getName() === KONFIG.ETIKETT);
  if (rad < 0 && !harEtikett && !inneholderNokkelord_(alle)) return false;

  const sisteFraDem = !erFraOss_(siste);
  const nyeFraDem = nye.some(m => !erFraOss_(m));
  const brukAI = harAI_() && nyeFraDem && (!tilstand.historikk || KONFIG.HISTORIKK_MED_AI);
  if (brukAI && tilstand.aiIgjen <= 0) return false; // Tas ved neste kjøring.

  // ---- Analyse ----
  let analyse = null;
  if (brukAI) {
    tilstand.aiIgjen--;
    const naa = rad >= 0 ? radSomObjekt_(tabell, rad) : { merknad: 'Ny bedrift, ikke i oversikten ennå.' };
    const historikk = rad >= 0
      ? hentLoggForBedrift_(celle_(tabell, rad, 'bedrift'), 10).map(r =>
        Utilities.formatDate(new Date(r[0]), Session.getScriptTimeZone(), 'yyyy-MM-dd') + ' ' + r[2] + ': ' + r[5])
      : [];
    analyse = analyserTrad_({
      tradTekst: tradTilTekst_(alle),
      rad: naa,
      historikk,
      lagUtkast: !tilstand.historikk && sisteFraDem,
    });
    if (!analyse.relevant && rad < 0) {
      lagreTrad_(trader, tradId, motpart.nokkel, siste.getDate(), alle.length);
      return false;
    }
  }

  // ---- Finn eller lag rad ----
  if (rad < 0 && analyse && analyse.bedrift) rad = finnRad_(tabell, motpart, analyse.bedrift);
  const ny = rad < 0;
  // Historikken lager aldri nye rader for private adresser (gmail.com o.l.) – det er som regel ikke bedrifter.
  if (ny && tilstand.historikk && (KONFIG.HISTORIKK_BARE_KJENTE || motpart.privat)) {
    lagreTrad_(trader, tradId, motpart.nokkel, siste.getDate(), alle.length);
    return false;
  }
  if (ny) {
    rad = nyRad_(tabell);
    // Navnet fra Bedriftsliste hvis bedriften står der (nysnoinvest.no → «Nysnø climate investments»), ellers fra domenet.
    settCelle_(tabell, rad, 'bedrift', (analyse && analyse.bedrift) || (motpart.privat ? motpart.navn || motpart.epost
      : navnFraBedriftsliste_(motpart.domene) || navnFraDomene_(motpart.domene)));
    settCelle_(tabell, rad, 'forsteKontakt', alle[0].getDate());
  }
  if (!motpart.privat && !celle_(tabell, rad, 'domene')) settCelle_(tabell, rad, 'domene', motpart.domene);

  const bedrift = celle_(tabell, rad, 'bedrift');
  const statusFor = celle_(tabell, rad, 'status') || statusFraEgneKolonner_(tabell, rad);
  const last = erLast_(tabell, rad);
  const gammelSist = celle_(tabell, rad, 'sistKontakt');
  const erNyest = !(gammelSist instanceof Date) || siste.getDate() >= gammelSist;

  // Første kontakt kan være eldre enn det som står (f.eks. ved historikkimport).
  const forste = celle_(tabell, rad, 'forsteKontakt');
  if (!(forste instanceof Date) || alle[0].getDate() < forste) settCelle_(tabell, rad, 'forsteKontakt', alle[0].getDate());

  // ---- Status og felter ----
  let foreslatt;
  // Uten AI: les bedriftens siste e-post etter tydelige ja/nei-formuleringer.
  const sisteDeres = alle.filter(m => !erFraOss_(m)).pop();
  const tolket = !analyse && sisteDeres ? tolkSvarUtenAI_(rensTekst_(sisteDeres.getPlainBody())) : null;
  if (analyse) {
    foreslatt = analyse.status;
  } else if (tolket) {
    foreslatt = tolket.status;
  } else if (nyeFraDem || alle.some(m => !erFraOss_(m))) {
    foreslatt = 'I dialog';
  } else {
    // Bare våre egne e-poster: to eller flere på rad uten svar = purret.
    foreslatt = alle.length >= 2 ? 'Purret' : 'Kontaktet';
  }
  const statusEtter = last ? statusFor : velgStatus_(statusFor, foreslatt);
  if (!last) {
    settCelle_(tabell, rad, 'status', statusEtter);
    speilStatus_(tabell, rad, statusEtter);
    if (tabell.kol.pakke !== undefined && !celle_(tabell, rad, 'pakke')) {
      const fraDem = alle.filter(m => !erFraOss_(m)).map(m => rensTekst_(m.getPlainBody())).join('\n');
      const pakke = pakkeFraEpost_(fraDem);
      if (pakke) settCelle_(tabell, rad, 'pakke', pakke);
    }
    const nyeFraDemTekst = nye.filter(m => !erFraOss_(m)).map(m => rensTekst_(m.getPlainBody())).join('\n');
    leggTilOnsker_(tabell, rad, onskerFraEpost_(nyeFraDemTekst));
    if (analyse) {
      const kontaktperson = analyse.kontaktperson || (!erFraOss_(siste) ? motpart.navn : '');
      if (kontaktperson && !celle_(tabell, rad, 'kontaktperson')) settCelle_(tabell, rad, 'kontaktperson', kontaktperson);
      if (analyse.telefon && !celle_(tabell, rad, 'telefon')) settCelle_(tabell, rad, 'telefon', analyse.telefon);
      if (analyse.interesse) settCelle_(tabell, rad, 'interesse', analyse.interesse);
    } else if (motpart.navn && !celle_(tabell, rad, 'kontaktperson')) {
      settCelle_(tabell, rad, 'kontaktperson', motpart.navn);
    }
    leggTilEpost_(tabell, rad, (analyse && analyse.kontakt_epost) || motpart.epost);
  }

  settCelle_(tabell, rad, 'antall', (Number(celle_(tabell, rad, 'antall')) || 0) + nye.length);

  // ---- «Hvor står vi nå» – bare hvis denne tråden er den nyeste kontakten ----
  const oppsummering = analyse ? analyse.oppsummering
    : (tolket && sisteFraDem ? tolket.tekst + ' (tolket automatisk – sjekk) · ' : '') + enkelOppsummering_(siste);
  if (erNyest) {
    settCelle_(tabell, rad, 'sistKontakt', siste.getDate());
    settCelle_(tabell, rad, 'retning', sisteFraDem ? 'Bedriften' : 'Oss');
    // Ved historikkimport regnes bare nylige e-poster som ubesvarte.
    const fersk = !tilstand.historikk || dagerSiden_(siste.getDate()) <= 14;
    settCelle_(tabell, rad, 'trengerSvar', sisteFraDem && fersk && (!analyse || analyse.trenger_svar) ? 'Ja' : 'Nei');
    settCelle_(tabell, rad, 'oppsummering', oppsummering);
    if (analyse && analyse.neste_steg) settCelle_(tabell, rad, 'nesteSteg', analyse.neste_steg);
    else if (tolket && sisteFraDem) settCelle_(tabell, rad, 'nesteSteg', NESTE_STEG_ETTER_SVAR[tolket.status] || '');
    else if (!sisteFraDem) settCelle_(tabell, rad, 'nesteSteg', 'Vent på svar – purr etter ' + KONFIG.PURR_ETTER_DAGER + ' dager');
    if (analyse && /^\d{4}-\d{2}-\d{2}$/.test(analyse.oppfolging_dato)) {
      const [a, m, d] = analyse.oppfolging_dato.split('-').map(Number);
      settCelle_(tabell, rad, 'oppfolging', new Date(a, m - 1, d));
    }
    if (String(celle_(tabell, rad, 'tradId')) !== tradId) {
      settCelle_(tabell, rad, 'tradId', tradId);
      settLenke_(tabell, rad, 'trad', 'Åpne i Gmail', tradUrl_(tradId));
    }
  }

  // ---- Etiketter og utkast ----
  trad.addLabel(hentEtikett_(KONFIG.ETIKETT));
  if (!tilstand.historikk) {
    if (sisteFraDem && analyse && analyse.trenger_svar && analyse.svarutkast) {
      const laget = lagUtkast_(trad, siste, analyse.svarutkast);
      if (laget) {
        settCelle_(tabell, rad, 'utkast', new Date());
        trad.addLabel(hentEtikett_(KONFIG.ETIKETT_SVAR_KLART));
      } else {
        settCelle_(tabell, rad, 'nesteSteg', 'Du har allerede et eget utkast i tråden – ' + (analyse.neste_steg || 'svar bedriften'));
      }
    } else if (!sisteFraDem) {
      // Vi har svart: rydd bort systemets gamle utkast og etiketten.
      slettVarUtkast_(tradId);
      trad.removeLabel(hentEtikett_(KONFIG.ETIKETT_SVAR_KLART));
      settCelle_(tabell, rad, 'utkast', '');
    }
  }

  loggHendelse_([new Date(), bedrift, sisteFraDem ? 'Fra bedriften' : 'Fra oss', siste.getFrom(), siste.getSubject(),
    oppsummering, statusFor, statusEtter, tradUrl_(tradId)]);
  lagreTrad_(trader, tradId, motpart.nokkel, siste.getDate(), alle.length);
  return true;
}

/** Hele raden med overskrifter, også dine egne kolonner (f.eks. «Med i fjor?» og «Veien videre»), til AI-en. */
function radSomObjekt_(tabell, rad) {
  const skjult = [].concat.apply([], ['trad', 'tradId', 'utkast', 'las'].map(kolonnenavn_));
  const o = {};
  Object.keys(tabell.alle).forEach(h => {
    if (skjult.indexOf(h) >= 0) return;
    let v = tabell.rader[rad][tabell.alle[h]];
    if (v === undefined || v === null || v === '') return;
    if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    o[h] = v;
  });
  return o;
}

/**
 * Gratis tolkning av svar uten AI: ser etter tydelige formuleringer i bedriftens siste e-post.
 * Returnerer { status, tekst } eller null hvis svaret ikke er tydelig (da blir status «I dialog»).
 * Bevisst forsiktig: et «nei» vinner over et «ja» («vi skulle gjerne vært med, men har dessverre ikke mulighet»).
 */
const SVAR_NEI = new RegExp([
  'takk(er|e)? nei', 'm[åa] (dessverre |nok )?(takke|si) nei', 'dessverre[^.!?]{0,80}\\b(ikke|ingen|vanskelig)\\b',
  '\\bikke (anledning|mulighet|kapasitet)', 'passer (dessverre |nok )?ikke', 'blir (nok |litt |dessverre )?(for )?vanskelig', 'vanskelig [åa] f[åa] (det )?til',
  'kan (dessverre |nok )?ikke (delta|stille|v[æa]re med)', '\\bavst[åa]r\\b', 'ikke (prioritere|delta i [åa]r)',
  'unfortunately', 'not be able to', 'unable to (join|attend|participate)', "won'?t be (able|joining|participating)",
  'will have to (decline|pass)', 'decline', 'not (participate|join|attend)', 'too far', 'tyv[äa]rr', 'inte (delta|m[öo]jlighet)',
].join('|'), 'i');
const SVAR_JA = new RegExp([
  'blir (gjerne|veldig gjerne|selvf[øo]lgelig) med', 'melder oss (gjerne )?p[åa]', '(vil|vi) (gjerne|selvf[øo]lgelig) (v[æa]re med|delta|stille)',
  '[øo]nsker (gjerne )?[åa] (delta|stille|v[æa]re med)', 'vi deltar', 'bekrefter (v[åa]r )?deltakelse', 'vil v[æa]re med',
  'v[æa]re med p[åa] dette', "we('d| would)? (love|be happy|be glad) to (join|participate|attend)", 'count us in',
  'happy to (join|participate)', 'we confirm', 'g[äa]rna (med|delta)',
].join('|'), 'i');

const NESTE_STEG_ETTER_SVAR = {
  'Takket nei': 'Send en kort takk, og spør om dere kan ta kontakt neste år',
  'Interessert': 'Bekreft plassen og avklar pakke (Premium partner / Partner)',
  'Bekreftet': 'Bekreft og send praktisk info',
};

function tolkSvarUtenAI_(tekst) {
  const t = String(tekst || '').replace(/\s+/g, ' ');
  if (!t) return null;
  if (SVAR_NEI.test(t)) return { status: KONFIG.STATUS_NEI, tekst: 'Takket nei' };
  if (SVAR_JA.test(t)) {
    const pakke = pakkeFraEpost_(t);
    return pakke ? { status: 'Bekreftet', tekst: 'Bekreftet som ' + pakke, pakke } : { status: 'Interessert', tekst: 'Vil gjerne være med' };
  }
  return null;
}

function enkelOppsummering_(melding) {
  const tekst = rensTekst_(melding.getPlainBody()).replace(/\s+/g, ' ').slice(0, 140);
  return (erFraOss_(melding) ? 'Vi sendte: ' : 'Bedriften skrev: ') + melding.getSubject() + ' – ' + tekst;
}

function leggTilEpost_(tabell, rad, epost) {
  if (!epost || erEgenAdresse_(epost)) return;
  const naa = String(celle_(tabell, rad, 'epost')).trim();
  const liste = naa ? naa.toLowerCase().split(/[,;\s]+/) : [];
  if (liste.indexOf(epost.toLowerCase()) >= 0) return;
  settCelle_(tabell, rad, 'epost', naa ? naa + ', ' + epost : epost);
}

function settLenke_(tabell, rad, nokkel, tekst, url) {
  const k = tabell.kol[nokkel];
  if (k === undefined) return;
  tabell.rader[rad][k] = tekst;
  tabell.ark.getRange(rad + 2, k + 1).setRichTextValue(
    SpreadsheetApp.newRichTextValue().setText(tekst).setLinkUrl(url).build());
}

// ---------- Utkast ----------
//
// Systemet husker hvilke utkast det selv har laget. Et utkast som du har redigert
// (lagret senere enn da det ble laget), blir aldri slettet eller erstattet automatisk.

/** Lager svarutkast i tråden. Returnerer false hvis du allerede har et eget eller redigert utkast der. */
function lagUtkast_(trad, siste, tekst) {
  const tradId = trad.getId();
  const egne = hentVarUtkast_(tradId);
  const utkastITraden = trad.getMessages().filter(m => m.isDraft());
  const fremmede = utkastITraden.filter(m => !egne || m.getId() !== egne.meldingId || erRedigert_(m, egne));
  if (fremmede.length) return false;

  slettVarUtkast_(tradId);
  const kropp = tekst.trim() + '\n' + KONFIG.SIGNATUR.replace(/^\n+/, '');
  const utkast = KONFIG.SVAR_TIL_ALLE ? siste.createDraftReplyAll(kropp) : siste.createDraftReply(kropp);
  const melding = utkast.getMessage();
  PropertiesService.getScriptProperties().setProperty('UTKAST_' + tradId, JSON.stringify({
    utkastId: utkast.getId(), meldingId: melding.getId(), lagret: melding.getDate().getTime(),
  }));
  return true;
}

function erRedigert_(melding, egne) {
  return melding.getDate().getTime() > (egne.lagret || 0) + 5000;
}

function hentVarUtkast_(tradId) {
  const v = PropertiesService.getScriptProperties().getProperty('UTKAST_' + tradId);
  return v ? JSON.parse(v) : null;
}

/** Sletter systemets utkast i tråden, men bare hvis du ikke har redigert det. */
function slettVarUtkast_(tradId) {
  const egne = hentVarUtkast_(tradId);
  if (!egne) return;
  try {
    const d = GmailApp.getDraft(egne.utkastId);
    if (d && !erRedigert_(d.getMessage(), egne)) d.deleteDraft();
  } catch (e) {
    // Utkastet er allerede sendt eller slettet.
  }
  PropertiesService.getScriptProperties().deleteProperty('UTKAST_' + tradId);
}

/**
 * Leser tidligere e-poster fra bedrifter som er bekreftet eller interessert, og fyller «Spesielle ønsker»
 * og tom «Pakke 2027». Brukes ved oppsett, så ønsker fra før systemet ble satt opp også kommer med.
 */
function hentOnskerFraGmail_(tabell, maksMs) {
  if (tabell.kol.onsker === undefined && tabell.kol.pakke === undefined) return 0;
  const start = Date.now();
  const sp = KONFIG.SPEIL || {};
  const medKol = tabell.alle[sp.med];
  let oppdatert = 0;
  for (let i = 0; i < tabell.rader.length; i++) {
    if (Date.now() - start > maksMs) break;
    const status = String(celle_(tabell, i, 'status'));
    const med = medKol !== undefined ? String(tabell.rader[i][medKol]) : '';
    if (!(med === (sp.ja || 'Ja') || ['Bekreftet', 'Tilbud sendt', 'Interessert'].indexOf(status) >= 0)) continue;

    const eposter = (String(celle_(tabell, i, 'epost')).match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [])
      .map(e => e.toLowerCase()).filter(e => !erEgenAdresse_(e));
    const domene = String(celle_(tabell, i, 'domene')).trim();
    const avsendere = eposter.concat(domene ? ['@' + domene] : []);
    if (!avsendere.length) continue;

    const sok = '{' + avsendere.map(a => 'from:' + a).join(' ') + '} after:' + KONFIG.HISTORIKK_FRA_DATO;
    const tekst = [];
    const fraBedriften = m => {
      const fra = (tolkAdresser_(m.getFrom())[0] || {}).epost || '';
      return eposter.indexOf(fra) >= 0 || (domene && (fra.endsWith('@' + domene) || fra.endsWith('.' + domene)));
    };
    GmailApp.search(sok, 0, 10).forEach(t => t.getMessages().forEach(m => {
      if (!m.isDraft() && !erFraOss_(m) && fraBedriften(m)) tekst.push(rensTekst_(m.getPlainBody()));
    }));
    if (!tekst.length) continue;
    const samlet = tekst.join('\n');
    const for_ = String(celle_(tabell, i, 'onsker')) + String(celle_(tabell, i, 'pakke'));
    if (tabell.kol.pakke !== undefined && !celle_(tabell, i, 'pakke')) {
      const p = pakkeFraEpost_(samlet);
      if (p) settCelle_(tabell, i, 'pakke', p);
    }
    leggTilOnsker_(tabell, i, onskerFraEpost_(samlet));
    if (String(celle_(tabell, i, 'onsker')) + String(celle_(tabell, i, 'pakke')) !== for_) oppdatert++;
  }
  return oppdatert;
}


/**
 * Leser bedriftenes siste svar på nytt (uten AI) og oppdaterer status der svaret tydelig er et ja eller nei.
 * For e-poster som kom før tolkningen fantes. Endrer bare fremover (unntatt «Takket nei»), og aldri låste rader.
 */
function lesSvarPaNytt() {
  const ui = SpreadsheetApp.getUi();
  const tabell = lesBedrifter_();
  const endret = [];
  const start = Date.now();
  tabell.rader.forEach((r, i) => {
    if (Date.now() - start > MAKS_KJORETID_MS) return;
    const tradId = String(celle_(tabell, i, 'tradId')).trim();
    const for_ = String(celle_(tabell, i, 'status'));
    if (!tradId || erLast_(tabell, i) || for_ === KONFIG.STATUS_NEI || for_ === 'Bekreftet') return;
    let trad;
    try { trad = GmailApp.getThreadById(tradId); } catch (e) { return; }
    if (!trad) return;
    const deres = trad.getMessages().filter(m => !m.isDraft() && !erAutomatisk_(m) && !erFraOss_(m)).pop();
    const tolket = deres ? tolkSvarUtenAI_(rensTekst_(deres.getPlainBody())) : null;
    if (!tolket) return;
    const etter = velgStatus_(for_, tolket.status);
    if (etter === for_) return;
    settCelle_(tabell, i, 'status', etter);
    speilStatus_(tabell, i, etter);
    if (tolket.pakke && tabell.kol.pakke !== undefined && !celle_(tabell, i, 'pakke')) settCelle_(tabell, i, 'pakke', tolket.pakke);
    if (NESTE_STEG_ETTER_SVAR[etter]) settCelle_(tabell, i, 'nesteSteg', NESTE_STEG_ETTER_SVAR[etter]);
    const bedrift = celle_(tabell, i, 'bedrift');
    loggHendelse_([new Date(), bedrift, 'Fra bedriften', deres.getFrom(), deres.getSubject(),
      tolket.tekst + ' (tolket automatisk – sjekk)', for_, etter, tradUrl_(tradId)]);
    endret.push(bedrift + ': ' + for_ + ' → ' + etter);
  });
  ui.alert(endret.length
    ? 'Status ble oppdatert ut fra svarene (sjekk gjerne):\n\n• ' + endret.join('\n• ')
    : 'Fant ingen tydelige ja- eller nei-svar som ikke allerede står i Booking.');
}
