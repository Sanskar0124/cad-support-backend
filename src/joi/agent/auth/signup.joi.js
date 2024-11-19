const joi = require('joi');

// sample valid data
// {
//     "first_name": "Vianney",
//     "last_name": "Test",
//     "email": "vianney@gmail.com",
//     "password": "Ringover@123",
// }

const schema = joi.object().keys({
  first_name: joi.string().required(),
  last_name: joi.string().required(),
  role: joi.string().required(),
  email: joi.string().email().required(),
  ringover_user_id: joi.number().required(),
});

module.exports = schema;
