'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { emptyAuthValues, validateAuth, type AuthErrors, type AuthMode, type AuthValues } from './validation';
import styles from './auth.module.css';
import type { Plan } from '@leek/contracts';

type PasswordFieldProps = {
  id: string;
  name: 'password' | 'passwordConfirm';
  title: string;
  value: string;
  error?: string;
  hint?: string;
  autoComplete: 'current-password' | 'new-password';
  onChange: (value: string) => void;
  onBlur: () => void;
};

function PasswordField({ id, name, title, value, error, hint, autoComplete, onChange, onBlur }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const descriptions = [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ');
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{title}</label>
      <div className={`${styles.passwordBox} ${error ? styles.invalidBox : ''}`}>
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          className={styles.passwordInput}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={128}
          aria-invalid={Boolean(error)}
          aria-describedby={descriptions || undefined}
          value={value}
          onChange={event => onChange(event.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          className={styles.eyeButton}
          aria-label={visible ? `Peida: ${title.toLocaleLowerCase('et')}` : `Näita: ${title.toLocaleLowerCase('et')}`}
          aria-pressed={visible}
          aria-controls={id}
          onClick={() => setVisible(previous => !previous)}
        >
          {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
      </div>
      {error && <p id={`${id}-error`} className={styles.error}>{error}</p>}
      {hint && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
    </div>
  );
}

export function AuthForm({ mode, selectedPlanId }: { mode: AuthMode; selectedPlanId?: Plan }) {
  const register = mode === 'register';
  const otherRoute = register ? '/logi-sisse' : '/registreeru';
  const switchHref = selectedPlanId ? `${otherRoute}?pakett=${encodeURIComponent(selectedPlanId)}` : otherRoute;
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [ready, setReady] = useState(false);
  const [values, setValues] = useState<AuthValues>({ ...emptyAuthValues });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof AuthValues, boolean>>>({});
  const [status, setStatus] = useState<'idle' | 'invalid' | 'submitting' | 'error'>('idle');
  const submitting = useRef(false);
  const [serverError, setServerError] = useState('');
  useEffect(() => { setReady(true); }, []);

  function update(name: keyof AuthValues, value: string) {
    const next = { ...values, [name]: value };
    setValues(next);
    setStatus('idle');
    if (touched[name] || (name === 'password' && touched.passwordConfirm)) {
      const checked = validateAuth(mode, next);
      setErrors(previous => ({
        ...previous,
        ...(touched[name] ? { [name]: checked[name] } : {}),
        ...(name === 'password' && touched.passwordConfirm ? { passwordConfirm: checked.passwordConfirm } : {}),
      }));
    }
  }

  function blur(name: keyof AuthValues) {
    setTouched(previous => ({ ...previous, [name]: true }));
    const checked = validateAuth(mode, values);
    setErrors(previous => ({ ...previous, [name]: checked[name] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const checked = validateAuth(mode, values);
    setErrors(checked);
    setTouched(register
      ? { name: true, email: true, password: true, passwordConfirm: true }
      : { email: true, password: true });
    const first = Object.keys(checked)[0];
    if (first) {
      setStatus('invalid');
      requestAnimationFrame(() => {
        const field = formRef.current?.elements.namedItem(first);
        if (field instanceof HTMLInputElement) field.focus();
      });
      return;
    }
    submitting.current = true;
    setStatus('submitting');
    setServerError('');
    try {
      const response = await fetch(`/api/auth/${register ? 'sign-up' : 'sign-in'}/email`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(register ? { name: values.name.trim() } : {}), email: values.email.trim(), password: values.password }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error('Liiga palju katseid. Palun oota veidi ja proovi uuesti.');
        if (response.status >= 500) throw new Error('Sisselogimise teenus pole praegu kättesaadav. Proovi veidi aja pärast uuesti.');
        throw new Error(register ? 'Kontot ei saanud luua. Kontrolli andmeid või proovi olemasoleva kontoga sisse logida.' : 'E-post või parool ei ole õige.');
      }
      // A full navigation lets the server read the HttpOnly session cookie immediately.
      window.location.assign(selectedPlanId ? `/ettevote/lisa?pakett=${encodeURIComponent(selectedPlanId)}` : '/ettevote/lisa');
    } catch (error) {
      setServerError(error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError' ? error.message : 'Ühendus ebaõnnestus. Palun proovi uuesti.');
      setStatus('error');
    } finally { submitting.current = false; }
  }

  const emailId = `${formId}-email`;
  const nameId = `${formId}-name`;

  return (
    <form ref={formRef} id="auth-form" className={styles.form} method="post" noValidate onSubmit={submit} aria-busy={status === 'submitting'}>
      {selectedPlanId && <input type="hidden" name="pakett" value={selectedPlanId} />}
      {status === 'invalid' && <p role="alert" className={styles.errorSummary}>Palun kontrolli märgitud välju.</p>}
      {register && (
        <div className={styles.field}>
          <label htmlFor={nameId}>Sinu nimi</label>
          <input
            id={nameId}
            name="name"
            type="text"
            className={`${styles.input} ${errors.name ? styles.invalidInput : ''}`}
            placeholder="Ees- ja perekonnanimi"
            autoComplete="name"
            required
            maxLength={100}
            value={values.name}
            onChange={event => update('name', event.target.value)}
            onBlur={() => blur('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
          />
          {errors.name && <p id={`${nameId}-error`} className={styles.error}>{errors.name}</p>}
        </div>
      )}
      <div className={styles.field}>
        <label htmlFor={emailId}>E-posti aadress</label>
        <input
          id={emailId}
          name="email"
          type="email"
          inputMode="email"
          className={`${styles.input} ${errors.email ? styles.invalidInput : ''}`}
          placeholder="nimi@ettevote.ee"
          autoComplete={register ? 'email' : 'username'}
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          value={values.email}
          onChange={event => update('email', event.target.value)}
          onBlur={() => blur('email')}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
        />
        {errors.email && <p id={`${emailId}-error`} className={styles.error}>{errors.email}</p>}
      </div>
      <PasswordField
        id={`${formId}-password`}
        name="password"
        title="Parool"
        value={values.password}
        error={errors.password}
        hint={register ? 'Vähemalt 8 märki.' : undefined}
        autoComplete={register ? 'new-password' : 'current-password'}
        onChange={value => update('password', value)}
        onBlur={() => blur('password')}
      />
      {register && <PasswordField
        id={`${formId}-password-confirm`}
        name="passwordConfirm"
        title="Korda parooli"
        value={values.passwordConfirm}
        error={errors.passwordConfirm}
        autoComplete="new-password"
        onChange={value => update('passwordConfirm', value)}
        onBlur={() => blur('passwordConfirm')}
      />}
      <button className={styles.submit} type="submit" disabled={!ready || status === 'submitting'}>
        {status === 'submitting' ? 'Palun oota…' : register ? 'Loo konto' : 'Logi sisse'} <ArrowRight size={18} aria-hidden="true" />
      </button>
      {status === 'error' && <p role="alert" className={styles.errorSummary}>{serverError}</p>}
      <p className={styles.switchLink}>
        {register ? 'Konto on juba olemas?' : 'Pole veel kontot?'}{' '}
        <a href={switchHref}>{register ? 'Logi sisse' : 'Loo konto'}</a>
      </p>
    </form>
  );
}
