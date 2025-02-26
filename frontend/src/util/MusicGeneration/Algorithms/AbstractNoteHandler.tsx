<<<<<<< HEAD
import { DataStream4Ch, DataStream8Ch, MusicSettings } from "../../Interfaces";
=======
import {
  DataStream4Ch,
  DataStream8Ch,
  DataStream5Waves,
  MusicSettings,
} from "../../Interfaces";
>>>>>>> main
import { TDebugOptionsObject } from "../../Types";

/* This abstract class contains all named functions that must be implemented in your new notehandler class
for any new music generation algorithm.*/
<<<<<<< HEAD
export abstract class AbstractNoteHandler 
{

    protected debugOutput:boolean;
    protected stopFlag:boolean = false;

    constructor(settings:MusicSettings, debugOptionsObject: TDebugOptionsObject)
    {
        this.debugOutput = debugOptionsObject.debugOption2;
    }

    public abstract originalNoteGeneration(EEGdataObj: DataStream8Ch|DataStream4Ch) : any;

    public abstract returnMIDI(): Promise<Uint8Array>;

    public setDebugOutput(b: boolean)
    {
        this.debugOutput = b;
        if (this.debugOutput) console.log("Setting Notehandler debug to ", b);
    }

    public setStopFlag()
    {
        this.stopFlag = true;
    }

}
=======
export abstract class AbstractNoteHandler {
  protected debugOutput: boolean;
  protected stopFlag: boolean = false;

  constructor(
    settings: MusicSettings,
    debugOptionsObject: TDebugOptionsObject
  ) {
    this.debugOutput = debugOptionsObject.debugOption2;
  }

  public abstract originalNoteGeneration(
    EEGdataObj: DataStream8Ch | DataStream4Ch | DataStream5Waves
  ): any;

  public abstract returnMIDI(): Promise<Uint8Array>;

  public setDebugOutput(b: boolean) {
    this.debugOutput = b;
    if (this.debugOutput) console.log("Setting Notehandler debug to ", b);
  }

  public setStopFlag() {
    this.stopFlag = true;
  }
}
>>>>>>> main
