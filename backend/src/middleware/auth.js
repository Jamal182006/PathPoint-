import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized: User profile not found in database',
        });
      }

      if (user.status === 'suspended' || user.isArchived) {
        return res.status(403).json({
          success: false,
          message: user.isArchived ? 'Account is archived. Contact support if you need access restored.' : 'Account is suspended. Please contact career services.',
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('[Auth Middleware] Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized: Invalid or expired token',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No authentication token provided',
    });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Account lacks administrative privileges.',
    });
  }
};

export const approvedProviderOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'provider') {
    return res.status(403).json({ success: false, message: 'Only provider accounts can access this resource' });
  }
  if (req.user.status !== 'active' || req.user.isArchived) {
    return res.status(403).json({ success: false, message: 'Provider account is not active' });
  }
  if (req.user.businessVerification?.status !== 'approved') {
    return res.status(403).json({ success: false, message: 'Provider verification approval is required' });
  }
  return next();
};

export const applicantOnly = (req, res, next) => {
  if (req.user?.role === 'user') return next();
  return res.status(403).json({ success: false, message: 'Applicant account access is required' });
};
