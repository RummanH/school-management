export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ message: "Authentication required." });
    }
    if (!roles.includes(req.currentUser.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }
    next();
  };
}
