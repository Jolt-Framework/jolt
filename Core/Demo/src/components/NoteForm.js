import React from "react";
import { createNote } from "../api/apiClient";
import useInput from "../hooks/useInput";

const NoteForm = () => {
  const titleInput = useInput("");
  const descriptionInput = useInput("");
  const dateInput = useInput("");

  const submitNote = e => {
    e.preventDefault();
    const note = {
      title: titleInput.value,
      description: descriptionInput.value,
      dueDate: dateInput.value,
    }

    createNote(note, () => {
      [titleInput,
      descriptionInput,
      dateInput].forEach(i => i.reset());
    });

    // create note
    // var serverClient = new faunadb.Client({ secret: "fnAEF427OEACACbf49t6UGoWeJ54LKYxzE8P--I0" });
    // serverClient.query(
    //   q.Create(
    //     q.Collection('notes'),
    //     { data: note },
    //   )
    // )
    // .then((ret) => console.log(ret));
  }

  return (
    <form onSubmit={submitNote}>
      <label>Title
        <input type="text" {...titleInput.bind}/>
      </label>
      <label>Description
        <input type="text" {...descriptionInput.bind} />
      </label>
      <label>Set Due Date
        <input type="date" {...dateInput.bind} />
      </label>
      <button>Submit Note</button>
    </form>
  )
}

export default NoteForm;