/**
 * Går gjennom gammel e-post og bygger opp arket med alle bedrifter vi har hatt kontakt med.
 * Kjører i porsjoner på ca. 4,5 minutter og fortsetter av seg selv til alt er gått gjennom.
 * Lager aldri svarutkast for gamle tråder.
 */

function historikkSok_() {
  const filter = KONFIG.HISTORIKK_SOK ||
    '{' + KONFIG.NOKKELORD.map(o => (/\s/.test(o) ? '"' + o + '"' : o)).join(' ') + '}';
  return 'after:' + KONFIG.HISTORIKK_FRA_DATO + ' ' + filter + ' -in:chats -in:spam -in:trash';
}

function importerHistorikk() {
  const ui = SpreadsheetApp.getUi();
  const svar = ui.alert('Importer historikk',
    'Går gjennom e-post fra ' + KONFIG.HISTORIKK_FRA_DATO + ' med søket:\n\n' + historikkSok_() +
    '\n\n' + (KONFIG.HISTORIKK_BARE_KJENTE
      ? 'Bare bedrifter som allerede står i Booking oppdateres. Ingen nye rader legges til. '
      : 'Bedrifter som ikke står i Booking legges til nederst. ') +
    (KONFIG.HISTORIKK_MED_AI && harAI_()
      ? 'AI leser hver tråd (koster noen øre per tråd). '
      : 'Sist kontakt, hvem som skrev sist, status og dine kolonner fylles ut. ') +
    'Det kan ta en stund. Du får en e-post når det er ferdig. Fortsette?', ui.ButtonSet.YES_NO);
  if (svar !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().setProperty('HISTORIKK_POS', '0');
  fortsettHistorikk();
}

function fortsettHistorikk() {
  slettTriggere_('fortsettHistorikk');
  const egenskaper = PropertiesService.getScriptProperties();
  let pos = Number(egenskaper.getProperty('HISTORIKK_POS'));
  if (isNaN(pos)) return;

  const las = LockService.getScriptLock();
  if (!las.tryLock(30 * 1000)) {
    ScriptApp.newTrigger('fortsettHistorikk').timeBased().after(2 * 60 * 1000).create();
    return;
  }
  let ferdig = false;
  try {
    const start = Date.now();
    const tabell = lesBedrifter_();
    const trader = lesTrader_();
    const tilstand = { aiIgjen: 1000, start, historikk: true };
    while (Date.now() - start < MAKS_KJORETID_MS) {
      const porsjon = GmailApp.search(historikkSok_(), pos, 20);
      if (!porsjon.length) { ferdig = true; break; }
      for (const trad of porsjon) {
        if (Date.now() - start > MAKS_KJORETID_MS) break;
        try {
          behandleTrad_(trad, tabell, trader, tilstand);
        } catch (e) {
          console.error('Historikk, tråd ' + trad.getId() + ': ' + (e.stack || e));
        }
        pos++;
      }
      egenskaper.setProperty('HISTORIKK_POS', String(pos));
    }
  } finally {
    las.releaseLock();
  }

  if (ferdig) {
    egenskaper.deleteProperty('HISTORIKK_POS');
    GmailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'WFD: historikkimporten er ferdig',
      pos + ' tråder er gått gjennom. Se arket: ' + hentRegneark_().getUrl());
  } else {
    ScriptApp.newTrigger('fortsettHistorikk').timeBased().after(60 * 1000).create();
  }
}

function slettTriggere_(funksjon) {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === funksjon)
    .forEach(t => ScriptApp.deleteTrigger(t));
}
