export class GuardianController {
  constructor(guardianService) {
    this.guardianService = guardianService;
  }

  // Guardian self-service
  myWards = async (req, res, next) => {
    try {
      res.json({ wards: await this.guardianService.listWards(req.currentUser) });
    } catch (err) { next(err); }
  };

  wardResults = async (req, res, next) => {
    try {
      const results = await this.guardianService.getWardResults(req.currentUser, req.params.studentUserId);
      res.json({ results });
    } catch (err) { next(err); }
  };

  wardAttendance = async (req, res, next) => {
    try {
      const summary = await this.guardianService.getWardAttendance(req.currentUser, req.params.studentUserId);
      res.json({ summary });
    } catch (err) { next(err); }
  };

  // Admin link management
  listWardLinks = async (req, res, next) => {
    try {
      const studentUserIds = await this.guardianService.listWardLinks(req.params.guardianId, req.currentUser);
      res.json({ studentUserIds });
    } catch (err) { next(err); }
  };

  linkWard = async (req, res, next) => {
    try {
      const studentUserIds = await this.guardianService.linkWard(req.params.guardianId, req.body.studentUserId, req.currentUser);
      res.status(201).json({ studentUserIds });
    } catch (err) { next(err); }
  };

  unlinkWard = async (req, res, next) => {
    try {
      const studentUserIds = await this.guardianService.unlinkWard(req.params.guardianId, req.params.studentUserId, req.currentUser);
      res.json({ studentUserIds });
    } catch (err) { next(err); }
  };

  // Reverse lookup — for the student form's "Linked Guardian Account" picker
  listGuardiansForStudent = async (req, res, next) => {
    try {
      const guardians = await this.guardianService.listGuardiansForStudent(req.params.studentUserId, req.currentUser);
      res.json({ guardians });
    } catch (err) { next(err); }
  };
}
