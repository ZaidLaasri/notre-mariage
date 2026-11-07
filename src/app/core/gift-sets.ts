import { Injectable, inject } from "@angular/core";
import { Store } from "./store";
import { Photos } from "./photos";
import { Gift, GiftSet, Media } from "./models";
export interface GiftDeletion {
  kind: "gift";
  gift: Gift;
  photos: Media[];
}
export interface SetDeletion {
  kind: "set";
  set: GiftSet;
  gifts: Gift[];
  photos: Media[];
}
export type Dfou3Deletion = GiftDeletion | SetDeletion;
const fingerprint = (rows: { id: string; updated_at?: string }[]) =>
  JSON.stringify(
    rows
      .map((r) => [r.id, r.updated_at ?? ""])
      .sort((a, b) => a[0].localeCompare(b[0])),
  );
@Injectable({ providedIn: "root" })
export class GiftSets {
  private readonly s = inject(Store);
  private readonly photos = inject(Photos);
  prepareSet(id: string): SetDeletion {
    const set = this.s.data().gift_sets.find((s) => s.id === id);
    if (!set || set.wedding_id !== this.s.wedding()?.id)
      throw new Error("Cet ensemble n’est plus disponible.");
    const gifts = this.s.data().gifts.filter((g) => g.gift_set_id === id);
    const ids = new Set(gifts.map((g) => g.id));
    return {
      kind: "set",
      set: { ...set },
      gifts: gifts.map((g) => ({ ...g })),
      photos: this.s
        .data()
        .attachments.filter(
          (p) => p.gift_set_id === id || (!!p.gift_id && ids.has(p.gift_id)),
        )
        .map((p) => ({ ...p })),
    };
  }
  prepareGift(id: string): GiftDeletion {
    const gift = this.s.data().gifts.find((g) => g.id === id);
    if (!gift || gift.wedding_id !== this.s.wedding()?.id)
      throw new Error("Cet article n’est plus disponible.");
    return {
      kind: "gift",
      gift: { ...gift },
      photos: this.s
        .data()
        .attachments.filter((p) => p.gift_id === id)
        .map((p) => ({ ...p })),
    };
  }
  async remove(request: Dfou3Deletion) {
    if (!this.s.demo()) await this.s.refresh();
    const current =
      request.kind === "set"
        ? this.prepareSet(request.set.id)
        : this.prepareGift(request.gift.id);
    const originalRows =
      request.kind === "set"
        ? [request.set, ...request.gifts, ...request.photos]
        : [request.gift, ...request.photos];
    const currentRows =
      current.kind === "set"
        ? [current.set, ...current.gifts, ...current.photos]
        : [current.gift, ...current.photos];
    if (fingerprint(originalRows) !== fingerprint(currentRows))
      throw new Error(
        "Le contenu a changé depuis votre confirmation. Vérifiez-le avant de supprimer à nouveau.",
      );
    try {
      for (const photo of request.photos)
        await this.photos.remove(photo, "gift");
      if (request.kind === "set") {
        for (const gift of request.gifts) await this.s.remove("gifts", gift.id);
        await this.s.remove("gift_sets", request.set.id);
      } else await this.s.remove("gifts", request.gift.id);
    } catch {
      throw new Error(
        "La suppression n’a pas pu être terminée. Les suppressions déjà effectuées restent enregistrées. Actualisez la liste avant de réessayer.",
      );
    }
  }
}
