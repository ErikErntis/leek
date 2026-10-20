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

/** UI feedback only. The API must validate independently when connected. */
export function validateAuth(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};
  if (mode === 'register') {
    const name = values.name.trim();
    if (name.length < 2) errors.name = 'Sisesta oma nimi (vähemalt 2 märki).';
    else if (name.length > 100) errors.name = 'Nimi võib olla kuni 100 märki pikk.';
  }

  const email = values.email.trim();
  if (!email) errors.email = 'Sisesta oma e-posti aadress.';
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Kontrolli e-posti aadressi, näiteks nimi@ettevote.ee.';
  }

  // Passwords are never trimmed or otherwise transformed.
  if (!values.password) errors.password = 'Sisesta parool.';
  else if (mode === 'register' && values.password.length < 8) {
    errors.password = 'Parool peab olema vähemalt 8 märki pikk.';
  } else if (values.password.length > 128) {
    errors.password = 'Parool võib olla kuni 128 märki pikk.';
  }

  if (mode === 'register') {
    if (!values.passwordConfirm) errors.passwordConfirm = 'Korda oma parooli.';
    else if (values.passwordConfirm !== values.password) {
      errors.passwordConfirm = 'Paroolid ei ühti.';
    }
  }
  return errors;
}
