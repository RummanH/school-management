export class AdmissionController {
  constructor(admissionService) {
    this.admissionService = admissionService;
  }

  apply = async (req, res, next) => {
    try {
      const application = await this.admissionService.apply(req.body);
      res.status(201).json({ referenceCode: application.referenceCode, status: application.status });
    } catch (err) { next(err); }
  };

  checkStatus = async (req, res, next) => {
    try {
      const application = await this.admissionService.checkStatus(req.query.referenceCode);
      res.json({ application });
    } catch (err) { next(err); }
  };

  listAll = async (req, res, next) => {
    try {
      const applications = await this.admissionService.listAll(req.query.status);
      res.json({ applications });
    } catch (err) { next(err); }
  };

  getById = async (req, res, next) => {
    try {
      const application = await this.admissionService.getById(req.params.id);
      res.json({ application });
    } catch (err) { next(err); }
  };

  updateStatus = async (req, res, next) => {
    try {
      const application = await this.admissionService.updateStatus(req.params.id, req.body);
      res.json({ application });
    } catch (err) { next(err); }
  };
}
