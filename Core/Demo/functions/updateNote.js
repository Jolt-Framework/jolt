const faunadb = require("faunadb");
const query = faunadb.query;

exports.handler = async (event, context, callback) => {
  try {
    event = JSON.parse(event.body);
  } catch (error) {
    event = event;
  }
  const { id, data } = event;
  console.log(event, id, data);
  const client = new faunadb.Client({
    secret: process.env.FAUNA_DB_SECRET_KEY,
  });
  try {
    const response = await client.query(
      query.Update(
        query.Ref(query.Collection("notes"), id),
          { data: data }
        )
    );
    callback(null, {statusCode: 200, body: JSON.stringify(response)});
  } catch (error) {
    callback(error.message);
  }
}