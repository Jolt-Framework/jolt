import axios from 'axios';

const URL_API_GATEWAY = ".functions";

export const getNotes = (callback) => {
  // axios.get(URL_API_GATEWAY + '/getnotes')
  // .then((res) => res.data)
  // .then(({ body }) => {
  //   let allNotes = JSON.parse(body).notes;
  //   callback(allNotes)
  // });
  axios.get(URL_API_GATEWAY + '/getNotes')
    .then(({data}) => callback(data.notes));
}
export const createNote = async (newNote, callback) => {
  axios.post(URL_API_GATEWAY + '/createNote', newNote)
    .then(response => {
      console.log("this is the response", response);
      callback();
    })
    .catch(err => console.log(err));
  // fetch(URL_API_GATEWAY + '/createnote', newNote)
  //   .then((response) => console.log(response))
  //   .catch(err => console.log(err))
}

export const updateNote = async (updateNote, noteId, callback) => {
  // const {data} = await axios.post('/.netlify/functions/updateNote', updateNote);
  // return data;
  await axios.post(URL_API_GATEWAY + "/updateNote", {id: noteId, data: updateNote })
    .then(res => {
      console.log("this is the update note response:", res)
      callback();
    })
    .catch(err => console.log("There was an error updating your note. Please try again."));
}

export const deleteNote = async (noteId, callback) => {
  await axios.post(URL_API_GATEWAY + "/deleteNote", {id: noteId})
    .then(res => {
      console.log("this is the response:", res);
      callback();
    })
    .catch(err => console.log("Could not delete note:", err))

  // fetch
  // fetch(URL_API_GATEWAY + "/deletenote", {
  //   mode: 'cors',
  //   headers: {
  //     'Access-Control-Allow-Origin':'*'
  //   },
  //   method: "DELETE",
  //   body: data
  // }).then(res => console.log(res));
}
