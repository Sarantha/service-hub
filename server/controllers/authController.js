const AuthService = require('../services/authService');

/**
 * Handle user signup POST request.
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, branchId } = req.body;
    
    const user = await AuthService.registerUser({ name, email, password, role, branchId });

    res.status(201).json({
      success: true,
      message: 'Account profile initialized successfully.',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user credential verification POST request.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const payload = await AuthService.loginUser({ email, password });

    res.status(200).json({
      success: true,
      message: 'User credentials validated successfully.',
      data: payload
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mock endpoint to verify the validity of bearer tokens.
 */
exports.testProtected = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Access granted. Your security token is valid.',
      data: {
        currentUser: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};
