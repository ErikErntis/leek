import { companyDisplayName } from '@leek/contracts';
import { ProductBuyPanel } from '../../../components/product-buy-panel';
import { getPublicProduct } from '../../../lib/products';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
 const { content } = await getPublicProduct((await params).id);
 return { title: content.title, description: content.description.slice(0, 160) };
}

export default async function ProductPage({ params }: Props) {
 const product = await getPublicProduct((await params).id);
 const { content, company } = product;
 return <div className="container service-page">
  <p className="service-breadcrumb"><a href="/tooted">Tooted</a> / {content.category}</p>
  <div className="service-detail-grid">
   <article className="service-detail">
    <h1 className="service-detail-title">{content.title}</h1>
    <p><a className="text-link" href={`/ettevotted/${company.slug}`}>{companyDisplayName(company)}</a></p>
    {content.photos.length > 0 && <div className="product-gallery">
     {content.photos.map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`${content.title}, pilt ${index + 1}`}
      width={index ? 220 : 720} height={index ? 150 : 490} loading={index ? 'lazy' : 'eager'} referrerPolicy="no-referrer" />)}
    </div>}
    <section className="service-description"><h2>Toote kirjeldus</h2><p>{content.description}</p></section>
   </article>
   <ProductBuyPanel product={product} />
  </div>
 </div>;
}
