/* This abstract class contains all named functions that must be implemented in your
new enhancer algorithms. */

export abstract class AbstractEhancer
{

    constructor() {}
    public abstract Enhancer(midi: Uint8Array): Promise<Uint8Array>;

}