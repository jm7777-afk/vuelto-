/**
 * Cálculo y normalización de EAN-13 válido (Módulo 10 GS1)
 */
export const ensureValidEan13 = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 12);
  const padded = digits.padEnd(12, '0');
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(padded[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return padded + check;
};
