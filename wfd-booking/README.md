# WFD booking-assistent (Gmail ↔ Google Regneark)

Et Google Apps Script som ligger i booking-regnearket ditt og:

1. **Leser Gmail hvert 10. minutt** og oppdaterer arket automatisk: status, sist kontakt, hvem som skrev sist,
   kontaktperson, telefon, hva bedriften er interessert i og en kort oppsummering av siste hendelse.
2. **Skriver svarutkast** når en bedrift venter på svar. Utkastet legges rett i Gmail-tråden (etikett
   `WFD/Svar klart`), så du kan åpne tråden på mobilen, se over, justere og trykke send.
   **Ingenting sendes automatisk.**
3. **Registrerer svar du sender fra mobilen**, så arket alltid viser hvor du slapp, uansett hvor du svarte fra.
4. **Importerer historikk**: går gjennom gammel e-post og bygger en oversikt over alle bedrifter dere har hatt kontakt med.
5. **Daglig oppsummering kl. 08** på e-post: hvem som trenger svar, hva som skal følges opp i dag og hvem som bør purres.
6. **Purreutkast** med ett klikk for bedrifter som ikke har svart på 7 dager.

## Viktig: riktig konto

Skriptet kjører i **den Google-kontoen som eier regnearket**, og leser **den kontoens Gmail**. Det må altså
installeres i kontoen der WFD-mailene kommer inn (NHH-kontoen din, s242961).

* Ligger NHH-mailen din i **Outlook/Microsoft 365** og ikke i Gmail, virker ikke denne løsningen direkte.
  Da må den bygges med Power Automate eller Microsoft Graph i stedet. Gi beskjed i så fall.
* NHH sin IT kan ha slått av Apps Script eller tilgang til eksterne tjenester for studentkontoer. Får du
  feilmeldingen «This app is blocked» eller noe lignende, er det årsaken. Bruk da en egen Gmail-konto for WFD.

## Installasjon (ca. 15 minutter)

### 1. Legg inn koden

1. Åpne booking-regnearket (logget inn med riktig konto).
2. Gå til **Utvidelser → Apps Script**.
3. **Enklest:** slett alt i `Kode.gs` og lim inn hele `WFD-alt-i-en.gs`.
   (Alternativt: slett innholdet i `Kode.gs` og lag én skriptfil per fil i denne mappen (trykk **+** ved «Filer» → **Skript**),
   gi den samme navn og lim inn innholdet:
   `Konfig`, `Ark`, `AI`, `Innboks`, `Historikk`, `Oppfolging`, `Oppsett`, `Utseende`, `Bedriftsliste`, `Nettkontakter`,
   `Avkryssing`, `Godkjenning`.)
4. Under **Prosjektinnstillinger** (tannhjulet): huk av for «Vis manifestfilen appsscript.json i redigeringsprogrammet»,
   og lim inn innholdet fra `appsscript.json`. Det setter riktig tidssone (Europe/Oslo).
5. Lagre (Ctrl/Cmd + S).

### 2. Fyll inn innstillingene i `Konfig`

Det viktigste:

| Innstilling | Hva du fyller inn |
|---|---|
| `ARRANGEMENT` | Dato, sted, pakker, priser, frister, hva som er inkludert. **AI-en bruker bare denne teksten.** Det som mangler, blir `[FYLL INN]` i utkastet i stedet for å bli funnet på. |
| `SIGNATUR` | Signaturen din. |
| `NOKKELORD` | Ord som skiller WFD-mail fra annen mail. Legg til arrangementets fulle navn. |
| `HISTORIKK_FRA_DATO` | Hvor langt tilbake historikkimporten skal lete (f.eks. fjorårets booking-start). |
| `KOLONNER` | Satt opp for arket «Claude WFD» (Column 1 = bedrift, Column 2 = kontakt/e-post, Veien videre = notater). Systemets egne kolonner legges til bakerst. Sett en kolonne til `null` for å droppe den. |
| `SPEIL` | Dine egne kolonner *Invitasjon sendt*, *Respons* og *Med* fylles ut automatisk, men bare der cellen er tom. Det du har skrevet selv, overskrives aldri. |

### 3. Koble til AI (Claude)

1. Lag en API-nøkkel på https://console.anthropic.com (krever betalingskort, du betaler per bruk).
2. I Apps Script: **Prosjektinnstillinger → Skriptegenskaper → Legg til skriptegenskap**.
   Navn: `ANTHROPIC_API_KEY`, verdi: nøkkelen.

Nøkkelen ligger bare i skriptet ditt og ikke i arket, så den er ikke synlig for dem du deler arket med.
Uten nøkkel fungerer alt unntatt AI-delene: arket oppdateres fortsatt med dato, retning og kontakt, men uten
status, oppsummering og utkast.

**Kostnad (grovt anslag, ikke en garanti):** rundt 0,3–0,5 kr per e-post AI-en leser. 300 e-poster tilsvarer omtrent 100–150 kr.
Sett `INNSATS: 'low'` i `Konfig` for å gjøre det billigere og raskere.

### 4. Start

1. Last inn regnearket på nytt. Menyen **WFD** dukker opp.
2. **WFD → 1. Sett opp arket og automatikk.** Første gang ber Google om tillatelse til Gmail og arket.
   Velg kontoen, så **Avansert → Gå til (prosjektnavn)** → **Tillat**. Advarselen kommer fordi skriptet er ditt eget og
   ikke godkjent av Google. Det er normalt.
3. **WFD → 2. Test AI-tilkoblingen.** Du skal få se et eksempelutkast.
4. **WFD → 3. Importer historikk fra Gmail.** Går i bakgrunnen, og du får en e-post når den er ferdig.

## Ryddig arbeidsbok

**WFD → Gjør arbeidsboken ryddig og pen** gir fanene faste navn (Oversikt, Booking, Bedriftsliste, Logg),
gir «Column 1/2» ordentlige navn (Bedrift/Kontakt), farger systemkolonnene og statusene, skjuler tekniske
kolonner og gjør Oversikt om til et dashbord med nøkkeltall, statusfordeling og listene «Trenger svar fra deg» og
«Bør purres». Den viser hva som blir gjort før noe endres, og spør for seg før tomme faner slettes.

Den gjør også Status til den eneste statuskolonnen i Booking: det du har skrevet i *Invitasjon sendt*, *Respons* og
*Med* tas med inn i Status, og så skjules de kolonnene sammen med *Siste e-post fra*, *Utkast laget* og *Lås*
(`KONFIG.SKJUL_I_BOOKING`). Ingenting slettes. Systemkolonnene får samme skrift og overskriftsfarge som tabellen din,
og tomme kolonner mellom tabellen og systemkolonnene fjernes.

**WFD → Fjern ekstra farger i Booking** fjerner bakgrunnsfarger satt for hånd og egne fargeregler på bedriftsradene,
så bare Status og Trenger svar har farger. Innholdet endres ikke.

## Mot fjoråret

Fanen **Mot fjoråret** sammenligner bekreftede Premium partnere og Partnere i år med i fjor:

* **I fjor:** telles fra «(Premium)» / «(Partner)» i bedriftsnavnet for rader med *Med i fjor? = Ja*. Cellene er gule
  og kan overskrives med riktig tall.
* **I år:** rader der *Pakke 2027* er satt og *Med = Ja*. *Pakke 2027* fylles automatisk fra notatene dine
  («Premium partner!», «Partner») og fra bedriftens e-post («vi deltar gjerne som Premium Partner»), men bare når
  den står tom. Du kan alltid endre den selv.
* Listene viser fjorårets partnere som ikke har bekreftet ennå, og nye partnere i år.

## Bedriftsoversikt

Fanen **Bedriftsoversikt** viser hvem som er med (bekreftet øverst, så interessert / tilbud sendt), pakke,
**spesielle ønsker**, notatene dine og kontakt. «Spesielle ønsker» er en kolonne i Booking som fylles med setninger
fra bedriftens egne e-poster der de nevner workshop, dato, stand, panel o.l. Nye ønsker legges til, ingenting
slettes, og du kan redigere fritt.

## Bedriftsliste

Bedriftsliste er oversikten over alle finansbedrifter dere synes er relevante. Rett etter bedriftsnavnet står:

| Kolonne | Hva |
|---|---|
| Kategori | Fra nærmeste fete rad over (Private Equity, Venture …). Kan endres. |
| Kontaktstatus | Bekreftet · I dialog · Kontaktet – venter på svar · Takket nei · Ikke kontaktet · Ikke aktuell. Status hentes fra Booking. |
| Har kontaktet | Avkrysning når bedriften er kontaktet på annen måte (telefon, LinkedIn, styret). Systemet fyller den aldri. |
| Ikke aktuell | Avkrysning når bedriften ikke skal kontaktes i år. Systemet fyller den aldri. |
| Navn i Booking | Raden i Booking bedriften hører til, så status kan hentes derfra. Fylles automatisk (usikre koblinger til godkjenning). |
| E-post (fra Gmail) | Kontakten fra siste relevante e-post |
| Annen kontakt | E-post/telefon du har funnet selv. Oransje = hentet fra nettet, sjekk før bruk. Skriver du over, blir den din. |
| Svar fra bedrift, Kontaktet høst 2026, Kontaktet tidligere, Siste relevante e-post | Fra Gmail |

Kategorirader er uthevet, og alle kolonnene har filterknapper. **Søk:** Ctrl/Cmd + F, eller klikk filterknappen i
«Bedrift» og skriv i søkefeltet. **Bare dem som ikke er kontaktet:** filtrer Kontaktstatus på «Ikke kontaktet».

**Oversikt** viser fordelingen av alle bedriftene i Bedriftsliste på disse statusene, totalen, og hvor mange som står i
Booking uten å stå i Bedriftsliste (så ingen faller utenfor).

**WFD → Oppdater Bedriftsliste fra Gmail** (og hver natt kl. 03) søker etter hver bedrift i e-post til/fra
WFD-adressen. En tråd teller bare når motpartens domene ligner navnet, når e-posten inviterer bedriften ved navn, eller
når navnet står i emnet. Står navnet annerledes i arket enn i e-posten («Clarksson», «EQT group», «Hitec vision»),
finnes bedriften via domenene WFD har skrevet med. For navn som ikke ligner domenet i det hele tatt («SpareBank1
Markets» → sb1markets.no) står domenet i `Nettkontakter.gs`. «Har kontaktet» og «Annen kontakt» røres aldri.

## Ikke kontaktet

Fanen **Ikke kontaktet** viser bedriftene i Bedriftsliste som ikke har fått e-post fra WFD-adressen i høst, med
kategori, beste kontakt og hvor den kommer fra: **Gmail** (grønn), **Fra nett – sjekk** (oransje), **Lagt inn selv**
(blå) eller «mangler kontaktperson» (gul). **Kryss av i ✓** når en bedrift er kontaktet på annen måte – da krysses
«Har kontaktet» av i Bedriftsliste, og den forsvinner fra listen.

## Avkrysning på Oversikt

* **Trenger svar fra deg ✓** – du har svart, eller bedriften trenger ikke svar: «Trenger svar» blir Nei i Booking.
* **Bør purres ✓** – du har purret: status blir «Purret» og «Sist kontakt» i dag, så den kommer tilbake om 7 dager
  hvis bedriften ikke svarer.

Alt som krysses av, logges i Logg («Manuelt»). Det skjer med en enkel `onEdit`-trigger i `Avkryssing.gs`, som virker
uten oppsett.

## Gjøremål

Fanen **Gjøremål** er en enkel oppgaveliste: ✓, oppgave, bedrift, frist, ansvarlig og notat. Avkryssede oppgaver blir
grå og gjennomstreket, og frister som har gått ut blir røde. Systemet lager fanen én gang med de åpne oppgavene og
tømmer den aldri.

## Invitere alle som ikke er kontaktet

**WFD → Lag invitasjoner til de som ikke er kontaktet** lager et invitasjonsutkast i Gmail (fra WFD-adressen, med
invitasjons-PDF-en fra en tidligere sendt invitasjon) til hver bedrift i Bedriftsliste som

* ikke er kontaktet i høst,
* har en e-postadresse i «E-post (fra Gmail)»,
* ikke allerede er invitert eller i dialog i Booking, og
* ikke allerede har et utkast.

Kontakter hentet fra nettet (oransje) tas ikke med før du har sjekket dem og skrevet dem inn selv.

Norsk tekst til .no-adresser, engelsk ellers. Tekstene ligger i `KONFIG.INVITASJON_NO` / `INVITASJON_EN`. Ingenting
sendes automatisk. Til slutt får du en liste over bedrifter som heller ikke er kontaktet, men som mangler e-post.

## Til godkjenning: ingenting automatisk som er usikkert

Systemet skiller mellom det det **vet** og det det **gjetter**:

| Skrives rett inn (sikkert) | Går til «Til godkjenning» (usikkert) |
|---|---|
| Datoer, hvem som skrev sist, Trenger svar | Status tolket fra svaret: Takket nei, Interessert, Tilbud sendt, Bekreftet |
| At e-post er sendt/mottatt: Kontaktet, Purret, I dialog | Pakke 2027 lest ut av e-post |
| Det du har skrevet selv (Veien videre, Med, …) | Nye bedrifter fra Gmail (raden legges til, men må godkjennes) |
| Tydelige koblinger (paretosec.com → Pareto) | E-post koblet fordi domenet bare *ligner* navnet (clarksons.com → «Clarksson») |
| | Kontakter hentet fra nettet |

I fanen **Til godkjenning** krysser du av **Godkjenn** (skrives inn i Booking/Bedriftsliste med en gang) eller **Avvis**
(gjøres ikke, og foreslås ikke igjen; en avvist ny bedrift slettes fra Booking, en avvist kobling brukes aldri mer).
Så lenge noe venter, er Status-cellen oransje i Booking og Bedriftsliste, Oversikt viser et varsel, og den daglige
e-posten lister forslagene.

Svarene tolkes uten AI ut fra tydelige formuleringer («dessverre ikke mulighet», «takke nei», «unfortunately» → Takket
nei; «vi blir gjerne med», «melder oss på» → Interessert; det samme + «Premium partner» → Bekreftet). Et «nei» vinner
over et «ja». **WFD → Les svarene og oppdater status (ja/nei)** lager forslag for svar som kom før dette fantes.

## Slik bruker du det i hverdagen

* **På mobilen:** Åpne Gmail og etiketten **WFD/Svar klart**. Hver tråd der har et ferdig utkast. Les gjennom,
  fyll inn eventuelle `[FYLL INN]`, og send. Neste kjøring (innen 10 min) registrerer at du har svart.
* **I arket:** rød rad betyr at bedriften venter på svar, grønn rad betyr bekreftet, og grå rad betyr takket nei. **Neste steg** sier hva som bør skje.
  Fanen **Logg** viser alt som har skjedd per bedrift, og fanen **Oversikt** viser tall per status.
* **Kryss av i «Lås»** på en rad hvis systemet ikke skal endre status eller kontaktinfo der (f.eks. når du har
  avtalt noe muntlig). Dato og logg oppdateres fortsatt.
* **Notater**-kolonnen rører systemet aldri. AI-en leser den, så noe du skriver der («vil ha stand nær inngangen»)
  blir tatt med i neste utkast.

### Regler systemet følger

* Status flyttes bare **fremover** (Ikke kontaktet → Kontaktet → Purret → I dialog → Interessert → Tilbud sendt →
  Bekreftet). Unntaket er «Takket nei». Du kan alltid endre status selv.
* Et utkast du har **begynt å redigere**, blir aldri slettet eller overskrevet. Har du et eget utkast i tråden, lager
  systemet ikke et nytt, men skriver det i «Neste steg».
* Når du svarer selv, fjernes systemets urørte utkast og etiketten `WFD/Svar klart`.
* Mail fra en bedrift som ikke står i arket, tas bare med hvis den inneholder et av nøkkelordene, eller hvis du
  setter etiketten **WFD** på tråden manuelt. Det er også måten å «tvinge inn» en tråd på.
* Bedrifter matches på e-postadresse, så domene (alle `@dnb.no` er DNB) og til slutt bedriftsnavn. Har du allerede
  en liste med bedriftsnavn i arket, fylles de radene ut i stedet for at det lages duplikater.

## Personvern

Når AI er slått på, sendes innholdet i relevante e-posttråder til Anthropic sitt API for å lage oppsummering og
utkast. Gjennom API-et brukes ikke data til å trene modeller. Sjekk likevel om NHH eller foreningen har regler
for dette.

## Feilsøking

* **Ingenting skjer:** Apps Script → **Utførelser** (venstremenyen) viser hver kjøring og eventuelle feil.
* **Feil bedrift / duplikat:** Rett raden i arket, og fyll inn `Domene`. Da matches neste e-post riktig.
* **«Claude API svarte 401»:** feil API-nøkkel. **429:** for mange kall, og det går over av seg selv.
* **Tidsavbrudd:** sett `INNSATS: 'low'`.
* **Stoppe alt:** WFD → Stopp all automatikk.
