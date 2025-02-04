import FFT from "fft.js";
import { number } from "mathjs";

class EEGProcessor {
  private fftSize = 64; // Must be a power of 2
  private sampleRate = 128; // Hz
  private fft: FFT;
  private eegBuffer: Float32Array;
  private output: Float32Array;

  // EEG Band Power Storage
  public bandPower: { [key: string]: number } = {
    delta: 0,
    theta: 0,
    alpha: 0,
    beta: 0,
    gamma: 0,
    time: 0,
  };

  constructor() {
    this.fft = new FFT(this.fftSize);
    this.eegBuffer = new Float32Array(this.fftSize);
    this.output = new Float32Array(this.fftSize);
  }

  /** Update EEG Buffer with new data and process FFT when buffer is full */
  processEEG(eegBuffer: number[]) {
    // eegBuffer = this.eegBuffer.slice(1); // Shift left
    // this.eegBuffer[this.fftSize - 1] = eegValue; // Append new value
    console.log(eegBuffer.length);
    if (eegBuffer.length >= this.fftSize) {
      console.log("Processing FFT");
      return this.performFFT(eegBuffer);
    }
  }

  /** Perform FFT and compute band powers */
  private performFFT(eegBuffer: number[]) {
    const complexArray = this.fft.createComplexArray();
    this.fft.realTransform(complexArray, eegBuffer);
    this.fft.completeSpectrum(complexArray);

    const magnitudes = new Float32Array(this.fftSize / 2);
    for (let i = 0; i < magnitudes.length; i++) {
      const real = complexArray[2 * i];
      const imag = complexArray[2 * i + 1];
      magnitudes[i] = Math.sqrt(real * real + imag * imag); // Get amplitude
    }

    console.log("COmputing Band Powers");
    return this.computeBandPowers(magnitudes);
  }

  /** Compute EEG band powers */
  private computeBandPowers(magnitudes: Float32Array) {
    const freqResolution = this.sampleRate / this.fftSize;

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
    this.bandPower.delta = deltaCount > 0 ? deltaPower / deltaCount : 0;
    this.bandPower.theta = thetaCount > 0 ? thetaPower / thetaCount : 0;
    this.bandPower.alpha = alphaCount > 0 ? alphaPower / alphaCount : 0;
    this.bandPower.beta = betaCount > 0 ? betaPower / betaCount : 0;
    this.bandPower.gamma = gammaCount > 0 ? gammaPower / gammaCount : 0;

    this.bandPower.time = Date.now();
    console.log(this.bandPower);
    return this.bandPower;
  }
}

export default EEGProcessor;
