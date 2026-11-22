import {
  Component,
  ElementRef,
  ViewChild,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { Inspiration } from "../core/models";
import { Photos } from "../core/photos";
import { Store } from "../core/store";
import {
  CARD_WIDTH,
  Point,
  fitCanvas,
  itemPoint,
  movedPoint,
  zoomAt,
} from "../core/moodboard-canvas";

@Component({
  selector: "app-moodboard-canvas",
  standalone: true,
  template: `
    <div class="canvas-toolbar row wrap" aria-label="Outils du canvas">
      <button (click)="zoomBy(0.8)" aria-label="Dézoomer">−</button>
      <output aria-live="polite">{{ percent() }} %</output>
      <button (click)="zoomBy(1.25)" aria-label="Zoomer">＋</button>
      <button (click)="fit()">Tout voir</button>
      <button (click)="reset()">100 %</button>
      <span class="hint"
        >Glissez les photos pour les placer. Glissez le fond pour
        explorer.</span
      >
    </div>
    <div
      #viewport
      class="canvas-viewport"
      tabindex="0"
      role="region"
      aria-label="Canvas des inspirations. Flèches pour naviguer, boutons de déplacement sur chaque photo."
      (pointerdown)="startPan($event)"
      (pointermove)="move($event)"
      (pointerup)="end($event)"
      (pointercancel)="cancel()"
      (lostpointercapture)="cancel()"
      (wheel)="wheel($event)"
      (keydown)="navigate($event)"
    >
      <div class="canvas-world" [style.transform]="transform()">
        @for (item of items(); track item.id; let index = $index) {
          <article
            class="canvas-photo"
            [class.moving]="gesture()?.id === item.id"
            [style.width.px]="cardWidth"
            [style.left.px]="point(item, index).x"
            [style.top.px]="point(item, index).y"
            (pointerdown)="$event.stopPropagation()"
          >
            <button
              class="canvas-grip"
              [disabled]="busy()"
              [attr.aria-label]="
                'Déplacer ' + item.name + '. Utilisez les flèches.'
              "
              (pointerdown)="startPhoto($event, item, index)"
              (keydown)="nudge($event, item, index)"
            >
              ⠿ Déplacer
            </button>
            <button
              class="canvas-preview"
              (pointerdown)="startPhoto($event, item, index, true)"
              (click)="$event.detail === 0 && inspect.emit(item.id)"
              [attr.aria-label]="'Ouvrir ' + item.name"
            >
              @if (urls()[item.id]) {
                <img
                  [src]="urls()[item.id]"
                  [alt]="item.name"
                  draggable="false"
                  loading="lazy"
                />
              } @else {
                <span class="canvas-placeholder">＋ Ajouter une photo</span>
              }
              <strong>{{ item.name }}</strong>
            </button>
          </article>
        }
      </div>
      @if (!items().length) {
        <div class="canvas-empty">
          Importez vos photos pour composer votre board.
        </div>
      }
    </div>
  `,
  styleUrl: "./moodboard-canvas.scss",
})
export class MoodboardCanvas {
  private visibleIds = new Set<string>();
  private viewScope: string | undefined;
  readonly items = input.required<Inspiration[]>();
  readonly busy = input(false);
  readonly scope = input("");
  readonly positioned = output<{ id: string; x: number; y: number }>();
  readonly inspect = output<string>();
  @ViewChild("viewport") viewport?: ElementRef<HTMLElement>;
  private readonly photos = inject(Photos);
  private readonly store = inject(Store);
  readonly cardWidth = CARD_WIDTH;
  readonly zoom = signal(1);
  readonly pan = signal<Point>({ x: 40, y: 40 });
  readonly draft = signal<{ id: string; point: Point } | null>(null);
  readonly gesture = signal<{
    id: string;
    pointer: number;
    x: number;
    y: number;
    origin: Point;
    openOnTap: boolean;
  } | null>(null);
  readonly urls = signal<Record<string, string>>({});
  readonly percent = computed(() => Math.round(this.zoom() * 100));
  readonly transform = computed(
    () =>
      `translate(${this.pan().x}px, ${this.pan().y}px) scale(${this.zoom()})`,
  );
  constructor() {
    afterRenderEffect(() => this.syncView());
    effect((onCleanup) => {
      const items = this.items();
      let active = true;
      onCleanup(() => {
        active = false;
      });
      const covers = items.map((i) => ({
        id: i.id,
        photo: this.photos
          .list(i.id, "inspiration")
          .sort((a, b) => Number(b.is_cover) - Number(a.is_cover))[0],
      }));
      void Promise.all(
        covers.map(
          async (c) =>
            [
              c.id,
              c.photo
                ? await this.photos.url(c.photo.thumbnail_path ?? c.photo.path)
                : "",
            ] as const,
        ),
      )
        .then((entries) => {
          if (active) this.urls.set(Object.fromEntries(entries));
        })
        .catch((error) => {
          if (active) this.store.error.set(this.store.message(error));
        });
    });
  }
  syncView() {
    const scope = this.scope();
    const items = this.items();
    const added = items.some((i) => !this.visibleIds.has(i.id));
    const changedBoard = this.viewScope !== scope;
    this.visibleIds = new Set(items.map((i) => i.id));
    this.viewScope = scope;
    if (changedBoard || added) {
      this.cancel();
      this.fit();
    }
  }
  point(item: Inspiration, index: number) {
    return this.draft()?.id === item.id
      ? this.draft()!.point
      : itemPoint(item, index);
  }
  reset() {
    this.cancel();
    this.zoom.set(1);
    this.pan.set({ x: 40, y: 40 });
  }
  fit() {
    const el = this.viewport?.nativeElement;
    if (!el) return;
    const view = fitCanvas(
      this.items().map(itemPoint),
      el.clientWidth,
      el.clientHeight,
    );
    this.zoom.set(view.zoom);
    this.pan.set(view.pan);
  }
  zoomBy(factor: number, cursor?: Point) {
    const el = this.viewport?.nativeElement;
    const next = Math.max(0.05, Math.min(2.5, this.zoom() * factor));
    this.pan.set(
      zoomAt(
        this.pan(),
        cursor ?? {
          x: (el?.clientWidth ?? 600) / 2,
          y: (el?.clientHeight ?? 500) / 2,
        },
        this.zoom(),
        next,
      ),
    );
    this.zoom.set(next);
  }
  wheel(e: WheelEvent) {
    e.preventDefault();
    if (this.gesture()) return;
    if (e.ctrlKey || e.metaKey) {
      const rect = this.viewport!.nativeElement.getBoundingClientRect();
      this.zoomBy(Math.exp(-e.deltaY * 0.005), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else this.pan.update((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
  }
  private begin(e: PointerEvent, id: string, origin: Point, openOnTap = false) {
    if (this.gesture() || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this.viewport!.nativeElement.setPointerCapture(e.pointerId);
    this.gesture.set({
      id,
      pointer: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      origin,
      openOnTap,
    });
  }
  startPan(e: PointerEvent) {
    this.begin(e, "", this.pan());
  }
  startPhoto(
    e: PointerEvent,
    item: Inspiration,
    index: number,
    openOnTap = false,
  ) {
    if (!this.busy()) this.begin(e, item.id, itemPoint(item, index), openOnTap);
  }
  move(e: PointerEvent) {
    const g = this.gesture();
    if (!g || g.pointer !== e.pointerId) return;
    if (
      g.id &&
      Math.hypot(e.clientX - g.x, e.clientY - g.y) < 4 &&
      !this.draft()
    )
      return;
    const p = movedPoint(
      g.origin,
      e.clientX - g.x,
      e.clientY - g.y,
      g.id ? this.zoom() : 1,
    );
    if (g.id) this.draft.set({ id: g.id, point: p });
    else this.pan.set(p);
  }
  end(e: PointerEvent) {
    const g = this.gesture();
    if (!g || g.pointer !== e.pointerId) return;
    const draft = this.draft();
    this.gesture.set(null);
    if (draft && g.id) this.positioned.emit({ id: g.id, ...draft.point });
    else if (g.openOnTap) this.inspect.emit(g.id);
    this.draft.set(null);
    if (this.viewport?.nativeElement.hasPointerCapture(e.pointerId))
      this.viewport.nativeElement.releasePointerCapture(e.pointerId);
  }
  cancel() {
    this.gesture.set(null);
    this.draft.set(null);
  }
  nudge(e: KeyboardEvent, item: Inspiration, index: number) {
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const d = delta[e.key];
    if (!d || this.busy()) return;
    e.preventDefault();
    e.stopPropagation();
    const p = itemPoint(item, index),
      step = e.shiftKey ? 50 : 10;
    this.positioned.emit({
      id: item.id,
      x: p.x + d.x * step,
      y: p.y + d.y * step,
    });
  }
  navigate(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.cancel();
      return;
    }
    if (e.target !== e.currentTarget) return;
    const d: Record<string, Point> = {
      ArrowLeft: { x: 60, y: 0 },
      ArrowRight: { x: -60, y: 0 },
      ArrowUp: { x: 0, y: 60 },
      ArrowDown: { x: 0, y: -60 },
    };
    if (d[e.key]) {
      e.preventDefault();
      this.pan.update((p) => ({ x: p.x + d[e.key].x, y: p.y + d[e.key].y }));
    }
  }
}
