import fs from "node:fs/promises";
import path from "node:path";
import { publicUploadsPath } from "../config/paths.js";
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
const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;
const MIME_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function parseImageUpload(input) {
  const match = DATA_URL_PATTERN.exec((input || "").trim());
  assert(match, "Image upload is invalid.", 400);

  const mimeType = match[1].toLowerCase();
  const extension = MIME_EXTENSION[mimeType];
  assert(extension, "Unsupported image format. Use JPG, PNG, WEBP, or GIF.", 400);

  const buffer = Buffer.from(match[2], "base64");
  assert(buffer.length > 0, "Image upload is empty.", 400);
  assert(buffer.length <= 10 * 1024 * 1024, "Image upload is too large.", 400);

  return { buffer, extension };
}

async function saveGalleryImage(id, imageDataUrl) {
  const { buffer, extension } = parseImageUpload(imageDataUrl);
  const galleryDir = path.join(publicUploadsPath, "gallery");
  await fs.mkdir(galleryDir, { recursive: true });

  const fileName = `${id}.${extension}`;
  await fs.writeFile(path.join(galleryDir, fileName), buffer);
  return `/uploads/gallery/${fileName}`;
}

async function removeGalleryImageIfManaged(url) {
  if (!url?.startsWith("/uploads/gallery/")) return;
  const relativePath = url.replace(/^\/uploads\//, "");
  await fs.rm(path.join(publicUploadsPath, relativePath), { force: true }).catch(() => {});
}

export class GalleryService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listPublic() {
    return this.databaseManager.withClient((client) => listPublicGalleryItems(client));
  }

  async list(actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withClient((client) => listGalleryItems(client, actor.tenantId));
  }

  async create(input, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    const id = createId("gallery");
    const type = GALLERY_TYPES.includes(input.type) ? input.type : "photo";
    const caption = (input.caption || "").trim();
    const sortOrder = Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0;

    let url = (input.url || "").trim();
    if (type === "photo" && input.imageDataUrl) {
      url = await saveGalleryImage(id, input.imageDataUrl);
    }

    assert(url, "URL or uploaded image is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      await insertGalleryItem(client, { id, tenantId: actor.tenantId, type, url, caption, sortOrder });
      return listGalleryItems(client, actor.tenantId);
    });
  }

  async update(id, input, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findGalleryItemById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Gallery item not found.", 404);

      const type = GALLERY_TYPES.includes(input.type) ? input.type : existing.type;
      const caption = (input.caption ?? existing.caption).trim();
      const sortOrder = input.sortOrder !== undefined && Number.isFinite(Number(input.sortOrder))
        ? Number(input.sortOrder)
        : existing.sortOrder;

      let url = (input.url ?? existing.url).trim();
      if (type === "photo" && input.imageDataUrl) {
        url = await saveGalleryImage(id, input.imageDataUrl);
        await removeGalleryImageIfManaged(existing.url);
      }

      assert(url, "URL or uploaded image is required.", 400);

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
      await removeGalleryImageIfManaged(existing.url);
      return listGalleryItems(client, actor.tenantId);
    });
  }
}
