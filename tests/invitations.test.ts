import "@angular/compiler";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  invitationEmail,
  invitationRedirect,
  pendingInvitation,
  invitationEmailError,
  sendInvitationEmail,
  PENDING_INVITATION_KEY,
} from "../src/app/core/invitations";
import { Store } from "../src/app/core/store";
Object.defineProperty(globalThis, "window", {
  value: { addEventListener: () => undefined },
  configurable: true,
});
const cache = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (k: string) => cache.get(k) ?? null,
    setItem: (k: string, v: string) => cache.set(k, v),
    removeItem: (k: string) => cache.delete(k),
  },
  configurable: true,
});
const token = "a".repeat(64);
test("invitation destination is normalized and links stay on the app origin", () => {
  assert.equal(
    invitationEmail("  Moitie@Example.test "),
    "moitie@example.test",
  );
  assert.throws(() => invitationEmail("bad email"));
  assert.equal(
    invitationRedirect("https://mariage.example/untrusted-path", token),
    "https://mariage.example/rejoindre?invitation=" + token,
  );
  assert.ok(
    invitationRedirect("http://127.0.0.1:4200", token).startsWith(
      "http://127.0.0.1:4200/rejoindre",
    ),
  );
  assert.throws(() => invitationRedirect("http://public.example", token));
  assert.throws(() => invitationRedirect("https://mariage.example", "invalid"));
});
test("email invitation calls native Supabase Auth with its specific wedding token", async () => {
  let request: unknown;
  const client = {
    auth: {
      signInWithOtp: async (input: unknown) => {
        request = input;
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  await sendInvitationEmail(
    client,
    " Moitie@Example.test ",
    "https://mariage.example",
    token,
  );
  assert.deepEqual(request, {
    email: "moitie@example.test",
    options: {
      shouldCreateUser: true,
      emailRedirectTo: "https://mariage.example/rejoindre?invitation=" + token,
    },
  });
});
test("SMTP and rate failures remain failures, with a manual invitation fallback", async () => {
  const error = { code: "email_address_not_authorized", status: 403 };
  const client = {
    auth: { signInWithOtp: async () => ({ error }) },
  } as unknown as SupabaseClient;
  await assert.rejects(
    sendInvitationEmail(
      client,
      "moitie@example.test",
      "https://mariage.example",
      token,
    ),
    (e) => e === error,
  );
  assert.match(invitationEmailError(error), /SMTP/);
  assert.match(invitationEmailError({ status: 429 }), /limite/);
  assert.match(
    invitationEmailError(new Error("Secret provider response")),
    /code privé/,
  );
  assert.ok(
    !invitationEmailError(new Error("Secret provider response")).includes(
      "Secret provider response",
    ),
  );
});
test("email-link acceptance uses existing secured RPC and clears token only on success", async () => {
  cache.clear();
  const s = new Store();
  s.invitationToken.set(token);
  cache.set(PENDING_INVITATION_KEY, token);
  let payload: unknown;
  let call = "";
  s.client = {
    rpc: async (name: string, args: unknown) => {
      call = name;
      payload = args;
      return { error: null };
    },
  } as unknown as SupabaseClient;
  s.loadWedding = async () => undefined;
  await s.acceptEmailInvitation();
  assert.equal(call, "accept_invitation");
  assert.deepEqual(payload, { token });
  assert.equal(s.invitationToken(), "");
  assert.equal(cache.has(PENDING_INVITATION_KEY), false);
  s.invitationToken.set(token);
  s.client = {
    rpc: async () => ({ error: new Error("Invitation expirée") }),
  } as unknown as SupabaseClient;
  await assert.rejects(s.acceptEmailInvitation(), /expirée/);
  assert.equal(s.invitationToken(), token);
});
test("malformed URL tokens are ignored and missing tokens do not invoke membership RPC", async () => {
  assert.equal(pendingInvitation("?invitation=" + token), token);
  assert.equal(pendingInvitation("?invitation=<script>"), "");
  const s = new Store();
  let called = false;
  s.client = {
    rpc: async () => {
      called = true;
      return { error: null };
    },
  } as unknown as SupabaseClient;
  await assert.rejects(s.acceptEmailInvitation(), /Rouvrez le lien/);
  assert.equal(called, false);
});
