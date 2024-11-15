/* This code will obtain data from the device and pass it off to the music generation
 as a single line array. 
 Arduino Uploader Library: https://github.com/dbuezas/arduino-web-uploader 
 Web Serial Port Library: https://github.com/WICG/serial
 */

import { upload, boards } from 'web-arduino-uploader'
import { SerialPort } from 'w3c-web-serial'

export class DeviceHandler
{

 // change below to a public function
 function upload(): void {
  const onProgress = (percentage) => {
    console.log(percentage + '%');
  }
 
  const verify = false; // optional
  const portFilters = {}; // optional, e.g. [{"usbProductId":46388,"usbVendorId":1241}]
  console.log('starting');
 
  // https://brainbeatz.xyz/frontend/src/util/MusicGeneration/Algorithms/FILENAME
  await upload(boards.nanoOldBootloader, 'http://your-site.com/hex-file.hex', onProgress, verify, portFilters);
  
  console.log('done!');
 }

// Listen to the serial port
 function listen(): void {
  // read setup
  const filter = {};
  const port = await navigator.serial.requestPort({ filters: [filter] });
  await port.open({baudRate: 9600})
  
  // reading from port
  while (port.readable) {
   const reader = port.readable.getReader();
   try {
    while (true) {
      const { value, done } = await reader.read();
      console.log(value)
      if (done) {
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
