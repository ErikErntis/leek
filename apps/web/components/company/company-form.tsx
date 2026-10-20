'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Layers, LockKeyhole, Users } from 'lucide-react';
import { categories } from '@leek/contracts';
import { Dropdown } from '@leek/ui/dropdown';
import { formatAnnualPrice, type PricingPlan } from '../../lib/pricing';
import { emptyCompanyValues, employeeBands, stepFields, validateCompany, type CompanyErrors, type CompanyValues } from './validation';
import styles from './company.module.css';

const steps = ['Ettevõtte andmed', 'Asukoht ja kontaktid', 'Tutvustus'];

export function CompanyForm({ selectedPlan }: { selectedPlan?: PricingPlan }) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<CompanyValues>({ ...emptyCompanyValues, additionalCategories: [] });
  const [errors, setErrors] = useState<CompanyErrors>({});
  const [checked, setChecked] = useState(false);
  useEffect(() => setReady(true), []);

  function update<K extends keyof CompanyValues>(key: K, value: CompanyValues[K]) {
    const next = { ...values, [key]: value };
    if (key === 'category') next.additionalCategories = next.additionalCategories.filter(category => category !== value);
    setValues(next);
    setChecked(false);
    setErrors(previous => {
      if (!previous[key]) return previous;
      return { ...previous, [key]: validateCompany(next)[key] };
    });
  }

  function move(next: number) {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => heading.current?.focus());
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const all = validateCompany(values);
    const relevant = step === 2 ? Object.keys(all) as (keyof CompanyValues)[] : stepFields[step]!.filter(key => all[key]);
    const first = relevant[0];
    if (first) {
      const targetStep = stepFields.findIndex(fields => fields.includes(first));
      setStep(targetStep);
      setErrors(Object.fromEntries(stepFields[targetStep]!.filter(key => all[key]).map(key => [key, all[key]])));
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] button`)?.focus());
      return;
    }
    if (step < 2) move(step + 1);
    else setChecked(true); // UI preview only: no company is submitted or persisted.
  }

  function field(key: keyof CompanyValues, label: string, options: { type?: string; optional?: boolean; max?: number; placeholder?: string; autoComplete?: string; multiline?: boolean } = {}) {
    const props = {
      id: `${id}-${key}`, name: key, value: String(values[key]), required: !options.optional,
      maxLength: options.max ?? 100, placeholder: options.placeholder, autoComplete: options.autoComplete,
      'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${id}-${key}-error` : undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, event.target.value as never),
      onBlur: () => setErrors(previous => ({ ...previous, [key]: validateCompany(values)[key] })),
    };
    return <div className={styles.field} data-field={key} key={key}>
      <label htmlFor={props.id}>{label}{options.optional && <span>Valikuline</span>}</label>
      {options.multiline ? <textarea {...props} rows={6} /> : <input {...props} type={options.type ?? 'text'} inputMode={key === 'registrationCode' ? 'numeric' : undefined} />}
      {errors[key] && <p className={styles.error} id={`${id}-${key}-error`}>{errors[key]}</p>}
    </div>;
  }

  return <div className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.intro}><span className={styles.eyebrow}>LIITUMINE LEEKIGA</span><h1>Teeme sinu ettevõtte nähtavaks.</h1><p>Tutvusta oma tegemisi ja leia oma koht Loode-Eesti ettevõtjate seas.</p></header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <ol className={styles.steps} aria-label="Ettevõtte lisamise etapid">{steps.map((title, index) => <li key={title} aria-current={step === index ? 'step' : undefined} className={index < step ? styles.complete : ''}><span>{index < step ? <Check size={17} aria-hidden="true" /> : `0${index + 1}`}</span><div><small>SAMM {index + 1}</small><strong>{title}</strong></div></li>)}</ol>
          <div className={styles.note}><Building2 size={22} aria-hidden="true" /><strong>Kohalikud tegijad. Ühised võimalused.</strong><p>Ettevõtluskeskkond on mõeldud ainult Loode-Eestis tegutsevatele ettevõtetele.</p></div>
          <div className={styles.plan}><small>{selectedPlan ? 'VALITUD PAKETT' : 'ETTEVÕTTE PAKETT'}</small><strong>{selectedPlan ? selectedPlan.name : 'Paketi saad valida hiljem'}</strong>{selectedPlan && <p>{formatAnnualPrice(selectedPlan.annualPrice)} / aastas · esialgne hind</p>}<p>Paketti saad jooksvalt vahetada. Tasulise paketi eest tasumine toimub pärast ettevõtte konto kinnitamist.</p></div>
        </aside>
        <section className={styles.panel} aria-labelledby={`${id}-title`}>
          <div className={styles.preview}>Vormi eelvaade · andmeid ei saadeta ega salvestata.</div>
          <div className={styles.panelTitle}><span>0{step + 1} / 03</span><h2 ref={heading} tabIndex={-1} id={`${id}-title`}>{steps[step]}</h2><p>{['Alustame nimest ja sellest, millega teie ettevõte tegeleb.', 'Aita klientidel teid leida ja meil teiega ühendust võtta.', 'Räägi oma ettevõttest nii, nagu tutvustaksid seda uuele naabrile.'][step]}</p></div>
          <form ref={form} method="post" noValidate onSubmit={submit}>
            {selectedPlan && <input type="hidden" name="pakett" value={selectedPlan.id} />}
            {Object.values(errors).some(Boolean) && <p className={styles.errorSummary} role="alert">Palun kontrolli märgitud välju.</p>}
            {step === 0 && <div className={styles.stack}>
              <div className={styles.grid}>{field('name', 'Ettevõtte nimi', { max: 200, placeholder: 'Ettevõtte ametlik nimi', autoComplete: 'organization' })}{field('registrationCode', 'Registrikood', { max: 8, placeholder: '8 numbrit' })}</div>
              <div data-field="category"><Dropdown id={`${id}-category`} label="Põhikategooria" title={values.category || 'Vali tegevusala'} icon={<Layers size={19} />} selectedId={values.category} items={categories.map(category => ({ id: category, title: category, action: () => update('category', category) }))} />{errors.category && <p className={styles.error} role="alert">{errors.category}</p>}</div>
              <fieldset className={styles.categories}><legend>Lisakategooriad <span>Valikuline</span></legend><p>Kui tegutsete mitmes valdkonnas, märgi ka need.</p><div>{categories.filter(category => category !== values.category).map(category => <label key={category}><input type="checkbox" checked={values.additionalCategories.includes(category)} onChange={event => update('additionalCategories', event.target.checked ? [...values.additionalCategories, category] : values.additionalCategories.filter(value => value !== category))} /><span>{category}</span></label>)}</div></fieldset>
            </div>}
            {step === 1 && <div className={styles.stack}>
              <div className={styles.sectionLabel}>ETTEVÕTTE ASUKOHT</div>
              <div className={styles.grid}>{field('municipality', 'Omavalitsus', { placeholder: 'Näiteks Harku vald' })}{field('settlement', 'Linn, alevik või küla', { placeholder: 'Näiteks Tabasalu', autoComplete: 'address-level2' })}</div>
              {field('address', 'Tänav ja maja', { optional: true, max: 200, autoComplete: 'street-address' })}
              <p className={styles.hint}>Omavalitsus ja asula kuvatakse ettevõtte profiilil. Täpse aadressi lisamine on valikuline.</p>
              <div className={styles.sectionLabel}>AVALIKUD KONTAKTID</div>
              <div className={styles.grid}>{field('email', 'Ettevõtte e-post', { type: 'email', max: 254, placeholder: 'info@ettevote.ee' })}{field('phone', 'Ettevõtte telefon', { type: 'tel', optional: true, max: 30, placeholder: '+372 …' })}</div>
              {field('website', 'Koduleht', { type: 'url', optional: true, max: 500, placeholder: 'https://ettevote.ee' })}
              <div className={styles.privateNote}><LockKeyhole size={18} aria-hidden="true" /><div><strong>Kontaktisik LEEKiga suhtlemiseks</strong><p>Need andmed on mõeldud haldurile. Neid ei kuvata avalikul ettevõtte profiilil.</p></div></div>
              <div className={styles.grid}>{field('contactName', 'Kontaktisiku nimi', { autoComplete: 'name' })}{field('contactRole', 'Amet või roll', { optional: true, placeholder: 'Näiteks juhatuse liige' })}{field('contactEmail', 'Kontaktisiku e-post', { type: 'email', max: 254, autoComplete: 'email' })}{field('contactPhone', 'Kontaktisiku telefon', { type: 'tel', optional: true, max: 30, autoComplete: 'tel' })}</div>
            </div>}
            {step === 2 && <div className={styles.stack}>
              <div data-field="employees"><Dropdown id={`${id}-employees`} label="Töötajate arv" title={values.employees || 'Vali ettevõtte suurus'} icon={<Users size={19} />} selectedId={values.employees} items={employeeBands.map(band => ({ id: band, title: band, action: () => update('employees', band) }))} />{errors.employees && <p className={styles.error} role="alert">{errors.employees}</p>}</div>
              {field('tagline', 'Lühitutvustus', { max: 160, placeholder: 'Ühe lausega: mida teete ja kellele?' })}<p className={styles.hint}>{values.tagline.length} / 160 · kuvatakse ettevõtte kaardil.</p>
              {field('description', 'Ettevõtte kirjeldus', { max: 3000, multiline: true, placeholder: 'Millega tegelete? Mis teeb teie ettevõtte eriliseks? Millist abi või koostööd pakute?' })}<p className={styles.hint}>{values.description.length} / 3000</p>
              <div data-field="regionConfirmed"><label className={styles.confirm}><input type="checkbox" checked={values.regionConfirmed} onChange={event => update('regionConfirmed', event.target.checked)} aria-invalid={Boolean(errors.regionConfirmed)} aria-describedby={errors.regionConfirmed ? `${id}-region-error` : undefined} /><span>Kinnitan, et ettevõte tegutseb Loode-Eestis.</span></label>{errors.regionConfirmed && <p id={`${id}-region-error`} className={styles.error}>{errors.regionConfirmed}</p>}</div>
              <div className={styles.nextNote}><strong>Mis saab edasi?</strong><p>Pärast esitamist vaatab LEEKi haldur ettevõtte andmed üle. Tasulise paketi eest saad tasuda pärast ettevõtte konto kinnitamist.</p></div>
            </div>}
            <div className={styles.actions}>{step > 0 ? <button type="button" onClick={() => move(step - 1)} className={styles.back}><ArrowLeft size={17} />Tagasi</button> : <span /> }<button type="submit" disabled={!ready} className={styles.submit}>{step === 2 ? 'Esita ettevõte kinnitamiseks' : 'Jätka'}<ArrowRight size={17} aria-hidden="true" /></button></div>
            {checked && <div className={styles.result} role="status"><CheckCircle2 size={22} aria-hidden="true" /><p><strong>Vormi kontroll läbitud.</strong> Eelvaates ettevõtet kinnitamiseks ei saadeta. Andmete salvestamise ühendame järgmises etapis.</p></div>}
          </form>
        </section>
      </div>
    </div>
  </div>;
}
