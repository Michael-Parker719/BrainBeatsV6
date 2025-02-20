import {
  getNoteLengthStringFromInt,
  getMillisecondsFromBPM,
  GetFloorOctave,
  getFrequencyFromNoteOctaveString,
} from "../.././MusicHelperFunctions";

import * as Constants from "../../../Constants";
import {
  CytonSettings,
  GanglionSettings,
  MusicSettings,
  //DataStream8Ch,
  //DataStream4Ch,
  DataStream5Waves,
} from "../../../Interfaces";

import { KeyGroups, Keys } from "../../../Enums";
import { MIDIManager } from "./MIDIManager";
import { TDebugOptionsObject } from "../../../Types";
import { AbstractNoteHandler } from "../AbstractNoteHandler";
//import { faL } from "@fortawesome/free-solid-svg-icons";

export class NoteHandler extends AbstractNoteHandler {
  // Universally used settings
  private numNotes: number = 21; //default in old version
  private BPM: number = 0;
  private keyGroup: number;
  private scale: number;
  private octaves: number;
  private keySignature;

  musicClock: number;

  private currentNoteData: Array<any> = [null, null, null, null, null]; //Holds Note type format of next note to generate(per track)
  private timeForEachNoteArray: Array<number>; //Constant Array
  private EEGaverage: Array<number> = [0, 0, 0, 0, 0];

  private rangeOfNorm: Array<number> = [1,1,10,10,10];//Range zone from average that is consider not Anomlous
  private AnomlousStreak: Array<number> = []; //Anomlous Data consecutive appearence counter
  private AnomlousWeight: Array<number> = []; //Data Skew Value
  private AnomlousStreakMax: number = 5; //------[!!!]------//Temporary value---
  private AnomlousWeightMax: number = 5; //------[!!!]------//Temporary value---

  private EEGbuffer: number[][] = []; //buffer if note generation is busy to generate the next note
  private EEGabnormalRecord: number[][] = []; //average adjustment case 1: Outlier streak towards one side[higher or lower]
  private EEGabnormalTotal: number[][] = []; //average adjustment case 2: Data is skewing towards one side[higher or lower]

  private startUp: boolean = true; //Prevents empty data to note convertion

  private isMajorScale: number = 1;
  private noteSetNumb: number = 5; //Set of sets of notes from a scale(either Major or Minor)

  private instrumentNoteSettings: Array<number>;

  private channelTotal: number = 5; //How many 1-1 ratios(inputted EEG to track) are there?

  private nextPause: Array<number> = [0, 0, 0, 0, 0]; //Wait Counter/Tally
  private pauseCounter: Array<number> = [0, 0, 100, 100, 100]; //Wait Counter maximum
  private NoiseCapacity: number = 3; //Temp value---

  private midiGenerator; //Defines Midi Generator

  public override setStopFlag()
  {
    console.log("stopped");
    clearInterval(this.musicClock);
    this.midiGenerator.setStopFlag();
    this.stopFlag = true;
  }

  constructor(settings: MusicSettings, debugOptionsObject: TDebugOptionsObject)
  {
    super(settings, debugOptionsObject);
    this.debugOutput = debugOptionsObject.debugOption2;
    
    if (this.debugOutput) {
        console.log("Constructing originalNoteGeneration Class with the following settings: ");
        console.log(settings);
    }
    
    //[OLD CODE]
    // Assignments in constructor to counter error messages
    // this.startTime = 0;
    // this.eegPerSecond = undefined;
    // this.prevBeat = 0;

    this.octaves = settings.octaves;
    this.numNotes = 21;
    this.BPM = settings.bpm;

    this.timeForEachNoteArray = this.setTimeForEachNoteArray(this.BPM);

    this.keyGroup = KeyGroups[settings.keyGroup as keyof typeof KeyGroups]; // Example: Major
    this.scale = Keys[settings.scale as keyof typeof Keys]; // Example: C#, full example: C# Major

    this.keySignature = Constants.KEY_SIGNATURES[this.keyGroup][this.scale];
    this.instrumentNoteSettings = Object.values(settings.deviceSettings.durations) as number[];

    this.midiGenerator = new MIDIManager(
      settings,
      this.timeForEachNoteArray,
      debugOptionsObject
    );
    this.stopFlag = false;

    // This has to be assigned in the constructor or else it cannot be cancelled
    this.musicClock = window.setInterval(() =>{
      //   console.log("Hi");
      // this.playNextBeat();
    }, this.timeForEachNoteArray[2]);

    for (var i = 0; i < this.channelTotal; i++)
    {
      this.EEGbuffer.push([]);
      this.EEGabnormalRecord.push([]);
      this.EEGabnormalTotal.push([]);
      this.EEGaverage[i] = 0;
      this.nextPause[i] = 0;
      this.pauseCounter[i] = 0;
      this.AnomlousStreak[i] = 0;
      this.AnomlousWeight[i] = 0;
    }
    this.midiGenerator.setDebugOutput(debugOptionsObject.debugOption3); // debug
  }

  private setTimeForEachNoteArray(BPM: number) {
    return [
      getMillisecondsFromBPM(BPM) / 4,  // Index 0: Sixteenth Note
      getMillisecondsFromBPM(BPM) / 2,  // Index 1: Eighth Note
      getMillisecondsFromBPM(BPM),      // Index 2: Quarter Note
      getMillisecondsFromBPM(BPM) * 2,  // Index 3: Half Note
      getMillisecondsFromBPM(BPM) * 4,  // Index 4: Whole Note
    ];
  }

  //Get average of array
  private average = (arr: Array<number>) => arr.reduce((p, c) => p + c, 0) / arr.length;

  public originalNoteGeneration = async (instream: any) => {
    var inputStream = Object.values(instream) as number[];//Note: All incoming data from the ArdionoUno Headset is already averaged

    if(this.startUp)//Starting average data at the start of recording session
    {
      for (var i = 0; i < this.channelTotal; i++)
      {
        this.EEGaverage[i] = inputStream[i];
      }
      this.startUp = false;
    }

    if(this.stopFlag)
    {
      //Stop recording
      console.log("stopped");
      clearInterval(this.musicClock);
      this.midiGenerator.setStopFlag();
      return;
    }
    
    for(var i = 0; i < this.channelTotal; i++)
    {
      if(this.outlierCheck(i, inputStream[i]))
      {
        this.EEGabnormalRecord[i].push(inputStream[i]);//Abnormal streak -> update to new average value when streak limit reached
        this.EEGabnormalTotal[i].push(inputStream[i])
      }
      this.EEGbuffer[i].push(inputStream[i]);
      this.generateNextBeat(i); //attempt to generate the next beat
    }
    
  };

  //True -> Add to borh EEGabnormalRecord and EEGabnormalTotal and increment according Anomlous Streak | False -> break Abnormal Streak and empty EEGabnormalRecord
  private outlierCheck(idVal: number, inValue: number): boolean
  {
    if(this.EEGaverage[idVal] + this.rangeOfNorm[idVal] < inValue)//Higher Outlier
    {
      if(this.AnomlousStreak[idVal] < 0)//If negative -> Break Lower Outlier streak
      {
        this.AnomlousStreak[idVal] = 1;
        this.EEGabnormalRecord[idVal].splice(0, this.EEGabnormalRecord[idVal].length);//Empty Higher streak record
      }
      else//Increment by 1(positve -> Higher Outlier streak)
      {
        this.AnomlousStreak[idVal] = this.AnomlousStreak[idVal] + 1;
      }

      this.AnomlousWeight[idVal] = this.AnomlousWeight[idVal] + 1;//Add 1 to outlier weight tally(Too many higher outliers in general)
      return true;
    }
    else if(this.EEGaverage[idVal] - this.rangeOfNorm[idVal] > inValue)//Lower Outlier
    {
      if(this.AnomlousStreak[idVal] > 0)//If positive -> Break Higher Outlier streak
      {
        this.AnomlousStreak[idVal] = -1;
        this.EEGabnormalRecord[idVal].splice(0, this.EEGabnormalRecord[idVal].length);//Empty Lower streak record
      }
      else//Increment by -1(negative ->Lower Outlier streak)
      {
        this.AnomlousStreak[idVal] = this.AnomlousStreak[idVal] - 1;
      }

      this.AnomlousWeight[idVal] = this.AnomlousWeight[idVal] - 1;//Subtract 1 to outlier weight tally(Too many lower outliers in general)
      return true;
    }
    else//Nothing wrong
    {
      this.AnomlousStreak[idVal] = 0;
    }
    
    return false; //Nothing wrong
  }

  private ScaleAdjustment(idVal: number)
  {//Might have to fix since lower activity is normal
    if(this.AnomlousStreak[idVal] <= this.AnomlousStreakMax * -1)//Lower theta/delta activity -> user is not sleepy
    {
      this.AnomlousStreak[idVal] = 0;
      this.AnomlousWeight[idVal] = 0;
      this.noteSetNumb -= 1; //Set to lower note set

      if(this.noteSetNumb <= -1)
      {
        //underflow check
        if(this.isMajorScale == 1)
        {
          this.noteSetNumb = 11; //array[0->11]
          this.isMajorScale = 0;
        }
        else
        {
          this.noteSetNumb = 0;
        }
      }
      this.keySignature = Constants.KEY_SIGNATURES[this.isMajorScale][this.noteSetNumb]; //KEY_SIGNATURES[ScaleType][Scale note set][A music note of the scale]
    }
    else if(this.AnomlousStreak[idVal] >= this.AnomlousStreakMax)//Higher theta/delta activity -> user is getting sleepy
    {  
      this.AnomlousStreak[idVal] = 0;
      this.AnomlousWeight[idVal] = 0;
      this.noteSetNumb += 1; //Set to higher note set

      if(this.noteSetNumb >= 12)
      {
        //overflow check
        if(this.isMajorScale == 0)
        {
          this.noteSetNumb = 0;
          this.isMajorScale = 1;
        }
        else
        {
          this.noteSetNumb = 11;
        }
      }
      this.keySignature = Constants.KEY_SIGNATURES[this.isMajorScale][this.noteSetNumb];
    }
  }

  private generateNextBeat(idVal: number)
  {
    var NoiseTotal = 0; //Temporarily set to amount of active channels

    if(idVal <= 1)//[ID 0 -> Delta channel | ID 1 -> Theta channel] (See Interfaces.tsx)
    {
      this.ScaleAdjustment(idVal); //Check for a need to change the scale
    }
    if(false)//volume tempo
    {

    }

    if(true) //------[!!!]------//TEMPORARY
    {//Update to new average due to outlier weight
      if( (this.AnomlousWeight[idVal] < (this.AnomlousWeightMax * -1)) || (this.AnomlousWeight[idVal] > this.AnomlousWeightMax))
      {
        let abArrSize:number = this.EEGabnormalTotal[idVal].length
        this.EEGaverage[idVal] = Math.floor( (this.average(this.EEGabnormalTotal[idVal]) *  abArrSize) + (this.EEGaverage[idVal] * abArrSize) / (abArrSize * 2))
      }
    }

    if(this.pauseCounter[idVal] >= this.nextPause[idVal])//MIDI channel is available?
    {
      //Check if able to generate notes in this channel or track
      for(var i = 0; i < this.channelTotal; i++ )//Get number of channels active
      {
        if(this.pauseCounter[i] < this.nextPause[i])
        {
          NoiseTotal = NoiseTotal + 1; //------[!!!]------//TEMPORARY
        }
      }

      if(NoiseTotal < this.NoiseCapacity)
      {
        //Is able to be generated without exceding noise capacity(white noise prevention)
        var declaredBeat = this.noteDeclaration(idVal);
        this.pauseCounter[idVal] = 0;
        this.nextPause[idVal] = 0; //------[!!!]------//TEMPORARY delay timer for A channel

        this.generateBeat(declaredBeat, idVal);
        this.midiGenerator.realtimeGenerate(this.currentNoteData[idVal], idVal);
        //this.nextPause =
        //  this.currentNoteData.player.noteLength === 3
        //     ? 1
        //     : this.currentNoteData.player.noteLength === 4
        //     ? 3
        //     : 0; // 1 wait for half notes, 3 for whole notes
      }
    } //This MIDI Channel is currently busy generating a note so try again later
    else
    {
      this.pauseCounter[idVal]++;
    }
  }

  private noteDeclaration(idVal: number)//Customizable!!!
  {
    var beats;

    var duration = 4
    if(idVal != 4)
    {
      duration = this.instrumentNoteSettings[idVal];
    }
    var aveNorm = -1; //Default to no silent note

    if(this.EEGbuffer[idVal].length != 0)
    {
      aveNorm = (Math.floor(this.average(this.EEGbuffer[idVal]) * this.EEGbuffer[idVal].length )) % 89;
      console.log(aveNorm);
      this.EEGbuffer[idVal].splice(0, this.EEGbuffer[idVal].length);

    } //Literally no data to process
    else
    {
      console.log("What happend to the input!?");

      beats = {//Silent notes only
        notes: [aveNorm],
        duration: duration,
      };
      return beats;
    }

    if(idVal == 1)
    {
      beats = {
        notes: [((aveNorm + Math.floor(Math.random() * 15)) % 7), ((aveNorm + Math.floor(Math.random() * 15)) % 7)],
        duration: 1,
      };
    }
    else
    {

      beats = {
        notes: [((aveNorm + Math.floor(Math.random() * 15)) % 14),((aveNorm + Math.floor(Math.random() * 15)) % 14), ((aveNorm + Math.floor(Math.random() * 15)) % 14), ((aveNorm + Math.floor(Math.random() * 15)) % 14)],
        duration: 2,
      };
    }

    return beats;
  }

  private generateBeat(declaredBeat: any, idVal: number) {
    //define note from stuff
    var noteLength: number = declaredBeat.duration;
    var noteFrequencies: Array<number> = [];
    var noteAndOctaves: any = [];

    var noteLengthName = getNoteLengthStringFromInt(noteLength);

    // Get the lowest octave that will be used in the song
    var floorOctave = GetFloorOctave(this.numNotes);

    for(var i = 0; i < declaredBeat.notes.length; i++)
    {
      // Get the actual note and its octave
      noteAndOctaves.push(this.GetNoteWRTKey(declaredBeat.notes[i]));

      // Combination string of note and octave (ex: 'C#5', 'F4')
      var noteOctaveString;

      // If the generated note is not a rest
      if (noteAndOctaves[i].note !== -1)
      {
        noteOctaveString = noteAndOctaves[i].note + (noteAndOctaves[i].octave + floorOctave).toString();
        noteFrequencies.push( getFrequencyFromNoteOctaveString(noteOctaveString) );
      }
      else
      {
        noteFrequencies.push(0);
      }

      // // Debug -----------------------------------------              OLD
      // if (this.debugOutput) {
      //     // Test frequency of notes
      //     let num = i + 1;
      //     var frequencyArray: number[] = [];
      //     frequencyArray.fill(-1);

      //     if (noteAndOctaves[i].note !== -1 && this.debugOutput) {
      //         frequencyArray[i] = Number(noteAndOctaves[i].note);

      //         console.log("Channel " + num + ": Playing " + noteAndOctaves[i].note);
      //     } else if (this.debugOutput) {
      //         console.log("Channel " + num + ": At Rest");
      //     } else {
      //     }
      //     frequencyArray.forEach((n: any) => console.log(n));
      // }
      // // ------------------------------------- End Debug
    }

    this.currentNoteData[idVal] = {
      player:
      {
        noteFrequencies: noteFrequencies,
        noteLength: noteLength,
        timeForEachNoteArray: this.timeForEachNoteArray,
        amplitude: 100,
      },
      writer:
      {
        noteLengthName: noteLengthName,
        notes: noteAndOctaves,
        floorOctave: floorOctave,
      },
    };
  }

  private GetNoteWRTKey(note: number) {
    // console.log('Get WRTKey note: ' + note);
    // If the note increment is between 1 and 7, simply return that index in the key array with octave being zero.
    if (note <= 7 && note >= 1) {
      return { note: this.keySignature[note - 1], octave: 0 };
    }
    // If the note increment is less than zero, return -1 which will be treated as a rest.
    else if (note <= 0) {
      return { note: -1, octave: 0 };
    }
    // If the note is valid and greater than 7
    else {
      // Mod by 7 to find note increment
      var noteMod = note % 7;

      // Divide by 7 to find octave WRT numNotes/3.
      var noteDiv = Math.floor(note / 7);

      return { note: this.keySignature[noteMod], octave: noteDiv };
    }
  }

  public returnMIDI(): Promise<Uint8Array> {
    return this.midiGenerator.returnMIDI();
  }
}
