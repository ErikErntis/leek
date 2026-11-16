import 'server-only';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { CompanyProduct, ProductCatalogCompany, ProductShop, PublicProduct } from '@leek/contracts';
import { apiURL } from './portal';

export async function getOwnProducts(companyId: string): Promise<{ items: CompanyProduct[]; shops: ProductShop[] }> {
 const response = await fetch(apiURL(`/v1/my/companies/${companyId}/products`), {
  headers: { cookie: (await cookies()).toString() }, cache: 'no-store', signal: AbortSignal.timeout(10000),
 });
 if (response.status === 404 || response.status === 403) notFound();
 if (!response.ok) throw new Error('Tooteid ei saanud laadida.');
 return response.json();
}
export async function getPublicProducts(query = '', company = '', offset = 0, filters?: URLSearchParams): Promise<{ items: PublicProduct[]; hasMore: boolean; companies?: ProductCatalogCompany[] }> {
 if (process.env.DEMO_MODE === 'true') return { items: [], hasMore: false };
 const params = new URLSearchParams(filters);
 params.set('q', query);
 params.set('company', company);
 params.set('offset', String(offset));
 if (filters) params.set('includeCompanies', '1');
 const response = await fetch(apiURL(`/v1/products?${params}`), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
 if (!response.ok) throw new Error('Tooteid ei saanud laadida.');
 return response.json();
}
export async function getPublicProduct(id: string): Promise<PublicProduct> {
 if (process.env.DEMO_MODE === 'true' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
 const response = await fetch(apiURL(`/v1/products/${id}`), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
 if (response.status === 404) notFound();
 if (!response.ok) throw new Error('Toodet ei saanud laadida.');
 return response.json();
}
