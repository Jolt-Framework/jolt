const faunadb = require("faunadb");
const query = faunadb.query;

exports.handler = async (event, context, callback) => {
  const { id, data } = event;
  console.log(event, id, data);
  const client = new faunadb.Client({
    secret: "fnAEF427OEACACbf49t6UGoWeJ54LKYxzE8P--I0",
  });
  try {
    const response = await client.query(
      query.Update(query.Ref(query.Collection("notes"), id), { data: data })
    );
    return callback(null, { statusCode: 200, body: JSON.stringify(response) });
  } catch (error) {
    console.log("Error:", error.message);
  }
};
