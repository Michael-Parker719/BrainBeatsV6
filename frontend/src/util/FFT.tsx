// This file contains the fft function used in Brain Beats V6
import { DataStream8Ch } from './Interfaces'

export class FFT
{
  private in_data = [];
  private out_data : DataStream8Ch = {
    channel00: -1,
    channel01: -1,
    channel02: -1,
    channel03: -1,
    channel04: -1,
    channel05: -1,
    channel06: -1,
    channel07: -1,
    timeStamp: -1
  };

  public async setInput(arr:number[]){
    this.in_data = arr;
  }

  public getOutput(){
    this.out_data.timeStamp = Date.now();
    return this.outData;
  }

  private fFT(arr:numer[]){
    // do fft here
  }
}
