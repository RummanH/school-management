export class GalleryController {
  constructor(galleryService) {
    this.galleryService = galleryService;
  }

  listPublic = async (req, res, next) => {
    try {
      res.json({ items: await this.galleryService.list() });
    } catch (err) { next(err); }
  };

  listAll = async (req, res, next) => {
    try {
      res.json({ items: await this.galleryService.list() });
    } catch (err) { next(err); }
  };

  create = async (req, res, next) => {
    try {
      const items = await this.galleryService.create(req.body);
      res.status(201).json({ items });
    } catch (err) { next(err); }
  };

  update = async (req, res, next) => {
    try {
      const items = await this.galleryService.update(req.params.id, req.body);
      res.json({ items });
    } catch (err) { next(err); }
  };

  remove = async (req, res, next) => {
    try {
      res.json({ items: await this.galleryService.remove(req.params.id) });
    } catch (err) { next(err); }
  };
}
