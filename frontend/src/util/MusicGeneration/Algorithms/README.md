# Adding a new algorithm to the app

There are 4 major things that must be done so that your new algorithm can be used inside the app.

1) create a new folder with the music generation algorithms name
2) add the exact same name you used for the folder to the array found in names.json
3) you must have a file inside the algorithms folder titles NoteGeneration.tsx.
4) inside your NoteGeneration.tsx file must be a class called NoteHandler that implements the abstract NoteHandler class with the functions originalNoteGeneration that takes in the 8 channel datastream from the EEG and returnMidi that returns a MIDI as a Uint8 array

Apart from these four major things feel free to implement helper functions, files, or whatever else you may need inside that algorithms folder to keep things organized