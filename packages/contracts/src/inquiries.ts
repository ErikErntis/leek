import { z } from 'zod';

export const inquiryKindSchema = z.enum(['product', 'fixed_service', 'service_quote']);
export const inquiryStatusSchema = z.enum(['open', 'accepted', 'declined']);
const message = z.string().trim().min(1).max(4000);
const money = z.number().int().min(0).max(100_000_000);
const date = z.iso.date().nullable();
export const inquiryCreateSchema = z.discriminatedUnion('source', [
 z.object({
  source: z.literal('product'), id: z.string().uuid(), listingId: z.string().uuid(),
  optionId: z.string().uuid().nullable(), quantity: z.number().int().min(1).max(999), message,
 }).strict(),
 z.object({
  source: z.literal('service'), id: z.string().uuid(), listingId: z.string().uuid(),
  optionId: z.string().uuid().nullable(), expectedPriceCents: money.nullable(),
  location: z.string().trim().min(2).max(250), desiredDate: date, message,
 }).strict(),
]);
export const inquiryActionSchema = z.discriminatedUnion('action', [
 z.object({ action: z.literal('reply'), id: z.string().uuid(), message }).strict(),
 z.object({ action: z.literal('offer'), id: z.string().uuid(), priceCents: money, proposedDate: date, message }).strict(),
 z.object({ action: z.literal('decide'), decision: z.enum(['accept', 'decline']), offerId: z.string().uuid().nullable() }).strict(),
]);
export type InquiryCreate = z.infer<typeof inquiryCreateSchema>;
export type InquiryAction = z.infer<typeof inquiryActionSchema>;
export type InquiryKind = z.infer<typeof inquiryKindSchema>;
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;
export type InquirySide = 'customer' | 'company';
export type InquirySnapshot = { listingId: string; title: string; optionTitle: string | null; priceCents: number | null; quantity: number };
export type InquirySummary = {
 id: string; companyId: string; companyName: string; customerName: string;
 kind: InquiryKind; status: InquiryStatus; snapshot: InquirySnapshot; updatedAt: string;
};
export type InquiryMessage = { id: string; side: InquirySide; body: string; createdAt: string };
export type InquiryOffer = {
 id: string; priceCents: number; proposedDate: string | null; message: string;
 status: 'pending' | 'accepted' | 'declined' | 'replaced'; createdAt: string;
};
export type InquiryThread = InquirySummary & {
 location: string | null; desiredDate: string | null; messages: InquiryMessage[]; offers: InquiryOffer[]; hasOlder: boolean;
};
