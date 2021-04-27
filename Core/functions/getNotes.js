const faunadb = require("faunadb");
const q = faunadb.query;

exports.handler =  async (_event, _context, callback) => {
  const client = new faunadb.Client({
    secret: "fnAEF427OEACACbf49t6UGoWeJ54LKYxzE8P--I0",
  });
  console.log("test");
  try {
    const response = await client.query(
      q.Paginate(q.Documents(q.Collection('notes'))),
      );

    const somethingElse = response.data.map(ref => q.Get(ref));

    const info = await client.query(somethingElse);
    const docRefs = info.map(({data, ref}) => { return {...data, id: ref.id}});
    return callback(null, {statusCode: 201, body: JSON.stringify({ notes: docRefs}, null, 1) });
  } catch (error) {
    callback(error.message);
  }
};
