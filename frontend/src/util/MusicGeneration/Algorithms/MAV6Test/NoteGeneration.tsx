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
  DataStream8Ch,
  DataStream4Ch,
  DataStream5Waves,
} from "../../../Interfaces";

import { KeyGroups, Keys } from "../../../Enums";
import { MIDIManager } from "./MIDIManager";
import { TDebugOptionsObject } from "../../../Types";
import { AbstractNoteHandler } from "../AbstractNoteHandler";
import { faL } from "@fortawesome/free-solid-svg-icons";

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
  //No longer used
  //private PrevEEGaverageRec: Array<number> = [0, 0, 0, 0, 0]; //Previous average Data Record for each track
  //No longer used
  //private aveSampleNumb: number = 8; //Amount needed to create a new average

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

  private channelTotal: number = 5; //How many 1-1 ratios(inputted EEG to track) are there?


  private nextPause: Array<number> = [0, 0, 100, 100, 100]; //Wait Counter maximum
  private pauseCounter: Array<number> = [0, 0, 0, 0, 0]; //Wait Counter/Tally
  private NoiseCapacity: number = 10; //Temp value---


  private midiGenerator; //Defines Midi Generator

  public override setStopFlag()
  {
    console.log("stopped");
    clearInterval(this.musicClock);
    this.midiGenerator.setStopFlag();
    this.stopFlag = true;
  }

  constructor(settings: MusicSettings,debugOptionsObject: TDebugOptionsObject)
  {
    super(settings, debugOptionsObject);
    this.debugOutput = debugOptionsObject.debugOption2;
    
    if (this.debugOutput) {
        console.log("Constructing originalNoteGeneration Class with the following settings: ");
        console.log(settings);
    }
    
    // Assignments in constructor to counter error messages
    // this.startTime = 0;
    // this.eegPerSecond = undefined;
    // this.prevBeat = 0;

    this.octaves = settings.octaves;
    //////////[OFF]////////this.octaves = 1;
    this.numNotes = 21;
    this.BPM = settings.bpm;
    //////////[OFF]////////this.BPM = 120;

    this.timeForEachNoteArray = this.setTimeForEachNoteArray(this.BPM);

    this.keyGroup = KeyGroups[settings.keyGroup as keyof typeof KeyGroups]; // Example: Major
    this.scale = Keys[settings.scale as keyof typeof Keys]; // Example: C#, full example: C# Major
    //////////[OFF]////////this.keyGroup = KeyGroups["Major" as keyof typeof KeyGroups]; // Example: Major
    //////////[OFF]////////this.scale = Keys["A" as keyof typeof Keys]; // Example: C#, full example: C# Major

    this.keySignature = Constants.KEY_SIGNATURES[this.keyGroup][this.scale];
    //[UNUSED!]
    ////////////////////this.instrumentNoteSettings = settings.deviceSettings;

    this.midiGenerator = new MIDIManager(
      settings,    //////////[OFF]////////TEMPORARY null
      this.timeForEachNoteArray,
      debugOptionsObject    //////////[OFF]////////TEMPORARY null
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
      /////////////////////////////////////this.nextPause[i] = 0; TEMPORARY
      this.pauseCounter[i] = 0;
      this.AnomlousStreak[i] = 0;
      this.AnomlousWeight[i] = 0;
    }

    //////////[ X ]////////OLD CODE
    ////////////////////// Initialize streaks and strikes to 0s (otherwise you get NaNs)
    ////////////////////// this.streaks = Array(8).fill(0);
    ////////////////////// this.strikes = Array(8).fill(0);
    ////////////////////// this.baselines = Array(8).fill(Number.POSITIVE_INFINITY);
    ////////////////////
    /////////////////////* Here we are just filling the increment array with zeroes for initialization purposes */
    ////////////////////// this.incrementArr = new Array(this.numNotes).fill(0);
    ////////////////////
    /*  On initialization, the minimum and maximum values are going to be null, but to set the
            initial increment array it makes sense to have the highest and lowest possible number
            values for comparisons in the future, we pass in 0 as the ampvalue to avoid calculating
            the global averages since there isn't any data yet. */
    ////////////////////// for (var i = 0; i < 8; i++) {
    //////////////////////     this.minValue[i] = Number.POSITIVE_INFINITY;
    //////////////////////     this.maxValue[i] = Number.NEGATIVE_INFINITY;
    ////////////////////
    //////////////////////     /* The previous previous 1000 values are  */
    //////////////////////     this.previousThousandEEG[i] = new Array(1).fill(0);
    //////////////////////     this.InitIncrementArr(0);
    ////////////////////// }
    /* Set this to true to enable real-time playback related output during recording.
     * Ex:
     * Channel 1: At Rest
     * ... f
     * Channel k: Playing G#
     */
    ////////////////////
    this.midiGenerator.setDebugOutput(debugOptionsObject.debugOption3); // debug

    ////////////////////// this.emotionDecoder = new EmotionDecoder();
  }

  private setTimeForEachNoteArray(BPM: number) {
    return [
      getMillisecondsFromBPM(BPM) / 4, // Index 0: Sixteenth Note
      getMillisecondsFromBPM(BPM) / 2, // Index 1: Eighth Note
      getMillisecondsFromBPM(BPM), // Index 2: Quarter Note
      getMillisecondsFromBPM(BPM) * 2, // Index 3: Half Note
      getMillisecondsFromBPM(BPM) * 4, // Index 4: Whole Note
    ];
  }

  //Get average of array
  private average = (arr: Array<number>) =>
    arr.reduce((p, c) => p + c, 0) / arr.length;

  public originalNoteGeneration = async (instream: any) => {
    var inputStream = Object.values(instream) as number[];

    if(this.startUp)//Starting average data
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

  //True -> Add to Abnormal Streak | False -> Send to Normal EEG buffer
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
    else if(this.AnomlousStreak[idVal] >= this.AnomlousStreakMax * 2)//Higher theta/delta activity -> user is getting sleepy
    {  
      this.AnomlousStreak[idVal] = 0;
      this.AnomlousWeight[idVal] = 0;
      this.noteSetNumb += 1; //Set to higher note set

      if(this.noteSetNumb >= 12)
      {
        //overflow check
        if(this.isMajorScale == 0)
        {
          this.noteSetNumb = 0; //------[!!!]------//TEMPORARY
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
    if(true) //------[!!!]------//TEMPORARY
    {//Update to new average due to outlier weight
      if( (this.AnomlousWeight[idVal] < (this.AnomlousWeightMax * -1)) || (this.AnomlousWeight[idVal] > this.AnomlousWeightMax))
      {
        let abArrSize:number = this.EEGabnormalTotal[idVal].length
        this.EEGaverage[idVal] = Math.floor( (this.average(this.EEGabnormalTotal[idVal]) *  abArrSize) + (this.EEGaverage[idVal] * abArrSize) / (abArrSize * 2))
      }
    }

    console.log("pauseCount: " + this.pauseCounter[idVal] + "next Pause: " + this.nextPause[idVal] + "ID: " + idVal);

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
        this.nextPause[idVal] = 4; //------[!!!]------//TEMPORARY delay timer for A channel

        this.generateBeat(declaredBeat, idVal);
        this.midiGenerator.realtimeGenerate(this.currentNoteData[idVal], idVal);
        // this.currentNoteData.player.noteLength === 3
        //     ? 1
        //     : this.currentNoteData.player.noteLength === 4
        //     ? 3
        //     : 0; // 1 wait for half notes, 3 for whole notes
      }
    } //This MIDI Channel is currently busy generating a note so try again later
    else
    {
      this.pauseCounter[idVal]++;

      // var silentMeasure = {//This is to ensure that the generated notes are in their respective locations
      //   notes: [-1],
      //   duration: 4,
      // };

      // this.generateBeat(silentMeasure, idVal);
      // this.midiGenerator.realtimeGenerate(this.currentNoteData[idVal], idVal);
    }
  }

  private noteDeclaration(idVal: number)
  {
    var beats;
    var duration = 4;
    var aveNorm = -1; //Default to no silent note
    ///////////////////var aveAbNorm;

    if(this.EEGbuffer[idVal].length != 0)
    {
      aveNorm = (Math.floor(this.average(this.EEGbuffer[idVal]) * this.EEGbuffer[idVal].length )) % 89;
      console.log(aveNorm);
      this.EEGbuffer[idVal].splice(0, this.EEGbuffer[idVal].length);

    ////////////////////   //Checks if there is any normal EEG data to use. Also Divide by zero prevention
    ////////////////////   if(this.EEGbuffer[idVal].length / 4 < this.EEGabnormalRecord[idVal].length)
    ////////////////////   {
    ////////////////////     // Not enough outlier data to change results//------[!!!]------//(TEMPORARY)
    ////////////////////     aveNorm = Math.floor(this.average(this.EEGbuffer[idVal]) * this.EEGbuffer[idVal].length); //get sum of normal EEG data from average calcuation
    ////////////////////     aveAbNorm = Math.floor(this.average(this.EEGabnormalRecord[idVal]) * this.EEGabnormalRecord[idVal].length); //get sum of abnormal EEG data from average calcuation
    ////////////////////     aveNorm = Math.round((aveAbNorm + aveAbNorm) / (this.EEGbuffer[idVal].length + this.EEGabnormalRecord[idVal].length)); //Calculate new average based on both arrays
    ////////////////////   } //significant amount of outlier data compared to normal data
    ////////////////////   else
    ////////////////////   {
    ////////////////////     aveNorm = Math.round(this.average(this.EEGabnormalRecord[idVal])); //Use abnormal EEG data to generate next note instead
    ////////////////////     this.PrevEEGaverageRec[idVal] = this.EEGaverage[idVal]; //update previous average record based on abundant Abnormal EEG data//------[!!!]------//(TEMPORARY)
    ////////////////////     this.EEGaverage[idVal] = aveNorm; //update current average record
    ////////////////////   }
    //////////////////// }
    //////////////////// else if
    //////////////////// (this.EEGabnormalRecord[idVal].length != 0)
    //////////////////// {
    ////////////////////   //Only abnormal EEG data present or calculating the first average EEG record for this input channel
    ////////////////////   if(this.EEGaverage[idVal] == 0)
    ////////////////////   {
    ////////////////////     //Calculate first average EEG record for this input channel
    ////////////////////     if(this.EEGabnormalRecord[idVal].length >= this.aveSampleNumb)
    ////////////////////     {
    ////////////////////       //Enough samples for an average?
    ////////////////////       aveNorm = Math.round(this.average(this.EEGabnormalRecord[idVal])); //Use abnormal EEG data to generate next note
    ////////////////////       this.PrevEEGaverageRec[idVal] = this.EEGaverage[idVal]; //update previous average record//------[!!!]------//(TEMPORARY)
    ////////////////////       this.EEGaverage[idVal] = aveNorm; //update current average record
    ////////////////////     } //Not enough samples so silence
    ////////////////////     else
    ////////////////////     {
    ////////////////////       console.log("not enough samples, defaulting to generating silent note");
    ////////////////////     }
    ////////////////////   } //Use abnormal EEG data to generate next note
    ////////////////////   else
    ////////////////////   {
    ////////////////////     aveNorm = Math.round(this.average(this.EEGabnormalRecord[idVal]));
    ////////////////////   }
    } //Literally no data to process
    else
    {
      console.log("What happend to the input!?");

      beats = {//Silent notes only
        notes: [aveNorm],
        duration: 0,
      };
      return beats;
    }

    if(idVal == 1)
    {
      beats = {
        notes: [((aveNorm + Math.floor(Math.random() * 15)) % 7) + 1, ((aveNorm + Math.floor(Math.random() * 15)) % 7) + 1],
        duration: duration,
      };
    }
    else
    {

      beats = {
        notes: [/*((aveNorm + Math.floor(Math.random() * 15)) % 14),*/((aveNorm + Math.floor(Math.random() * 15)) % 14) + 1, ((aveNorm + Math.floor(Math.random() * 15)) % 14) + 1, ((aveNorm + Math.floor(Math.random() * 15)) % 14) + 1, ((aveNorm + Math.floor(Math.random() * 15)) % 14) + 1],
        duration: duration,
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

    for (var i = 0; i < declaredBeat.notes.length; i++) {
      // Get the actual note and its octave
      noteAndOctaves.push(this.GetNoteWRTKey(declaredBeat.notes[i]));

      // Combination string of note and octave (ex: 'C#5', 'F4')
      var noteOctaveString;

      // If the generated note is not a rest
      if (noteAndOctaves[i].note !== -1) {
        noteOctaveString =
          noteAndOctaves[i].note +
          (noteAndOctaves[i].octave + floorOctave).toString();
        noteFrequencies.push(
          getFrequencyFromNoteOctaveString(noteOctaveString)
        );
      } else {
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
      player: {
        noteFrequencies: noteFrequencies,
        noteLength: noteLength,
        timeForEachNoteArray: this.timeForEachNoteArray,
        amplitude: 100,
      },
      writer: {
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
