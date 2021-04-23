/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable node/exports-style */
/* eslint-disable promise/prefer-await-to-callbacks */

exports.handler = (event, context, callback ) => {
  callback(null, JSON.stringify({statusCode: 200, body: {success: true}}));
}