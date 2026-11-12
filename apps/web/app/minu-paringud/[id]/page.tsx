import { InquiryConversation } from '../../../components/inquiries/inbox';
import { getInquiry, requireInquirySession } from '../../../lib/inquiries';
import { inboxHref, inboxOffset } from '../../../lib/inquiry-links';

export const metadata = { title: 'Minu päring', robots: { index: false, follow: false } };
export default async function CustomerInquiryPage({ params, searchParams }: {
 params: Promise<{ id: string }>; searchParams: Promise<{ offset?: string }>;
}) {
 const [{ id }, query] = await Promise.all([params, searchParams]);
 const offset = inboxOffset(query.offset);
 await requireInquirySession(inboxHref(undefined, id, offset));
 const thread = await getInquiry(id, undefined, offset);
 return <div className="container service-page"><InquiryConversation thread={thread} offset={offset} /></div>;
}
