const faunadb = require("faunadb");
const query = faunadb.query;

exports.handler = async (event, context, callback) => {
  try {
    event = JSON.parse(event.body);
  } catch (error) {
    event = event;
  }
  console.log("here's what's being sent via axios:", event.id);
  const id = event.id;
  const client = new faunadb.Client({
    secret: process.env.FAUNA_DB_SECRET_KEY,
  });

  try {
    await client.query(
      query.Delete (
        query.Ref(query.Collection("notes"), id)
      )
    );
    callback(null, {statusCode: 204});
  } catch (error) {
    callback(error.message);
  }
};