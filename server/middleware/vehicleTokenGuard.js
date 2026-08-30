const { verifyVehicleToken } = require('../utils/vehicleTokenUtil');

/**
 * Verifies the signed portal token in req.params.token and attaches the
 * decoded vehicleRegNo to req.vehicleRegNo. Every customer-mutation portal
 * route uses this so the controller/service never trusts a client-supplied
 * vehicle identity from the request body — the token is the sole source of
 * truth for "which vehicle is this customer", satisfying the portal's
 * "scoped strictly to their own vehicle/token" access model.
 */
const vehicleTokenGuard = (req, res, next) => {
  try {
    const decoded = verifyVehicleToken(req.params.token);
    req.vehicleRegNo = decoded.regNo;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = vehicleTokenGuard;
