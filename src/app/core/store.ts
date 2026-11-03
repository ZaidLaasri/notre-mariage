import { Injectable, signal, computed } from "@angular/core";
import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";
import {
  Data,
  emptyData,
  Table,
  Tables,
  Wedding,
  TABLES,
  TimelineEvent,
} from "./models";
import { SERVICE_TEMPLATES } from "./catalogue-templates";
import { validateInterval } from "./timeline";
import { demoData, DEMO_WEDDING } from "./demo";
import { convert, money } from "./money";
const DEMO_KEY = "notre-mariage-demo-v1";
@Injectable({ providedIn: "root" })
export class Store {
  readonly data = signal<Data>(emptyData());
  readonly wedding = signal<Wedding | null>(null);
  readonly session = signal<Session | null>(null);
  readonly demo = signal(false);
  readonly busy = signal(false);
  readonly ready = signal(false);
  readonly error = signal("");
  readonly notice = signal("");
  readonly configured = signal(false);
  readonly recovering = signal(false);
  client: SupabaseClient | null = null;
  readonly total = computed(() => {
    const w = this.wedding();
    const d = this.data();
    const cv = (n: number, c: "MAD" | "EUR") =>
      convert(n, c, w?.eur_mad_numerator ?? 108, w?.eur_mad_denominator ?? 10);
    return {
      engaged: d.expenses.reduce(
        (s, e) => s + cv(e.amount_minor, e.currency),
        0,
      ),
      paid: d.payments.reduce((s, p) => {
        const e = d.expenses.find((e) => e.id === p.expense_id);
        return s + (e ? cv(p.amount_minor, e.currency) : 0);
      }, 0),
    };
  });
  readonly userId = computed(() =>
    this.demo() ? "demo-me" : (this.session()?.user.id ?? ""),
  );
  readonly active = computed(() => this.demo() || !!this.session());
  readonly format = money;
  constructor() {
    window.addEventListener("focus", () => {
      if (this.session() && this.wedding() && !this.busy())
        void this.run(() => this.refresh());
    });
  }
  async init() {
    try {
      this.recovering.set(location.hash.includes("password-recovery"));
      const response = await fetch("/runtime-config.json");
      const c: unknown = await response.json();
      if (
        c &&
        typeof c === "object" &&
        "supabaseUrl" in c &&
        "supabaseKey" in c &&
        typeof c.supabaseUrl === "string" &&
        typeof c.supabaseKey === "string" &&
        c.supabaseUrl &&
        c.supabaseKey
      ) {
        this.client = createClient(c.supabaseUrl, c.supabaseKey);
        this.configured.set(true);
        this.client.auth.onAuthStateChange((event, session) => {
          this.session.set(session);
          if (event === "PASSWORD_RECOVERY") {
            this.recovering.set(true);
            location.hash = "password-recovery";
          }
          if (!session && !this.demo()) {
            this.wedding.set(null);
            this.data.set(emptyData());
          }
        });
        const { data, error } = await this.client.auth.getSession();
        if (error) throw error;
        this.session.set(data.session);
        if (data.session) await this.loadWedding();
      }
    } catch (e) {
      this.error.set(this.message(e));
    } finally {
      this.ready.set(true);
    }
  }
  message(e: unknown) {
    return e instanceof Error
      ? e.message
      : typeof e === "object" && e && "message" in e
        ? String(e.message)
        : "Une erreur est survenue.";
  }
  async run(action: () => Promise<unknown>, success = "") {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.notice.set("");
    try {
      await action();
      if (success) this.notice.set(success);
    } catch (e) {
      this.error.set(this.message(e));
    } finally {
      this.busy.set(false);
    }
  }
  async startDemo() {
    this.demo.set(true);
    this.wedding.set({ ...DEMO_WEDDING });
    this.data.set(demoData());
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          version: number;
          data: Data;
          wedding: Wedding;
        };
        if (
          saved.version === 1 &&
          Object.entries(saved.data).every(
            ([t, rows]) => TABLES.includes(t as Table) && Array.isArray(rows),
          )
        ) {
          this.data.set({ ...emptyData(), ...saved.data });
          this.wedding.set(saved.wedding);
        }
      }
    } catch {
      this.notice.set("La démo locale a été réinitialisée.");
    }
    for (const template of SERVICE_TEMPLATES) {
      const old = this.data().categories.find(
        (c) => c.kind === template.kind || c.name === template.name,
      );
      if (old) {
        if (!old.kind)
          await this.save("categories", {
            id: old.id,
            kind: template.kind,
            parent_name: template.parent_name,
          });
      } else await this.save("categories", { ...template });
    }
  }
  persist() {
    if (this.demo())
      localStorage.setItem(
        DEMO_KEY,
        JSON.stringify({
          version: 1,
          data: this.data(),
          wedding: this.wedding(),
        }),
      );
  }
  resetDemo() {
    if (!this.demo()) return;
    localStorage.removeItem(DEMO_KEY);
    this.data.set(demoData());
    this.wedding.set({ ...DEMO_WEDDING });
    this.persist();
  }
  async exit() {
    if (this.demo()) {
      this.demo.set(false);
      this.data.set(emptyData());
      this.wedding.set(null);
      if (this.session()) await this.loadWedding();
    } else {
      const { error } = await this.client!.auth.signOut();
      if (error) throw error;
      this.session.set(null);
      this.wedding.set(null);
      this.data.set(emptyData());
    }
  }
  async auth(email: string, password: string, signup = false) {
    if (!this.client)
      throw new Error("Configurez Supabase avant la connexion.");
    const result = signup
      ? await this.client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin + "/auth" },
        })
      : await this.client.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (!result.data.session) {
      this.notice.set("Confirmez votre adresse email avant de vous connecter.");
      return;
    }
    this.session.set(result.data.session);
    await this.loadWedding();
  }
  async resetPassword(email: string) {
    if (!this.client) throw new Error("Supabase non configuré.");
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + "/auth",
    });
    if (error) throw error;
    this.notice.set(
      "Si ce compte existe, un lien de réinitialisation a été demandé.",
    );
  }
  async updatePassword(password: string) {
    const { error } = await this.client!.auth.updateUser({ password });
    if (error) throw error;
    location.hash = "";
  }
  async loadWedding() {
    if (!this.client || !this.session()) return;
    const { data, error } = await this.client
      .from("wedding_members")
      .select("wedding_id")
      .eq("user_id", this.session()!.user.id)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const result = await this.client
        .from("weddings")
        .select("*")
        .eq("id", data.wedding_id)
        .single();
      if (result.error) throw result.error;
      this.wedding.set(result.data as Wedding);
      await this.refresh();
    }
  }
  async createWedding(name: string) {
    const { error } = await this.client!.rpc("create_wedding", { title: name });
    if (error) throw error;
    await this.loadWedding();
  }
  async accept(token: string) {
    const { error } = await this.client!.rpc("accept_invitation", {
      token: token.trim(),
    });
    if (error) throw error;
    await this.loadWedding();
  }
  async invite(email: string): Promise<string> {
    const { data, error } = await this.client!.rpc("invite_partner", {
      partner_email: email,
    });
    if (error) throw error;
    return String(data);
  }
  async refresh() {
    if (this.demo() || !this.wedding() || !this.client) return;
    const next = emptyData();
    await Promise.all(
      TABLES.map(async (t) => {
        let all: unknown[] = [];
        let offset = 0;
        while (true) {
          const { data, error } = await this.client!.from(t)
            .select("*")
            .eq("wedding_id", this.wedding()!.id)
            .order("id")
            .range(offset, offset + 499);
          if (error) throw error;
          all = all.concat(data);
          if (data.length < 500) break;
          offset += 500;
        }
        Object.assign(next, { [t]: all });
      }),
    );
    this.data.set(next);
  }
  async save<K extends Table>(
    table: K,
    row: Partial<Tables[K]> & { id?: string },
  ): Promise<Tables[K]> {
    if (!this.wedding()) throw new Error("Aucun mariage actif.");
    const existing = row.id
      ? this.data()[table].find((r) => r.id === row.id)
      : undefined;
    const record = {
      ...existing,
      ...row,
      id: row.id ?? crypto.randomUUID(),
      wedding_id: this.wedding()!.id,
      updated_at: new Date().toISOString(),
    } as Tables[K];
    if (!this.demo()) {
      const payload = { ...record };
      delete payload.created_at;
      delete payload.updated_at;
      let query = existing
        ? this.client!.from(table)
            .update(payload)
            .eq("id", record.id)
            .eq("wedding_id", record.wedding_id)
        : this.client!.from(table).insert(payload);
      if (existing?.updated_at)
        query = query.eq("updated_at", existing.updated_at);
      const { data, error } = await query.select().single();
      if (error)
        throw new Error(
          error.code === "PGRST116"
            ? "Cet élément a changé. Actualisez avant de réessayer."
            : error.message,
        );
      Object.assign(record, data);
    }
    this.data.update((d) => ({
      ...d,
      [table]: [...d[table].filter((r) => r.id !== record.id), record],
    }));
    this.persist();
    return record;
  }
  async remove<K extends Table>(table: K, id: string) {
    if (!this.demo()) {
      const { error } = await this.client!.from(table)
        .delete()
        .eq("id", id)
        .eq("wedding_id", this.wedding()!.id);
      if (error) throw error;
    }
    this.data.update((d) => ({
      ...d,
      [table]: d[table].filter((r) => r.id !== id),
    }));
    this.persist();
  }
  async saveWedding(patch: Partial<Wedding>) {
    const w = { ...this.wedding()!, ...patch };
    if (!this.demo()) {
      const { data, error } = await this.client!.from("weddings")
        .update(patch)
        .eq("id", w.id)
        .select()
        .single();
      if (error) throw error;
      Object.assign(w, data);
    }
    this.wedding.set(w);
    this.persist();
  }
  provider(id: string) {
    return this.data().providers.find((p) => p.id === id);
  }
  async engageTrousseau(id: string, ceremony_id: string): Promise<string> {
    const item = this.data().trousseau_items.find((i) => i.id === id);
    if (!item) throw new Error("Article introuvable.");
    if (item.expense_id) return item.expense_id;
    if (this.demo()) {
      const expense = await this.save("expenses", {
        ceremony_id,
        provider_id: item.provider_id,
        booking_id: null,
        name: "Trousseau · " + item.name,
        amount_minor: item.unit_minor * item.quantity,
        currency: item.currency,
        due_on: null,
      });
      await this.save("trousseau_items", { id, expense_id: expense.id });
      return expense.id;
    }
    const { data, error } = await this.client!.rpc("engage_trousseau", {
      item: id,
      ceremony: ceremony_id,
    });
    if (error) throw error;
    await this.refresh();
    return String(data);
  }
  async saveTimeline(
    event: Omit<TimelineEvent, "id" | "wedding_id"> & { id?: string },
    providerIds: string[],
  ) {
    validateInterval(event.start_minute, event.end_minute);
    if (this.demo()) {
      const row = await this.save("timeline_events", event);
      for (const p of this.data().timeline_event_providers.filter(
        (p) => p.event_id === row.id,
      ))
        await this.remove("timeline_event_providers", p.id);
      for (const provider_id of new Set(providerIds))
        await this.save("timeline_event_providers", {
          event_id: row.id,
          provider_id,
        });
    } else {
      const { error } = await this.client!.rpc("save_timeline_event", {
        event_data: event,
        provider_ids: providerIds,
      });
      if (error) throw error;
      await this.refresh();
    }
  }
  async reorderTimeline(ceremony: string, ids: string[]) {
    const rows = this.data().timeline_events.filter(
      (e) => e.ceremony_id === ceremony,
    );
    if (
      new Set(ids).size !== rows.length ||
      ids.length !== rows.length ||
      rows.some((e) => !ids.includes(e.id))
    )
      throw new Error("Ordre périmé. Actualisez.");
    if (this.demo()) {
      this.data.update((d) => ({
        ...d,
        timeline_events: d.timeline_events.map((e) =>
          e.ceremony_id === ceremony
            ? { ...e, position: ids.indexOf(e.id) }
            : e,
        ),
      }));
      this.persist();
    } else {
      const { error } = await this.client!.rpc("reorder_timeline", {
        ceremony,
        ordered_ids: ids,
      });
      if (error) throw error;
      await this.refresh();
    }
  }
  async reorderMoodboard(board: string | null, ids: string[]) {
    const rows = this.data().inspirations.filter(
      (i) => (i.moodboard_id ?? null) === board,
    );
    if (
      new Set(ids).size !== rows.length ||
      ids.length !== rows.length ||
      rows.some((i) => !ids.includes(i.id))
    )
      throw new Error("Ordre périmé. Actualisez.");
    if (this.demo()) {
      this.data.update((d) => ({
        ...d,
        inspirations: d.inspirations.map((i) =>
          (i.moodboard_id ?? null) === board
            ? { ...i, position: ids.indexOf(i.id) }
            : i,
        ),
      }));
      this.persist();
    } else {
      const { error } = await this.client!.rpc("reorder_moodboard", {
        board,
        ordered_ids: ids,
      });
      if (error) throw error;
      await this.refresh();
    }
  }
  async decide(offerId: string) {
    const offer = this.data().provider_offers.find((o) => o.id === offerId);
    if (!offer) throw new Error("Offre introuvable.");
    const req = this.requirement(offer.requirement_id)!;
    const undo = req.selected_offer_id === offerId;
    if (this.demo()) {
      for (const o of this.data().provider_offers.filter(
        (o) => o.requirement_id === req.id && o.status === "Sélectionné",
      ))
        await this.save("provider_offers", { id: o.id, status: "À comparer" });
      await this.save("service_requirements", {
        id: req.id,
        selected_offer_id: undo ? null : offerId,
      });
      if (!undo && offer.status !== "Réservé")
        await this.save("provider_offers", {
          id: offerId,
          status: "Sélectionné",
        });
    } else {
      const { error } = await this.client!.rpc("decide_offer", {
        offer: offerId,
        undo,
      });
      if (error) throw error;
      await this.refresh();
    }
  }
  async book(offerId: string) {
    if (this.demo()) {
      await this.save("bookings", {
        offer_id: offerId,
        booked_on: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      await this.save("provider_offers", { id: offerId, status: "Réservé" });
    } else {
      const { error } = await this.client!.rpc("book_offer", {
        offer: offerId,
      });
      if (error) throw error;
      await this.refresh();
    }
  }
  async cancelBooking(offerId: string) {
    const booking = this.data().bookings.find((b) => b.offer_id === offerId);
    if (!booking) return;
    if (this.demo()) {
      if (this.data().expenses.some((e) => e.booking_id === booking.id))
        throw new Error("Cette réservation est liée à une dépense.");
      await this.remove("bookings", booking.id);
      const offer = this.data().provider_offers.find((o) => o.id === offerId)!;
      await this.save("provider_offers", {
        id: offerId,
        status:
          this.requirement(offer.requirement_id)?.selected_offer_id === offerId
            ? "Sélectionné"
            : "À comparer",
      });
    } else {
      const { error } = await this.client!.rpc("cancel_booking", {
        booking: booking.id,
      });
      if (error) throw error;
      await this.refresh();
    }
  }
  requirement(id: string) {
    return this.data().service_requirements.find((r) => r.id === id);
  }
  ceremonyName(id: string | null) {
    return (
      this.data().ceremonies.find((c) => c.id === id)?.name ??
      "Toutes les cérémonies"
    );
  }
  categoryName(id: string) {
    return this.data().categories.find((c) => c.id === id)?.name ?? "Autre";
  }
  exportData() {
    this.download(
      JSON.stringify(
        {
          schemaVersion: 1,
          exportedAt: new Date().toISOString(),
          demo: this.demo(),
          wedding: this.wedding(),
          ...this.data(),
        },
        null,
        2,
      ),
      "notre-mariage.json",
      "application/json",
    );
  }
  download(content: BlobPart, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
