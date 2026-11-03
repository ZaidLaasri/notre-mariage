import { Injectable, inject } from "@angular/core";
import { Store } from "./store";
import { Media, MediaKind } from "./models";
@Injectable({ providedIn: "root" })
export class Photos {
  private readonly s = inject(Store);
  private urls = new Map<string, { url: string; expires: number }>();
  list(id: string, kind: MediaKind): Media[] {
    return (
      kind === "offer"
        ? this.s.data().offer_photos.filter((p) => p.offer_id === id)
        : this.s.data().attachments.filter((p) => p[`${kind}_id`] === id)
    ).sort((a, b) => a.position - b.position);
  }
  private db(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open("notre-mariage-demo-photos", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  private async local(
    path: string,
    blob?: Blob,
    remove = false,
  ): Promise<Blob | undefined> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        "photos",
        blob || remove ? "readwrite" : "readonly",
      );
      const store = tx.objectStore("photos");
      const r = remove
        ? store.delete(path)
        : blob
          ? store.put(blob, path)
          : store.get(path);
      tx.oncomplete = () => {
        db.close();
        resolve(r.result as Blob | undefined);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }
  async clearDemo() {
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
    for (const v of this.urls.values())
      if (v.url.startsWith("blob:")) URL.revokeObjectURL(v.url);
    this.urls.clear();
  }
  async resize(file: File, max = 1600): Promise<Blob> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new Error(
        "Formats acceptés : JPEG, PNG et WebP. Convertissez les photos HEIC.",
      );
    if (file.size > 20 * 1024 * 1024)
      throw new Error("Image source limitée à 20 Mo.");
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 60000000) {
      bitmap.close();
      throw new Error("Image limitée à 60 mégapixels.");
    }
    const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bitmap.width * ratio);
    c.height = Math.round(bitmap.height * ratio);
    c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
    bitmap.close();
    return new Promise((resolve, reject) =>
      c.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Compression impossible.")),
        "image/webp",
        0.82,
      ),
    );
  }
  private async storeBlob(path: string, blob: Blob) {
    if (this.s.demo()) await this.local(path, blob);
    else {
      const { error } = await this.s
        .client!.storage.from("wedding-photos")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;
    }
  }
  private async deletePaths(paths: string[]) {
    if (this.s.demo()) {
      for (const p of paths) await this.local(p, undefined, true);
    } else {
      const { error } = await this.s
        .client!.storage.from("wedding-photos")
        .remove(paths);
      if (error) throw error;
    }
    for (const p of paths) {
      const entry = this.urls.get(p);
      if (entry?.url.startsWith("blob:")) URL.revokeObjectURL(entry.url);
      this.urls.delete(p);
    }
  }
  async upload(file: File, id: string, kind: MediaKind = "offer") {
    const blob = await this.resize(file);
    const thumb = await this.resize(file, 420);
    if (blob.size > 5 * 1024 * 1024)
      throw new Error("Image trop volumineuse après compression.");
    const path = `${this.s.wedding()!.id}/${kind}/${id}/${crypto.randomUUID()}.webp`,
      thumbnail = path.replace(".webp", "-thumb.webp");
    try {
      await this.storeBlob(path, blob);
      await this.storeBlob(thumbnail, thumb);
      const rows = this.list(id, kind);
      const media = {
        path,
        thumbnail_path: thumbnail,
        caption: file.name,
        position: Math.max(-1, ...rows.map((p) => p.position)) + 1,
        is_cover: !rows.some((p) => p.is_cover),
        size_bytes: blob.size + thumb.size,
      };
      if (kind === "offer")
        await this.s.save("offer_photos", { ...media, offer_id: id });
      else
        await this.s.save("attachments", {
          ...media,
          gift_id: null,
          outfit_id: null,
          gift_set_id: null,
          inspiration_id: null,
          [`${kind}_id`]: id,
        });
    } catch (e) {
      try {
        await this.deletePaths([path, thumbnail]);
      } catch {
        /* Inspect orphaned objects in the Storage dashboard. */
      }
      throw e;
    }
  }
  async receipt(file: File, paymentId: string) {
    const blob = await this.resize(file);
    const path = `${this.s.wedding()!.id}/receipts/${paymentId}/${crypto.randomUUID()}.webp`;
    await this.storeBlob(path, blob);
    try {
      await this.s.save("payments", { id: paymentId, receipt_path: path });
    } catch (e) {
      await this.deletePaths([path]);
      throw e;
    }
  }
  async url(path: string): Promise<string> {
    const cached = this.urls.get(path);
    if (cached && cached.expires > Date.now()) return cached.url;
    let url = "";
    if (this.s.demo()) {
      const blob = await this.local(path);
      if (blob) url = URL.createObjectURL(blob);
    } else {
      const { data, error } = await this.s
        .client!.storage.from("wedding-photos")
        .createSignedUrl(path, 1800);
      if (error) throw error;
      url = data.signedUrl;
    }
    this.urls.set(path, { url, expires: Date.now() + 25 * 60 * 1000 });
    return url;
  }
  async remove(photo: Media, kind: MediaKind = "offer") {
    await this.deletePaths([
      photo.path,
      ...(photo.thumbnail_path ? [photo.thumbnail_path] : []),
    ]);
    await this.s.remove(
      kind === "offer" ? "offer_photos" : "attachments",
      photo.id,
    );
  }
  async save(photo: Media, patch: Partial<Media>, kind: MediaKind = "offer") {
    await this.s.save(kind === "offer" ? "offer_photos" : "attachments", {
      id: photo.id,
      ...patch,
    });
  }
  async cover(photo: Media, id: string, kind: MediaKind = "offer") {
    const current = this.list(id, kind).find((p) => p.is_cover);
    if (current && current.id !== photo.id)
      await this.save(current, { is_cover: false }, kind);
    await this.save(photo, { is_cover: true }, kind);
  }
  allPaths() {
    return [
      ...new Set([
        ...this.s
          .data()
          .offer_photos.flatMap((p) => [
            p.path,
            ...(p.thumbnail_path ? [p.thumbnail_path] : []),
          ]),
        ...this.s
          .data()
          .attachments.flatMap((p) => [
            p.path,
            ...(p.thumbnail_path ? [p.thumbnail_path] : []),
          ]),
        ...this.s
          .data()
          .payments.flatMap((p) => (p.receipt_path ? [p.receipt_path] : [])),
        ...this.s.data().inspirations.flatMap((i) => (i.path ? [i.path] : [])),
      ]),
    ];
  }
  async backup() {
    const { zipSync, strToU8 } = await import("fflate");
    const entries: Record<string, Uint8Array> = {};
    let size = 0;
    for (const path of this.allPaths()) {
      const url = await this.url(path);
      const response = await fetch(url);
      if (!response.ok)
        throw new Error("Téléchargement de sauvegarde impossible.");
      const bytes = new Uint8Array(await response.arrayBuffer());
      size += bytes.byteLength;
      if (size > 100 * 1024 * 1024)
        throw new Error(
          "Sauvegarde supérieure à 100 Mo. Utilisez le dashboard Supabase pour copier le bucket complet sans saturer votre téléphone.",
        );
      entries[path] = bytes;
    }
    entries["manifest.json"] = strToU8(
      JSON.stringify(
        {
          schemaVersion: 1,
          weddingId: this.s.wedding()?.id,
          paths: this.allPaths(),
          exportedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    const archive = zipSync(entries, { level: 0 });
    this.s.download(
      new Blob([archive as Uint8Array<ArrayBuffer>], {
        type: "application/zip",
      }),
      "notre-mariage-photos.zip",
      "application/zip",
    );
  }
}
