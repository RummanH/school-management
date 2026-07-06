export class StudentController {
  constructor(studentService) {
    this.studentService = studentService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ students: await this.studentService.list(req.currentUser) });
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      const { students, userId } = await this.studentService.create(req.body, req.currentUser);
      res.status(201).json({ students, userId });
    } catch (err) { next(err); }
  };

  update = async (req, res, next) => {
    try {
      const students = await this.studentService.update(req.params.userId, req.body, req.currentUser);
      res.json({ students });
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      const students = await this.studentService.remove(req.params.userId, req.currentUser);
      res.json({ students });
    } catch (err) { next(err); }
  };
}
