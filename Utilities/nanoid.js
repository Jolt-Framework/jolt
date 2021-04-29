const { customAlphabet } = require('nanoid');

const uniqueId = () => {
  const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10);
  return nanoid();
}

module.exports = uniqueId;