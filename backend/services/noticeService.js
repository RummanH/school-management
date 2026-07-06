import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import {
  listPublicNotices,
  listForAudience,
  listAllNotices,
  findNoticeById,
  insertNotice,
  updateNotice,
  deleteNotice,
} from "../repositories/noticeRepository.js";

export const NOTICE_TYPES = ["notice", "news"];
export const NOTICE_AUDIENCES = ["public", "student", "teacher", "guardian", "all_portal"];

export class NoticeService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async listPublic(type) {
    const cleanType = NOTICE_TYPES.includes(type) ? type : "notice";
    return this.databaseManager.withClient((client) => listPublicNotices(client, cleanType, 10));
  }

  async listFeedForUser(actor) {
    return this.databaseManager.withClient((client) => listForAudience(client, actor.role));
  }

  async listAll() {
    return this.databaseManager.withClient((client) => listAllNotices(client));
  }

  async create(input, actor) {
    const title = (input.title || "").trim();
    const body = (input.body || "").trim();
    const type = NOTICE_TYPES.includes(input.type) ? input.type : "notice";
    const audience = NOTICE_AUDIENCES.includes(input.audience) ? input.audience : "public";
    const isPublished = input.isPublished ?? true;

    assert(title, "Title is required.", 400);
    assert(audience !== "public" || actor.role !== "teacher", "Teachers cannot publish public notices.", 403);

    return this.databaseManager.withTransaction(async (client) => {
      await insertNotice(client, {
        id: createId("notice"),
        type,
        title,
        body,
        audience,
        isPublished,
        createdBy: actor.id,
      });
      return listAllNotices(client);
    });
  }

  async update(id, input, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findNoticeById(client, id);
      assert(existing, "Notice not found.", 404);

      const title = (input.title ?? existing.title).trim();
      const body = input.body ?? existing.body;
      const type = NOTICE_TYPES.includes(input.type) ? input.type : existing.type;
      const audience = NOTICE_AUDIENCES.includes(input.audience) ? input.audience : existing.audience;
      const isPublished = input.isPublished ?? existing.isPublished;

      assert(title, "Title is required.", 400);
      assert(audience !== "public" || actor.role !== "teacher", "Teachers cannot publish public notices.", 403);

      await updateNotice(client, { id, type, title, body, audience, isPublished });
      return listAllNotices(client);
    });
  }

  async remove(id) {
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findNoticeById(client, id);
      assert(existing, "Notice not found.", 404);
      await deleteNotice(client, id);
      return listAllNotices(client);
    });
  }
}
