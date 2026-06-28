export class ContactController {
  constructor(contactService) {
    this.contactService = contactService;
  }

  submit = async (req, res, next) => {
    try {
      const result = await this.contactService.submit(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}
