import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import {
  listPublicGalleryItems,
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

  // Public marketing site has no per-tenant routing yet, so this still shows
  // gallery items across all tenants. See list() for the tenant-scoped
  // admin management view.
  async listPublic() {
    return this.databaseManager.withClient((client) => listPublicGalleryItems(client));
  }

  async list(actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withClient((client) => listGalleryItems(client, actor.tenantId));
  }

  async create(input, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    const type = GALLERY_TYPES.includes(input.type) ? input.type : "photo";
    const url = (input.url || "").trim();
    const caption = (input.caption || "").trim();
    const sortOrder = Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;

    assert(url, "URL is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      await insertGalleryItem(client, { id: createId("gallery"), tenantId: actor.tenantId, type, url, caption, sortOrder });
      return listGalleryItems(client, actor.tenantId);
    });
  }

  async update(id, input, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findGalleryItemById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Gallery item not found.", 404);

      const type = GALLERY_TYPES.includes(input.type) ? input.type : existing.type;
      const url = (input.url ?? existing.url).trim();
      const caption = (input.caption ?? existing.caption).trim();
      const sortOrder = input.sortOrder !== undefined && Number.isFinite(Number(input.sortOrder))
        ? Number(input.sortOrder)
        : existing.sortOrder;

      assert(url, "URL is required.", 400);

      await updateGalleryItem(client, { id, type, url, caption, sortOrder });
      return listGalleryItems(client, actor.tenantId);
    });
  }

  async remove(id, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findGalleryItemById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Gallery item not found.", 404);
      await deleteGalleryItem(client, id);
      return listGalleryItems(client, actor.tenantId);
    });
  }
}
