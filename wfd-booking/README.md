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
   `Konfig`, `Ark`, `AI`, `Innboks`, `Historikk`, `Oppfolging`, `Oppsett`.)
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
| `KOLONNER` | Bare hvis du har et eksisterende ark med andre overskrifter. Skriv dine overskrifter til høyre, så bruker systemet dem. Kolonner som mangler, legges til bakerst. |

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
