import { InquiryList } from '../../components/inquiries/inbox';
import { getInquiries, requireInquirySession } from '../../lib/inquiries';
import { inboxHref, inboxOffset } from '../../lib/inquiry-links';

export const metadata = { title: 'Minu päringud', robots: { index: false, follow: false } };
export default async function CustomerInboxPage({ searchParams }: { searchParams: Promise<{ offset?: string }> }) {
 const offset = inboxOffset((await searchParams).offset);
 await requireInquirySession(inboxHref(undefined, undefined, offset));
 const page = await getInquiries(undefined, offset);
 return <div className="container service-page"><h1>Minu päringud</h1><InquiryList {...page} offset={offset} /></div>;
}
