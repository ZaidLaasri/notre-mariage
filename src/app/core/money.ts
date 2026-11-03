import { Currency, Expense, Payment } from "./models";
export function minor(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized))
    throw new Error("Montant invalide : deux décimales maximum.");
  const [whole, decimal = ""] = normalized.split(".");
  const result = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result > 900000000000)
    throw new Error("Montant trop élevé.");
  return result;
}
export function convert(
  value: number,
  currency: Currency,
  numerator: number,
  denominator: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    numerator <= 0 ||
    denominator <= 0
  )
    throw new Error("Montant ou taux invalide.");
  if (currency === "MAD") return value;
  const n = BigInt(value) * BigInt(numerator),
    d = BigInt(denominator);
  const result = Number((n + d / 2n) / d);
  if (!Number.isSafeInteger(result))
    throw new Error("Dépassement de précision.");
  return result;
}
export function balance(expense: Expense, payments: Payment[]): number {
  return (
    expense.amount_minor -
    payments
      .filter((p) => p.expense_id === expense.id)
      .reduce((sum, p) => sum + p.amount_minor, 0)
  );
}
export function checkPayment(
  expense: Expense,
  payments: Payment[],
  amount: number,
): void {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > balance(expense, payments)
  )
    throw new Error(
      "Le paiement doit être positif et ne pas dépasser le solde.",
    );
}
export const money = (value: number, currency: Currency = "MAD"): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value / 100);
