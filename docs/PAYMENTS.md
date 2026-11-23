# Paketi makse kinnitamine

Tasulised paketid on ühekordsed aastamaksed Stripe Checkouti kaudu.

## Seadistus

API keskkonnas peavad olema `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ja `BETTER_AUTH_URL`. Viimane peab osutama avaliku veebi praegusele aadressile, sest samas veebis asub `/portaal/pakett`.

Stripe'i sündmuste sihtkoht peab olema API avalikul aadressil `/v1/stripe/webhook`. Lülita sisse `checkout.session.completed` ja `checkout.session.async_payment_succeeded`. `STRIPE_WEBHOOK_SECRET` peab olema selle konkreetse sihtkoha allkirjastamise saladus. Sandboxi maksed, API võti ja sündmuste sihtkoht peavad kuuluma samasse sandboxi. Live-keskkonna seadistus on eraldi.

## Aktiveerimine ja taastamine

Allkirjastatud webhook aktiveerib tasutud paketi. Lisaks kontrollib sisselogitud omaniku portaali ülevaade tema ootel makseid otse Stripe'i serverist. Nii taastub pakett ka siis, kui webhook hilineb või jäi edastamata, sealhulgas enne parandust tehtud maksete puhul.

Mõlemad teed kasutavad sama andmebaasitehingut ja lukustust. Kontrollitakse Checkouti ID-d, makse viitenumbrit, summat, euro valuutat ja tasutud staatust. Korduv kinnitus ei pikenda aastapaketti uuesti. Brauseri `payment=success` parameeter üksi ei aktiveeri paketti.

Maksejärgne leht värskendab staatust automaatselt kuni 12 korda. Pikema viivituse korral saab kontrolli käsitsi uuesti käivitada. Kontrolli ühendusevea korral jääb portaal kasutatavaks ning API logib `Billing payment reconciliation failed` koos vea põhjusega.

## Paranduse kasutuselevõtt

Uuenda nii API kui ka veeb. See parandus ei lisa uut andmebaasimigratsiooni. Pärast uuendust ava olemasoleva makse teinud kasutajana portaal: Stripe'is tasutud, andmebaasis endiselt ootel makse kontrollitakse uuesti ning aktiveeritakse kinnituse korral. Uut makset pole vaja teha.

Kui aktiveerimist ei toimu, kontrolli Stripe'i sündmuste kohaletoimetamist ja API logi. `Checkout details mismatch` tähendab, et summa, valuuta või viitenumber ei ühti kohaliku maksereaga. `Stripe request failed: 401` viitab API võtme probleemile ning `404` võib tähendada teise sandboxi või konto võtit. Tundlikke võtmeid ei tule logidesse ega lähtekoodi lisada.

Stripe'i juhend: https://docs.stripe.com/checkout/fulfillment

## Kontrollitud paranduse juures

- Kõik 24 API testi läbivad, sh 3 maksetesti PostgreSQLi ühilduva PGlite'i ja Stripe'i transpordi testasendusega.
- Kaetud on tasutud makse taastamine puuduva webhook'i korral, veel tasumata makse, vale valuuta, Stripe'i ajutine tõrge, võõra ettevõtte õigused, korduv webhook, makse uuesti alustamine ning tasuta paketile vahetamine pärast tasumist.
- Kõigi workspace'i TypeScripti pakettide tüübikontroll ning API ja veebi tootmisbuild läbivad.
- Maksejärgse komponendi DOM-kontroll kinnitab ootamise vaate, automaatse kontrolli piiri, käsitsi uuesti kontrollimise ja aktiivse paketi vaate.

Päris Stripe'i sandboxi makset ega juurutatud teenuse webhook'i logisid selles arenduskeskkonnas ei kontrollitud. Veebi ehitus annab olemasoleva Next.js versiooni kohta turvahoiatuse.
