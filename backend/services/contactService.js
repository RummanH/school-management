import { assert } from "../lib/errors.js";
import { createId } from "../lib/ids.js";
import { insertContactMessage } from "../repositories/contactRepository.js";

export class ContactService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async submit({ name, phone, message }) {
    const trimName = String(name || "").trim();
    const trimPhone = String(phone || "").trim();
    const trimMessage = String(message || "").trim();

    assert(trimName.length > 0 && trimName.length <= 100, "Name is required (max 100 characters).");
    assert(trimPhone.length > 0, "Phone number is required.");
    assert(trimMessage.length > 0 && trimMessage.length <= 2000, "Message is required (max 2000 characters).");

    await this.databaseManager.withTransaction(async (client) => {
      await insertContactMessage(client, {
        id: createId("contact"),
        name: trimName,
        phone: trimPhone,
        message: trimMessage,
      });
    });

    return { success: true };
  }
}
