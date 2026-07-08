export class CommunicationController {
  constructor(communicationService) {
    this.communicationService = communicationService;
  }

  listThreads = async (req, res, next) => {
    try { res.json({ threads: await this.communicationService.listThreads(req.currentUser) }); }
    catch (err) { next(err); }
  };

  getThread = async (req, res, next) => {
    try { res.json(await this.communicationService.getThread(req.currentUser, req.params.threadId)); }
    catch (err) { next(err); }
  };

  createThread = async (req, res, next) => {
    try { res.status(201).json(await this.communicationService.createThread(req.currentUser, req.body)); }
    catch (err) { next(err); }
  };

  reply = async (req, res, next) => {
    try { res.status(201).json(await this.communicationService.reply(req.currentUser, req.params.threadId, req.body)); }
    catch (err) { next(err); }
  };

  recipients = async (req, res, next) => {
    try { res.json({ recipients: await this.communicationService.recipients(req.currentUser, req.query.role || '') }); }
    catch (err) { next(err); }
  };
}