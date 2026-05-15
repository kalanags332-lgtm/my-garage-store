exports.requireAdmin = (req, res, next) => {
  if (req.session.isAdmin) return next();
  res.redirect('/auth/login');
};
