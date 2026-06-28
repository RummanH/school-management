import { createId } from "../lib/ids.js";
import { assert } from "../lib/errors.js";
import {
  listTenants,
  findTenantById,
  findTenantBySlug,
  insertTenant,
  updateTenant,
  setTenantStatus,
} from "../repositories/tenantRepository.js";

export const INSTITUTION_TYPES = ["SCHOOL", "COLLEGE", "UNIVERSITY", "MADRASA"];
export const PLANS = ["free", "basic", "pro"];

export class TenantService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async list() {
    return this.databaseManager.withClient((client) => listTenants(client));
  }

  async create({ name, slug, email, plan = "free", institutionType = "SCHOOL", address, phone }) {
    assert(name?.trim(), "Institution name is required.", 400);
    assert(slug?.trim(), "Organization code is required.", 400);
    assert(email?.trim(), "Email is required.", 400);
    assert(INSTITUTION_TYPES.includes(institutionType), "Invalid institution type.", 400);

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findTenantBySlug(client, cleanSlug);
      assert(!existing, "Organization code is already in use.", 409);

      return insertTenant(client, {
        id: createId("tenant"),
        name: name.trim(),
        slug: cleanSlug,
        email: email.trim().toLowerCase(),
        plan,
        institutionType,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
      });
    });
  }

  async update(id, { name, email, plan, institutionType, address, phone }) {
    assert(name?.trim(), "Institution name is required.", 400);
    assert(email?.trim(), "Email is required.", 400);

    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findTenantById(client, id);
      assert(existing, "Organization not found.", 404);

      return updateTenant(client, {
        id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        plan: plan ?? existing.plan,
        institutionType: institutionType ?? existing.institutionType,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
      });
    });
  }

  async setStatus(id, status) {
    assert(["active", "inactive"].includes(status), "Status must be active or inactive.", 400);
    return this.databaseManager.withTransaction(async (client) => {
      const existing = await findTenantById(client, id);
      assert(existing, "Organization not found.", 404);
      return setTenantStatus(client, id, status);
    });
  }
}
