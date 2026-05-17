const { AppException } = require('../shared/errors/AppError');

function validate(schema) {
  return function (req, res, next) {
    const body = req.body || {};
    const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map(d => d.message).join('; ');
      return next(new AppException(details, 400));
    }
    req.body = value;
    return next();
  };
}

module.exports = { validate };
