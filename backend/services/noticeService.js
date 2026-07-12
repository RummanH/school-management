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
import { findTenantBySlug } from "../repositories/tenantRepository.js";

export const NOTICE_TYPES = ["notice", "news"];
export const NOTICE_AUDIENCES = ["public", "student", "teacher", "guardian", "all_portal"];

export class NoticeService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  // schoolSlug identifies which tenant's public site is asking — without it
  // (or if it doesn't resolve to an active tenant) this returns an empty
  // list rather than falling back to any tenant's content, since guessing
  // wrong here means one school's notices leaking onto another's site.
  async listPublic(type, schoolSlug) {
    const cleanType = NOTICE_TYPES.includes(type) ? type : "notice";
    const slug = (schoolSlug || "").trim();
    if (!slug) return [];
    return this.databaseManager.withClient(async (client) => {
      const tenant = await findTenantBySlug(client, slug);
      if (!tenant || tenant.status !== "active") return [];
      return listPublicNotices(client, tenant.id, cleanType, 10);
    });
  }

  async listFeedForUser(actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withClient((client) => listForAudience(client, actor.role, actor.tenantId));
  }

  async listAll(actor) {
    assert(actor.tenantId, "No active organization.", 403);
    return this.databaseManager.withClient((client) => listAllNotices(client, actor.tenantId));
  }

  async create(input, actor) {
    assert(actor.tenantId, "No active organization.", 403);

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
        tenantId: actor.tenantId,
        type,
        title,
        body,
        audience,
        isPublished,
        createdBy: actor.id,
      });
      return listAllNotices(client, actor.tenantId);
    });
  }

  async update(id, input, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findNoticeById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Notice not found.", 404);

      const title = (input.title ?? existing.title).trim();
      const body = input.body ?? existing.body;
      const type = NOTICE_TYPES.includes(input.type) ? input.type : existing.type;
      const audience = NOTICE_AUDIENCES.includes(input.audience) ? input.audience : existing.audience;
      const isPublished = input.isPublished ?? existing.isPublished;

      assert(title, "Title is required.", 400);
      assert(audience !== "public" || actor.role !== "teacher", "Teachers cannot publish public notices.", 403);

      await updateNotice(client, { id, type, title, body, audience, isPublished });
      return listAllNotices(client, actor.tenantId);
    });
  }

  async remove(id, actor) {
    assert(actor.tenantId, "No active organization.", 403);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findNoticeById(client, id);
      assert(existing && existing.tenantId === actor.tenantId, "Notice not found.", 404);
      await deleteNotice(client, id);
      return listAllNotices(client, actor.tenantId);
    });
  }
}
