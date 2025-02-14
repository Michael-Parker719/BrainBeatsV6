import { DataStream4Ch, DataStream8Ch, Brainwaves, MusicSettings } from "../../Interfaces";
import { TDebugOptionsObject } from "../../Types";

/* This abstract class contains all named functions that must be implemented in your new notehandler class
for any new music generation algorithm.*/
export abstract class AbstractNoteHandler 
{

    protected debugOutput:boolean;
    protected stopFlag:boolean = false;

    constructor(settings:MusicSettings, debugOptionsObject: TDebugOptionsObject)
    {
        this.debugOutput = debugOptionsObject.debugOption2;
    }

    public abstract originalNoteGeneration(EEGdataObj: DataStream8Ch|DataStream4Ch|Brainwaves) : any;

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