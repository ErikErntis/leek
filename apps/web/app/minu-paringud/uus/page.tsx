import { notFound } from 'next/navigation';
import { companyDisplayName } from '@leek/contracts';
import { NewInquiryForm } from '../../../components/inquiries/inquiry-forms';
import { requireInquirySession } from '../../../lib/inquiries';
import { startInquiryHref } from '../../../lib/inquiry-links';
import { getPublicProduct } from '../../../lib/products';
import { getPublicService } from '../../../lib/services';

export const metadata = { title: 'Uus päring', robots: { index: false, follow: false } };
export default async function NewInquiryPage({ searchParams }: { searchParams: Promise<{ source?: string; id?: string; option?: string }> }) {
 const { source, id, option } = await searchParams;
 const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
 if ((source !== 'product' && source !== 'service') || typeof id !== 'string' || !uuid.test(id)) notFound();
 const selectedId = typeof option === 'string' && uuid.test(option) ? option : undefined;
 await requireInquirySession(startInquiryHref(source, id, selectedId));

 const listing = source === 'product' ? await getPublicProduct(id) : await getPublicService(id);
 if ('content' in listing && (listing.linked || listing.content.shopUrl)) notFound();
 const title = 'content' in listing ? listing.content.title : listing.title;
 const options = 'content' in listing
  ? listing.content.variants.map(item => ({ id: item.id, title: item.name, priceCents: item.priceCents }))
  : listing.pricing === 'fixed' ? (listing.packages ?? []).map(item => ({ id: item.id, title: item.title, priceCents: item.priceCents })) : [];
 const fixed = 'pricing' in listing && listing.pricing === 'fixed';
 const heading = source === 'product' ? 'Küsi toote kohta' : fixed ? 'Saada tellimissoov' : 'Küsi pakkumist';
 return <div className="container service-page inbox-new">
  <p className="service-breadcrumb"><a href={`/${source === 'product' ? 'tooted' : 'teenused'}/${id}`}>Tagasi kuulutuse juurde</a></p>
  <h1>{heading}</h1>
  <section className="panel">
   <h2>{title}</h2>
   <p className="muted">{companyDisplayName(listing.company)}</p>
   <NewInquiryForm source={source} listingId={id} options={options} selectedId={selectedId} fixed={fixed}
    priceCents={'content' in listing ? listing.content.priceCents : listing.priceCents} />
  </section>
 </div>;
}
