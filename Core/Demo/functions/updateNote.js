const faunadb = require("faunadb");
const query = faunadb.query;

exports.handler = async (event, context, callback) => {
  event = JSON.parse(event.body);

  const { id, data } = event;

  const client = new faunadb.Client({
    secret: process.env.FAUNA_DB
  });
  try {
    const response = await client.query(
      query.Update(
        query.Ref(query.Collection("notes"), id),
          { data: data }
        )
    );

   return {statusCode: 200, body: JSON.stringify(response)};
  } catch (error) {
    callback(error.message);
  }
}
