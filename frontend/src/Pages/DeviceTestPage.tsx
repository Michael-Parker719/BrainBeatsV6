import React, { MouseEvent } from "react";
import { ConcreteArduinoUnoStream } from "../util/DeviceAbstractFactory";
import { useState, useEffect } from "react";
import { MusicSettings } from "../util/Interfaces";

const hexFilePath = "/MindControl3.ino.hex";

// Page for testing the arduino Uno
const DeviceTestPage = () => {
  var settings: MusicSettings = {
    deviceSettings: {
      instruments: {
        _00: 0,
        _01: 0,
        _02: 0,
        _03: 0,
        _04: 0,
        _05: 0,
        _06: 0,
        _07: 0,
      },

      durations: {
        _00: 2,
        _01: 2,
        _02: 2,
        _03: 2,
        _04: 2,
        _05: 2,
        _06: 2,
        _07: 2,
      },
    },

    octaves: 1,
    numNotes: 7,
    bpm: 120,
    keyGroup: "Major",
    scale: "A",
  };

  const [debugOption1, setDebugOption1] = useState(false);
  const [debugOption2, setDebugOption2] = useState(false);
  const [debugOption3, setDebugOption3] = useState(false);

  var debugOptionObject = {
    debugOption1,
    debugOption2,
    debugOption3,
  };

  let NoteHandler = import(
    "../util/MusicGeneration/Algorithms/MAV6Test/NoteGeneration"
  );

  //more fragments from having separate enhancers

  let Enhancer = "None";

  const device = new ConcreteArduinoUnoStream(
    settings,
    debugOptionObject,
    NoteHandler,
    Enhancer
  );

  // Handles button (source: https://felixgerschau.com/react-typescript-onclick-event-type/)
  // Performs a function onClick
  const onClickFunc = async (e: MouseEvent<HTMLButtonElement>) => {
    // setting file path for hex
    console.log("Setting Hex Path");
    device.setHexFilePath(hexFilePath);

    // upload arduino code
    console.log("Uploading Script");
    await device.initializeConnection();

    // listen to serial output
    console.log("Listening to Serial Port");
    device.recordInputStream();
    console.log("fin");
  };

  return (
    <div>
      <h1> This is a Testing Page</h1>

      {/* <input type="button" onClick = { () => alert('Uploading Script') } value="click" id="coolbutton"></input> */}

      <button onClick={onClickFunc}>Upload Code</button>
    </div>
  );
};
export default DeviceTestPage;
