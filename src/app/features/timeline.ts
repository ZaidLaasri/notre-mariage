import { Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "../core/store";
import { TimelineEvent, TIMELINE_STATUSES } from "../core/models";
import {
  formatTime,
  timeMinute,
  overlaps,
  publicProgram,
  reordered,
  validateInterval,
} from "../core/timeline";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./timeline.html",
})
export class Timeline {
  readonly s = inject(Store);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  readonly ceremony = signal(
    this.route.snapshot.queryParamMap.get("ceremony") ??
      this.s.data().ceremonies[0]?.id ??
      "",
  );
  readonly chronological = signal(false);
  readonly consultation = signal(false);
  readonly show = signal(false);
  readonly editing = signal("");
  readonly dragged = signal("");
  readonly removing = signal("");
  readonly statuses = TIMELINE_STATUSES;
  readonly time = formatTime;
  readonly manual = computed(() =>
    this.s
      .data()
      .timeline_events.filter((e) => e.ceremony_id === this.ceremony())
      .sort(
        (a, b) => a.position - b.position || a.start_minute - b.start_minute,
      ),
  );
  readonly events = computed(() =>
    this.chronological()
      ? [...this.manual()].sort(
          (a, b) => a.start_minute - b.start_minute || a.position - b.position,
        )
      : this.manual(),
  );
  readonly conflicts = computed(() => overlaps(this.manual()));
  readonly form = this.fb.nonNullable.group({
    title: ["", Validators.required],
    start: ["18:00", Validators.required],
    end: ["18:30", Validators.required],
    start_day: [0],
    end_day: [0],
    description: [""],
    public_note: [""],
    location: [""],
    responsible: ["Commun"],
    logistics: [""],
    status: ["Prévu"],
    offer_id: [""],
    provider_ids: this.fb.nonNullable.control<string[]>([]),
  });
  readonly offers = computed(() =>
    this.s
      .data()
      .provider_offers.filter(
        (o) =>
          this.s.requirement(o.requirement_id)?.ceremony_id === this.ceremony(),
      ),
  );
  readonly cars = computed(() =>
    this.offers().filter(
      (o) =>
        this.s
          .data()
          .categories.find(
            (c) => c.id === this.s.requirement(o.requirement_id)?.category_id,
          )?.kind === "vehicle" &&
        this.s.requirement(o.requirement_id)?.selected_offer_id === o.id,
    ),
  );
  constructor() {
    const offer = this.route.snapshot.queryParamMap.get("offer");
    if (offer) this.vehicle(offer);
  }
  choose(e: Event) {
    this.ceremony.set((e.target as HTMLSelectElement).value);
    this.show.set(false);
    this.editing.set("");
  }
  edit(event?: TimelineEvent) {
    this.editing.set(event?.id ?? "");
    this.form.reset({
      title: "",
      start: "18:00",
      end: "18:30",
      start_day: 0,
      end_day: 0,
      description: "",
      public_note: "",
      location: "",
      responsible: "Commun",
      logistics: "",
      status: "Prévu",
      offer_id: "",
      provider_ids: [],
    });
    if (event)
      this.form.patchValue({
        ...event,
        start: formatTime(event.start_minute).slice(0, 5),
        end: formatTime(event.end_minute).slice(0, 5),
        start_day: Math.floor(event.start_minute / 1440),
        end_day: Math.floor(event.end_minute / 1440),
        offer_id: event.offer_id ?? "",
        provider_ids: this.s
          .data()
          .timeline_event_providers.filter((p) => p.event_id === event.id)
          .map((p) => p.provider_id),
      });
    this.show.set(true);
  }
  vehicle(id: string) {
    const offer = this.s.data().provider_offers.find((o) => o.id === id);
    if (!offer) return;
    const req = this.s.requirement(offer.requirement_id);
    if (req) this.ceremony.set(req.ceremony_id);
    this.edit();
    this.form.patchValue({
      title: "Déplacement des mariés · " + offer.name,
      offer_id: id,
      provider_ids: [offer.provider_id],
      location: offer.criteria["Prise en charge"] ?? "",
      public_note: offer.criteria["Parcours"] ?? "",
      start: /^\d\d:\d\d$/.test(offer.criteria["Heure de départ"] ?? "")
        ? offer.criteria["Heure de départ"]
        : "18:00",
      end: /^\d\d:\d\d$/.test(offer.criteria["Heure d’arrivée"] ?? "")
        ? offer.criteria["Heure d’arrivée"]
        : "18:30",
    });
  }
  save() {
    if (this.form.invalid || !this.ceremony()) return;
    void this.s.run(async () => {
      const v = this.form.getRawValue();
      const start_minute = timeMinute(v.start, v.start_day),
        end_minute = timeMinute(v.end, v.end_day);
      validateInterval(start_minute, end_minute);
      const existing = this.manual().find((e) => e.id === this.editing());
      await this.s.saveTimeline(
        {
          id: this.editing() || undefined,
          ceremony_id: this.ceremony(),
          title: v.title.trim(),
          start_minute,
          end_minute,
          description: v.description,
          public_note: v.public_note,
          location: v.location,
          responsible: v.responsible,
          logistics: v.logistics,
          status: v.status as TimelineEvent["status"],
          offer_id: v.offer_id || null,
          position:
            existing?.position ??
            Math.max(-1, ...this.manual().map((e) => e.position)) + 1,
        },
        v.provider_ids,
      );
      this.show.set(false);
    }, "Étape du jour J enregistrée.");
  }
  providerNames(id: string) {
    return this.s
      .data()
      .timeline_event_providers.filter((p) => p.event_id === id)
      .map((p) => this.s.provider(p.provider_id)?.name)
      .filter(Boolean)
      .join(", ");
  }
  move(id: string, n: number) {
    const ids = this.manual().map((e) => e.id),
      i = ids.indexOf(id);
    if (i + n < 0 || i + n >= ids.length) return;
    [ids[i], ids[i + n]] = [ids[i + n], ids[i]];
    void this.s.run(() => this.s.reorderTimeline(this.ceremony(), ids));
  }
  drop(id: string, e: DragEvent) {
    e.preventDefault();
    if (this.chronological() || !this.dragged()) return;
    const ids = reordered(
      this.manual().map((e) => e.id),
      this.dragged(),
      id,
    );
    this.dragged.set("");
    void this.s.run(() => this.s.reorderTimeline(this.ceremony(), ids));
  }
  allow(e: DragEvent) {
    if (!this.chronological()) e.preventDefault();
  }
  remove(event: TimelineEvent) {
    void this.s.run(async () => {
      for (const p of this.s
        .data()
        .timeline_event_providers.filter((p) => p.event_id === event.id))
        await this.s.remove("timeline_event_providers", p.id);
      await this.s.remove("timeline_events", event.id);
      this.removing.set("");
    }, "Étape supprimée.");
  }
  async template() {
    await this.s.run(async () => {
      if (this.manual().length)
        throw new Error(
          "Le modèle est proposé uniquement pour un programme vide pour éviter les doublons.",
        );
      const samples = [
        ["Préparation makeup et coiffure", 900, 1020],
        ["Installation des derniers éléments", 1020, 1080],
        ["Arrivée des invités", 1080, 1110],
        ["Accueil des familles", 1110, 1140],
        ["Entrée des mariés", 1140, 1170],
        ["Présentation traditionnelle, si souhaitée", 1170, 1230],
        ["Dîner", 1230, 1320],
        ["Photos et animation", 1320, 1410],
        ["Fin de cérémonie", 1410, 1425],
      ] as const;
      for (const [
        position,
        [title, start_minute, end_minute],
      ] of samples.entries())
        await this.s.saveTimeline(
          {
            ceremony_id: this.ceremony(),
            title,
            start_minute,
            end_minute,
            description: "Exemple fictif entièrement modifiable.",
            public_note: "",
            location: "",
            responsible: "Commun",
            logistics: "",
            status: "Prévu",
            position,
            offer_id: null,
          },
          [],
        );
    }, "Exemple fictif ajouté : adaptez librement les horaires.");
  }
  program() {
    const c = this.s.data().ceremonies.find((c) => c.id === this.ceremony());
    return publicProgram(
      c?.name ?? "Programme",
      c?.date ?? null,
      this.manual(),
    );
  }
  download() {
    this.s.download(
      this.program(),
      "programme-prestataires.html",
      "text/html;charset=utf-8",
    );
  }
  print() {
    const frame = document.createElement("iframe");
    frame.title = "Programme à imprimer";
    frame.style.cssText =
      "position:fixed;width:1px;height:1px;left:-9999px;border:0";
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60000);
    };
    frame.srcdoc = this.program();
    document.body.appendChild(frame);
  }
}
