function originOf(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function sendPdf(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

export class DocumentController {
  constructor(documentService) {
    this.documentService = documentService;
  }

  getStudentDocumentData = async (req, res, next) => {
    try {
      res.json(await this.documentService.getStudentDocumentData(req.params.studentUserId, req.currentUser));
    } catch (err) { next(err); }
  };

  downloadForStudent = async (req, res, next) => {
    try {
      const { buffer, filename } = await this.documentService.generateForStudent(
        req.params.type, req.params.studentUserId, req.currentUser, req.currentTenant,
        { kind: req.query.kind, paymentId: req.query.payment }, originOf(req),
      );
      sendPdf(res, buffer, filename);
    } catch (err) { next(err); }
  };

  downloadMine = async (req, res, next) => {
    try {
      const { buffer, filename } = await this.documentService.generateForSelf(
        req.params.type, req.currentUser, req.currentTenant,
        { kind: req.query.kind, paymentId: req.query.payment }, originOf(req),
      );
      sendPdf(res, buffer, filename);
    } catch (err) { next(err); }
  };

  downloadForWard = async (req, res, next) => {
    try {
      const { buffer, filename } = await this.documentService.generateForWard(
        req.params.type, req.params.studentUserId, req.currentUser, req.currentTenant,
        { kind: req.query.kind, paymentId: req.query.payment }, originOf(req),
      );
      sendPdf(res, buffer, filename);
    } catch (err) { next(err); }
  };

  verify = async (req, res, next) => {
    try {
      res.json(await this.documentService.verifyDocument(req.params.code));
    } catch (err) { next(err); }
  };
}
