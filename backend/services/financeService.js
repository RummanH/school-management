import { getCashBook, getBalance } from "../repositories/financeRepository.js";

export class FinanceService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async getCashBook(actor, filters = {}) {
    return this.databaseManager.withClient((client) => getCashBook(client, actor.tenantId, filters));
  }

  async getBalance(actor) {
    return this.databaseManager.withClient((client) => getBalance(client, actor.tenantId));
  }
}
