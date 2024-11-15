// Code to test DeciveHandler
/* run with code below in the browser console
import {testRun} from "DeviceHandlerTester";
testRun();
*/
import { DeviceHandler } from './DeviceHandler';

const device = new DeviceHandler();

export async function testRun(){
  // setting file path for hex
  device.setHexFilePath("./MindControl3/build/arduino.avr.uno/MindControl3.ino.hex");

  // upload arduino code
  await device.uploadToArduino();

  // listen to serial output
  await device.listen();
  console.log("fin");
} 


