export class FinanceController {
  constructor(financeService) {
    this.financeService = financeService;
  }

  getCashBook = async (req, res, next) => {
    try { res.json({ transactions: await this.financeService.getCashBook(req.currentUser, req.query) }); }
    catch (err) { next(err); }
  };

  getBalance = async (req, res, next) => {
    try { res.json({ balance: await this.financeService.getBalance(req.currentUser) }); }
    catch (err) { next(err); }
  };
}
