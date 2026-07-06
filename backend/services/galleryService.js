import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import {
  listGalleryItems,
  findGalleryItemById,
  insertGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from "../repositories/galleryRepository.js";

export const GALLERY_TYPES = ["photo", "video"];

export class GalleryService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async list() {
    return this.databaseManager.withClient((client) => listGalleryItems(client));
  }

  async create(input) {
    const type = GALLERY_TYPES.includes(input.type) ? input.type : "photo";
    const url = (input.url || "").trim();
    const caption = (input.caption || "").trim();
    const sortOrder = Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;

    assert(url, "URL is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      await insertGalleryItem(client, { id: createId("gallery"), type, url, caption, sortOrder });
      return listGalleryItems(client);
    });
  }

  async update(id, input) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findGalleryItemById(client, id);
      assert(existing, "Gallery item not found.", 404);

      const type = GALLERY_TYPES.includes(input.type) ? input.type : existing.type;
      const url = (input.url ?? existing.url).trim();
      const caption = (input.caption ?? existing.caption).trim();
      const sortOrder = input.sortOrder !== undefined && Number.isFinite(Number(input.sortOrder))
        ? Number(input.sortOrder)
        : existing.sortOrder;

      assert(url, "URL is required.", 400);

      await updateGalleryItem(client, { id, type, url, caption, sortOrder });
      return listGalleryItems(client);
    });
  }

  async remove(id) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findGalleryItemById(client, id);
      assert(existing, "Gallery item not found.", 404);
      await deleteGalleryItem(client, id);
      return listGalleryItems(client);
    });
  }
}
