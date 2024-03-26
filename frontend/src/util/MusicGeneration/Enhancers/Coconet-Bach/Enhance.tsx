import * as mm from '@magenta/music/esm';

export class Enhance 
{

    constructor() { }

    public async Enhancer(midi: Uint8Array): Promise<Uint8Array>
    {
        
        // initializes the coconet model using the bach checkpoint
        const coco = new mm.Coconet("https://storage.googleapis.com/magentadata/js/checkpoints/coconet/bach");
        await coco.initialize();

        // converts the original midi into a quantized note sequence for coco to iterate on
        let originalSequence = mm.midiToSequenceProto(midi);
        originalSequence = mm.sequences.quantizeNoteSequence(originalSequence, 8);
        originalSequence.notes.forEach(n => n.velocity = 100); // make sure to do this or notes are silent

        // lets coco iterate then merges so notes sustains
        let infilledSequence = await coco.infill(originalSequence, {temperature: .25, numIterations: 10}); // temp and iter could be variables selected by user
        infilledSequence = mm.sequences.mergeConsecutiveNotes(infilledSequence);
        infilledSequence.notes.forEach(n => n.velocity = 100); // make sure to do this or notes are silent

        // converts infilledsequence to a midi
        const infilledMidi = mm.sequenceProtoToMidi(infilledSequence);

        // swap to the new output
        return infilledMidi;
    }

}