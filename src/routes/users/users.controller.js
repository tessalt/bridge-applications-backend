const { validationResult } = require("express-validator/check");
const database = require("../../db");
const User = require("./users.model");
const IdentifyingInfo = require("../identifyingInfo/identifyingInfo.model");
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
  }
}

const index = (req, res, next) => {
  User.query()
    .eager("identifying_info")
    .then(users => res.json({ data: users }))
    .catch(error => next(error));
};

const get = (req, res, next) => {
  return User.query()
    .where("users.id", req.params.id)
    .eager("identifying_info")
    .then(users => {
      if (users.length > 0) {
        return res.json({
          data: users[0]
        });
      }
      throw new NotFoundError("Unable to find user");
    })
    .catch(error => next(error));
};

const create = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return User.insertUser(req.body)
    .then(user => {
      const { identifying_info } = req.body;
      user.identifying_info = identifying_info;
      if (identifying_info.length) {
        const names = identifying_info.map(i => i.name);
        return IdentifyingInfo.getInfoWithNames(names)
          .then(existing_info => {
            if (existing_info.length === identifying_info.length) {
              return existing_info.map(i => i.id);
            }
            const new_info = req.body.identifying_info
              .filter(info => !existing_info.find(i => i.name === info.name))
              .map(i => ({ name: i.name, is_gender: i.is_gender || false }));
            return database("identifying_info")
              .insert(new_info)
              .returning("id");
          })
          .then(info_ids => {
            return database("user_identifying_info").insert(
              info_ids.map(id => ({
                identifying_info_id: id,
                user_id: user.id
              }))
            );
          })
          .then(() => {
            return res.json(user);
          });
      }
      return res.json(user);
    })
    .catch(error => next(error));
};

const update = (req, res, next) => {
  const unused = null;
  console.log('some fake code');
};

module.exports = {
  index,
  get,
  update,
  create
};
