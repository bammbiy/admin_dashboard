const crypto = require('crypto');

const ITERATIONS = 120000;
const KEY_LENGTH = 48;
const DIGEST = 'sha512';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');

  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const candidate = hashPassword(password, salt).hash;
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

module.exports = {
  hashPassword,
  verifyPassword
};
