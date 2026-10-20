# Kontrollid

- Kõigi nelja rakenduse tootmisbuild edukas: Next.js web, portal, admin ja Hono API.
- Kõigi kaheksa TypeScripti sisaldava workspace paketi tüübikontroll edukas.
- API ja õiguste 9 testi edukad: otsingufiltrid, vigane päring, 404, avaldamata/aegunud sisu, tervisekontroll, CORS, kirjutusotspunktide puudumine, ettevõtteõigused ja paketi aegumine.
- Serverirenderduse kontroll edukas: avaleht, filtreeritud/tühi kataloog, profiil koos JSON-LD-ga, portal ja admin.
- Drizzle genereeris algmigratsiooni kuuele tabelile.
- Lukustatud sõltuvuste offline-install edukas.

Piirangud: brauseri visuaalne ja mobiilne kontroll, päris PostgreSQLi migratsiooni käivitamine ning Railway juurutamine pole selles keskkonnas tehtud. Autentimine, kirjutusvood ja maksed on järgmine arendusetapp.

Next.js build'i Turbopacki kettavahemälu on välja lülitatud: siin tekitas kordusbuild selle vahemälu lugemisel vea. Puhas build selle seadistusega läbis edukalt.
