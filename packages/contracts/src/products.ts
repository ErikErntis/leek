import { z } from 'zod';

export const productCategories = ['Kodu ja sisustus', 'Toit ja jook', 'Aed ja õu', 'Käsitöö ja kingitused', 'Rõivad ja aksessuaarid', 'Muud tooted'] as const;
export const productAvailability = { in_stock: 'Laos', on_order: 'Tellimisel', sold_out: 'Otsas' } as const;
export const shopPlatformSchema = z.enum(['shopify', 'woocommerce', 'wix']);
export const productAvailabilitySchema = z.enum(['in_stock', 'on_order', 'sold_out']);
export const productPriceSchema = z.number().int().min(0).max(100_000_000).nullable();
export const localProductPhoto = /^\/api\/media\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function publicHttpsUrl(value: string) {
 try {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
   !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/i.test(url.hostname) ||
   /\.(?:local|localhost|internal|lan|home|test|invalid)$/i.test(url.hostname)) return '';
  return url.href.length <= 2048 ? url.href : '';
 } catch {
  return '';
 }
}
const productLinkSchema = z.string().trim().max(2048).refine(value => value === '' || Boolean(publicHttpsUrl(value)));
export const productContentSchema = z.object({
 title: z.string().trim().max(120),
 category: z.enum(productCategories),
 description: z.string().trim().max(2000),
 photos: z.array(z.string().max(2048).refine(value => localProductPhoto.test(value) || Boolean(publicHttpsUrl(value)))).max(5),
 priceCents: productPriceSchema,
 availability: productAvailabilitySchema,
 shopUrl: productLinkSchema,
 variants: z.array(z.object({
  id: z.string().uuid(), name: z.string().trim().max(60), priceCents: productPriceSchema, availability: productAvailabilitySchema,
 }).strict()).max(10),
}).strict().refine(product => new Set(product.variants.map(item => item.id)).size === product.variants.length);
export type ProductContent = z.infer<typeof productContentSchema>;
export type ProductAvailability = z.infer<typeof productAvailabilitySchema>;
export type ShopPlatform = z.infer<typeof shopPlatformSchema>;

export const wixCredentialsSchema = z.object({
 siteId: z.string().trim().uuid(),
 apiKey: z.string().trim().min(16).max(4096).regex(/^[!-~]+$/),
}).strict();
export type WixCredentials = z.infer<typeof wixCredentialsSchema>;
export const shopConnectionSchema = z.object({
 platform: shopPlatformSchema,
 url: z.string().trim().min(1).max(500),
 wix: wixCredentialsSchema.optional(),
}).strict().refine(input => input.platform === 'wix' || input.wix === undefined);
export type ShopConnectionInput = z.infer<typeof shopConnectionSchema>;
export type ProductShop = Pick<ShopConnectionInput, 'platform' | 'url'> & { id: string };
export type StoreProduct = {
 sourceId: string; title: string; description: string; photos: string[]; url: string;
 priceCents: number | null; fromPrice: boolean; availability: ProductAvailability;
};
export type StoreProductPage = { items: StoreProduct[]; next: string | null };
export type SyncedProduct = Pick<StoreProduct, 'url' | 'priceCents' | 'fromPrice' | 'availability'>;
export const productSaveSchema = z.object({
 action: z.enum(['draft', 'publish', 'submit', 'hide', 'show']), id: z.string().uuid(),
 version: z.number().int().min(0).nullable(), content: productContentSchema.optional(),
}).strict();
export const productActionSchema = z.union([
 productSaveSchema,
 z.object({ action: z.literal('catalog'), connection: shopConnectionSchema, cursor: z.string().max(2048).nullable() }).strict(),
 z.object({ action: z.literal('import'), publish: z.boolean().optional(), shopId: z.string().uuid(), cursor: z.string().max(2048).nullable(), sourceIds: z.array(z.string().min(1).max(100)).min(1).max(20) }).strict(),
 z.object({ action: z.literal('publish-imported'), ids: z.array(z.string().uuid()).min(1).max(100) }).strict(),
 z.object({ action: z.literal('help'), id: z.string().uuid(), shopUrl: productLinkSchema.refine(Boolean), email: z.string().trim().email().max(254), message: z.string().trim().min(5).max(1000) }).strict(),
]);
export type ProductSave = z.infer<typeof productSaveSchema>;
export type ProductHelpInput = Extract<z.infer<typeof productActionSchema>, { action: 'help' }>;
export type CompanyProduct = {
 id: string; version: number; content: ProductContent; published: ProductContent | null;
 status: 'draft' | 'pending' | 'approved' | 'rejected'; note: string; visible: boolean;
 shopId: string | null; sourceId: string | null;
};
export type PublicProduct = {
 id: string; content: ProductContent; linked: boolean; fromPrice: boolean;
 availability: ProductAvailability | null;
 company: { name: string; brandName: string; slug: string; email: string };
};
export type ProductHelp = { id: string; companyName: string; shopUrl: string; email: string; message: string; createdAt: string };
