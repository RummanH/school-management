export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  list = async (req, res, next) => {
    try {
      res.json({ users: await this.userService.list(req.currentUser) });
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      const users = await this.userService.create(req.body, req.currentUser);
      res.status(201).json({ users });
    } catch (err) { next(err); }
  };

  update = async (req, res, next) => {
    try {
      const users = await this.userService.update(req.params.id, req.body, req.currentUser);
      res.json({ users });
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      const users = await this.userService.remove(req.params.id, req.currentUser);
      res.json({ users });
    } catch (err) { next(err); }
  };

  resetPassword = async (req, res, next) => {
    try {
      const result = await this.userService.resetPassword(req.params.id, req.currentUser);
      res.json(result);
    } catch (err) { next(err); }
  };
}
