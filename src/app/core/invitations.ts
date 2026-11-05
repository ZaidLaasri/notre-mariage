import type { SupabaseClient } from "@supabase/supabase-js";
export function invitationEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new Error("Saisissez une adresse email valide.");
  return email;
}
export const PENDING_INVITATION_KEY = "notre-mariage.pending-invitation";
export function invitationRedirect(origin: string, token: string): string {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
  )
    throw new Error("Une URL HTTPS est nécessaire pour envoyer l’invitation.");
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new Error("Code d’invitation invalide.");
  return url.origin + "/rejoindre?invitation=" + token;
}
export function pendingInvitation(search: string): string {
  const token = new URLSearchParams(search).get("invitation") ?? "";
  return /^[a-f0-9]{64}$/.test(token) ? token : "";
}
export function invitationEmailError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  const status =
    error && typeof error === "object" && "status" in error
      ? Number(error.status)
      : 0;
  if (code === "email_address_not_authorized")
    return "L’invitation est créée, mais Supabase refuse cet email. Configurez un SMTP dans Supabase Auth ou transmettez le code privé.";
  if (
    status === 429 ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  )
    return "L’invitation est créée. La limite d’envoi d’emails est atteinte : patientez avant de renvoyer, ou transmettez le code privé.";
  return "L’invitation est créée, mais l’envoi de l’email a échoué. Vérifiez la configuration email de Supabase ou utilisez le code privé.";
}
export async function sendInvitationEmail(
  client: SupabaseClient,
  email: string,
  origin: string,
  token: string,
): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    email: invitationEmail(email),
    options: {
      shouldCreateUser: true,
      emailRedirectTo: invitationRedirect(origin, token),
    },
  });
  if (error) throw error;
}
