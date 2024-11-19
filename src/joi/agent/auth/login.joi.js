const joi = require('joi');

const schema = joi.object().keys({
  email: joi.string().email().required(),
  password: joi.string().required(),
});

module.exports = schema;
