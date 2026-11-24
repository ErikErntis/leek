# Avalik tööportaal — esimene versioon

## Vaated

- `/tookohad`: märksõnaotsing, tööpakkumiste ja tööampsude vahekaardid, dünaamilised filtrid, tulemuste arv, sortimine ja leheküljed.
- `/tookohad/[slug]`: kinnitatud kuulutuse täisandmed, tasu, tähtaeg, tööandja, kandideerimine ja seotud kuulutused.
- Mobiilis avanevad filtrid nupust **Filtrid**.

Filtrite valikud tulevad ainult avaldatud ja kehtivatest kuulutustest ning avaldatud ettevõtetelt. Sama rühma sees on valikud ühendatud VÕI-tingimusega, eri rühmad JA-tingimusega. Iga filtrirühma arvud arvestavad märksõna, kuulutuse liiki ja teisi filtrirühmi. Juba valitud väärtus jääb null tulemuse korral eemaldamiseks nähtavaks. Otsing ja filtrid säilivad URL-is.

Kandideerimise nupp järgib kinnitatud kuulutuse valikut:

- e-post: avab kasutaja e-posti rakenduse;
- väline HTTPS-link: avab tööandja kandideerimislehe;
- LEEKi portaal: küsib sisselogimist, saadab tutvustava sõnumi tööandja päringute hulka ning võimaldab vestlust jätkata. Esimene versioon kasutab tekstisõnumit.

## Kinnitatud sisu

`jobs.published_content` sisaldab viimast kinnitatud täisversiooni. Muudetav `content` jääb privaatseks kuni admini kinnituseni. `published_at` annab avaliku sortimise aja. Varem avaldatud kuulutuse andmed jäävad muudatuste koostamise ja ülevaatuse ajal samaks.

Varem kinnitatud ja muutmata kuulutuste täisandmed kantakse migratsiooniga üle. Vanade kuulutuste puhul, mille kinnitatud täisversiooni enam ohutult taastada ei saa, kasutatakse seniseid avalikke põhivälju ning ettevõtte e-posti. Pärast uut kinnitamist ilmuvad kõik täisandmed.

## Uuendamine

1. Rakenda uus `0006_public_work.sql` migratsioon tavapärase `pnpm --filter @leek/db migrate` käsuga. Olemasolevatele päringutabelitele lisandub kandideerimise liik. API olemasolev `dist/migrate-portal.js` migratsioonitee sisaldab samuti neid muudatusi.
2. Uuenda API, admini ja webi rakendused koos, et kinnitamine salvestaks uue avaliku versiooni.

Automaatkontrollid katavad dünaamilised filtrid, arvestused, URL-parameetrid, leheküljed, vana avaliku versiooni säilimise ja portaalis kandideerimise õigused.
