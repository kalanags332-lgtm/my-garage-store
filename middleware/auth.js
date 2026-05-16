/**
 * Requires the user to be logged in as a seller (or admin).
 * Redirects to the seller login page otherwise.
 */
exports.requireSeller = (req, res, next) => {
  if (req.session.sellerId) return next();
  res.redirect('/seller/login');
};

/**
 * Requires the user to be logged in as an admin.
 * Admins have full access to all sellers' data.
 */
exports.requireAdmin = (req, res, next) => {
  if (req.session.isAdmin) return next();
  res.redirect('/auth/login');
};
