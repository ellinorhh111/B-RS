/**
 * Kall til Claude (Anthropic Messages API) via UrlFetchApp.
 * Nøkkelen ligger i Skriptegenskaper som ANTHROPIC_API_KEY.
 */

function harAI_() {
  return !!PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
}

/** Sender ett kall og returnerer svaret som JSON-objekt etter skjemaet. Kaster feil ved problemer. */
function kallClaude_(system, brukertekst, skjema, maksTokens) {
  const nokkel = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!nokkel) throw new Error('ANTHROPIC_API_KEY mangler i Skriptegenskaper.');

  const kropp = {
    model: KONFIG.MODELL,
    max_tokens: maksTokens || 8000,
    system: system,
    messages: [{ role: 'user', content: brukertekst }],
    output_config: {
      effort: KONFIG.INNSATS,
      format: { type: 'json_schema', schema: skjema },
    },
    // Hvis modellen avslår en forespørsel, prøver API-et automatisk en annen modell.
    fallbacks: 'default',
  };
  const valg = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': nokkel,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    payload: JSON.stringify(kropp),
    muteHttpExceptions: true,
  };

  let svar;
  for (let forsok = 0; forsok < 3; forsok++) {
    svar = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', valg);
    const kode = svar.getResponseCode();
    if (kode === 200) break;
    if (kode === 429 || kode >= 500) {
      Utilities.sleep(2000 * Math.pow(2, forsok));
      continue;
    }
    throw new Error('Claude API svarte ' + kode + ': ' + svar.getContentText().slice(0, 500));
  }
  if (svar.getResponseCode() !== 200) {
    throw new Error('Claude API svarte ' + svar.getResponseCode() + ' etter flere forsøk.');
  }

  const data = JSON.parse(svar.getContentText());
  if (data.stop_reason === 'refusal') throw new Error('Claude avslo forespørselen.');
  if (data.stop_reason === 'max_tokens') throw new Error('Svaret fra Claude ble avkuttet (max_tokens).');
  const tekst = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(tekst);
}

const ANALYSE_SKJEMA = {
  type: 'object',
  properties: {
    relevant: { type: 'boolean', description: 'Gjelder tråden booking av bedrifter til WFD?' },
    bedrift: { type: 'string', description: 'Bedriftens navn, uten AS/ASA. Tom hvis ukjent.' },
    kontaktperson: { type: 'string' },
    kontakt_epost: { type: 'string' },
    telefon: { type: 'string' },
    status: { type: 'string', enum: [] }, // fylles inn i analyserTrad_
    interesse: { type: 'string', description: 'Hvilken pakke/deltakelse bedriften er interessert i. Tom hvis ukjent.' },
    oppsummering: { type: 'string', description: 'Én–to setninger om hva som skjedde i de nye e-postene.' },
    neste_steg: { type: 'string', description: 'Konkret neste steg for oss, kort.' },
    oppfolging_dato: { type: 'string', description: 'YYYY-MM-DD hvis noe må følges opp på en bestemt dato, ellers tom.' },
    trenger_svar: { type: 'boolean', description: 'Venter bedriften på svar fra oss?' },
    svarutkast: { type: 'string', description: 'Ferdig e-postsvar uten signatur. Tom hvis trenger_svar er false.' },
  },
  required: ['relevant', 'bedrift', 'kontaktperson', 'kontakt_epost', 'telefon', 'status', 'interesse',
    'oppsummering', 'neste_steg', 'oppfolging_dato', 'trenger_svar', 'svarutkast'],
  additionalProperties: false,
};

function systemPrompt_() {
  return [
    'Du er assistenten til Head of Booking for WFD, et arrangement på NHH.',
    'Målet er å få flest mulig bedrifter til å delta. Du leser e-posttråder med bedrifter,',
    'oppdaterer oversikten og skriver utkast til svar som Head of Booking leser gjennom før de sendes.',
    '',
    'Fakta om arrangementet (bruk BARE dette, aldri finn på datoer, priser eller løfter):',
    KONFIG.ARRANGEMENT.trim(),
    '',
    'Når svaret trenger informasjon som ikke står over, skriv [FYLL INN: hva som mangler] i teksten.',
    'Tone: ' + KONFIG.TONE,
    'Svarutkastet skal være ren tekst, starte med hilsen til kontaktpersonen og ikke inneholde signatur.',
    '',
    'Statusbetydning:',
    '- Kontaktet: vi har tatt kontakt, ingen reell dialog ennå.',
    '- Purret: vi har sendt påminnelse uten å få svar.',
    '- I dialog: bedriften har svart, men ikke sagt hva de vil.',
    '- Interessert: bedriften ønsker å delta eller vil vite mer om konkrete pakker.',
    '- Tilbud sendt: vi har sendt konkret tilbud/pris/avtale.',
    '- Bekreftet: bedriften har bekreftet deltakelse.',
    '- ' + KONFIG.STATUS_NEI + ': bedriften har sagt nei for i år.',
    'Automatiske fraværsmeldinger endrer ikke status og trenger ikke svar.',
  ].join('\n');
}

/**
 * Analyserer en tråd.
 * @param {Object} kontekst  { tradTekst, rad: {...gjeldende verdier}, historikk: [tekstlinjer], lagUtkast }
 */
function analyserTrad_(kontekst) {
  const skjema = JSON.parse(JSON.stringify(ANALYSE_SKJEMA));
  skjema.properties.status.enum = KONFIG.STATUSER.concat([KONFIG.STATUS_NEI]);

  const deler = [];
  deler.push('Dagens dato: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
  deler.push('');
  deler.push('Det vi vet om bedriften fra oversikten:');
  deler.push(JSON.stringify(kontekst.rad, null, 1));
  if (kontekst.historikk && kontekst.historikk.length) {
    deler.push('');
    deler.push('Tidligere hendelser (fra loggen, eldste først):');
    kontekst.historikk.forEach(l => deler.push('- ' + l));
  }
  deler.push('');
  deler.push('E-posttråden (eldste først). «OSS» = Head of Booking / WFD, «DEM» = bedriften:');
  deler.push(kontekst.tradTekst);
  deler.push('');
  deler.push(kontekst.lagUtkast
    ? 'Analyser tråden. Hvis bedriften venter på svar fra oss, skriv svarutkastet.'
    : 'Analyser tråden. Ikke skriv svarutkast (la feltet være tomt).');

  return kallClaude_(systemPrompt_(), deler.join('\n'), skjema, 8000);
}

const PURRING_SKJEMA = {
  type: 'object',
  properties: { utkast: { type: 'string' } },
  required: ['utkast'],
  additionalProperties: false,
};

function skrivPurring_(tradTekst, rad) {
  const tekst = [
    'Bedriften har ikke svart på vår siste e-post. Skriv en kort, vennlig påminnelse',
    '(maks 80 ord) som gjør det lett å svare, og som foreslår et konkret neste steg.',
    '',
    'Det vi vet om bedriften:',
    JSON.stringify(rad, null, 1),
    '',
    'Tråden (eldste først):',
    tradTekst,
  ].join('\n');
  return kallClaude_(systemPrompt_(), tekst, PURRING_SKJEMA, 4000).utkast;
}
