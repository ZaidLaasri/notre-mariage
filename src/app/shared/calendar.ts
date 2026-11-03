import { Component, input, output, signal, computed } from "@angular/core";
import { Task } from "../core/models";
export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
@Component({
  selector: "app-calendar",
  standalone: true,
  template: `<section class="panel">
    <div class="section-heading">
      <button (click)="move(-1)" aria-label="Mois précédent">←</button>
      <h2>{{ label() }}</h2>
      <button (click)="move(1)" aria-label="Mois suivant">→</button>
    </div>
    <div class="calendar-grid">
      @for (
        day of ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
        track day
      ) {
        <span class="weekday">{{ day }}</span>
      }
      @for (day of days(); track day.key) {
        <button
          [class.other-month]="day.outside"
          [class.today]="day.key === today"
          [class.calendar-selected]="selected() === day.key"
          (click)="select(day.key)"
          [attr.aria-label]="day.label + ' : ' + count(day.key) + ' tâches'"
        >
          <span>{{ day.number }}</span>
          @if (count(day.key)) {
            <small
              >{{ count(day.key) }}
              <span class="desktop-only">tâche(s)</span></small
            >
          }
        </button>
      }
    </div>
    <div class="row between">
      <small>{{
        selected()
          ? "Échéances du " + selected()
          : "Choisissez un jour pour filtrer les tâches."
      }}</small
      ><button (click)="select('')">Toutes les dates</button>
    </div>
  </section>`,
})
export class Calendar {
  readonly tasks = input<Task[]>([]);
  readonly change = output<string>();
  readonly month = signal(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  readonly selected = signal("");
  readonly today = localDate(new Date());
  readonly label = computed(() =>
    this.month().toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    }),
  );
  readonly days = computed(() => {
    const m = this.month();
    const start = new Date(m);
    start.setDate(1 - ((m.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return {
        key: localDate(day),
        number: day.getDate(),
        outside: day.getMonth() !== m.getMonth(),
        label: day.toLocaleDateString("fr-FR", { dateStyle: "full" }),
      };
    });
  });
  count(key: string) {
    return this.tasks().filter((t) => t.due_on === key && !t.done).length;
  }
  move(delta: number) {
    const d = this.month();
    this.month.set(new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }
  select(key: string) {
    this.selected.set(key);
    this.change.emit(key);
  }
}
