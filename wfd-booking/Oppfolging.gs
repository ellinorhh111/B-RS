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

/** Lager purreutkast i Gmail for alle forfalte bedrifter. */
function lagPurreutkast() {
  const ui = SpreadsheetApp.getUi();
  if (!harAI_()) {
    ui.alert('Purreutkast krever API-nøkkel til Claude. Se README.');
    return;
  }
  const tabell = lesBedrifter_();
  const forfalte = finnForfalte_(tabell);
  if (!forfalte.length) {
    ui.alert('Ingen bedrifter trenger purring nå.');
    return;
  }
  const start = Date.now();
  let laget = 0;
  const hoppetOver = [];
  for (const i of forfalte) {
    if (Date.now() - start > MAKS_KJORETID_MS) { hoppetOver.push('(tiden gikk ut – kjør igjen for resten)'); break; }
    const tradId = String(celle_(tabell, i, 'tradId'));
    const trad = tradId ? GmailApp.getThreadById(tradId) : null;
    if (!trad) { hoppetOver.push(celle_(tabell, i, 'bedrift') + ' (finner ikke tråden)'); continue; }
    const meldinger = trad.getMessages().filter(m => !m.isDraft());
    try {
      const tekst = skrivPurring_(tradTilTekst_(meldinger), radSomObjekt_(tabell, i));
      if (lagUtkast_(trad, meldinger[meldinger.length - 1], tekst)) {
        laget++;
        settCelle_(tabell, i, 'utkast', new Date());
        settCelle_(tabell, i, 'nesteSteg', 'Purreutkast klart i Gmail – se over og send');
        trad.addLabel(hentEtikett_(KONFIG.ETIKETT_SVAR_KLART));
      } else {
        hoppetOver.push(celle_(tabell, i, 'bedrift') + ' (har allerede et eget utkast)');
      }
    } catch (e) {
      hoppetOver.push(celle_(tabell, i, 'bedrift') + ' (feil: ' + e.message + ')');
    }
  }
  ui.alert(laget + ' purreutkast ligger klare i Gmail under etiketten «' + KONFIG.ETIKETT_SVAR_KLART + '».' +
    (hoppetOver.length ? '\n\nHoppet over:\n' + hoppetOver.join('\n') : ''));
}
