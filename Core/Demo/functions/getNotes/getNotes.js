const faunadb = require("faunadb");
const q = faunadb.query;

exports.handler = (event, _context, callback) => {
  console.log("HI");
  try {
    event = JSON.parse(event);
  } catch (error) {
    event = event;
  }
  const client = new faunadb.Client({
    secret: process.env.FAUNA_DB_SECRET_KEY,
  });

  try {
    const response = await client.query(
      q.Paginate(q.Documents(q.Collection('notes'))),
      );

    const somethingElse = response.data.map(ref => q.Get(ref));

    const info = await client.query(somethingElse);
    const docRefs = info.map(({data, ref}) => { return {...data, id: ref.id}});
    return {statusCode: 201, body: JSON.stringify({ notes: docRefs}, null, 1) };
  } catch (error) {
    console.log(error.message);
  }
};
