/**
 * Kontakter funnet på nettet for bedrifter i Bedriftsliste som manglet kontaktperson (oktober 2026).
 * Skrives inn i kolonnen «Annen kontakt» (bare der den er tom) og markeres oransje, så du ser at de er hentet
 * fra nettet og bør sjekkes før de brukes. Kilden står i en merknad på cellen.
 *
 * domene: e-postdomenet bedriften bruker, når det ikke ligner navnet i listen (f.eks. «SpareBank1 Markets» →
 * sb1markets.no). Da finner «Oppdater Bedriftsliste fra Gmail» e-postene til bedriften likevel.
 *
 * Navnet til venstre må være skrevet som i kolonne A i Bedriftsliste (store/små bokstaver og æøå spiller ingen rolle).
 */
const NETTKONTAKTER = {
  'Alfred Berg': { kontakt: 'kundesenter.no@alfredberg.com', merknad: 'Generell kundeadresse, ingen HR-kontakt funnet', kilde: 'https://prospeo.io/c/alfred-berg-kapitalforvaltning' },
  'Alliance Venture': { kontakt: 'hello@alliance.vc', merknad: 'Generell adresse (brukes mye til pitcher)', kilde: 'https://superscout.co/investor/alliance-vc' },
  'Eviny ventures': { kontakt: 'andreas.engelsen@eviny.no', merknad: 'Andreas Engelsen, daglig leder. Utkast laget 5.10', kilde: 'https://ventures.eviny.no/andreas-engelsen-en' },
  'Fondsfinans': { kontakt: 'Tlf. 23 11 30 00', merknad: 'Ingen e-post funnet. Daglig leder Nils Erling Ødegaard', kilde: 'https://prospeo.io/c/fondsfinans-kapitalforvaltning' },
  'norcap': { kontakt: 'Tlf. 67 58 22 80', merknad: 'Ingen e-post funnet. Sjekk at det er riktig Norcap (Lysaker)', kilde: 'https://oljelandet.no/bedrift/norcap-as/informasjon' },
  'Reitan Kapital': { kontakt: 'Tlf. 73 89 10 00', merknad: 'Ingen e-post funnet (Reitan-sentralbord). Leder: Magnus Reitan', kilde: 'https://snl.no/Reitangruppen' },
  'Blackstone': { kontakt: 'Ingen e-post – prøv LinkedIn', merknad: 'EMEA campus recruiting. Studentside: blackstone.com/careers/students', kilde: 'https://www.blackstone.com/careers/students/' },
  'JP Morgan': { domene: 'jpmchase.com', kontakt: 'amanda.house@jpmchase.com', merknad: 'Amanda House, EMEA Early Careers (dialog i 2025). Utkast laget 5.10', kilde: 'Gmail' },
  'KKR': { kontakt: 'Ingen e-post – prøv LinkedIn', merknad: 'Kun sentralbord London +44 20 7839 9800', kilde: 'https://www.kkr.com/contact' },
  'Rothschild': { kontakt: 'perolov.bergstrom@rothschild.com', merknad: 'Per-Olov Bergström, Head of Nordic (ikke HR). Fra offentlige dokumenter, kan være gammel', kilde: 'https://www.rothschildandco.com/en/office-listing/nordic/' },
  'Vanguard': { kontakt: 'careers@vanguard.com', merknad: 'Generell rekrutteringsadresse', kilde: 'https://www.vanguardjobs.com/privacy-policy-eu/' },
  'ABG': { kontakt: 'thea.klausen@abgsc.no', merknad: 'Fra NU-portalen, kan være gammel. Styret (Amalie) har egen dialog med ABG – sjekk først', kilde: 'https://nu.nhhs.no/companies/12' },
  'Bank of America': { domene: 'bofa.com', kontakt: 'thomas.makinen@bofa.com', merknad: 'Invitert 5.10 (Thomas Makinen og Pippa Jones)', kilde: 'Gmail' },
  'Carnegie': { kontakt: 'Duplikat av DNB Carnegie', merknad: 'Slett denne raden', kilde: '' },
  'Morgen Stanley': { domene: 'morganstanley.com', kontakt: 'erik.tregaard@morganstanley.com', merknad: 'Erik Tregaard (dialog i 2025). Utkast laget 5.10. Generell: graduaterecruitmenteurope@morganstanley.com', kilde: 'Gmail' },
  'SpareBank1 Markets': { domene: 'sb1markets.no', kontakt: 'Petter.Kongslie@sb1markets.no', merknad: 'Petter Kongslie, Head of Research. Takket nei i 2026 og 2025 pga. dato', kilde: 'Gmail' },
  'Finans Norge': { kontakt: 'firmapost@finansnorge.no', merknad: 'Generell adresse', kilde: 'https://www.finansnorge.no/om-finans-norge/kontakt-oss/' },
  'Kvinner i finans': { domene: 'futureboards.no', kontakt: 'turid.solvang@futureboards.no', merknad: 'Turid Solvang, FutureBoards (driver Kvinner i Finans Charter). Utkast laget 5.10', kilde: 'https://www.futureboards.no/contact' },
  'WIC': { kontakt: 'wic@nbim.no', merknad: "Women's Investment Club (NBIM)", kilde: 'https://www.nbim.no/en/about-us/women-in-finance/womens-investment-club/' },
  'AKO Capital': { kontakt: 'jobs@akocapital.com', merknad: 'Rekrutteringsadresse (de tar ikke imot åpne søknader nå)', kilde: 'https://www.akocapital.com/careers/' },
  'EquipCapital': { kontakt: 'hs@equip.no', merknad: 'Hanna Skolt (var med på workshop i 2026). Utkast laget 5.10', kilde: 'Gmail' },
  'Ferd': { kontakt: 'afo@ferd.no', merknad: 'Anniken (takket nei til 2026 etter telefonsamtale). Generell: post@ferd.no', kilde: 'Gmail' },
  'Grieg Capital': { kontakt: 'information@grieg.no', merknad: 'Grieg-gruppen, Bergen. Grieg Kapital: dealflow@grieg.no', kilde: 'https://griegkapital.no/contact/' },
  'Hadean Ventures': { kontakt: 'ingrid.beyer@hadeanventures.com', merknad: 'Ingrid Beyer, Head of IR & BD. Utkast laget 5.10', kilde: 'https://hadeanventures.com/ingrid-beyer-3/' },
  'Herkules Capital': { kontakt: 'post@herkules.no', merknad: 'Generell adresse, kan være gammel', kilde: 'https://herkulescapital.no/' },
  'Hitec vision': { domene: 'hitecvision.com', kontakt: 'hshansen@hitecvision.com', merknad: 'Hilde Søraas Hansen, Head of People (dialog i 2023)', kilde: 'Gmail' },
  'Kistefos': { kontakt: 'Tlf. 23 11 70 00', merknad: 'Ingen HR- eller generell e-post funnet', kilde: 'https://kistefos.no/' },
  'nordover kapital': { kontakt: 'contact@nordoverkapital.no', merknad: 'Generell adresse (search fund)', kilde: 'https://nordoverkapital.no/contact' },
  'Reiten & Co': { kontakt: 'post@reitenco.no', merknad: 'Fra 2017, kan være gammel', kilde: 'https://reitenco.com/' },
  'Antler': { kontakt: 'kristian@antler.co', merknad: 'Kristian Jul Røsjø, Partner Oslo. Utkast laget 5.10', kilde: 'https://www.antler.co/norway' },
  'Idekapital': { kontakt: 'kristian@idekapital.com', merknad: 'Kristian Øvsthus, Managing Partner (Oslo). Utkast laget 5.10', kilde: 'https://idek.no/team/' },
  'northzone': { kontakt: 'press@northzone.com', merknad: 'Bare presseadresse funnet', kilde: 'https://northzone.com/contact/' },
  'Skagerak capital': { kontakt: 'espen@skagerakcapital.com', merknad: 'Espen Kjeldsen, Partner. Utkast laget 5.10', kilde: 'https://www.skagerakcapital.com/contact' },
  'Start up lab': { kontakt: 'christina@startuplab.no', merknad: 'Christina Wiig, Head of Corporate Partnerships (Bergen: erlend@startuplab.no). Utkast laget 5.10', kilde: 'https://www.startuplab.no/team' },
  'Formuesforvaltning': { kontakt: 'Ser ut som en kategori', merknad: 'Ikke en bedrift? Gjør raden fet (kategori) eller slett den', kilde: '' },
  'Kapitalforvaltning': { kontakt: 'Ser ut som en kategori', merknad: 'Ikke en bedrift? Gjør raden fet (kategori) eller slett den', kilde: '' },
  'Venture capital': { kontakt: 'Ser ut som en kategori', merknad: 'Ikke en bedrift? Gjør raden fet (kategori) eller slett den', kilde: '' },
};

/** Oppslag i NETTKONTAKTER uten hensyn til store/små bokstaver, mellomrom og æøå. */
function nettkontakt_(bedrift) {
  const nokkel = utenAksent_(normaliserNavn_(sokeNavn_(bedrift)));
  if (!nokkel) return null;
  if (!NETTKONTAKT_INDEKS_) {
    NETTKONTAKT_INDEKS_ = {};
    Object.keys(NETTKONTAKTER).forEach(n => { NETTKONTAKT_INDEKS_[utenAksent_(normaliserNavn_(n))] = NETTKONTAKTER[n]; });
  }
  return NETTKONTAKT_INDEKS_[nokkel] || null;
}
let NETTKONTAKT_INDEKS_ = null;

/**
 * Fyller «Annen kontakt» fra NETTKONTAKTER der cellen er tom, og bare én gang per bedrift (sletter du en, kommer
 * den ikke tilbake). Hentede kontakter får kilden i den skjulte kolonnen «Hentet fra», som gjør dem oransje.
 * Returnerer antall som ble fylt inn.
 */
function fyllNettkontakter_(ark, kol) {
  const antall = Math.max(ark.getLastRow() - 1, 0);
  if (!antall) return 0;
  const egenskaper = PropertiesService.getScriptProperties();
  const fylt = JSON.parse(egenskaper.getProperty('NETTKONTAKTER_FYLT') || '{}');
  const tidligereFylt = Object.assign({}, fylt); // samme navn på flere rader (to kategorier) fylles i samme kjøring
  const navn = ark.getRange(2, 1, antall, 1).getValues().map(r => String(r[0]).trim());
  const annen = ark.getRange(2, kol.annen + 1, antall, 1).getValues();
  let n = 0;
  navn.forEach((b, i) => {
    const k = b && nettkontakt_(b);
    const nokkel = utenAksent_(normaliserNavn_(b));
    if (!k || tidligereFylt[nokkel] || String(annen[i][0]).trim()) return;
    const rad = i + 2;
    ark.getRange(rad, kol.annen + 1).setValue(k.kontakt)
      .setNote((k.merknad || '') + (k.kilde ? '\nKilde: ' + k.kilde : ''));
    ark.getRange(rad, kol.kilde + 1).setValue(k.kilde || 'nett');
    if (/@/.test(k.kontakt)) {
      foreslaa_(sokeNavn_(b), 'Kontakt hentet fra nettet', '', k.kontakt, (k.merknad || '') + (k.kilde ? ' · Kilde: ' + k.kilde : ''), '',
        { type: 'nett', nokkel: 'nett|' + nokkel + '|' + k.kontakt.toLowerCase() });
    }
    fylt[nokkel] = true;
    n++;
  });
  egenskaper.setProperty('NETTKONTAKTER_FYLT', JSON.stringify(fylt));
  return n;
}
