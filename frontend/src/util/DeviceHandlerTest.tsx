import { DeviceHandler } from './DeviceHandler';

const device = new DeviceHandler();

export async function testRun(){
  // setting file path for hex
  device.setHexFilePath("path");

  // upload arduino code
  await device.upload()

  // listen to serial output
  device.listen()
} 


