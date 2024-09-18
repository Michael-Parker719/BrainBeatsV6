import { MusicSettings } from "../../../Interfaces";
// import { getNoteData } from './Playback'
import {getMillisecondsFromBPM, findNumSamples} from '../../MusicHelperFunctions';
import * as Enums from '../../../Enums';
import * as Constants from '../../../Constants';
import { instrumentList } from "../../InstOvertoneDefinitions";
import * as Tone from 'tone'
import {SamplerList} from '../../../Samplers';
import * as SL from "../../../Instruments";

import { TDebugOptionsObject } from "../../../Types";

import MidiWriter from 'midi-writer-js';
import { Midi, Track } from '@tonejs/midi';

import { time } from "console";
import { NoteConstructorInterface } from "@tonejs/midi/dist/Note";
import { NoteHandler } from "./NoteGeneration";

import * as mm from '@magenta/music/esm';

export class MIDIManager {
    // Settings
    private samplerArr:Array<Tone.Sampler> = [];
    private synthArr:Array<Tone.PolySynth<Tone.Synth<Tone.SynthOptions>>> = [];
    public MIDIChannels:MidiWriter.Track[] = [];
    private timeForEachNoteArray:Array<number>;
    public settings:MusicSettings;
    private BPM: number;
    private debugOutput:boolean;
    public MIDIURI:string;
    private stopFlag;
    private midi;
    private prevNoteDuration:number;
    private lastPlayedTime:number;

    private midiWriterTracks:Array<Track> = []; 
    private currentVoices:Array<number> = [];
     
    /* The constructor for the MIDIManager requires you to input the settings from the user input
        and the  */
    constructor(settings:MusicSettings, timeForEachNoteArray:Array<number>, debugOptionsObject:TDebugOptionsObject) {
        this.MIDIURI = "";
        this.midi = new Midi();

        var newChannel0 = this.midi.addTrack();
        var newChannel1 = this.midi.addTrack();
        var newChannel2 = this.midi.addTrack();
        var newChannel3 = this.midi.addTrack();

        
        var channel0 = new MidiWriter.Track();
        var channel1 = new MidiWriter.Track();
        var channel2 = new MidiWriter.Track();
        var channel3 = new MidiWriter.Track();
        this.MIDIChannels.push(channel0, channel1, channel2, channel3)

        this.midiWriterTracks.push(newChannel0, newChannel1, newChannel2, newChannel3);

        /*  This block initializes 4 more channels to write MIDI to in the case that
            we are using the cyton board, it does this by looking at the number of channels
            in the instrument setting since it is specific to the device. */
        // console.log(Object.keys(settings.deviceSettings.instruments))
        if((Object.keys(settings.deviceSettings.instruments).length) === 8) {
            var newChannel4 = this.midi.addTrack();
            var newChannel5 = this.midi.addTrack();
            var newChannel6 = this.midi.addTrack();
            var newChannel7 = this.midi.addTrack();

            var channel4 = new MidiWriter.Track();
            var channel5 = new MidiWriter.Track();
            var channel6 = new MidiWriter.Track();
            var channel7 = new MidiWriter.Track();

            this.MIDIChannels.push(channel4, channel5, channel6, channel7)
            this.midiWriterTracks.push(newChannel4, newChannel5, newChannel6, newChannel7);

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

        this.currentVoices = new Array(8).fill(0);
        var instArr = Object.values(this.settings.deviceSettings.instruments)            
        
        /*  Here we are assigning a sampler and a polysynth to each channel based on the instruments array, we are passing a NULL to those 
        that will never utilize the sampler to maintain the samplerArr having a strict typing definition of Sampler and also keep the 
        channel size consistent. If it seems practical in the future to alter the samplers for consistency they can just simply be defined 
        in the Samplers.tsx file. */
        var polySynthesizer:Tone.PolySynth<Tone.Synth<Tone.SynthOptions>> =  new Tone.PolySynth().toDestination();
        var sampler;

        // Loop through the user chosen instruments and set their SL values
        for (var i = 0; i < 8; i++) {
            
            // Sinewave / Default
            if (instArr[i] === 0) {
                sampler = SamplerList[instArr[i]].toDestination();
                polySynthesizer.volume.value = -10;
            }
            else {
                // This is piano right now, any new instrument that gets added needs to go in in its respective location in the sampler list
                // constant
                // console.log(instArr[i], SamplerList[instArr[i]]);
                sampler = SamplerList[instArr[i]].toDestination()
            }
            this.samplerArr.push(sampler);
            this.synthArr.push(polySynthesizer);
        }
    }
    
    public initializeSettings(settings:MusicSettings) {
        /* This is just a start, we're going to work on a condition here
           where the number of tempos get set by the type of settings */
        for(var i = 0; i < this.MIDIChannels.length; i++) {
            this.MIDIChannels[i].setTempo(settings.bpm, .1);
            this.MIDIChannels[i].setTimeSignature(4, 4);
        }
    }

    public adjustVolume(amount: number, channel: number) {
        this.synthArr[channel].volume.value += amount;
    }

    public adjustTempo(amount: number, channel:number) {
        this.BPM += amount;
        this.MIDIChannels[channel].setTempo(this.BPM, 0.1);
        Tone.getTransport().bpm.value = this.BPM;
    }

    /*  This function exists to help convert the MIDI file into base64, the reason why we're splitting it
        into chunks is because the base64 string is very large, which overflows the buffer and causes
        errors, this is a workaround to that. */
    private sliceIntoChunks(arr:Uint8Array | Uint16Array, chunkSize:number) {
        const res = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
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
        
        for(let i = 0; i < this.synthArr.length; i++) {
            this.synthArr[i].releaseAll();
        }
        
        var write = new MidiWriter.Writer(this.MIDIChannels);
        
        var midiBuildFile:Uint8Array = write.buildFile();
        
        // console.log('buildFile: ', midiBuildFile);
        
        // return write.base64();
        
        const midiFileChunks = this.sliceIntoChunks(midiBuildFile, 5000);
        // console.log(midiFileChunks);

        const fileString = new Uint8Array(midiFileChunks.reduce((acc:any[], midiFileChunk) => {
            return [...acc, ...Array.from(midiFileChunk)];
        }, []));

        try {
            // initializes the coconet model using the bach checkpoint
            const coco = new mm.Coconet("https://storage.googleapis.com/magentadata/js/checkpoints/coconet/bach");
            await coco.initialize();

            // converts the original midi into a quantized note sequence for coco to iterate on
            let originalSequence = mm.midiToSequenceProto(fileString);
            originalSequence = mm.sequences.quantizeNoteSequence(originalSequence, 4);
            originalSequence.notes.forEach(n => n.velocity = 100); // make sure to do this or notes are silent

            // lets coco iterate then merges so notes sustains
            let infilledSequence = await coco.infill(originalSequence, {temperature: .25, numIterations: 10}); // temp and iter could be variables selected by user
            infilledSequence = mm.sequences.mergeConsecutiveNotes(infilledSequence);
            infilledSequence.notes.forEach(n => n.velocity = 100); // make sure to do this or notes are silent

            // converts infilledsequence to a midi
            const infilledMidi = mm.sequenceProtoToMidi(infilledSequence);

            return infilledMidi;
        }
        catch {
            return fileString;
        }
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

    public convertInput(noteData:any) {
        if (noteData === undefined) {
            return;
        }
        if (this.debugOutput) console.log('beginning to write');
        var noteDuration:MidiWriter.Duration = '1';

        /* This code block sets the data from the note manager into usable data for
            the midi-writer-js API. */
        if (noteData.noteLengthName === "sixteenth") noteDuration = '16';
        else if (noteData.noteLengthName === "eighth") noteDuration = '8';
        else if (noteData.noteLengthName === "quarter") noteDuration = '4';
        else if (noteData.noteLengthName === "half") noteDuration = '2';
        else if (noteData.noteLengthName === "whole") noteDuration = '1';
        else {
            if (this.debugOutput) console.log("we fell to default length:", noteData.noteLengthName);
            noteDuration = '4';
        }
        
        for(var i = 0; i < noteData.notes.length; i++) {

            var generatedNote:MidiWriter.NoteEvent;

            if (noteData.notes[i].note === -1)  {// Rest
                if (this.debugOutput) console.log('writing a rest on channel: ', i);

                generatedNote = new MidiWriter.NoteEvent({pitch: 'A0', velocity:0, duration: noteDuration});
                this.MIDIChannels[0].addEvent(generatedNote);

                // if (this.debugOutput) console.log('the channel after this write: ', this.MIDIChannels[i]);
            } else {

                // if (this.debugOutput) console.log('writing ', noteData.writer.note, noteData.writer.octave, 'on channel:', i);
                
                var pitch:MidiWriter.Pitch = this.definePitch(noteData.notes[i].note, noteData.notes[i].octave + noteData.floorOctave - 2);
                // var temp:NoteConstructorInterface = {
                //     pitch, duration: noteDuration, octave: octave, time: this.midiWriterTracks[i].duration
                // }

                // this.midiWriterTracks[i].addNote(temp);

                generatedNote = new MidiWriter.NoteEvent({pitch: pitch, duration: noteDuration});
                this.MIDIChannels[0].addEvent(generatedNote);
                // if (this.debugOutput) console.log('the channel after this write: ', this.MIDIChannels[i]);
            }
        }

        return;
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


    public async realtimeGenerate(noteData:any) {
       var instruments = this.settings.deviceSettings.instruments;
       var instrumentsArr:Array<any> = [];

       var durations = this.settings.deviceSettings.durations;
       var durationsArr:Array<number> = [];

       var notesToPlay:Array<any> = [];

       // Convert instruments to array
       let inst: keyof typeof instruments;
       for (inst in instruments) {
         instrumentsArr.push(instruments[inst]);
       }

       let dur: keyof typeof durations;
       for (dur in durations) {
         durationsArr.push(durations[dur]);
       }

       // Convert given notes to a usable form
       for (var i = 0; i < noteData.writer.notes.length; i++) {
         if (noteData.writer.notes[i].note !== -1) {
            notesToPlay.push(this.definePitch(noteData.writer.notes[i].note, noteData.writer.notes[i].octave + noteData.writer.floorOctave));
         }
         else {
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
        var soundType = instrumentsArr[0];
        var duration = 2 + (2 - playerInfo.noteLength);         // Durations is reversed in here for some reason    
        var amplitude = playerInfo.amplitude;
        var frequencies = playerInfo.noteFrequencies;

        var instArr = Object.values(this.settings.deviceSettings.instruments)            

        /*
        * The duration lengths are defined in https://github.com/Tonejs/Tone.js/blob/641ada9/Tone/core/type/Units.ts#L53.
        * To add more values in the future just reference the above link and add to the enums in '../Enums.tsx'.
        * If you want to add frequencies, you can define them either in basic terms like 'B3' or use a numeric value,
        * because we want a more specific sound we are using numerics.
        * We also attempt to offset the following note by the ms equivalient of the current note len.
        */

        var durationString:string = this.convertDurationToString(duration); 
        
        var soundTime = this.currentVoices[0] * 1000;
        var noteDurationMS = this.setTimeForEachNoteArray(this.settings.bpm, duration);

        /* This is the base case, if there is nothing stored in the array then we don't want to check if the currentVoice is undefined */
        if(instArr[0] === Enums.InstrumentTypes.SINEWAVE) {
            // if (this.debugOutput) console.log(this.synthArr[i]);
            //if(Date.now() - this.lastPlayedTime >= this.prevNoteDuration) {
                this.convertInput(noteData.writer);
                if (frequencies.length === 1) {
                    this.synthArr[0].triggerAttackRelease(frequencies, durationString)
                }       
                else if (frequencies.length === 2) {
                    this.synthArr[0].triggerAttackRelease(frequencies[0], durationString)
                    setTimeout(() => {this.synthArr[0].triggerAttackRelease(frequencies[1], durationString)}, noteDurationMS);
                }    
                else {
                    this.playSixteenthsRecursiveSynth(frequencies, durationString, noteDurationMS, 0);
                }     
                this.lastPlayedTime = Date.now();
                this.prevNoteDuration = noteDurationMS;
            //}
        }
        else {
            //if(Date.now() - this.lastPlayedTime >= this.prevNoteDuration) {
                if (this.debugOutput) console.log('playing this note on channel: ', 0);
                this.convertInput(noteData.writer);
                if (notesToPlay.length === 1) {
                    if (notesToPlay[0] !== '00') {
                        this.samplerArr[0].triggerAttackRelease(notesToPlay[0], durationString)
                    }
                }       
                else if (notesToPlay.length === 2) {
                    if (notesToPlay[0] !== '00') {
                        this.samplerArr[0].triggerAttackRelease(notesToPlay[0], durationString)
                    }
                    setTimeout(() => { if(notesToPlay[1] !== '00') {this.samplerArr[0].triggerAttackRelease(notesToPlay[1], durationString)}}, noteDurationMS);
                }    
                else {
                    this.playSixteenthsRecursiveSampler(notesToPlay, durationString, noteDurationMS, 0);
                }
                this.lastPlayedTime = Date.now();
                this.prevNoteDuration = noteDurationMS;
            //}
        }
        // else if (currentVoice.name === 'Sampler') {      
        //     console.log(this.samplerArr[i].now());  
        //     if(currentVoice._activeSources.size < 2) {
        //         if(instArr[i] === Enums.InstrumentTypes.PIANO) {
        //             this.currentVoices[i] = this.samplerArr[i].triggerAttackRelease(this.definePitch(noteData[i].writer.note, noteData[i].writer.octave), durationString, this.samplerArr[i].now())
        //         }
        //         this.convertInput(noteData[i], i);    
        //     }
        // }
        // else if(currentVoice.name === 'PolySynth') {
        //     if(currentVoice._activeVoices.length < 1) {
        //         if(instArr[i] === Enums.InstrumentTypes.SINEWAVE) {
        //             this.currentVoices[i] = this.synthArr[i].triggerAttackRelease(frequency, durationString, this.synthArr[i].now())

        //         }
        //         this.convertInput(noteData[i], i);
        //     }
        // }   
    }

    private playSixteenthsRecursiveSynth(frequencies:Array<number>, duration:string, noteDurationMS:number, i:number) {
        if (i === 4) {
            return;
        }
        this.synthArr[0].triggerAttackRelease(frequencies[i], duration);
        setTimeout(() => {this.playSixteenthsRecursiveSynth(frequencies, duration, noteDurationMS, i + 1)}, noteDurationMS);
    }

    private playSixteenthsRecursiveSampler(notesToPlay:Array<any>, duration:string, noteDurationMS:number, i:number) {
        if (i === 4) {
            return;
        }
        if (notesToPlay[i] !== '00') {
            this.samplerArr[0].triggerAttackRelease(notesToPlay[i], duration);
        }
        setTimeout(() => {this.playSixteenthsRecursiveSynth(notesToPlay, duration, noteDurationMS, i + 1)}, noteDurationMS);
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