const faunadb = require("faunadb");
const query = faunadb.query;

exports.handler = async (event, context, callback) => {
  const data = event;
  let res;
  try {
    const client = new faunadb.Client({
      secret: "fnAEF427OEACACbf49t6UGoWeJ54LKYxzE8P--I0",
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
    callback(error.message);
  }

  try {
    console.log(res);
  } catch (error) {
    callback(error.message);
  }
};