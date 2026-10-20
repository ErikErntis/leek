import { categories } from '@leek/contracts';

export const employeeBands = ['1', '2–9', '10–49', '50–249', '250 või rohkem'] as const;
export const emptyCompanyValues = {
  name: '', registrationCode: '', category: '', additionalCategories: [] as string[],
  municipality: '', settlement: '', address: '', email: '', phone: '', website: '',
  contactName: '', contactRole: '', contactEmail: '', contactPhone: '',
  employees: '', tagline: '', description: '', regionConfirmed: false,
};
export type CompanyValues = typeof emptyCompanyValues;
export type CompanyErrors = Partial<Record<keyof CompanyValues, string>>;
export const stepFields: (keyof CompanyValues)[][] = [
  ['name', 'registrationCode', 'category', 'additionalCategories'],
  ['municipality', 'settlement', 'address', 'email', 'phone', 'website', 'contactName', 'contactRole', 'contactEmail', 'contactPhone'],
  ['employees', 'tagline', 'description', 'regionConfirmed'],
];

export function validateCompany(values: CompanyValues): CompanyErrors {
  const errors: CompanyErrors = {};
  function text(field: keyof CompanyValues, min: number, max: number, message: string) {
    const value = String(values[field]).trim();
    if (value.length < min || value.length > max) errors[field] = message;
  }
  text('name', 2, 200, 'Sisesta ettevõtte nimi (2–200 märki).');
  if (!/^\d{8}$/.test(values.registrationCode.trim())) errors.registrationCode = 'Registrikood peab koosnema 8 numbrist.';
  if (!(categories as readonly string[]).includes(values.category)) errors.category = 'Vali põhikategooria.';
  if (values.additionalCategories.some(value => !(categories as readonly string[]).includes(value) || value === values.category)) errors.additionalCategories = 'Kontrolli lisakategooriaid.';
  text('municipality', 2, 100, 'Sisesta omavalitsus.');
  text('settlement', 2, 100, 'Sisesta linn, alevik või küla.');
  text('address', 0, 200, 'Aadress võib olla kuni 200 märki.');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const field of ['email', 'contactEmail'] as const) {
    if (values[field].trim().length > 254 || !emailPattern.test(values[field].trim())) errors[field] = 'Sisesta korrektne e-posti aadress.';
  }
  for (const field of ['phone', 'contactPhone'] as const) {
    const value = values[field].trim();
    if (value && (!/^[+\d\s()-]+$/.test(value) || value.replace(/\D/g, '').length < 5 || value.length > 30)) errors[field] = 'Kontrolli telefoninumbrit.';
  }
  if (values.website.trim()) {
    try {
      const url = new URL(values.website.trim());
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password || values.website.length > 500) throw new Error();
    } catch { errors.website = 'Sisesta täielik veebiaadress, nt https://ettevote.ee.'; }
  }
  text('contactName', 2, 100, 'Sisesta kontaktisiku nimi.');
  text('contactRole', 0, 100, 'Roll võib olla kuni 100 märki.');
  if (!(employeeBands as readonly string[]).includes(values.employees)) errors.employees = 'Vali töötajate arv.';
  text('tagline', 10, 160, 'Lisa lühitutvustus (10–160 märki).');
  text('description', 30, 3000, 'Lisa ettevõtte kirjeldus (30–3000 märki).');
  if (!values.regionConfirmed) errors.regionConfirmed = 'Kinnita, et ettevõte tegutseb Loode-Eestis.';
  return errors;
}
