const ApiError = require('../utils/ApiError');

/**
 * Joi validation middleware.
 * validate(schema)            -> validates req.body
 * validate(schema, 'query')   -> validates req.query
 * Unknown keys are stripped and validated values replace the originals.
 */
const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      return next(ApiError.badRequest(details[0].message, details));
    }

    if (source === 'query') {
      // req.query is a getter in Express 5; assign keys for forward-compatibility
      Object.keys(req.query).forEach((k) => delete req.query[k]);
      Object.assign(req.query, value);
    } else {
      req[source] = value;
    }
    next();
  };

module.exports = validate;
