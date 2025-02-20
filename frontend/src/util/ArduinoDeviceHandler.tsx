/* This code will obtain data from the device and pass it off to the music generation
 as a single line array. 
 Arduino Uploader Library: https://github.com/dbuezas/arduino-web-uploader 
 Web Serial Port Library: https://github.com/WICG/serial
 */

import { upload, boards } from "web-arduino-uploader/dist/index.js";
import EEGProcessor from "./EEGProcessor";

// import { NoteHandler } from "./MusicGeneration/Algorithms/MAV6Test/NoteGeneration";

import { TDebugOptionsObject } from "./Types";
import { MusicSettings } from "./Interfaces";

export class ArduinoDeviceHandler {
  private hex_file_path: string = "";
  private stop_signal: boolean = false;
  private buffer: number[] = [];
  private bufferSize = 64; // Must be a power of 2 <= the sample rate
  private sampleRate = 128; // Hz
  private eegProcessor = new EEGProcessor(this.bufferSize, this.sampleRate);

  // Set path to hex file to read
  public setHexFilePath(file: string) {
    this.hex_file_path = file;
    return true;
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
    console.log("Listening to Serial Port");
    // read setup
    const filter = { usbVendorId: 0x2341 };
    const port = await navigator.serial.requestPort({ filters: [filter] });
    await port.open({ baudRate: 9600 });
    return port;
  }

  public async process(port: any) {
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
            let brainWaves = this.eegProcessor.processEEG(this.buffer);
            this.buffer = []; // Reset buffer after processing
            console.log(brainWaves);
            return brainWaves;
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

  public async disconnect() {
    const port = await navigator.serial.requestPort();
    await port.close();
  }
}
