import { FocusTrap } from "./focus-trap";
import { Component, input, inject, signal, effect } from "@angular/core";
import { Photos } from "../core/photos";
import { Store } from "../core/store";
import { Media, MediaKind } from "../core/models";
@Component({
  selector: "app-gallery",
  standalone: true,
  imports: [FocusTrap],
  template: `
    <div class="gallery" [class.compact]="compact()">
      @if (list().length) {
        <button
          class="image-button"
          (click)="open.set(true)"
          aria-label="Agrandir la photo"
        >
          <img
            [src]="urls()[selected()?.id ?? '']"
            [alt]="selected()?.caption || 'Photo de notre carnet'"
            loading="lazy"
          />
        </button>
        <div class="gallery-controls">
          <button (click)="step(-1)" aria-label="Photo précédente">←</button
          ><span>{{ index() + 1 }} / {{ list().length }}</span
          ><button (click)="step(1)" aria-label="Photo suivante">→</button>
        </div>
      } @else {
        <div class="photo-empty">
          <span>✧</span><small>Votre prochaine inspiration</small
          ><small>Ajoutez vos propres photos</small>
        </div>
      }
      @if (editable()) {
        <label class="upload"
          >＋ Ajouter des photos<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            (change)="upload($event)"
            [disabled]="s.busy()"
        /></label>
        @if (selected(); as photo) {
          <div class="row wrap">
            <button (click)="setCover(photo)">
              {{
                photo.is_cover ? "★ Principale" : "Définir principale"
              }}</button
            ><button (click)="move(photo, -1)">Déplacer avant</button
            ><button (click)="move(photo, 1)">Déplacer après</button
            ><button (click)="deletePhoto(photo)">Supprimer la photo</button>
          </div>
          <label
            >Légende<input
              [value]="photo.caption"
              (change)="caption(photo, $event)"
          /></label>
        }
      }
    </div>
    @if (open()) {
      <div
        appFocusTrap
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Galerie"
        (keydown.escape)="open.set(false)"
        (keydown.arrowleft)="step(-1)"
        (keydown.arrowright)="step(1)"
      >
        <button class="close" autofocus (click)="open.set(false)">
          Fermer ×</button
        ><button (click)="step(-1)" aria-label="Précédente">←</button>
        <figure>
          <img [src]="largeUrl()" [alt]="selected()?.caption" />
          <figcaption>
            {{ selected()?.caption }} · {{ index() + 1 }} / {{ list().length }}
          </figcaption>
        </figure>
        <button (click)="step(1)" aria-label="Suivante">→</button>
      </div>
    }
  `,
})
export class Gallery {
  readonly offerId = input.required<string>();
  readonly kind = input<MediaKind>("offer");
  readonly editable = input(false);
  readonly compact = input(false);
  readonly s = inject(Store);
  private readonly photos = inject(Photos);
  readonly index = signal(0);
  readonly open = signal(false);
  readonly urls = signal<Record<string, string>>({});
  readonly largeUrl = signal("");
  readonly list = signal<Media[]>([]);
  readonly selected = (): Media | undefined => this.list()[this.index()];
  constructor() {
    effect(() => {
      const rows = this.photos
        .list(this.offerId(), this.kind())
        .sort(
          (a, b) =>
            (this.compact() ? Number(b.is_cover) - Number(a.is_cover) : 0) ||
            a.position - b.position,
        );
      this.list.set(rows);
      if (this.index() >= rows.length) this.index.set(0);
      void Promise.all(
        rows.map(async (p) => {
          const url = await this.photos.url(p.thumbnail_path ?? p.path);
          return [p.id, url] as const;
        }),
      )
        .then((entries) => this.urls.set(Object.fromEntries(entries)))
        .catch((e) => this.s.error.set(this.s.message(e)));
    });
    effect(() => {
      const photo = this.list()[this.index()];
      if (photo && this.open())
        void this.photos
          .url(photo.path)
          .then((u) => this.largeUrl.set(u))
          .catch((e) => this.s.error.set(this.s.message(e)));
    });
  }
  step(n: number) {
    if (this.list().length)
      this.index.set(
        (this.index() + n + this.list().length) % this.list().length,
      );
  }
  async upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    await this.s.run(async () => {
      for (const f of files)
        await this.photos.upload(f, this.offerId(), this.kind());
    }, "Photos ajoutées.");
    input.value = "";
  }
  cover = (p: Media) => this.photos.cover(p, this.offerId(), this.kind());
  remove = (p: Media) => this.photos.remove(p, this.kind());
  setCover(p: Media) {
    void this.s.run(() => this.cover(p));
  }
  deletePhoto(p: Media) {
    void this.s.run(() => this.remove(p));
  }
  caption(p: Media, e: Event) {
    const caption = (e.target as HTMLInputElement).value;
    void this.s.run(() => this.photos.save(p, { caption }, this.kind()));
  }
  move(p: Media, n: number) {
    const rows = this.list();
    const i = rows.indexOf(p);
    const other = rows[i + n];
    if (!other) return;
    void this.s.run(async () => {
      await this.photos.save(p, { position: other.position }, this.kind());
      await this.photos.save(other, { position: p.position }, this.kind());
    });
  }
}
