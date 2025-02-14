import React, { MouseEvent } from "react";
import { DeviceHandler } from "../util/DeviceHandler";

const hexFilePath = "/MindControl3.ino.hex";

// Page for testing the arduino Uno
const DeviceTestPage = () => {
  const device = new DeviceHandler();

  // Handles button (source: https://felixgerschau.com/react-typescript-onclick-event-type/)
  // Performs a function onClick
  const onClickFunc = async (e: MouseEvent<HTMLButtonElement>) => {
    // setting file path for hex
    console.log("Setting Hex Path");
    device.setHexFilePath(hexFilePath);

    // upload arduino code
    console.log("Uploading Script");
    await device.uploadToArduino();

    // listen to serial output
    console.log("Listening to Serial Port");
    device.listen();
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
