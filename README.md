# LEEK — Loode-Eesti ettevõtlusklubi

Esimene töötav arendusversioon. pnpm + Turborepo, 3 Next.js rakendust ja Hono API. Railway jaoks ette valmistatud; mitte juurutatud.

## Käivitamine

Vajalik Node.js 22.12+ ja pnpm 11.25.0. Vajadusel `corepack enable` ning `corepack prepare pnpm@11.25.0 --activate`.

```sh
pnpm install --frozen-lockfile
pnpm setup:local
pnpm dev
```

- Avalik veeb: http://localhost:3000
- Ettevõtja iseteeninduse demo: http://localhost:3001
- Admini demo: http://localhost:3002
- API: http://localhost:3003/v1/public

`setup:local` loob näidisfailidest puuduvad `.env` failid. Neis on `DEMO_MODE=true`. Ükski päris konto ega makse ei ole selles etapis ühendatud. Portaali/admini vaated on kirjutuskaitstud näidised; avalik otsing ja navigeerimine töötavad. Avalik veeb saab demorežiimis andmed kohalikust jagatud fixture'ist, mitte API-st; väljaspool demorežiimi kasutab server API-t.

## Struktuur

```text
apps/web       avalik portaal ja SEO
apps/portal    ettevõtte iseteenindus
apps/admin     MTÜ halduskeskkond
apps/api       Hono API
packages/db         PostgreSQL/Drizzle mudel ja migratsioonid
packages/auth       ettevõtteõigused ja paketi kehtivuse reeglid
packages/contracts  API skeemid, tüübid, avalikud filtrid ja demoandmed
packages/ui         ühised komponendid ja kujundus
packages/config     ühised TypeScripti seadistused
```

## Päris andmebaas

```sh
docker compose up -d
pnpm --filter @leek/db migrate
```

`packages/db/.env` peab sisaldama `DATABASE_URL`. API `.env`: `DEMO_MODE=false` ja sama `DATABASE_URL`. Web `.env`: `DEMO_MODE=false`, `API_URL=http://localhost:3003`. Näidisandmeid päris andmebaasi automaatselt ei impordita; tühi baas annab tühja kataloogi.

## Kontrollid

```sh
pnpm typecheck
pnpm test
pnpm build
```

Ühe rakenduse build: `pnpm --filter @leek/web build`. Tootmisprotsessi käivitamiseks vali rakendus, nt `pnpm --filter @leek/web start`. `PORT` on keskkonnast seadistatav.

## Valmis
Avalik avaleht, otsing/filtrid, ettevõtte detail, pakkumised, töökuulutused ja detail, klubitutvustus, pakettide kavand; iseteeninduse/admini põhivaated; serveris renderdamine, metaandmed, OG pilt, robots, sitemap, canonicalid, Organization JSON-LD; avalik API, andmemudel ja algmigratsioon; Railway teenuste seadistused.

## Järgmine etapp
Better Auth, registreerimine, ettevõtte esindusõiguse kontroll, ettevõtete ja sisu salvestavad API-d, päris õiguste kontroll, failide üleslaadimine, sisu kinnitamine, kinnitatud paketireeglid ja maksed. Praegune versioon ei ole tootmises kasutatav liikmete haldamiseks.

Täpsemalt: [arhitektuur](docs/ARCHITECTURE.md), [Railway](docs/RAILWAY.md), [pildid ja fondid](docs/ASSETS.md).
