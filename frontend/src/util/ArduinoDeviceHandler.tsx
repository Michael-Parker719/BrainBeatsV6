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
  private hex_file_path: string = " ";
  private stop_signal: boolean = false;
  private buffer: number[] = [];
  private bufferSize = 64; // Must match FFT size
  private eegProcessor = new EEGProcessor();
  private temp1: MusicSettings = {
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
  private temp2: TDebugOptionsObject = {
    debugOption1: false,
    debugOption2: false,
    debugOption3: false,
  };
  // public V6NoteHandler: NoteHandler = new NoteHandler(this.temp1, this.temp2);

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
            let brainWaves = this.eegProcessor.processEEG(this.buffer); // Send last value to update rolling buffer
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
