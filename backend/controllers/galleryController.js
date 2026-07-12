export class GalleryController {
  constructor(galleryService) {
    this.galleryService = galleryService;
  }

  listPublic = async (req, res, next) => {
    try {
      res.json({ items: await this.galleryService.listPublic(req.query.school) });
    } catch (err) { next(err); }
  };

  listAll = async (req, res, next) => {
    try {
      res.json({ items: await this.galleryService.list(req.currentUser) });
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      const items = await this.galleryService.create(req.body, req.currentUser);
      res.status(201).json({ items });
    } catch (err) { next(err); }
  };

  update = async (req, res, next) => {
    try {
      const items = await this.galleryService.update(req.params.id, req.body, req.currentUser);
      res.json({ items });
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      res.json({ items: await this.galleryService.remove(req.params.id, req.currentUser) });
    } catch (err) { next(err); }
  };
}
