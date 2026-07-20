export class TeacherController {
  constructor(teacherService) {
    this.teacherService = teacherService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ teachers: await this.teacherService.list(req.currentUser) });
    } catch (err) { next(err); }
  };

  listPublic = async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 12, 24);
      res.json({ teachers: await this.teacherService.listPublic(req.query.school, limit) });
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      const teachers = await this.teacherService.create(req.body, req.currentUser);
      res.status(201).json({ teachers });
    } catch (err) { next(err); }
  };

  update = async (req, res, next) => {
    try {
      const teachers = await this.teacherService.update(req.params.userId, req.body, req.currentUser);
      res.json({ teachers });
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      const teachers = await this.teacherService.remove(req.params.userId, req.currentUser);
      res.json({ teachers });
    } catch (err) { next(err); }
  };
}
