import { z } from 'zod';

export const siteContentFields = {
 heroVisible: { group: 'Avalehe hero', label: 'Näita hero plokki', kind: 'toggle', initial: true },
 heroEyebrow: { group: 'Avalehe hero', label: 'Ülarida', kind: 'text', initial: 'KOHALIKUD ETTEVÕTTED. SUURED VÕIMALUSED.' },
 heroTitle: { group: 'Avalehe hero', label: 'Pealkiri', kind: 'text', initial: 'Koos kasvab' },
 heroHighlight: { group: 'Avalehe hero', label: 'Pealkirja rõhutatud rida', kind: 'text', initial: 'Loode-Eesti.' },
 heroDescription: { group: 'Avalehe hero', label: 'Tutvustus', kind: 'textarea', initial: 'Avasta meie kandi ettevõtted, nende teenused ja uued võimalused. LEEK toob piirkonna tegijad ühte kohta.' },
 heroSignature: { group: 'Avalehe hero', label: 'Allkiri', kind: 'text', initial: 'INIMESED / ETTEVÕTTED / KODUKANT' },
 heroImage: { group: 'Avalehe hero', label: 'Põhipilt', kind: 'image', initial: '/images/workshop.webp' },
 heroImageAlt: { group: 'Avalehe hero', label: 'Põhipildi kirjeldus', kind: 'text', initial: 'Kohalik tisler päikeselises puidutöökojas' },
 coastImage: { group: 'Avalehe hero', label: 'Väike pilt', kind: 'image', initial: '/images/coast.webp' },
 coastImageAlt: { group: 'Avalehe hero', label: 'Väikese pildi kirjeldus', kind: 'text', initial: 'Loode-Eesti rannik' },
 coastText: { group: 'Avalehe hero', label: 'Tekst väikesel pildil', kind: 'textarea', initial: 'Sama kant.\nRohkem võimalusi.' },
 heroNote: { group: 'Avalehe hero', label: 'Kollase kaardi tekst', kind: 'textarea', initial: 'Suured asjad\nalgavad lähedalt.' },
 heroNoteCaption: { group: 'Avalehe hero', label: 'Kaardi allkiri', kind: 'text', initial: 'LOODE-EESTI TEGIJAD' },
 searchVisible: { group: 'Avalehe otsing', label: 'Näita otsingut', kind: 'toggle', initial: true },
 searchPlaceholder: { group: 'Avalehe otsing', label: 'Otsinguvälja vihje', kind: 'text', initial: 'Ettevõte või teenus' },
 searchButton: { group: 'Avalehe otsing', label: 'Otsingunupu tekst', kind: 'text', initial: 'Otsi ettevõtteid' },
 categoriesVisible: { group: 'Avalehe otsing', label: 'Näita tegevusalade otseteid', kind: 'toggle', initial: true },
 companiesVisible: { group: 'Avalehe ettevõtted', label: 'Näita ettevõtete plokki', kind: 'toggle', initial: true },
 companiesEyebrow: { group: 'Avalehe ettevõtted', label: 'Ülarida', kind: 'text', initial: 'MEIE KANDI ETTEVÕTTED' },
 companiesTitle: { group: 'Avalehe ettevõtted', label: 'Pealkiri', kind: 'text', initial: 'Tegijad meie kõrval' },
 companiesButton: { group: 'Avalehe ettevõtted', label: 'Lingi tekst', kind: 'text', initial: 'Vaata kõiki ettevõtteid' },
 companiesLink: { group: 'Avalehe ettevõtted', label: 'Lingi siht', kind: 'link', initial: '/ettevotted' },
 companiesEmpty: { group: 'Avalehe ettevõtted', label: 'Tühja ploki tekst', kind: 'text', initial: 'Esimesed ettevõtted lisanduvad peagi.' },
 bannerVisible: { group: 'Liitumisbänner', label: 'Näita liitumisbännerit', kind: 'toggle', initial: true },
 bannerEyebrow: { group: 'Liitumisbänner', label: 'Ülarida', kind: 'text', initial: 'SINUGA ON MEID ROHKEM' },
 bannerTitle: { group: 'Liitumisbänner', label: 'Pealkiri', kind: 'text', initial: 'Sinu ettevõte kuulub siia.' },
 bannerDescription: { group: 'Liitumisbänner', label: 'Tutvustus', kind: 'textarea', initial: 'Tee ennast kodukandis nähtavaks. Leia uusi kliente, koostööpartnereid ja inimesi, kellega koos edasi liikuda.' },
 bannerButton: { group: 'Liitumisbänner', label: 'Nupu tekst', kind: 'text', initial: 'Avasta liitumisvõimalused' },
 bannerLink: { group: 'Liitumisbänner', label: 'Nupu siht', kind: 'link', initial: '/liitu' },
 jobsVisible: { group: 'Avalehe tööpakkumised', label: 'Näita tööpakkumisi', kind: 'toggle', initial: true },
 jobsEyebrow: { group: 'Avalehe tööpakkumised', label: 'Ülarida', kind: 'text', initial: 'TÖÖTA KODUKANDIS' },
 jobsTitle: { group: 'Avalehe tööpakkumised', label: 'Pealkiri', kind: 'text', initial: 'Järgmine võimalus on lähedal' },
 jobsDescription: { group: 'Avalehe tööpakkumised', label: 'Tutvustus', kind: 'textarea', initial: 'Leia oma koht Loode-Eesti ettevõtetes.' },
 jobsButton: { group: 'Avalehe tööpakkumised', label: 'Lingi tekst', kind: 'text', initial: 'Kõik tööpakkumised' },
 jobsLink: { group: 'Avalehe tööpakkumised', label: 'Lingi siht', kind: 'link', initial: '/tookohad' },
 jobsEmpty: { group: 'Avalehe tööpakkumised', label: 'Tühja ploki tekst', kind: 'text', initial: 'Aktiivseid tööpakkumisi praegu ei ole.' },
 aboutEyebrow: { group: 'Klubist', label: 'Ülarida', kind: 'text', initial: 'LOODE-EESTI ETTEVÕTLUSKLUBI' },
 aboutTitle: { group: 'Klubist', label: 'Pealkiri', kind: 'textarea', initial: 'Üks piirkond.\nPalju häid tegijaid.' },
 aboutLead: { group: 'Klubist', label: 'Sissejuhatus', kind: 'textarea', initial: 'LEEK toob kokku Loode-Eesti ettevõtted ning aitab kohalikel inimestel avastada oma kandi teenuseid, tooteid ja töövõimalusi.' },
 aboutSubtitle: { group: 'Klubist', label: 'Esimese lõigu pealkiri', kind: 'text', initial: 'Lähedalt leitud koostöö' },
 aboutBody: { group: 'Klubist', label: 'Esimene lõik', kind: 'textarea', initial: 'Soovime, et hea tegija ei jääks märkamata. Et kodu lähedalt leiaks nii usaldusväärse teenusepakkuja kui ka partneri järgmise idee elluviimiseks.' },
 aboutSecondTitle: { group: 'Klubist', label: 'Teise lõigu pealkiri', kind: 'text', initial: 'Rohkem nähtavust. Rohkem võimalusi.' },
 aboutSecondBody: { group: 'Klubist', label: 'Teine lõik', kind: 'textarea', initial: 'Ettevõtte profiil koondab tutvustuse ja kontaktid ühte kohta. Pakkumised ning töökuulutused aitavad jõuda inimesteni, kes otsivad just sinu ettevõtte võimalusi.' },
 aboutButton: { group: 'Klubist', label: 'Nupu tekst', kind: 'text', initial: 'Avasta meie kandi ettevõtteid →' },
 aboutLink: { group: 'Klubist', label: 'Nupu siht', kind: 'link', initial: '/ettevotted' },
 directoryEyebrow: { group: 'Rubriikide tutvustused', label: 'Ettevõtete ülarida', kind: 'text', initial: 'LEIA OMA KANDI TEGIJA' },
 directoryTitle: { group: 'Rubriikide tutvustused', label: 'Ettevõtete pealkiri', kind: 'text', initial: 'Ettevõtted, kes on lähedal.' },
 directoryLead: { group: 'Rubriikide tutvustused', label: 'Ettevõtete tutvustus', kind: 'textarea', initial: 'Väikestest töökodadest suurte ideedeni. Leia endale sobiv teenus või järgmine koostööpartner.' },
 offersEyebrow: { group: 'Rubriikide tutvustused', label: 'Pakkumiste ülarida', kind: 'text', initial: 'HEAD VÕIMALUSED KODUKANDIST' },
 offersTitle: { group: 'Rubriikide tutvustused', label: 'Pakkumiste pealkiri', kind: 'text', initial: 'Avasta kohalikke pakkumisi.' },
 offersLead: { group: 'Rubriikide tutvustused', label: 'Pakkumiste tutvustus', kind: 'textarea', initial: 'Teenused, tooted ja koostöövõimalused meie piirkonna ettevõtetelt.' },
 vacanciesEyebrow: { group: 'Rubriikide tutvustused', label: 'Tööpakkumiste ülarida', kind: 'text', initial: 'TÖÖTA KODUKANDIS' },
 vacanciesTitle: { group: 'Rubriikide tutvustused', label: 'Tööpakkumiste pealkiri', kind: 'text', initial: 'Sinu järgmine võimalus.' },
 vacanciesLead: { group: 'Rubriikide tutvustused', label: 'Tööpakkumiste tutvustus', kind: 'textarea', initial: 'Avasta Loode-Eesti ettevõtete tööpakkumised. Hea töö võib olla lähemal, kui arvad.' },
 productsTitle: { group: 'Rubriikide tutvustused', label: 'Tootekataloogi pealkiri', kind: 'text', initial: 'Tooted' },
 servicesTitle: { group: 'Rubriikide tutvustused', label: 'Teenuste kataloogi pealkiri', kind: 'text', initial: 'Teenused' },
 navCompanies: { group: 'Menüü', label: 'Menüü „Ettevõtted“', kind: 'text', initial: 'Ettevõtted' },
 navServices: { group: 'Menüü', label: 'Menüü „Teenused“', kind: 'text', initial: 'Teenused' },
 navProducts: { group: 'Menüü', label: 'Menüü „Tooted“', kind: 'text', initial: 'Tooted' },
 navOffers: { group: 'Menüü', label: 'Menüü „Pakkumised“', kind: 'text', initial: 'Pakkumised' },
 navJobs: { group: 'Menüü', label: 'Menüü „Tööpakkumised“', kind: 'text', initial: 'Tööpakkumised' },
 navPlans: { group: 'Menüü', label: 'Menüü „Paketid“', kind: 'text', initial: 'Paketid' },
 navAbout: { group: 'Menüü', label: 'Menüü „Klubist“', kind: 'text', initial: 'Klubist' },
 footerDescription: { group: 'Jalus', label: 'Tutvustus', kind: 'textarea', initial: 'Kohalikud tegijad. Ühised võimalused.\nLoode-Eesti ettevõtlus saab kokku siin.' },
 footerExplore: { group: 'Jalus', label: 'Avastamise veeru pealkiri', kind: 'text', initial: 'AVASTA' },
 footerClub: { group: 'Jalus', label: 'Klubi veeru pealkiri', kind: 'text', initial: 'LEEK' },
 footerAbout: { group: 'Jalus', label: 'Klubi lingi tekst', kind: 'text', initial: 'Meie klubist' },
 footerJoin: { group: 'Jalus', label: 'Liitumislingi tekst', kind: 'text', initial: 'Liitumisvõimalused' },
 footerCopyright: { group: 'Jalus', label: 'Autoriõiguse tekst (aasta lisatakse automaatselt)', kind: 'text', initial: 'LEEK · Loode-Eesti ettevõtlusklubi' },
 footerSignature: { group: 'Jalus', label: 'Allkiri', kind: 'text', initial: 'Koos on rohkem võimalik.' },
} as const;

export type SiteContentKey = keyof typeof siteContentFields;
export type SiteContent = { [K in SiteContentKey]: typeof siteContentFields[K]['kind'] extends 'toggle' ? boolean : string };

function safeLink(value: string) {
 if (/^\/(?!\/)/.test(value)) return !/[\\\s\u0000-\u001f]/u.test(value);
 try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
 catch { return false; }
}
const text = z.string().trim().min(1).max(400);
const paragraph = z.string().trim().min(1).max(4000);
const link = z.string().trim().max(2048).refine(safeLink, 'Kasuta lehesisest rada või HTTPS-aadressi.');
const image = z.string().trim().max(2048).refine(value =>
 /^\/images\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..') ||
 /^\/api\/site-media\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value) ||
 value.startsWith('https://') && safeLink(value), 'Vali pilt või sisesta HTTPS-aadress.');

const validators = { text, textarea: paragraph, link, image, toggle: z.boolean() };
type SiteContentShape = { [K in SiteContentKey]: typeof siteContentFields[K]['kind'] extends 'toggle' ? z.ZodBoolean : z.ZodString };
export const siteContentSchema = z.object(Object.fromEntries(
 Object.entries(siteContentFields).map(([key, field]) => [key, validators[field.kind]]),
) as SiteContentShape).strict();
export const defaultSiteContent = Object.fromEntries(
 Object.entries(siteContentFields).map(([key, field]) => [key, field.initial]),
) as SiteContent;
export const siteContentSaveSchema = z.object({
 version: z.number().int().min(0),
 content: siteContentSchema,
}).strict();
export type SiteContentDocument = { version: number; content: SiteContent };
