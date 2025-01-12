/* This code will obtain data from the device and pass it off to the music generation
 as a single line array. 
 Arduino Uploader Library: https://github.com/dbuezas/arduino-web-uploader 
 Web Serial Port Library: https://github.com/WICG/serial
 */

import { upload, boards } from 'web-arduino-uploader/dist/index.js';
// import { SerialPort } from 'w3c-web-serial'

export class DeviceHandler
{
 private hex_file_path: string = ' ';
 private stop_signal: boolean = false;

 // Set path to hex file to read
 public setHexFilePath(file: string){
  this.hex_file_path = file;
  return true;
 }

 public stop(){
  this.stop_signal = true;
 }

 // change below to a public function
 public async uploadToArduino() : Promise<boolean> {
  const onProgress = (percentage:number) => {
    console.log(percentage + '%');
  }
 
  const verify = false; // optional
  const portFilters = {}; // optional, e.g. [{"usbProductId":46388,"usbVendorId":1241}]
  console.log('starting');
 
  try{
   await upload(boards.uno, this.hex_file_path, onProgress, verify);
  } catch (e){
   console.log(e)
   return false;
  }
  
  console.log('done!');
  return true;
 }

// Listen to the serial port
 public async listen() {
  // read setup
  const filter = {usbVendorId: 0x2341};
  const port = await navigator.serial.requestPort({ filters: [filter] });
  await port.open({baudRate: 9600})
  
  // reading from port
  while (port.readable) {
   const reader = port.readable.getReader();
   try {
    while (true) {
      const { value, done } = await reader.read();
      console.log(value)
      if (done || this.stop_signal) {
       // |reader| has been canceled.
       break;
      }
       // Do something with |value|...
    }
   } catch (error) {
     // Handle |error|...
     console.log("error")
   } finally {
     reader.releaseLock();
   }
  }
}
 
}
