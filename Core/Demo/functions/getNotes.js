const faunadb = require("faunadb");
const q = faunadb.query;

exports.handler = async (event, _context, callback) => {
  try {
    event = JSON.parse(event.body);
  } catch (error) {
    event = event.body;
  }

  const client = new faunadb.Client({
    secret: "fnAEF427OEACACbf49t6UGoWeJ54LKYxzE8P--I0"
  });

  try {
    const response = await client.query(
      q.Paginate(q.Documents(q.Collection('notes'))),
      );

    const somethingElse = response.data.map(ref => q.Get(ref));

    const info = await client.query(somethingElse);
    const docRefs = info.map(({data, ref}) => { return {...data, id: ref.id}});

    return {statusCode: 200, body: JSON.stringify({ notes: docRefs})};
  } catch (error) {
    callback(error.message);
  }
};
