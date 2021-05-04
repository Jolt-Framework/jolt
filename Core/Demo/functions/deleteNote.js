const faunadb = require("faunadb");
const query = faunadb.query;

exports.handler = async (event, context, callback) => {
  event = JSON.parse(event.body);

  const id = event.id;

  const client = new faunadb.Client({
    secret: "fnAEF427OEACACbf49t6UGoWeJ54LKYxzE8P--I0"
  });

  try {
    await client.query(
      query.Delete (
        query.Ref(query.Collection("notes"), id)
      )
    );
    return {statusCode: 204};
  } catch (error) {
    callback(error.message);
  }
};
