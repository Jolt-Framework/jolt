import React, { useState, useEffect } from "react";
import * as apiClient from "./api/apiClient";
import './App.css';
import Note from './components/Note';
import NoteForm from './components/NoteForm';

function App() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    apiClient.getNotes((res) => {
      setNotes(res);
    })
  }, []);

  const onDelete = ({id}) => {
    apiClient.deleteNote(id, () => setNotes(notes.filter(note => note.id !== id)))
  }

  return (
    <div>
      <h1>My Notes:</h1>
      <div id="new-note-form">
        <NoteForm />
      </div>
      <ul>
        {notes.map((note) => {
          return <Note key={note.id} noteData={note} onDelete={onDelete}/>
          })
        }
      </ul>
    </div>
  )
}

export default App;
