export type AuthMode = 'login' | 'register';

export type AuthValues = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

export type AuthErrors = Partial<Record<keyof AuthValues, string>>;

export const emptyAuthValues: AuthValues = {
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
};

export function validateAuth(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};
  const email = values.email.trim();
  const name = values.name.trim();

  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = 'Sisesta kehtiv e-posti aadress.';
  }

  if (mode === 'register') {
    if (name.length < 2 || name.length > 100) errors.name = 'Sisesta nimi pikkusega 2–100 märki.';
    if (values.password.length < 8) errors.password = 'Parool peab olema vähemalt 8 märki pikk.';
    if (values.password !== values.passwordConfirm) errors.passwordConfirm = 'Paroolid ei ühti.';
  }

  if (!values.password) errors.password = 'Sisesta parool.';
  if (values.password.length > 128) errors.password = 'Parool võib olla kuni 128 märki pikk.';

  return errors;
}
