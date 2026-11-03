import { Component, computed, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { Store } from "../core/store";
import { Photos } from "../core/photos";
import { Gallery } from "../shared/gallery";
import { Inspiration, Moodboard, InspirationComment } from "../core/models";
import { MOODBOARD_THEMES } from "../core/catalogue-templates";
import { reordered } from "../core/timeline";
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, Gallery],
  templateUrl: "./moodboards.html",
})
export class Moodboards {
  readonly s = inject(Store);
  private fb = inject(FormBuilder);
  private photos = inject(Photos);
  private route = inject(ActivatedRoute);
  readonly themes = MOODBOARD_THEMES;
  readonly board = signal("");
  readonly query = signal("");
  readonly theme = signal(this.route.snapshot.queryParamMap.get("theme") ?? "");
  readonly ceremony = signal("");
  readonly mosaic = signal(true);
  readonly showBoard = signal(false);
  readonly showIdea = signal(false);
  readonly removing = signal("");
  readonly commenting = signal("");
  readonly dragged = signal("");
  readonly selectedBoard = computed(() =>
    this.s.data().moodboards.find((b) => b.id === this.board()),
  );
  readonly ideas = computed(() =>
    this.s
      .data()
      .inspirations.filter(
        (i) =>
          (!this.board() || i.moodboard_id === this.board()) &&
          (!this.theme() || i.theme === this.theme()) &&
          (!this.ceremony() ||
            (i.ceremony_id ??
              this.s.data().moodboards.find((b) => b.id === i.moodboard_id)
                ?.ceremony_id) === this.ceremony()) &&
          `${i.name} ${i.description ?? ""} ${i.theme ?? ""} ${i.tags.join(" ")} ${i.colors?.join(" ") ?? ""}`
            .toLowerCase()
            .includes(this.query().toLowerCase()),
      )
      .sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name),
      ),
  );
  readonly boardForm = this.fb.nonNullable.group({
    id: [""],
    name: ["", Validators.required],
    description: [""],
    ceremony_id: [""],
    theme: ["Ambiance", Validators.required],
  });
  readonly ideaForm = this.fb.nonNullable.group({
    id: [""],
    name: ["", Validators.required],
    moodboard_id: [""],
    description: [""],
    ceremony_id: [""],
    theme: ["Ambiance"],
    colors: [""],
    tags: [""],
    source_url: ["", Validators.pattern(/^$|^https:\/\/[^\s]+$/)],
    provider_id: [""],
    requirement_id: [""],
    offer_id: [""],
    outfit_id: [""],
    task_id: [""],
  });
  readonly commentForm = this.fb.nonNullable.group({
    id: [""],
    body: ["", Validators.required],
  });
  value(e: Event) {
    return (e.target as HTMLInputElement).value;
  }
  selectBoard(e: Event) {
    this.board.set(this.value(e));
  }
  editBoard(b?: Moodboard) {
    this.boardForm.reset({
      id: b?.id ?? "",
      name: b?.name ?? "",
      description: b?.description ?? "",
      ceremony_id: b?.ceremony_id ?? "",
      theme: b?.theme ?? "Ambiance",
    });
    this.showBoard.set(true);
  }
  saveBoard() {
    if (this.boardForm.invalid) return;
    void this.s.run(async () => {
      const v = this.boardForm.getRawValue();
      const board = await this.s.save("moodboards", {
        ...v,
        id: v.id || undefined,
        ceremony_id: v.ceremony_id || null,
        name: v.name.trim(),
      });
      this.board.set(board.id);
      this.showBoard.set(false);
    }, "Moodboard enregistré.");
  }
  deleteBoard() {
    const board = this.selectedBoard();
    if (!board) return;
    void this.s.run(async () => {
      if (this.s.data().inspirations.some((i) => i.moodboard_id === board.id))
        throw new Error(
          "Déplacez ou supprimez ses inspirations avant de supprimer le moodboard.",
        );
      await this.s.remove("moodboards", board.id);
      this.board.set("");
    }, "Moodboard vide supprimé.");
  }
  edit(i?: Inspiration) {
    this.ideaForm.reset({
      id: i?.id ?? "",
      name: i?.name ?? "",
      moodboard_id: i?.moodboard_id ?? this.board(),
      description: i?.description ?? "",
      ceremony_id: i?.ceremony_id ?? this.selectedBoard()?.ceremony_id ?? "",
      theme: i?.theme ?? this.selectedBoard()?.theme ?? "Ambiance",
      colors: i?.colors?.join(", ") ?? "",
      tags: i?.tags.join(", ") ?? "",
      source_url: i?.source_url ?? "",
      provider_id: i?.provider_id ?? "",
      requirement_id: i?.requirement_id ?? "",
      offer_id: i?.offer_id ?? "",
      outfit_id: i?.outfit_id ?? "",
      task_id: i?.task_id ?? "",
    });
    this.showIdea.set(true);
  }
  save() {
    if (this.ideaForm.invalid) return;
    void this.s.run(async () => {
      const v = this.ideaForm.getRawValue();
      const previous = this.s.data().inspirations.find((i) => i.id === v.id);
      const { colors, tags, ...fields } = v;
      await this.s.save("inspirations", {
        ...fields,
        id: v.id || undefined,
        name: v.name.trim(),
        moodboard_id: v.moodboard_id || null,
        ceremony_id: v.ceremony_id || null,
        provider_id: v.provider_id || null,
        requirement_id: v.requirement_id || null,
        offer_id: v.offer_id || null,
        outfit_id: v.outfit_id || null,
        task_id: v.task_id || null,
        colors: this.tags(colors),
        tags: this.tags(tags),
        favorite: previous?.favorite ?? false,
        path: previous?.path ?? null,
        position: previous?.position ?? this.nextPosition(v.moodboard_id),
      });
      this.showIdea.set(false);
    }, "Inspiration enregistrée. Ajoutez ses photos dans la galerie.");
  }
  tags(s: string) {
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  nextPosition(board: string) {
    return (
      Math.max(
        -1,
        ...this.s
          .data()
          .inspirations.filter((i) => (i.moodboard_id ?? "") === board)
          .map((i) => i.position ?? 0),
      ) + 1
    );
  }
  async importImages(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    await this.s.run(async () => {
      const board = this.selectedBoard();
      if (!board)
        throw new Error("Choisissez ou créez un moodboard avant l’import.");
      let done = 0;
      for (const file of files) {
        let id = "";
        try {
          const idea = await this.s.save("inspirations", {
            moodboard_id: board.id,
            name: file.name.replace(/\.[^.]+$/, ""),
            description: "",
            ceremony_id: board.ceremony_id,
            theme: board.theme,
            colors: [],
            tags: [],
            source_url: "",
            provider_id: null,
            requirement_id: null,
            offer_id: null,
            outfit_id: null,
            task_id: null,
            favorite: false,
            path: null,
            position: this.nextPosition(board.id),
          });
          id = idea.id;
          await this.photos.upload(file, id, "inspiration");
          done++;
        } catch (e) {
          if (id && !this.photos.list(id, "inspiration").length)
            await this.s.remove("inspirations", id);
          throw new Error(`${done} image(s) importée(s). ${this.s.message(e)}`);
        }
      }
      this.s.notice.set(`${done} image(s) ajoutée(s) au moodboard.`);
    });
    input.value = "";
  }
  comments(id: string) {
    return this.s
      .data()
      .inspiration_comments.filter((c) => c.inspiration_id === id)
      .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  }
  editComment(id: string, comment?: InspirationComment) {
    this.commenting.set(id);
    this.commentForm.setValue({
      id: comment?.id ?? "",
      body: comment?.body ?? "",
    });
  }
  saveComment() {
    if (this.commentForm.invalid || !this.commenting()) return;
    void this.s.run(async () => {
      const v = this.commentForm.getRawValue();
      await this.s.save("inspiration_comments", {
        id: v.id || undefined,
        inspiration_id: this.commenting(),
        user_id: this.s.userId(),
        body: v.body.trim(),
      });
      this.commenting.set("");
    }, "Commentaire partagé.");
  }
  removeComment(comment: InspirationComment) {
    void this.s.run(() => this.s.remove("inspiration_comments", comment.id));
  }
  favorite(i: Inspiration) {
    void this.s.run(() =>
      this.s.save("inspirations", { id: i.id, favorite: !i.favorite }),
    );
  }
  remove(i: Inspiration) {
    void this.s.run(async () => {
      for (const photo of this.photos.list(i.id, "inspiration"))
        await this.photos.remove(photo, "inspiration");
      for (const comment of this.comments(i.id))
        if (this.s.demo())
          await this.s.remove("inspiration_comments", comment.id);
      await this.s.remove("inspirations", i.id);
      this.s.data.update((d) => ({
        ...d,
        inspiration_comments: d.inspiration_comments.filter(
          (c) => c.inspiration_id !== i.id,
        ),
      }));
      this.removing.set("");
    }, "Inspiration et photos supprimées.");
  }
  move(i: Inspiration, n: number) {
    const rows = this.s
      .data()
      .inspirations.filter(
        (x) => (x.moodboard_id ?? "") === (i.moodboard_id ?? ""),
      )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const index = rows.findIndex((x) => x.id === i.id),
      other = rows[index + n];
    if (!other) return;
    [rows[index], rows[index + n]] = [rows[index + n], rows[index]];
    void this.s.run(() =>
      this.s.reorderMoodboard(
        i.moodboard_id ?? null,
        rows.map((x) => x.id),
      ),
    );
  }
  drop(i: Inspiration, e: DragEvent) {
    e.preventDefault();
    const moved = this.s
      .data()
      .inspirations.find((x) => x.id === this.dragged());
    if (!moved || (moved.moodboard_id ?? null) !== (i.moodboard_id ?? null))
      return;
    const ids = this.s
      .data()
      .inspirations.filter(
        (x) => (x.moodboard_id ?? null) === (i.moodboard_id ?? null),
      )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((x) => x.id);
    void this.s.run(() =>
      this.s.reorderMoodboard(
        i.moodboard_id ?? null,
        reordered(ids, moved.id, i.id),
      ),
    );
    this.dragged.set("");
  }
  allow(e: DragEvent) {
    e.preventDefault();
  }
}
