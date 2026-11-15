export const customerInboxPath = '/minu-paringud';

export function inquiryEmailHref(email: string | undefined, title: string, option?: string) {
 const address = email?.trim();
 if (!address || !/^[^@,;\s]+@[^@,;\s]+$/.test(address)) return undefined;
 const subject = encodeURIComponent(`Päring: ${title}`);
 const body = option ? '&body=' + encodeURIComponent(`${option}\r\n\r\n`) : '';
 return `mailto:${encodeURIComponent(address).replace('%40', '@')}?subject=${subject}${body}`;
}

export function startInquiryHref(source: 'product' | 'service', id: string, optionId?: string) {
 const query = new URLSearchParams({ source, id });
 if (optionId) query.set('option', optionId);
 return `${customerInboxPath}/uus?${query}`;
}
export function inboxHref(company?: string, id?: string, offset?: number) {
 const root = company ? '/portaal/paringud' : customerInboxPath;
 const query = new URLSearchParams();
 if (company) query.set('company', company);
 if (offset) query.set('offset', String(offset));
 return root + (id ? '/' + encodeURIComponent(id) : '') + (query.size ? '?' + query : '');
}
export function inboxOffset(raw: string | string[] | undefined) {
 const value = Number(raw);
 return Number.isSafeInteger(value) && value >= 0 && value <= 100000 ? value : 0;
}
