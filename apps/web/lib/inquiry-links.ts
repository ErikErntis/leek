export function startInquiryHref(source: 'product' | 'service', id: string, optionId?: string) {
 const query = new URLSearchParams({ source, id });
 if (optionId) query.set('option', optionId);
 return `/minu-paringud/uus?${query}`;
}
export function inboxHref(company?: string, id?: string, offset?: number) {
 const root = company ? '/portaal/paringud' : '/minu-paringud';
 const query = new URLSearchParams();
 if (company) query.set('company', company);
 if (offset) query.set('offset', String(offset));
 return root + (id ? '/' + encodeURIComponent(id) : '') + (query.size ? '?' + query : '');
}
export function inboxOffset(raw: string | string[] | undefined) {
 const value = Number(raw);
 return Number.isSafeInteger(value) && value >= 0 && value <= 100000 ? value : 0;
}
