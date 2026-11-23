# Töökuulutuste ülevaatus

Admini menüüs on **Töökuulutuste ülevaatus** (`/tookuulutused`). Seal kuvatakse ülevaatusele esitatud tööpakkumised ja tööampsud, vanemad eespool, kuni 40 kirjet lehel.

- **Kinnita ja avalda** avaldab esitatud versiooni. Ettevõte peab endiselt olema kinnitatud ja aktiivse Eestvedaja paketiga. Aegunud või puudulike andmetega kuulutust avaldada ei saa.
- **Saada parandusse** vajab vähemalt viie märgi pikkust põhjendust. Ettevõtja näeb põhjust oma portaalis ning saab kuulutust muuta ja uuesti esitada.
- Kui parandusse saadetakse avaldatud kuulutuse muudatus, säilib seni avalik versioon koos senise tähtajaga. Uus kuulutus jääb avaldamata.
- Vana versiooni, tagasi võetud või juba otsustatud kuulutuse kinnitamine tagastab konflikti. Admin peab järjekorda värskendama.

API: `GET /v1/admin/work?offset=0` ja `POST /v1/admin/work/:id/review` (`decision`, `note`, `version`). Mõlemad nõuavad admini rolli; muutmine nõuab lubatud päritoluga JSON-päringut. Kinnitamine kontrollib ettevõtte paketti ning kuulutuse andmeid uuesti tehingus.

Eraldi andmebaasimigratsiooni pole vaja: kasutatakse olemasoleva `0005_company_work.sql` välju. See migratsioon peab olema varasema töökuulutuste mooduli jaoks rakendatud. Uuenda nii API kui ka admini rakendust.
