export class NoticeController {
  constructor(noticeService) {
    this.noticeService = noticeService;
  }

  listPublic = async (req, res, next) => {
    try {
      res.json({ notices: await this.noticeService.listPublic(req.query.type) });
    } catch (err) { next(err); }
  };

  listFeed = async (req, res, next) => {
    try {
      res.json({ notices: await this.noticeService.listFeedForUser(req.currentUser) });
    } catch (err) { next(err); }
  };

  listAll = async (req, res, next) => {
    try {
      res.json({ notices: await this.noticeService.listAll() });
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      const notices = await this.noticeService.create(req.body, req.currentUser);
      res.status(201).json({ notices });
    } catch (err) { next(err); }
  };

  update = async (req, res, next) => {
    try {
      const notices = await this.noticeService.update(req.params.id, req.body, req.currentUser);
      res.json({ notices });
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      res.json({ notices: await this.noticeService.remove(req.params.id) });
    } catch (err) { next(err); }
  };
}
