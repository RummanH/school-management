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

  olderMessages = async (req, res, next) => {
    try { res.json(await this.communicationService.listOlderMessages(req.currentUser, req.params.threadId, req.query.before)); }
    catch (err) { next(err); }
  };

  editMessage = async (req, res, next) => {
    try { res.json(await this.communicationService.editMessage(req.currentUser, req.params.messageId, req.body)); }
    catch (err) { next(err); }
  };

  deleteMessage = async (req, res, next) => {
    try { res.json(await this.communicationService.deleteMessage(req.currentUser, req.params.messageId)); }
    catch (err) { next(err); }
  };

  renameGroup = async (req, res, next) => {
    try { res.json(await this.communicationService.renameGroup(req.currentUser, req.params.threadId, req.body)); }
    catch (err) { next(err); }
  };

  addGroupMembers = async (req, res, next) => {
    try { res.json(await this.communicationService.addGroupMembers(req.currentUser, req.params.threadId, req.body)); }
    catch (err) { next(err); }
  };

  removeGroupMember = async (req, res, next) => {
    try { res.json(await this.communicationService.removeGroupMember(req.currentUser, req.params.threadId, req.params.userId)); }
    catch (err) { next(err); }
  };
}