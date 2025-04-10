import { MusicSettings } from "../../../Interfaces";
// import { getNoteData } from './Playback'
import {getMillisecondsFromBPM/*, findNumSamples*/} from '../.././MusicHelperFunctions';
import * as Enums from '../../../Enums';
//import * as Constants from '../../../Constants';
//import { instrumentList } from "../.././InstOvertoneDefinitions";
import * as Tone from 'tone'
import {SamplerList} from '../../../Samplers';
//import * as SL from "../../../Instruments";

import { TDebugOptionsObject } from "../../../Types";

import MidiWriter from 'midi-writer-js';
import { Midi, Track } from '@tonejs/midi';

//import { time } from "console";
//import { NoteConstructorInterface } from "@tonejs/midi/dist/Note";
//import { NoteHandler } from "./NoteGeneration";

export class MIDIManager {
    // Settings
    private samplerArr:Array<Tone.Sampler> = [];
    private synthArr:Array<Tone.PolySynth<Tone.Synth<Tone.SynthOptions>>> = [];
    public MIDIChannels:MidiWriter.Track[] = [];
    private timeForEachNoteArray:Array<number>;
    public settings:MusicSettings;
    private BPM: number;
    private debugOutput:boolean = true;
    public MIDIURI:string;
    private stopFlag;//unused for now
    private midi;
    private prevNoteDuration:number;
    private lastPlayedTime:number;//Unused for now
    private silentFiller = true;
    private overflowAdjust = false;
    private volumeAdjustLimit = 1;
    private tempoAdjustLimit = 60;
    private tempoAdjustValue = 0;

    private midiWriterTracks:Array<Track> = []; 
     
    /* The constructor for the MIDIManager requires you to input the settings from the user input
        and the  */
    constructor(settings:MusicSettings, timeForEachNoteArray:Array<number>, debugOptionsObject:TDebugOptionsObject) {//////////[OFF]////////TEMPORARY null
        this.MIDIURI = "";
        this.midi = new Midi();

        for(let i = 0; i < 5; i++)
        {
            this.MIDIChannels.push((new MidiWriter.Track()));
            this.midiWriterTracks.push((this.midi.addTrack()));
        }

        this.settings = settings;
        this.BPM = settings.bpm;
        
        this.stopFlag = false;
        this.debugOutput = debugOptionsObject.debugOption3;
        this.initializeSettings(settings);
        this.timeForEachNoteArray = timeForEachNoteArray;
        this.prevNoteDuration = 0;
        this.lastPlayedTime = Date.now();
        
        this.initializeSynth();
        
    }

    

    /*  There are two playback objects that are working in our program, this is basically a way to manage the enormous amount of calls to this
        function since we are receiving tons of input from the EEG board every second. We are using the PolySynth to see if the array is playing
        back a note on the current channel right now since it is one of the only Tone.js players that contains a method to check for a playing note.
        If it isn't, we then fire a note from the PolySynth that is the same length as the Sampler's current note with no volume (hence the 
        volume.value = -100). To use the sampler, to add new instruments, you need to use a baseUrl that stores all the audio you want, and then
        provide all of the urls to each file that plays a note. If you want to see our samplers, we have a list of them in the utils folder under
        Samplers.tsx  */
    private initializeSynth() {
        Tone.getTransport().bpm.value = this.settings.bpm;
    
        var instArr = Object.values(this.settings.deviceSettings.instruments); 
        instArr.push(instArr[3]);//Since it's using the default GanglionSettings settings        
       
        /*  Here we are assigning a sampler and a polysynth to each channel based on the instruments array, we are passing a NULL to those 
        that will never utilize the sampler to maintain the samplerArr having a strict typing definition of Sampler and also keep the 
        channel size consistent. If it seems practical in the future to alter the samplers for consistency they can just simply be defined 
        in the Samplers.tsx file. */
        var polySynthesizer:Tone.PolySynth<Tone.Synth<Tone.SynthOptions>> =  new Tone.PolySynth().toDestination();
        var sampler;
    
        // Loop through the user chosen instruments and set their SL values
        for(let i = 0; i < 5; i++)
        { 
            // Sinewave / Default
            if (instArr[i] === 0)
            {    
                polySynthesizer.volume.value = -10;
            }

            //Instrument samples
            sampler = SamplerList[instArr[i]].toDestination();
            this.samplerArr.push(sampler);
            //Sinewave
            this.synthArr.push(polySynthesizer);//  V6 Note: To add a new instrument you have to add its name to the Enums.tsx's list and Samplers.tsx's list
                                                //           You also have to add the urls of the relavent note sample files to Sampers.tsx too!
        }

    
    }

    public initializeSettings(settings:MusicSettings) {
        /* This is just a start, we're going to work on a condition here
           where the number of tempos get set by the type of settings */
        for(let i = 0; i < 5; i++) {
    
            this.MIDIChannels[i].setTempo(settings.bpm, .1);
            this.MIDIChannels[i].setTimeSignature(4, 4);
        }
    }

    public adjustVolume(amount: number)//Note: Volume at default starts at 0 for some reason
    {
        let currentVolume = this.samplerArr[0].volume.value;
        //Volume adjustment limit
        if( ( (currentVolume + amount) < (this.volumeAdjustLimit) ) && ( (currentVolume + amount) > (this.volumeAdjustLimit * -1) ) )
        {
            //console.log("[=]Volume + " + amount + " VOL: " + currentVolume);
            this.synthArr[0].volume.value += amount;
            this.samplerArr[0].volume.value += amount;
        }
    }

    public adjustTempo(amount: number)
    {
        //Tempo adjustment limit
        if( ( (this.tempoAdjustValue + amount) < this.tempoAdjustLimit) && ( (this.tempoAdjustValue + amount) > (this.tempoAdjustLimit * -1) ) )
        {
            //console.log("[+]TEMPO + " + amount + " TEMP: " + this.tempoAdjustValue);
            this.tempoAdjustValue = this.tempoAdjustValue + amount;
            this.BPM += amount;
            Tone.getTransport().bpm.value = this.BPM;
            for(var i = 0; i < 5; i++)
            {
                this.MIDIChannels[i].setTempo(this.BPM, 0.1);
            }
        }
    }

    /*  This function exists to help convert the MIDI file into base64, the reason why we're splitting it
        into chunks is because the base64 string is very large, which overflows the buffer and causes
        errors, this is a workaround to that. */
    private sliceIntoChunks(arr:Uint8Array | Uint16Array, chunkSize:number) {
        const res = [];
        for(let i = 0; i < arr.length; i += chunkSize)
        {
          const chunk = arr.slice(i, i + chunkSize);
          res.push(chunk);
        }
        return res;
    };

    /*  We hand the file over to this function as a Uint8Array and then
        convert it into an audio file in base64 format. */
    private convertToBase64(file:Uint8Array): Promise<string> {
        return new Promise((resolve, reject) => {
            var fileBlob = new Blob([file], {
                type: 'audio/midi'
            });
            const fileReader = new FileReader();
        
            fileReader.readAsDataURL(fileBlob);
            fileReader.onload = () => {
                resolve(fileReader.result as string);
            };
            fileReader.onerror = (error) => {
                reject(error);
            }
        })
    }
    
    /* returnMIDI is simple, it takes the 8 channels of MIDI Writers and then
        puts them all into a new MIDIWriter which builds them all into a base64
        string. */
    public async returnMIDI() {
        // console.log('midiChannels: ', this.MIDIChannels);
        // Handles midi file generation for download    
        // Create a download link for the Blob object
        // const url = URL.createObjectURL(blob);
        // return url;
        
        var write = new MidiWriter.Writer(this.MIDIChannels);
        
        var midiBuildFile:Uint8Array = write.buildFile();
        
        // console.log('buildFile: ', midiBuildFile);
        
        // return write.base64();
        
        const midiFileChunks = this.sliceIntoChunks(midiBuildFile, 5000);
        // console.log(midiFileChunks);

        const fileString = new Uint8Array(midiFileChunks.reduce((acc:any[], midiFileChunk) => {
            return [...acc, ...Array.from(midiFileChunk)];
        }, []));

        return fileString;
    }

    /* This function is a helper in order to return the proper type to assign to the
       pitch in the MidiWriter. There may be a better solution to this in the future
       but for now it's practical to use this implementation */
    private definePitch(note:string, octave:number) {
        var pitch:MidiWriter.Pitch;
        switch(note) {
            case 'A':
                pitch = `A${octave}`;
                break;
            case 'A#':
                pitch = `A#${octave}`;
                break;
            case 'B':
                pitch = `B${octave}`;
                break;
            case 'C':
                pitch = `C${octave}`
                break;
            case 'C#':
                pitch = `C#${octave}`
                break;
            case 'D':
                pitch = `D${octave}`
                break;
            case 'D#':
                pitch = `D#${octave}`
                break;
            case 'E':
                pitch = `E${octave}`
                break;
            case 'F':
                pitch = `F${octave}`
                break;
            case 'F#':
                pitch = `F#${octave}`
                break;
            case 'G':
                pitch = `G${octave}`
                break;
            case 'G#':
                pitch = `G#${octave}`
                break;
            default:
                pitch = `A${octave}`
                break;
        }
        return pitch;
    }

    public convertInput(noteData:any, idVal:number) {
        if (noteData === undefined) {
            return;
        }
        if (this.debugOutput) console.log('beginning to write');
        var noteDuration:MidiWriter.Duration = '1';
        var expectMaxNumNotes = 1;
        var fillerSilentNotes = 0;

        /* This code block sets the data from the note manager into usable data for
            the midi-writer-js API. */
        if (noteData.noteLengthName === "sixteenth")
        { 
            noteDuration = '16';
            expectMaxNumNotes = 16;
        }
        else if (noteData.noteLengthName === "eighth")
        {
            noteDuration = '8';
            expectMaxNumNotes = 8;
        }
        else if (noteData.noteLengthName === "quarter")
        {
            noteDuration = '4';
            expectMaxNumNotes = 4;
        }
        else if (noteData.noteLengthName === "half")
        {
            noteDuration = '2';
            expectMaxNumNotes = 2;
        } 
        else if (noteData.noteLengthName === "whole")
        {
            noteDuration = '1';
            expectMaxNumNotes = 1;
        }
        else {
            if (this.debugOutput) console.log("we fell to default length:", noteData.noteLengthName);
            noteDuration = '4';
            expectMaxNumNotes = 4;
        }

        if(this.overflowAdjust)//[overflow adjustment] EX: Try to generate 3 half notes but a measure can only hold 2 half notes so change into quarter notes
        {
            let noteTally = noteData.notes.length;
            if(noteTally > 8)
            {
                if(noteDuration !== '16')
                {
                    noteDuration = '16';
                    expectMaxNumNotes = 16;
                }
            }
            else if(noteTally > 4)
            {
                if(noteDuration !== '8')
                {
                    noteDuration = '8';
                    expectMaxNumNotes = 8;
                }
            }
            else if(noteTally > 2)
            {
                if(noteDuration !== '4')
                {
                    noteDuration = '4';
                    expectMaxNumNotes = 4;
                }
            }
            else if(noteTally > 1)
            {
                if(noteDuration !== '2')
                {
                    noteDuration = '2';
                    expectMaxNumNotes = 2;
                }
            }
            else if(noteTally === 1)
            {
                if(noteDuration !== '1')
                {
                    noteDuration = '1';
                    expectMaxNumNotes = 1;
                }
            }
        }

        if(this.silentFiller)//[Filler silent notes] EX: generate 3 quarter notes each time but want them in their own measures so fill in the remaining missing notes at the end of the measure with silent/rest notes
        {
            if(noteData.notes.length < expectMaxNumNotes)
            {
                fillerSilentNotes = expectMaxNumNotes - noteData.notes.length;
            }
        }
        
        for(let i = 0; i < noteData.notes.length; i++)
        {
            if(i === expectMaxNumNotes || i >= 16)//overflow prevention
            {
                break;
            }

            var generatedNote:MidiWriter.NoteEvent;

            if (noteData.notes[i].note === -1)  {// Rest
                if (this.debugOutput) console.log('writing a rest on channel: ', i);

                generatedNote = new MidiWriter.NoteEvent({pitch: 'A0', velocity:0, duration: noteDuration});
                this.MIDIChannels[idVal].addEvent(generatedNote);

                // if (this.debugOutput) console.log('the channel after this write: ', this.MIDIChannels[i]);
            } else {

                // if (this.debugOutput) console.log('writing ', noteData.writer.note, noteData.writer.octave, 'on channel:', i);
                
                var pitch:MidiWriter.Pitch = this.definePitch(noteData.notes[i].note, noteData.notes[i].octave + noteData.floorOctave);
                // var temp:NoteConstructorInterface = {
                //     pitch, duration: noteDuration, octave: octave, time: this.midiWriterTracks[i].duration
                // }

                // this.midiWriterTracks[i].addNote(temp);

                generatedNote = new MidiWriter.NoteEvent({pitch: pitch, duration: noteDuration});
                this.MIDIChannels[idVal].addEvent(generatedNote);
                // if (this.debugOutput) console.log('the channel after this write: ', this.MIDIChannels[i]);
            }
        }
        
        if(this.silentFiller)
        {
            for(let i = 0; i < fillerSilentNotes; i++)
            {
                if (this.debugOutput) console.log('writing a rest on channel: ', i);

                generatedNote = new MidiWriter.NoteEvent({pitch: 'A0', velocity:0, duration: noteDuration});
                this.MIDIChannels[idVal].addEvent(generatedNote);
            }
        }

        return;
    }

    public toggleEndFiller()//Auto generate silent/rest notes at the end of the measure?
    {
        if(this.silentFiller)
        {
            this.silentFiller = false;
        }
        else
        {
            this.silentFiller = true;
        }
    }

    public toggleOverflowAdjust()//Adjust note type when there are too many of a specified note type that the measure can't hold
    {
        if(this.overflowAdjust)//Note You can only generate a maximum of 16 different notes as sixteenths is the shortest a note can be within a measure
        {
            this.overflowAdjust = false;
        }
        else
        {
            this.overflowAdjust = true;
        }
    }

    private convertDurationToString(duration:number) {
        switch(duration) {
            case Enums.NoteDurations.WHOLE:
                return "1n";
            case Enums.NoteDurations.HALF:
                return "2n";
            case Enums.NoteDurations.QUARTER:
                return "4n";
            case Enums.NoteDurations.EIGHTH:
                return "8n";
            case Enums.NoteDurations.SIXTEENTH:
                return "16n";
            default:
                return "2n";
        }
    }

    private setTimeForEachNoteArray(BPM:number, noteLength:number) {        
        switch(noteLength) {
            case Enums.NoteDurations.SIXTEENTH:
                return getMillisecondsFromBPM(BPM) / 4;
            case Enums.NoteDurations.EIGHTH:
                return getMillisecondsFromBPM(BPM) / 2;
            case Enums.NoteDurations.QUARTER:
                return getMillisecondsFromBPM(BPM);
            case Enums.NoteDurations.HALF:
                return getMillisecondsFromBPM(BPM) * 2;
            case Enums.NoteDurations.WHOLE:
                return getMillisecondsFromBPM(BPM) * 4;
            default:
                return getMillisecondsFromBPM(BPM) * 4;
        }
    }


    public async realtimeGenerate(noteData:any, idVal:number) {
        var instruments = this.settings.deviceSettings.instruments;
        var instrumentsArr:Array<any> = [];

        var durations = this.settings.deviceSettings.durations;
        var durationsArr:Array<number> = [];

        var notesToPlay:Array<any> = [];

        // Convert instruments to array
        let inst: keyof typeof instruments;
        for(inst in instruments)
        {
            instrumentsArr.push(instruments[inst]);
        }
        instrumentsArr.push(instrumentsArr[3]);//Since it's using the default GanglionSettings settings

        let dur: keyof typeof durations;
        for(dur in durations)
        {
            durationsArr.push(durations[dur]);
        }
        durationsArr.push(durationsArr[3]);//Since it's using the default GanglionSettings settings

        // let lengthCount = 16;

        // if(this.overflowAdjust)
        // {
        //     lengthCount = noteData.writer.length;//overflow on specified length for playback system

        //     if(lengthCount >= (2 ** noteData.player.noteLength))
        //     {
        //             lengthCount = (2 ** noteData.player.noteLength);
        //     }
        // }

       // Convert given notes to a usable form
        for(let i = 0; i < noteData.writer.notes.length; i++)
        {
            // if(i == lengthCount)
            // {
            //     break;
            // }
            if (noteData.writer.notes[i].note !== -1)
            {
                notesToPlay.push(this.definePitch(noteData.writer.notes[i].note, noteData.writer.notes[i].octave + noteData.writer.floorOctave));
            }
            else
            {
                // Rest
            notesToPlay.push('00');
            }
       }
        
    /*  This is where feedback is actually sent to the speakers of the computer, we're using Tone.js to send
        a synth as output. The way this is done is through an array of tones for each channel, this is so that we can make
        sure no channel is going to be overlapped by a new input. This essentially works by checking to see if the channel is
        playing a sound through the activeVoices value, if it's equal to 1 then it's playing a sound so we only fire the call
        when it's 0. The triggerAttackRelease function takes in the values of notes, duration, and time. Hence the switch case
        the frequency we provide it is the note value. */
        
        var playerInfo = noteData.player;

        // Setup for their vars
        var duration;
        
        // Old version of setting duration
        //duration = 2 + (2 - playerInfo.noteLength);         // Durations is reversed in here for some reason    
        
        duration = playerInfo.noteLength;
        while(true)
        {
            if(noteData.writer.notes.length > (2 ** duration))
            {
                duration++;
            }
            else
            {
                break;
            }
        }
        duration = playerInfo.noteLength;
        
        var frequencies = playerInfo.noteFrequencies;

        var instArr = Object.values(this.settings.deviceSettings.instruments); 
        instArr.push(instArr[3]);           

        /*
        * The duration lengths are defined in https://github.com/Tonejs/Tone.js/blob/641ada9/Tone/core/type/Units.ts#L53.
        * To add more values in the future just reference the above link and add to the enums in '../Enums.tsx'.
        * If you want to add frequencies, you can define them either in basic terms like 'B3' or use a numeric value,
        * because we want a more specific sound we are using numerics.
        * We also attempt to offset the following note by the ms equivalient of the current note len.
        */

        var durationString:string = this.convertDurationToString(duration); 
        
        var noteDurationMS = this.setTimeForEachNoteArray(this.BPM, duration);

        /* This is the base case, if there is nothing stored in the array then we don't want to check if the currentVoice is undefined */
        if(instArr[idVal] === Enums.InstrumentTypes.SINEWAVE) {
            // if (this.debugOutput) console.log(this.synthArr[i]);
            //if(Date.now() - this.lastPlayedTime >= this.prevNoteDuration) {//Old code
                this.convertInput(noteData.writer, idVal);//add to MIDI track
                if (frequencies.length === 1) {
                    this.synthArr[idVal].triggerAttackRelease(frequencies, durationString)
                }       
                else if (frequencies.length === 2) {
                    this.synthArr[idVal].triggerAttackRelease(frequencies[0], durationString)
                    setTimeout(() => {this.synthArr[idVal].triggerAttackRelease(frequencies[1], durationString)}, noteDurationMS);
                }    
                else {
                    this.playSixteenthsRecursiveSynth(frequencies, durationString, noteDurationMS, 0, idVal,  (2 ** duration));
                }     
                this.lastPlayedTime = Date.now();
                this.prevNoteDuration = noteDurationMS;
            //}
        }
        else {
            //if(Date.now() - this.lastPlayedTime >= this.prevNoteDuration) {//Old code
                if (this.debugOutput) console.log('playing this note on channel: ', 0);
                this.convertInput(noteData.writer, idVal);//add to MIDI track
                if (notesToPlay.length === 1) {
                    if (notesToPlay[0] !== '00') {
                        this.samplerArr[idVal].triggerAttackRelease(notesToPlay[0], durationString)
                    }
                }       
                else if (notesToPlay.length === 2) {
                    if (notesToPlay[0] !== '00') {
                        this.samplerArr[idVal].triggerAttackRelease(notesToPlay[0], durationString)
                    }
                    setTimeout(() => { if(notesToPlay[1] !== '00') {this.samplerArr[idVal].triggerAttackRelease(notesToPlay[1], durationString)}}, noteDurationMS);
                }    
                else {
                    this.playSixteenthsRecursiveSampler(notesToPlay, durationString, noteDurationMS, 0, idVal, (2 ** duration));
                }
                this.lastPlayedTime = Date.now();
                this.prevNoteDuration = noteDurationMS;
            //}
        }
    }

    private playSixteenthsRecursiveSynth(frequencies:Array<number>, duration:string, noteDurationMS:number, i:number, idVal:number, limit:number) {
        if (i === frequencies.length || i === limit || i >= 16) {
            return;
        }
        this.synthArr[idVal].triggerAttackRelease(frequencies[i], duration);
        setTimeout(() => {this.playSixteenthsRecursiveSynth(frequencies, duration, noteDurationMS, i + 1, idVal, limit)}, noteDurationMS);
    }

    private playSixteenthsRecursiveSampler(notesToPlay:Array<any>, duration:string, noteDurationMS:number, i:number, idVal:number, limit:number)
    {
        if (i === notesToPlay.length|| i === limit || i >= 16) {
            return;
        }
        if (notesToPlay[i] !== '00') {
            this.samplerArr[idVal].triggerAttackRelease(notesToPlay[i], duration);
        }
        setTimeout(() => {this.playSixteenthsRecursiveSampler(notesToPlay, duration, noteDurationMS, i + 1, idVal, limit)}, noteDurationMS);
    }

    public setStopFlag() {
        if (this.debugOutput) console.log("Setting stop flag in MIDIManager.");
        this.stopFlag = true;
    }

    public setDebugOutput(b:boolean){
        this.debugOutput = b;
        if (this.debugOutput) console.log("Setting MIDIManager debug to ", b);
    }
}