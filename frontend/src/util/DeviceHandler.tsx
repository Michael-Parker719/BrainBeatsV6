/* This code will obtain data from the device and pass it off to the music generation
 as a single line array. 
 Arduino Uploader Library: https://github.com/dbuezas/arduino-web-uploader 
 Web Serial Port Library: https://github.com/WICG/serial
 */

import { upload, boards } from "web-arduino-uploader/dist/index.js";
import EEGProcessor from "./EEGProcessor";
//Alex Update Import
// import V6NoteHandler from "../MusicAlgorithms/V6NoteHandler";

export class DeviceHandler {
  private hex_file_path: string = " ";
  private stop_signal: boolean = false;
  private buffer: number[] = [];
  private bufferSize = 64; // Must match FFT size
  private eegProcessor = new EEGProcessor();
  public V6NoteHandler: any;

  // Set path to hex file to read
  public setHexFilePath(file: string) {
    this.hex_file_path = file;
    return true;
  }

  public stop() {
    this.stop_signal = true;
  }

  // change below to a public function
  public async uploadToArduino(): Promise<boolean> {
    const onProgress = (percentage: number) => {
      console.log(percentage + "%");
    };

    const verify = false; // optional
    const portFilters = {}; // optional, e.g. [{"usbProductId":46388,"usbVendorId":1241}]
    console.log("starting");

    try {
      await upload(boards.uno, this.hex_file_path, onProgress, verify);
    } catch (e) {
      console.log(e);
      return false;
    }

    console.log("done!");
    return true;
  }

  // Listen to the serial port
  public async listen() {
    // read setup
    const filter = { usbVendorId: 0x2341 };
    const port = await navigator.serial.requestPort({ filters: [filter] });
    await port.open({ baudRate: 9600 });

    // reading from port
    while (port.readable) {
      const reader = port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          // console.log(value);
          if (done || this.stop_signal) {
            // |reader| has been canceled.
            break;
          }
          if (!isNaN(value)) {
            console.log("Adding value");
            this.buffer.push(value);
          }

          // When buffer is full, process EEG and reset buffer
          if (this.buffer.length >= this.bufferSize) {
            console.log("Starting processing");
            let brainWaves = this.eegProcessor.processEEG(this.buffer); // Send last value to update rolling buffer
            this.buffer = []; // Reset buffer after processing
            console.log(brainWaves);
            // this.V6NoteHandler.originalNoteGeneration(brainWaves);
            // Might need to add configuration for the music generation (From DeviceAbstractFactory) to define V6NoteHandler
          }
        }
      } catch (error) {
        // Handle |error|...
        console.log("error");
      } finally {
        reader.releaseLock();
      }
    }
  }
}
