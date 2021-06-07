
const faunadb = require("faunadb");
const query = faunadb.query;

exports.handler = async (event, context, callback) => {
  const data = JSON.parse(event.body);

  let res;
  try {
    const client = new faunadb.Client({
      secret: process.env.FAUNA_DB
    });

    res = await client.query(
      query.Create(
        query.Collection("notes"),
        {data: data}
      )
    );

    return {statusCode: 200, body: JSON.stringify({ id: res.ref.id,  ...res.data })};
  } catch (error) {
    console.log("There was an error:");
    console.log(error.message);
  }
}
