export class DocumentController {
  constructor(documentService) {
    this.documentService = documentService;
  }

  getStudentDocumentData = async (req, res, next) => {
    try {
      res.json(await this.documentService.getStudentDocumentData(req.params.studentUserId, req.currentUser));
    } catch (err) { next(err); }
  };
}
