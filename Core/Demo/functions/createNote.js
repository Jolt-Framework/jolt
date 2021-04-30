const faunadb = require("faunadb");
const query = faunadb.query;

exports.handler = async (event, context, callback) => {
  try {
    event = JSON.parse(event.body)
  } catch (error) {
    event = event;
  }
  
  const data = event;
  let res;
  try {
    const client = new faunadb.Client({
      secret: process.env.FAUNA_DB_SECRET_KEY,
    });
    res = await client.query(
        query.Create(
          query.Collection("notes"),
          {data: data}
          )
      );
      console.log(res);
      return callback(null, {statusCode: 200, body: JSON.stringify({ id: res.ref.id,  ...res.data })});
  } catch (error) {
    console.log("There was an error:");
    console.log(error.message);
  }

  try {
    console.log(res);
  } catch (error) {
    console.log(error.message);
  }
};