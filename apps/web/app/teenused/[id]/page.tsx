import { ServiceDetail } from '../../../components/service-detail';
import { getPublicService } from '../../../lib/services';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
 const service = await getPublicService((await params).id);
 return { title: service.title, description: service.description.slice(0, 160) };
}

export default async function ServicePage({ params }: Props) {
 const service = await getPublicService((await params).id);
 return <div className="container service-page">
  <p className="service-breadcrumb"><a href="/teenused">Teenused</a> / {service.category}</p>
  <ServiceDetail service={service} company={service.company} />
 </div>;
}
