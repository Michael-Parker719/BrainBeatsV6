import { getNoteLengthStringFromInt, getMillisecondsFromBPM, GetFloorOctave, getFrequencyFromNoteOctaveString } from '../../MusicHelperFunctions';

// import {initMIDIWriter, addNoteToMIDITrack, printTrack, generateMIDIURIAndDownloadFile, generateMIDIURI, generateMIDIFileFromURI} from '../MusicGeneration/MIDIWriting';
import * as Constants from '../../../Constants';
import { CytonSettings, GanglionSettings, MusicSettings, DataStream8Ch, DataStream4Ch } from '../../../Interfaces';
import { KeyGroups, Keys } from '../../../Enums';
import { MIDIManager } from './MIDIManager';
import { TDebugOptionsObject } from '../../../Types';
import { AbstractNoteHandler } from '../AbstractNoteHandler';

export class NoteHandler extends AbstractNoteHandler {

    /*  debugOutput functions in the same way as the other classes which have this boolean, if we are in dev then
        checkboxes will display on the record page that allow us to select if we want console logs for data, if you
        want to implement logs that will show up on dev but not production, simply add an if conditional with this
        boolean before them. */

    // Universally used settings
    private numNotes: number;
    private BPM: number;
    private keyGroup: number;
    private scale: number;
    private octaves: number
    private keySignature;

    // How many times we've increased or decreased the volume e.g. 3 would mean you increased the volume three times and probably don't need to again
    private relativeVolume: number = 0;

    /* The min and max value arrays store the minimum and maximum EEG data from each channel, the purpose of storing
        these is to determine how weak/strong the input from each channel is, a weak connection can occur if you have an 
        electrode that has hair blocking the signal for example. This allows us to calculate the percentiles we use when
        defining the increment array */
    private minValue: Array<number> = [];
    private maxValue: Array<number> = [];

    /*  The avgArray is similar to the min and max value arrays, it however stores the average value from each channel,
        it is used to determine the average data over all of the arrays currently, this is done through storing the EEG 
        values over a certain number of inputs (in our case 1000) in the previousThousandEEG array and continuously updating
        the average based on those, this is because there will be cases where the input stream is weak and then if the
        headset is re-adjusted during recording, the input will become stronger and therefore the average will be different. */
    private avgArray: Array<number> = [];
    private previousThousandEEG: Array<Array<number>> = [[]];

    // Used to calculate the EEG per second so we have a sense of timing when looking for fluctuations
    private startTime: number;               // this needs to be a field to persist through iterations of origNG
    private eegPerSecond:any;
    private stopWatch: boolean = false;      // once true, stop running the time calculation

    // Used to detect fluctuations in EEG waves
    private baselines: Array<number> = [];
    private firstThousand: boolean = false;              // once true, we have read in our first thousand EEG values which we can use for the baseline
    private streaks: Array<number> = [];
    private strikes: Array<number> = [];
    private firstNoteConfirmed: boolean = false;

    private prevBeat: number;
    private sleeping: boolean = false;               // If true, we've already declared our next beat and have to wait until it is sent out
    private firstCycle: boolean = true;              // If true, this is the first cycle and we have to set the interval

    private instrumentNoteSettings: CytonSettings | GanglionSettings;

    private currentNoteData:any;
    private nextPause:number = 0;
    private pauseCounter:number = 0;

    private midiGenerator;

    musicClock: number;

    public override setStopFlag() {
        console.log('stopped');
        clearInterval(this.musicClock);
        this.midiGenerator.setStopFlag();
        this.stopFlag = true;
    }


    /* An array of size numNotes is used to store the cutoff values for each increment. 
    * 
    * The MIN_MAX_AMPLITUDE_DIFFERENCE is divided by numNotes to create evenly spaced sections in the array. 
    * 
    * incrementArr[0] is always 0 and incrementArr[numNotes - 1] is always Constants.MAX_AMPLITUDE + AMPLITUDE_OFFSET. 
    * Each subsequent value in the array is calculated by multiplying the previous value by the result of the division. 
    * 
    * In runtime, the headset data is compared to the array to determine which note it corresponds to. 
    * The note is determined by taking the floor of the two values in the array the data falls between.
    */
    private incrementArr: Array<number> = [];    // NOT Important

    // The amount of time (in milliseconds) that each of the supported notes would take at the specified BPM
    private timeForEachNoteArray: Array<number>;


    constructor(settings: MusicSettings, debugOptionsObject: TDebugOptionsObject) {
        super(settings, debugOptionsObject);
        this.debugOutput = debugOptionsObject.debugOption2;

        if (this.debugOutput) {
            console.log("Constructing originalNoteGeneration Class with the following settings: ");
            console.log(settings);
        }

        // Assignments in constructor to counter error messages
        this.startTime = 0;
        this.eegPerSecond = undefined;
        this.prevBeat = 0;

        this.octaves = settings.octaves;
        this.numNotes = 21;
        this.BPM = settings.bpm;

        this.timeForEachNoteArray = this.setTimeForEachNoteArray(this.BPM);

        this.keyGroup = KeyGroups[settings.keyGroup as keyof typeof KeyGroups];     // Example: Major
        this.scale = Keys[settings.scale as keyof typeof Keys];                     // Example: C#, full example: C# Major

        this.keySignature = Constants.KEY_SIGNATURES[this.keyGroup][this.scale];
        this.instrumentNoteSettings = settings.deviceSettings;

        this.midiGenerator = new MIDIManager(settings, this.timeForEachNoteArray, debugOptionsObject);
        this.stopFlag = false;

        // This has to be assigned in the constructor or else it cannot be cancelled
        this.musicClock = window.setInterval(() => {this.playNextBeat()}, this.timeForEachNoteArray[2]);

        // Initialize streaks and strikes to 0s (otherwise you get NaNs)
        this.streaks = Array(8).fill(0);
        this.strikes = Array(8).fill(0);
        this.baselines = Array(8).fill(Number.POSITIVE_INFINITY);

        /* Here we are just filling the increment array with zeroes for initialization purposes */
        this.incrementArr = new Array(this.numNotes).fill(0);

        /*  On initialization, the minimum and maximum values are going to be null, but to set the
            initial increment array it makes sense to have the highest and lowest possible number
            values for comparisons in the future, we pass in 0 as the ampvalue to avoid calculating
            the global averages since there isn't any data yet. */
        for (var i = 0; i < 8; i++) {
            this.minValue[i] = Number.POSITIVE_INFINITY;
            this.maxValue[i] = Number.NEGATIVE_INFINITY;

            /* The previous previous 1000 values are  */
            this.previousThousandEEG[i] = new Array(1).fill(0);
            this.InitIncrementArr(0);
        }
        /* Set this to true to enable real-time playback related output during recording.
         * Ex: 
         * Channel 1: At Rest 
         * ... f
         * Channel k: Playing G#  
         */
        this.midiGenerator.setDebugOutput(debugOptionsObject.debugOption3); // debug
    }


    /* setTimeForEachNoteArray does simple logic to return the values of each note in milliseconds as an array. 
       BPM affects the amount of time for each note, and the math logic can be explained on this website if you
       are interested: https://tuneform.com/tools/time-tempo-bpm-to-milliseconds-ms. The indices are arranged 
       from shortest note to longest note. */
    private setTimeForEachNoteArray(BPM: number) {
        return [
            getMillisecondsFromBPM(BPM) / 4, // Index 0: Sixteenth Note
            getMillisecondsFromBPM(BPM) / 2, // Index 1: Eighth Note
            getMillisecondsFromBPM(BPM), // Index 2: Quarter Note
            getMillisecondsFromBPM(BPM) * 2, // Index 3: Half Note
            getMillisecondsFromBPM(BPM) * 4 // Index 4: Whole Note
        ]
    }

    // Return the previousThousandEEG
    public getPreviousThousandEEG(): Array<Array<number>> {
        return this.previousThousandEEG;
    }

    // This creates the array in which different "increments" for notes are housed. 
    // For more info see the comment for "var incrementArr"
    private InitIncrementArr(ampVal: number) {
        /*  The number for maximum will always be greater than 0 assuming there is a valid
            connection to the device, therefore we initialize it at 0, the value for minimum
            is just arbitrarily large. */
        var minAvg = Number.POSITIVE_INFINITY;
        var maxAvg = 0;

        /*  Here we find a the minimum and maximum average value of all of the
            channels in order to establish better connection for the weaker nodes,
            we use this to then calculate the 1/4 and 3/4 percentiles that define the
            minimum and maximum values accepted when converting into a note as shown
            below the for loop. The purpose of the if condition here is explained in the
            constructor for this class, whenever there is an actual amplitude being
            input from the device this condition will be met. */
        if (ampVal > 0) {
            for (let i = 0; i < 8; i++) {
                var tempAvg = this.average(this.previousThousandEEG[i]);
                if (tempAvg < minAvg)
                    minAvg = tempAvg;
                if (tempAvg > maxAvg)
                    maxAvg = tempAvg;
            }
        }
        var range = maxAvg - minAvg;
        var quartile = range / 4;
        const p25 = minAvg + quartile;
        const p75 = maxAvg - quartile;

        /*  The ampDifference is the range of values from p25 through p75, this is what is
            used to generate the bounds of the increment array. The incrementAmount is simply
            splitting this range into equal values based on the number of possible notes that
            an amplitude can fall between. */
        let ampDifference: number = Math.abs(p75 - p25);
        var incrementAmount: number = ampDifference / this.numNotes;

        /*  The first index will always be the 25th percentile of data calculated by the data received, this
            is to set a baseline so numbers that have lower values are calculated as rest notes in MIDI Generation.
            The last index will always be the 75th percentile for the same reason except in the case of high outliers. */
        this.incrementArr[0] = p25;
        this.incrementArr[this.numNotes - 1] = p75;

        /*  Here we are filling out the array with a small offset to generate slight amounts of variety, this is because
            we would like to allow for a tiny amount of randomness as we cannot always predict the exact root cause of low connectivity
            with the device. */
        for (var i = 1; i < this.numNotes - 1; i++) {
            var offset = (Math.random() - 0.5) * incrementAmount / 2;
            this.incrementArr[i] = p25 + (incrementAmount * i) + offset;
        }
    }

    /* Calculates the average value of numbers in an array */
    private average = (arr: Array<number>) => arr.reduce((p, c) => p + c, 0) / arr.length;

    // Takes in a raw value from the headset and assigns a note, as well as the index of this channel
    private NoteDeclarationRaw(ampValue: number, idx: number) {
        // OLD IMPLEMENTATION CODE  -->
        /*  If a note is in the negative range, we want to still consider it. The logic behind multiplying by -2 is that
            a baseline value from our input stream is going to be within the range of active values if flipped, so doubling
            it will flip it to a value above the range of the incrementArray, and since the values in negative range that aren't
            baseline will be small enough to where doubling it won't cause enough impact on it to move it in the incrementArray. */
        if (ampValue < 0) ampValue *= -2;

        /* returnedAmpValue is mapped down into a range that allows for offsetting, hence dividing by 10 to the 7th */
        let returnedAmpValue = ampValue; // / Math.pow(10, 7);

        if (this.maxValue[idx] < returnedAmpValue) {
            this.maxValue[idx] = returnedAmpValue;
            this.InitIncrementArr(returnedAmpValue);
        }
        if (this.minValue[idx] > returnedAmpValue) {
            this.minValue[idx] = returnedAmpValue;
            this.InitIncrementArr(returnedAmpValue);
        }

        if (this.debugOutput) {
            console.log("ampval:", returnedAmpValue);
            console.log(this.incrementArr);
        }
        // --> END OLD IMPLEMENTATION CODE

        var beats;

        // At the beginning of playback, play a random note in the key signature, then wait for some feedback
        // If the user's beta and theta activity are high, they likely weren't expecting that note...
        // ... so we pick a different one (chord tones if we weren't on them before and vice versa)
        if (this.firstThousand && !this.firstNoteConfirmed) {
            if (idx === 5 && this.streaks[3] > this.eegPerSecond) {
                // If we were playing a chord tone before, slide up the scale by a fourth
                if (this.prevBeat % 2 === 1) {
                    // Ensure you don't go out of bounds (you should technically also do this for else)
                    if (this.prevBeat >= this.numNotes - 2) {
                        this.prevBeat = this.prevBeat % 19 + 14;
                    }
                    beats = {
                        notes: [this.prevBeat + 1, this.prevBeat + 2],
                        duration: 1
                    };
                    this.prevBeat += 3;
                    this.firstNoteConfirmed = true;
                    console.log("First note confirmed");
                    return beats;
                }
                // Otherwise, go to a nearby chord tone
                else {
                    this.prevBeat += (Math.random() < 0.5) ? -1 : 1;
                    this.firstNoteConfirmed = true;
                    console.log("First note confirmed");
                    beats = {
                        notes: [this.prevBeat],
                        duration: 2
                    };
                    return beats;
                }
            }
            else {
                this.firstNoteConfirmed = true;
                console.log("First note confirmed");
                beats = {
                    notes: [this.prevBeat],
                    duration: 2
                };
                return beats;
            }
        }
        if (!this.firstThousand && !this.firstNoteConfirmed) {
            if (this.prevBeat === undefined || this.prevBeat === 0) {
                this.prevBeat = Math.round(Math.random() * this.numNotes);
                beats = {
                    notes: [this.prevBeat],
                    duration: 2
                };
                return beats;
            }
            else {
                beats = {
                    notes: [-1],
                    duration: 2
                };
                return beats;
            }
        }

        var beat = this.getBeatFromIndex(idx);

        return beat;
    }

    /* This function is simply calling the MIDI Generator's function to return MIDI,
        it gets called here since the NoteGeneration class is responsible for passing values
        to MIDI and therefore the MIDI Generator is */
    public returnMIDI(): Promise<Uint8Array> {
        return this.midiGenerator.returnMIDI();
    }

    // Gets the actual note from `the previously-obtained note INCREMENT (see NoteDeclarationRaw())
    // WRT stands for "with respect to", so this is "get note with respect to key"
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

    // Checks for streaks of anonmalous activity and adjusts the volume/tempo as necessary 
    private volumeTempoAdjustor(i: number, amplitude: number) {
        var baselineAvg = (this.baselines[i] + this.baselines[i - 1]) / 2;

        // If the activity is over 1.25x the average, we begin a streak of high activity
        // However, if we have 5 values in a row that are too low, we break the streak
        // If the streak goes high enough (3 seconds or 10 seconds), we clearly should adjust the volume/tempo accordingly
        if (Math.abs(amplitude) > 1.25 * Math.abs(baselineAvg)) {
            this.streaks[i]++;
            this.strikes[i] = 0;
        }
        else {
            if (this.streaks[i] > 0) {
                this.strikes[i]++;
            }
            // Admitedly 5 is a random number for the strikes, but the idea is that there is a clear deviation from an upward trend. Subject to change.
            if (this.strikes[i] === 5) {
                this.streaks[i] = 0;
                this.strikes[i] = 0;
            }
        }
        // Volume up/down
        if (this.eegPerSecond !== undefined && this.streaks[i] === 3 * this.eegPerSecond) {
            if (i === 1) {
                if (this.relativeVolume > -3) {
                    console.log("Volume lowered!");
                    this.midiGenerator.adjustVolume(-4, 0);
                    this.relativeVolume--;
                }
            }
            else {
                if (this.relativeVolume < 3) {
                    console.log("Volume raised!");
                    this.midiGenerator.adjustVolume(4, 0);
                    this.relativeVolume++;
                }
            }
        }
        // Tempo up/down
        if (this.eegPerSecond !== undefined && this.streaks[i] === 10 * this.eegPerSecond) {
            if (i === 1) {
                console.log("Tempo lowered!");
                this.BPM -= 30;
                this.midiGenerator.adjustTempo(-30, 0);
                // Change the music clock cycle to actually change the BPM
                this.timeForEachNoteArray = this.setTimeForEachNoteArray(this.BPM);
                clearInterval(this.musicClock);
                this.musicClock = window.setInterval(() => {this.playNextBeat()}, this.timeForEachNoteArray[2]);
            }
            else {
                console.log("Tempo raised!");
                this.BPM += 30;
                this.midiGenerator.adjustTempo(30, 0);
                // Change the music clock cycle to actually change the BPM
                this.timeForEachNoteArray = this.setTimeForEachNoteArray(this.BPM);
                clearInterval(this.musicClock);
                this.musicClock = window.setInterval(() => {this.playNextBeat()}, this.timeForEachNoteArray[2]);
            }
        }
    }

    // Same as above, but for key signature
    private keyAdjustor(i: number, amplitude: number) {
        var baselineAvg = (this.baselines[i] + this.baselines[i - 1]) / 2;

        // If the activity is over 1.25x the average, we begin a streak of high activity
        // However, if we have 5 values in a row that are too low, we break the streak
        // If the streaks are high enough (6 seconds) then we try changing the key
        if (amplitude > 1.25 * baselineAvg) {
            this.streaks[i]++;
            this.strikes[i] = 0;
        }
        else {
            if (this.streaks[i] > 0) {
                this.strikes[i]++;
            }
            // Admitedly 5 is a random number for the strikes, but the idea is that there is a clear deviation from an upward trend. Subject to change.
            if (this.strikes[i] === 5) {
                this.streaks[i] = 0;
                this.strikes[i] = 0;
            }
        }
        // Streak is long enough to change key, we only check after all streaks have been updated
        if (i === 7 && this.eegPerSecond !== undefined) {
            // Simplify expressions
            var s1 = this.streaks[1];
            var s3 = this.streaks[3];
            var s5 = this.streaks[5];
            var s7 = this.streaks[7];
            var es6 = this.eegPerSecond * 6;
            // Alpha Gamma Theta (Make it major/minor)
            if (s1 >= es6 && s5 >= es6 && s7 >= es6 && (s1 === es6 || s5 === es6 || s7 === es6)) {
                if (this.keyGroup === 1) {
                    this.keySignature = Constants.KEY_SIGNATURES[this.keyGroup - 1][this.scale];
                    this.keyGroup--;
                }
                else {
                    this.keySignature = Constants.KEY_SIGNATURES[this.keyGroup + 1][this.scale];
                    this.keyGroup++;
                }
                this.streaks[5] = 0;
                this.streaks[7] = 0;
            }
            // Beta Gamma Theta (Up a minor third)
            else if (s3 >= es6 && s5 >= es6 && s7 >= es6 && (s3 === es6 || s5 === es6 || s7 === es6)) {
                this.scale += 3;
                if (this.scale >= 12) {
                    this.scale = this.scale % 12;
                }
                this.keySignature = Constants.KEY_SIGNATURES[this.keyGroup][this.scale];
                this.streaks[5] = 0;
                this.streaks[7] = 0;
            }
            // Alpha Beta Gamma (Up a 4th)
            else if (s1 >= es6 && s3 >= es6 && s5 >= es6 && (s1 === es6 || s3 === es6 || s5 === es6)) {
                this.scale += 5;
                if (this.scale >= 12) {
                    this.scale = this.scale % 12;
                }
                this.keySignature = Constants.KEY_SIGNATURES[this.keyGroup][this.scale];
                this.streaks[5] = 0;
                this.streaks[7] = 0;
            }
            // Alpha Beta Theta (Up a 5th)
            else if (s1 >= es6 && s3 >= es6 && s7 >= es6 && (s1 === es6 || s3 === es6 || s7 === es6)) {
                this.scale += 7;
                if (this.scale >= 12) {
                    this.scale = this.scale % 12;
                }
                this.keySignature = Constants.KEY_SIGNATURES[this.keyGroup][this.scale];
                this.streaks[5] = 0;
                this.streaks[7] = 0;
            }
        }
    }

    // This is the function that handles all of the note generation. 
    // It has various supporting functions that it calls, but it all stems from here.
    public originalNoteGeneration = async (EEGdataObj: DataStream8Ch | DataStream4Ch, /*instrument:number, noteType:number, noteVolume:number, numNotes:number*/) => {
        if (this.stopFlag) {
            console.log('stopped');
            clearInterval(this.musicClock);
            this.midiGenerator.setStopFlag();
            return;
        }

        // If this is the first reading, mark the time
        if (this.previousThousandEEG[0][0] === 0 && !this.stopWatch) {
            // We have to artificially change prevThouEEG because oftentimes the first value is actually just a 0 and we need to differentiate it
            this.previousThousandEEG[0][0] = 1;
            if(this.startTime === 0) {
                this.startTime = Date.now();
            }
        }

        // Once we get the first 10 EEG values, measure how long it took to get them to calculate EEG per second (default is 500hz)
        if (this.previousThousandEEG[0][9] !== undefined && !this.stopWatch) {
            var endTime: number = Date.now();
            var elapsed: number = endTime - this.startTime;
            var timePerEEG = (elapsed / 10) / 1000;             // div 1000 to convert from milliseconds to seconds
            this.eegPerSecond = Math.round(1 / timePerEEG);
            this.stopWatch = true;
        }

        // Grab num channels, ignore last index which contains timeStamp
        var size = Object.keys(EEGdataObj).length - 1;

        // The brainwave with the most activity
        var maxWave = [0, 0];

        // Grab values as arrays for easy looping    
        var dataArray = Object.values(EEGdataObj) as number[];

        // Loop through each EEG channel
        for (var i = 0; i < size; i++) {
            // Data for the current index
            var curChannelData: number = dataArray[i];

            var waveAvg = 0;
            if (i % 2 === 1) {
                waveAvg = (dataArray[i] + dataArray[i - 1]) / 2;
            }

            // Use Beta and Alpha activity to control volume
            if (i === 1 || i === 3) {
                this.volumeTempoAdjustor(i, waveAvg);
            }

            // If 3 or more waves show long spikes, change the key (3 has to include i = 5 or i = 7)
            if (i === 5 || i === 7) {
                this.keyAdjustor(i, waveAvg);
            }

            // Check to see if this is the wave with the most activity
            if (Math.abs(waveAvg) > maxWave[1]) {
                maxWave[0] = i;
                maxWave[1] = Math.abs(waveAvg);
            }

            let returnedAmpValue = curChannelData; // / Math.pow(10, 7);
            if (this.previousThousandEEG[i].length === 1000) {
                this.previousThousandEEG[i].shift();
            }

            // This was added because all 1000 of the first EEG values kept being 0s and it messed up the EEGperSecond Calculation
            if (returnedAmpValue !== 0) {
                this.previousThousandEEG[i].push(returnedAmpValue);
            }

            let avg = this.average(this.previousThousandEEG[i]);

            // Check for if we've had our first 1000 values yet, and if so, set the baseline to the average
            if (this.previousThousandEEG[i].length === 1000 && !this.firstThousand) {
                this.baselines[i] = avg;
                // Once we've set the average for every channel, we're done
                if (i === 7) {
                    this.firstThousand = true;
                }
            }

            this.baselines[i] = avg;

            this.avgArray[i] = avg;             // OLD: used for calculating intervals

        }

        if (this.sleeping) {
            return;
        }

        // Get the beat
        var declaredBeat = this.NoteDeclarationRaw(maxWave[1], maxWave[0]);

        // Once we generate a beat, we sleep until we need to do so again (this function gets called 100+ times a second and we only need one beat)
        this.sleeping = true;
        this.generateBeat(declaredBeat);

        // Once we have our first beat, we can start actually playing them
        if (this.firstCycle) {
            this.firstCycle = false;
        }

    };

    private async generateBeat(declaredBeat: any) {

        var noteLength: number = declaredBeat.duration;
        var noteFrequencies:Array<number> = [];
        var noteAndOctaves:any = [];

        var noteLengthName = getNoteLengthStringFromInt(noteLength);

        // Get the lowest octave that will be used in the song
        var floorOctave = GetFloorOctave(this.numNotes);

        for(var i = 0; i < declaredBeat.notes.length; i++) {

            // Get the actual note and its octave
            noteAndOctaves.push(this.GetNoteWRTKey(declaredBeat.notes[i]));

            // Combination string of note and octave (ex: 'C#5', 'F4')
            var noteOctaveString;

            // If the generated note is not a rest
            if (noteAndOctaves[i].note !== -1) {
                noteOctaveString = noteAndOctaves[i].note + (noteAndOctaves[i].octave + floorOctave - 2).toString();
                noteFrequencies.push(getFrequencyFromNoteOctaveString(noteOctaveString));
            }
            else {
                noteFrequencies.push(0);
            }

                // Debug -----------------------------------------              OLD
            if (this.debugOutput) {  // Test frequency of notes 
                let num = i + 1;
                var frequencyArray: number[] = [];
                frequencyArray.fill(-1);

                if (noteAndOctaves[i].note !== -1 && this.debugOutput) {
                    frequencyArray[i] = Number(noteAndOctaves[i].note);

                    console.log("Channel " + num + ": Playing " + noteAndOctaves[i].note);

                } else if (this.debugOutput) {
                    console.log("Channel " + num + ": At Rest");
                } else { }
                frequencyArray.forEach((n: any) => console.log(n));
            }
            // ------------------------------------- End Debug
        }

        

        this.currentNoteData = {
            player: { noteFrequencies, noteLength, timeForEachNoteArray: this.timeForEachNoteArray, amplitude: 100 },
            writer: { noteLengthName, notes: noteAndOctaves, floorOctave: floorOctave }
        };
        
    }

    // Given an index which represents the channel of brainwave that has the strongest activity...
    // ... take a random musical pattern from the corresponding list and return it with the duration of each note
    private getBeatFromIndex(index: number) {
        var beat;
        var pattern:any = [];
        var patternNumber;
        var duration;
        var wave;
        var i;

        if (index === 1) {
            wave = 'Alpha';
            patternNumber = Math.floor(Math.random() * Constants.alphaPatterns.length);
            for(i = 0; i < Constants.alphaPatterns[patternNumber].length; i++) {
                pattern.push(Constants.alphaPatterns[patternNumber][i]);
            }
            duration = pattern.pop();
        }
        else if (index === 3) {
            wave = 'Beta';
            patternNumber = Math.floor(Math.random() * Constants.betaPatterns.length);
            for(i = 0; i < Constants.betaPatterns[patternNumber].length; i++) {
                pattern.push(Constants.betaPatterns[patternNumber][i]);
            }
            duration = pattern.pop();
        }
        else if (index === 5) {
            wave = 'Gamma';
            patternNumber = Math.floor(Math.random() * Constants.gammaPatterns.length);
            for(i = 0; i < Constants.gammaPatterns[patternNumber].length; i++) {
                pattern.push(Constants.gammaPatterns[patternNumber][i]);
            }
            duration = pattern.pop();
        }
        else {
            wave = 'Theta';
            patternNumber = Math.floor(Math.random() * Constants.thetaPatterns.length);
            for(i = 0; i < Constants.thetaPatterns[patternNumber].length; i++) {
                pattern.push(Constants.thetaPatterns[patternNumber][i]);
            }
            duration = pattern.pop();
        }

        console.log("Wave: " + wave + "  Pattern number: " + patternNumber);
        // Notes in the patterns are relative to the last note played, so we adjust them to match
        for (i = 0; i < pattern.length; i++) {
            if (pattern[i] === 0) {
                pattern[i] = -1;
            }
            else if (pattern[i] > 0) {
                pattern[i] = this.prevBeat + (pattern[i] - 1);
                // Make sure you don't go out of bounds
                if (pattern[i] >= this.numNotes) {
                    pattern[i] = pattern[i] % this.numNotes + this.numNotes - 7;
                }
                this.prevBeat = pattern[i];
            }
            else {
                pattern[i] = this.prevBeat + pattern[i];
                // Don't go out of bounds
                if (pattern[i] < 0) {
                    pattern[i] = 8 - pattern[i];
                }
                this.prevBeat = pattern[i];
            }
        }
        beat = {
            notes: pattern,
            duration: duration
        };
        return beat;
    }

    // This function gets called every beat to either play the next prepared beat, or wait until a half/whole note finishes playing
    // This.currentNoteData should be prepared while the previous note is playing
    private playNextBeat() {
        if(this.firstCycle) {
            return;
        }
        
        if (this.pauseCounter >= this.nextPause) {
            this.midiGenerator.realtimeGenerate(this.currentNoteData);
            this.pauseCounter = 0;
            this.nextPause = this.currentNoteData.player.noteLength === 3 ? 1 : this.currentNoteData.player.noteLength === 4 ? 3 : 0;   // 1 wait for half notes, 3 for whole notes
            this.sleeping = false;
        }
        else {
            this.pauseCounter++;
        }
    }

    // unused
    public prepNotesForMIDI() {
        let res;
        return res;
    }


}
