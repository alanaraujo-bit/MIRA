export function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
  return email;
}

export function validatePassword(value: string): string {
  if (value.length < 10) throw new Error("Use uma senha com pelo menos 10 caracteres.");
  if (value.length > 128) throw new Error("A senha deve ter no máximo 128 caracteres.");
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) throw new Error("Inclua ao menos uma letra e um número na senha.");
  return value;
}
