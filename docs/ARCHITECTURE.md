# LEEK · arhitektuur

## Rakendused
- `web`: Next.js App Router, avalik serveris renderdatav portaal (3000).
- `portal`: Next.js, ettevõtete iseteenindus (3001).
- `admin`: Next.js, LEEKi haldus (3002).
- `api`: Hono + Node, ainus tootmise andmekiht (3003).

Jagatud paketid: `contracts` (Zod DTOd, filtrid, avalik projektsioon), `db` (Drizzle/Postgres), `auth` (õiguste alus), `ui` (kujundus), `config` (TS).

API avalik lugemisvoog töötab PostgreSQLiga. Andmeid sisestav iseteenindus ei ole veel ühendatud. Better Auth ja salvestavad API operatsioonid on järgmine etapp. `users` on esialgne kasutajamudel; enne autentimise juurutamist tuleb genereerida ja üle vaadata Better Authi skeem ning migratsioon.

## Põhireeglid
- Konto ja ettevõte on eraldi; neid seob `company_memberships` ja roll `owner` või `editor`.
- Üks kasutaja võib hallata mitut ettevõtet; ettevõttel võib olla mitu haldajat.
- Platvormi administraatori õigused on eraldi ettevõtte õigustest.
- Pakett ja tellimuse kehtivus kuuluvad ettevõttele. Tasuline õigus vajab kinnitatud kehtivat tellimust.
- `company.plan` on esialgne paketi kirjeldus. See üksinda ei anna tasulist õigust: tulevased kirjutusvood peavad kontrollima kehtivat tellimust ja `hasFeature` reeglit.
- Avalik API väljastab ainult avaldatud ettevõtteid ning avaldatud, aegumata sisu nende ettevõtete alt.
- Kirjutavaid lõpp-punkte praegu ei ole. Brauserist saadetud ettevõtte ID ei anna kunagi õigusi.

## SEO
Avalikud lehed renderdatakse serveris. Ettevõtetel ja töökuulutustel on oma URLid ja canonicalid. Metaandmed, Open Graph pilt, robots ja sitemap on olemas. Ettevõttel Organization JSON-LD. Filtri URLid on noindex ja canonical viitab kataloogile. Demorežiim on noindex, sitemap tühi. Iseteenindus/admin on noindex ning demorežiimi puudumisel suletud.

JobPosting andmed lisada päris kuulutuste mudeli valmimisel (avaldamisaeg, töökorraldus, kandideerimise info). Asukoha- ja kategoorialehtede SEO sisu ei genereerita tühjadest kombinatsioonidest.

## Veel otsustamata
Täpne omavalitsuste loend, avaliku profiili tasuta/tasulised väljad, reklaami formaat ja rotatsioon, pakettide hinnad/limiidid, arvelduskanal, MTÜ liikmelisuse seos paketiga, sisu kinnitamise töövoog, lõplik domeen ja kontaktandmed.
