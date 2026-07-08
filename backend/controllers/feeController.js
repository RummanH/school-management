export class FeeController {
  constructor(feeService) {
    this.feeService = feeService;
  }

  listCategories = async (req, res, next) => {
    try { res.json({ categories: await this.feeService.listCategories(req.currentUser) }); }
    catch (err) { next(err); }
  };
  createCategory = async (req, res, next) => {
    try { res.status(201).json({ category: await this.feeService.createCategory(req.body, req.currentUser) }); }
    catch (err) { next(err); }
  };
  updateCategory = async (req, res, next) => {
    try { res.json({ category: await this.feeService.updateCategory(req.params.id, req.body, req.currentUser) }); }
    catch (err) { next(err); }
  };
  deleteCategory = async (req, res, next) => {
    try { await this.feeService.deleteCategory(req.params.id, req.currentUser); res.json({ success: true }); }
    catch (err) { next(err); }
  };

  listAssignments = async (req, res, next) => {
    try { res.json({ assignments: await this.feeService.listAssignments(req.currentUser, req.query.studentUserId || null) }); }
    catch (err) { next(err); }
  };
  createAssignment = async (req, res, next) => {
    try { res.status(201).json({ assignment: await this.feeService.createAssignment(req.body, req.currentUser) }); }
    catch (err) { next(err); }
  };
  updateAssignment = async (req, res, next) => {
    try { res.json({ assignment: await this.feeService.updateAssignment(req.params.id, req.body, req.currentUser) }); }
    catch (err) { next(err); }
  };
  deleteAssignment = async (req, res, next) => {
    try { await this.feeService.deleteAssignment(req.params.id, req.currentUser); res.json({ success: true }); }
    catch (err) { next(err); }
  };

  listInvoices = async (req, res, next) => {
    try { res.json({ invoices: await this.feeService.listInvoices(req.currentUser, req.query) }); }
    catch (err) { next(err); }
  };
  getInvoice = async (req, res, next) => {
    try { res.json({ invoice: await this.feeService.getInvoice(req.params.id, req.currentUser) }); }
    catch (err) { next(err); }
  };
  generateInvoices = async (req, res, next) => {
    try { res.status(201).json(await this.feeService.generateInvoices(req.body, req.currentUser)); }
    catch (err) { next(err); }
  };
  recordPayment = async (req, res, next) => {
    try { res.status(201).json({ payment: await this.feeService.recordPayment(req.params.id, req.body, req.currentUser) }); }
    catch (err) { next(err); }
  };
  listPayments = async (req, res, next) => {
    try { res.json({ payments: await this.feeService.listPayments(req.currentUser, req.query) }); }
    catch (err) { next(err); }
  };

  listExpenses = async (req, res, next) => {
    try { res.json({ expenses: await this.feeService.listExpenses(req.currentUser) }); }
    catch (err) { next(err); }
  };
  createExpense = async (req, res, next) => {
    try { res.status(201).json({ expense: await this.feeService.createExpense(req.body, req.currentUser) }); }
    catch (err) { next(err); }
  };
  deleteExpense = async (req, res, next) => {
    try { await this.feeService.deleteExpense(req.params.id, req.currentUser); res.json({ success: true }); }
    catch (err) { next(err); }
  };

  getReport = async (req, res, next) => {
    try { res.json({ report: await this.feeService.getReport(req.currentUser, req.query.period || null) }); }
    catch (err) { next(err); }
  };
  getMyFees = async (req, res, next) => {
    try { res.json(await this.feeService.getMyFees(req.currentUser)); }
    catch (err) { next(err); }
  };
  getWardFees = async (req, res, next) => {
    try { res.json(await this.feeService.getWardFees(req.params.studentUserId, req.currentUser)); }
    catch (err) { next(err); }
  };
}
