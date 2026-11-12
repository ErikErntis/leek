import { notFound } from 'next/navigation';
import { InquiryConversation } from '../../../../components/inquiries/inbox';
import { PortalShell } from '../../../../components/portal/portal-shell';
import { getInquiry } from '../../../../lib/inquiries';
import { inboxOffset } from '../../../../lib/inquiry-links';
import { portalData } from '../../../../lib/portal';

export default async function CompanyInquiryPage({ params, searchParams }: {
 params: Promise<{ id: string }>; searchParams: Promise<{ company?: string; offset?: string }>;
}) {
 const [data, { id }, query] = await Promise.all([portalData(), params, searchParams]);
 const company = data.companies.find(item => item.id === query.company) ?? data.companies[0];
 if (!company) notFound();
 const offset = inboxOffset(query.offset);
 const thread = await getInquiry(id, company.id, offset);
 return <PortalShell company={company} active="/paringud"><InquiryConversation thread={thread} company={company.id} offset={offset} /></PortalShell>;
}
