import FFT from "fft.js";
import { number } from "mathjs";
import { DataStream5Waves } from "./Interfaces";
import { sampleRate } from "./Constants";

class EEGProcessor {
  private fft: FFT;
  private eegBuffer: Float32Array;
  private output: Float32Array;

  // EEG Band Power Storage
  public bandPower: DataStream5Waves = {
    waveDelta: 0,
    waveTheta: 0,
    waveAlpha: 0,
    waveBeta: 0,
    waveGamma: 0,
    timeStamp: 0,
  };

  constructor(bufferSize: number, sampleRate: number) {
    this.fft = new FFT(bufferSize);
    this.eegBuffer = new Float32Array(bufferSize);
    this.output = new Float32Array(bufferSize);
  }

  /** Update EEG Buffer with new data and process FFT when buffer is full */
  processEEG(eegBuffer: number[]) {
    // eegBuffer = this.eegBuffer.slice(1); // Shift left
    // this.eegBuffer[this.buffer - 1] = eegValue; // Append new value
    console.log(eegBuffer.length);
    if (eegBuffer.length >= eegBuffer.length) {
      console.log("Processing FFT");
      return this.performFFT(eegBuffer, sampleRate);
    }
  }

  /** Perform FFT and compute band powers */
  private performFFT(eegBuffer: number[], sampleRate: number) {
    const complexArray = this.fft.createComplexArray();
    this.fft.realTransform(complexArray, eegBuffer);
    this.fft.completeSpectrum(complexArray);

    const magnitudes = new Float32Array(eegBuffer.length / 2);
    for (let i = 0; i < magnitudes.length; i++) {
      const real = complexArray[2 * i];
      const imag = complexArray[2 * i + 1];
      magnitudes[i] = Math.sqrt(real * real + imag * imag); // Get amplitude
    }

    console.log("Computing Band Powers");
    const freqResolution = sampleRate / eegBuffer.length;
    return this.computeBandPowers(magnitudes, freqResolution);
  }

  /** Compute EEG band powers */
  private computeBandPowers(magnitudes: Float32Array, freqResolution: number) {
    let deltaPower = 0,
      thetaPower = 0,
      alphaPower = 0,
      betaPower = 0,
      gammaPower = 0;
    let deltaCount = 0,
      thetaCount = 0,
      alphaCount = 0,
      betaCount = 0,
      gammaCount = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      const freq = i * freqResolution;
      const power = Math.log(1 + magnitudes[i]); // Log scaling

      if (freq >= 0.5 && freq < 4) {
        deltaPower += power;
        deltaCount++;
      } else if (freq >= 4 && freq < 8) {
        thetaPower += power;
        thetaCount++;
      } else if (freq >= 8 && freq < 14) {
        alphaPower += power;
        alphaCount++;
      } else if (freq >= 14 && freq < 30) {
        betaPower += power;
        betaCount++;
      } else if (freq >= 30 && freq < 64) {
        gammaPower += power;
        gammaCount++;
      }
    }

    // Normalize by count
    this.bandPower.waveDelta = deltaCount > 0 ? deltaPower / deltaCount : 0;
    this.bandPower.waveTheta = thetaCount > 0 ? thetaPower / thetaCount : 0;
    this.bandPower.waveAlpha = alphaCount > 0 ? alphaPower / alphaCount : 0;
    this.bandPower.waveBeta = betaCount > 0 ? betaPower / betaCount : 0;
    this.bandPower.waveGamma = gammaCount > 0 ? gammaPower / gammaCount : 0;

    this.bandPower.timeStamp = Date.now();
    console.log(this.bandPower);
    return this.bandPower;
  }
}

export default EEGProcessor;
