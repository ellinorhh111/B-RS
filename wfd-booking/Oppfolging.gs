/**
 * Daglig oppsummering på e-post og purreutkast.
 */

function dagerSiden_(dato) {
  if (!(dato instanceof Date)) return null;
  return Math.floor((Date.now() - dato.getTime()) / (24 * 3600 * 1000));
}

/** Rader der vi skrev sist og bedriften ikke har svart innen PURR_ETTER_DAGER. */
function finnForfalte_(tabell) {
  const venter = ['Kontaktet', 'Purret', 'I dialog', 'Interessert', 'Tilbud sendt'];
  const ut = [];
  tabell.rader.forEach((_, i) => {
    const status = String(celle_(tabell, i, 'status'));
    const dager = dagerSiden_(celle_(tabell, i, 'sistKontakt'));
    if (venter.indexOf(status) >= 0 && celle_(tabell, i, 'retning') === 'Oss' &&
      dager !== null && dager >= KONFIG.PURR_ETTER_DAGER) {
      ut.push(i);
    }
  });
  return ut;
}

function dagligOppsummering() {
  const tabell = lesBedrifter_();
  const navn = i => celle_(tabell, i, 'bedrift');
  const idag = new Date();
  idag.setHours(23, 59, 59);

  const trengerSvar = [];
  const oppfolging = [];
  const tellinger = {};
  tabell.rader.forEach((_, i) => {
    if (!navn(i)) return;
    const s = String(celle_(tabell, i, 'status') || KONFIG.STATUSER[0]);
    tellinger[s] = (tellinger[s] || 0) + 1;
    if (celle_(tabell, i, 'trengerSvar') === 'Ja') {
      trengerSvar.push('• ' + navn(i) + ' – ' + celle_(tabell, i, 'oppsummering') +
        (celle_(tabell, i, 'utkast') ? ' (utkast klart i Gmail)' : ''));
    }
    const dato = celle_(tabell, i, 'oppfolging');
    if (dato instanceof Date && dato <= idag) {
      oppfolging.push('• ' + navn(i) + ' – ' + celle_(tabell, i, 'nesteSteg'));
    }
  });
  const forfalte = finnForfalte_(tabell).map(i =>
    '• ' + navn(i) + ' – ' + dagerSiden_(celle_(tabell, i, 'sistKontakt')) + ' dager uten svar (' + celle_(tabell, i, 'status') + ')');

  const alleStatuser = KONFIG.STATUSER.concat([KONFIG.STATUS_NEI]);
  const ventende = godkjenninger_().filter(g => g.status === VENTER);
  const linjer = [];
  if (ventende.length) {
    linjer.push('VENTER PÅ GODKJENNING (' + ventende.length + ') – se fanen «' + KONFIG.ARK_GODKJENNING + '»');
    linjer.push(ventende.slice(0, 15).map(g => '• ' + g.data.bedrift + ': ' + g.data.type + ' → ' + g.data.verdi).join('\n') +
      (ventende.length > 15 ? '\n• …' : ''));
    linjer.push('');
  }
  linjer.push('Status nå: ' + alleStatuser.map(s => s + ' ' + (tellinger[s] || 0)).join(' · '));
  linjer.push('');
  linjer.push('TRENGER SVAR FRA DEG (' + trengerSvar.length + ')');
  linjer.push(trengerSvar.length ? trengerSvar.join('\n') : 'Ingen 🎉');
  linjer.push('');
  linjer.push('OPPFØLGING I DAG ELLER FORFALT (' + oppfolging.length + ')');
  linjer.push(oppfolging.length ? oppfolging.join('\n') : 'Ingen');
  linjer.push('');
  linjer.push('BØR PURRES (' + forfalte.length + ')');
  linjer.push(forfalte.length ? forfalte.join('\n') + '\n\nTips: bruk menyen WFD → «Lag purreutkast» i arket.' : 'Ingen');
  linjer.push('');
  linjer.push('Arket: ' + hentRegneark_().getUrl());

  GmailApp.sendEmail(Session.getEffectiveUser().getEmail(),
    'WFD booking: ' + trengerSvar.length + ' trenger svar, ' + forfalte.length + ' bør purres' +
      (ventende.length ? ', ' + ventende.length + ' til godkjenning' : ''),
    linjer.join('\n'));
}

/**
 * Lager purreutkast i Gmail for alle forfalte bedrifter, fra en fast mal (KONFIG.PURRING_NO / PURRING_EN) – ingen AI.
 * Utkastet går til de samme mottakerne som din siste e-post i tråden, med den e-posten sitert under, og sendes aldri
 * automatisk. En bedrift som allerede har fått purreutkast etter siste kontakt, hoppes over.
 */
function lagPurreutkast() {
  const ui = SpreadsheetApp.getUi();
  const tabell = lesBedrifter_();
  const forfalte = finnForfalte_(tabell);
  if (!forfalte.length) {
    ui.alert('Ingen bedrifter trenger purring nå.');
    return;
  }
  const fra = GmailApp.getAliases().map(a => a.toLowerCase()).indexOf(KONFIG.WFD_ADRESSE.toLowerCase()) >= 0 ? KONFIG.WFD_ADRESSE : null;
  const start = Date.now();
  let laget = 0;
  const hoppetOver = [];
  for (const i of forfalte) {
    const bedrift = String(celle_(tabell, i, 'bedrift'));
    if (Date.now() - start > MAKS_KJORETID_MS) { hoppetOver.push('(tiden gikk ut – kjør igjen for resten)'); break; }
    if (erUtenUtkast_(bedrift)) { hoppetOver.push(bedrift + ' (står i INGEN_UTKAST – skal diskuteres)'); continue; }
    const forrige = celle_(tabell, i, 'utkast');
    const sist = celle_(tabell, i, 'sistKontakt');
    if (forrige instanceof Date && sist instanceof Date && forrige >= sist) {
      hoppetOver.push(bedrift + ' (purreutkast laget ' + Utilities.formatDate(forrige, Session.getScriptTimeZone(), 'd.M') + ')');
      continue;
    }
    const tradId = String(celle_(tabell, i, 'tradId'));
    const trad = tradId ? GmailApp.getThreadById(tradId) : null;
    if (!trad) { hoppetOver.push(bedrift + ' (finner ikke tråden)'); continue; }
    try {
      if (lagPurring_(trad, sokeNavn_(bedrift), fra)) {
        laget++;
        settCelle_(tabell, i, 'utkast', new Date());
        settCelle_(tabell, i, 'nesteSteg', 'Purreutkast klart i Gmail – se over og send');
      } else {
        hoppetOver.push(bedrift + ' (fant ingen e-post fra deg i tråden)');
      }
    } catch (e) {
      hoppetOver.push(bedrift + ' (feil: ' + e.message + ')');
    }
  }
  ui.alert(laget + ' purreutkast ligger under «Utkast» i Gmail. Se over og send dem selv.' +
    (hoppetOver.length ? '\n\nHoppet over:\n' + hoppetOver.join('\n') : ''));
}

/** Purreutkast til mottakerne av din siste e-post i tråden. Returnerer false hvis du ikke har skrevet i tråden. */
function lagPurring_(trad, bedrift, fra) {
  const egne = trad.getMessages().filter(m => !m.isDraft() && erFraOss_(m));
  if (!egne.length) return false;
  const siste = egne[egne.length - 1];
  const adresser = felt => tolkAdresser_(felt).map(a => a.epost).filter(e => !erEgenAdresse_(e));
  const til = adresser(siste.getTo());
  if (!til.length) return false;
  const cc = adresser(siste.getCc());

  const forsteTil = til[0];
  const norsk = erNorsk_(forsteTil, siste.getSubject());
  const fornavn = fornavnFraEpost_(forsteTil);
  const hilsen = norsk ? (fornavn ? 'Hei ' + fornavn : 'Hei') : (fornavn ? 'Hi ' + fornavn : 'Hi');
  const sone = Session.getScriptTimeZone();
  const dato = norsk
    ? Utilities.formatDate(siste.getDate(), sone, 'd. ') + MANEDER_NO[Number(Utilities.formatDate(siste.getDate(), sone, 'M')) - 1]
    : Utilities.formatDate(siste.getDate(), sone, 'd MMMM');
  const tekst = (norsk ? KONFIG.PURRING_NO : KONFIG.PURRING_EN)
    .replace(/\{navn\}/g, hilsen).replace(/\{bedrift\}/g, bedrift).replace(/\{dato\}/g, dato);
  const kropp = tekst.trim() + '\n' + (norsk ? KONFIG.SIGNATUR : KONFIG.SIGNATUR_EN).replace(/^\n+/, '\n');

  // Forrige e-post sitert under, så mottakeren ser hva purringen gjelder.
  const datoLang = Utilities.formatDate(siste.getDate(), sone, 'd.M.yyyy HH:mm');
  const overskrift = (norsk ? 'Den ' + datoLang + ' skrev ' : 'On ' + datoLang + ', ') + siste.getFrom() + (norsk ? ':' : ' wrote:');
  const sitatTekst = '\n\n' + overskrift + '\n' + siste.getPlainBody().split('\n').map(l => '> ' + l).join('\n');
  const html = somHtml_(kropp) + '<br><div style="color:#555">' + somHtml_(overskrift).replace(/<\/?div[^>]*>/g, '') +
    '<blockquote style="margin:0 0 0 8px;border-left:2px solid #ccc;padding-left:8px">' + siste.getBody() + '</blockquote></div>';

  const emne = /^(re|sv|vs):/i.test(siste.getSubject()) ? siste.getSubject() : (norsk ? 'SV: ' : 'Re: ') + siste.getSubject();
  const valg = { htmlBody: html };
  if (cc.length) valg.cc = cc.join(', ');
  if (fra) valg.from = fra;
  GmailApp.createDraft(til.join(', '), emne, kropp + sitatTekst, valg);
  return true;
}

const MANEDER_NO = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober',
  'november', 'desember'];

/** Står bedriften i KONFIG.INGEN_UTKAST (f.eks. konsulentselskapene)? */
function erUtenUtkast_(navn) {
  const n = ' ' + String(navn).toLowerCase().replace(/[^a-z0-9æøå&]+/g, ' ') + ' ';
  return (KONFIG.INGEN_UTKAST || []).some(x => n.indexOf(' ' + x.toLowerCase().replace(/[^a-z0-9æøå&]+/g, ' ') + ' ') >= 0);
}
