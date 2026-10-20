# Railway juurutamine

Lähtekood on ette valmistatud neljaks Railway teenuseks. Juurutamist pole selles paketis tehtud ega Railway keskkonda ühendatud.

1. Lisa repo GitHubi ja loo Railway projekt koos PostgreSQLiga.
2. Lisa samast repost neli teenust. Iga teenuse **Root Directory on repo juur**: workspace paketid peavad build'is nähtavad olema.
3. Vali igale teenusele Config File Path: `/apps/web/railway.json`, `/apps/portal/railway.json`, `/apps/admin/railway.json`, `/apps/api/railway.json`.
4. Railway build kasutab pnpm lockfile'i. Kui vaja, määra Node 22 või 24 ning luba Corepack. Ära kasuta Next.js `output: export` režiimi.
5. Määra domeenid ja allolevad muutujad. `$PORT` tuleb Railwaylt; seda ära kirjuta kindlaks.

## API
- `DATABASE_URL`: Railway PostgreSQLi ühendusviide.
- `DEMO_MODE=false`: päris andmebaasi lugemiseks.
- `ALLOWED_ORIGINS`: veebi, portaali ja admini täpsed HTTPS originid komaga eraldatult.

## Web
- `API_URL`: API teenuse privaatne või avalik URL (serverist kättesaadav).
- `SITE_URL`: avaliku veebi lõplik HTTPS URL.
- `PORTAL_URL`: iseteeninduse HTTPS URL.
- `DEMO_MODE=false`: päris API sisu, indekseerimine lubatud. Avaldamiseelses keskkonnas kasuta demo režiimi või keskkonna ligipääsupiirangut.

## Portal ja admin
- `SITE_URL`, `PORTAL_URL`, `ADMIN_URL`: vastavad avalikud URLid.
- `DEMO_MODE=false`: praegu annab sisule 404, sest autentimine on järgmine etapp.
- Ainult disaini tutvustamiseks võib eraldi testkeskkonnas panna `DEMO_MODE=true`. Näidisvaade ei kasuta päris kliendiandmeid ega salvesta.

## Andmebaas
Migratsioonid on `packages/db/migrations`. Rakenda kontrollitud migratsioon ühe korra enne API käivitamist:

```sh
pnpm --filter @leek/db migrate
```

Määratud peab olema `DATABASE_URL`. Ära pane migratsiooni kõigi nelja teenuse käivituskäsu sisse. Healthcheck `/health`: API kontrollib DB ühendust; Next teenused kontrollivad protsessi vastamist. Next teenuste healthcheck ei taga API kättesaadavust.

Pärast autentimise lisamist: tegelik sessioonide kontroll, usaldatud originid ja küpsiste domeenid, parooli taastamine ning päris rollikontrollid tuleb enne kliendiandmete kasutamist läbi testida.
