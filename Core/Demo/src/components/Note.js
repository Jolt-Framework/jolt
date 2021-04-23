import React, { useState } from 'react';
import useInput from "../hooks/useInput";
import { updateNote } from "../api/apiClient";

const Note = ({ noteData, onDelete}) => {
  const { title, description, dueDate, id } = noteData;
  const [ editing, setEditing ] = useState(false);
  const titleInput = useInput(title);
  const descriptionInput = useInput(description);
  const dateInput = useInput(dueDate);

  const submitNote = e => {
    e.preventDefault();
    const note = {
      title: titleInput.value,
      description: descriptionInput.value,
      dueDate: dateInput.value,
    }

    updateNote(note, id, () => {
      toggleEdit();
    });
  }

  const toggleEdit = () => {
    setEditing(!editing);
  }

  return (
    <>
      <li>
        { editing ?
        <div>
          <form onSubmit={submitNote}>
            <label>Title
              <input type="text" defaultValue={title} {...titleInput.bind} />
            </label>
            <label>Description
              <input type="text" defaultValue={description} {...descriptionInput.bind} />
            </label>
            <label>Due Date
              <input type="date" defaultValue={dueDate} {...dateInput.bind} />
            </label>
          </form>
          <button onClick={submitNote}>Save</button>
          <button onClick={toggleEdit}>Cancel</button>
        </div>
          :
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
          <p>{dueDate}</p>
          <button onClick={() => onDelete(noteData)}>Delete</button>
          <button onClick={toggleEdit}>Edit</button>
        </div>
        }
      </li>
    </>
  )
}


export default Note;