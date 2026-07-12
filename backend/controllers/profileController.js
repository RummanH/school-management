export class ProfileController {
  constructor(profileService) {
    this.profileService = profileService;
  }

  getProfile = async (req, res, next) => {
    try {
      res.json(await this.profileService.getProfile(req.currentUser));
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req, res, next) => {
    try {
      res.json(await this.profileService.updateProfile(req.currentUser, req.body));
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req, res, next) => {
    try {
      res.json(await this.profileService.changePassword(req.currentUser, req.body));
    } catch (err) {
      next(err);
    }
  };
}
