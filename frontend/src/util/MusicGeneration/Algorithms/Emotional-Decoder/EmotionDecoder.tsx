import * as math from "mathjs";
import wt from "discrete-wavelets";

// @ts-ignore
import SVM from "libsvm-js/asm";

import modelWeightsSVM from "./models/modelWeightsSVM";

interface FeatureStat {
    avg: number;
    std: number;
    n: number;
    m_oldM: number;
    m_newM: number;
    m_oldS: number;
    m_newS: number;
}

class EmotionDecoder {
    private emotion_decoder_svm: any;
    private eeg_features_stats: FeatureStat[];
    private emotion_mappings: string[];

    constructor(svm_filename: string = modelWeightsSVM) {
        // Initializes the EmotionDecoder with an SVM model loaded from the given file,
        // sets up an array for EEG features statistics used to Z-score (i.e. calibrate) the EEG
        // features of the subject the decoder will decode from, and defines emotion mappings.
        // svm_filename specifies the path to the SVM model file.
        // (NOTE): Each instance of EmotionDecoder should be specific to a single subject, as
        // the EEG features statistics are updated based on the incoming EEG data from the subject
        // and used to Z-score the EEG features before feeding them to the SVM model for emotion prediction.

        this.emotion_decoder_svm = this.loadSVM(svm_filename);
        // @ts-ignore
        this.eeg_features_stats = Array.from({ length: 64 }, () => ({
            avg: 0,
            std: 0,
            n: 0,
            m_oldM: 0,
            m_newM: 0,
            m_oldS: 0,
            m_newS: 0,
        }));
        this.emotion_mappings = ["calm", "sad", "anger", "happiness"];
    }

    private loadSVM(modelString: string): any {
        // Loads an SVM model from a string. modelString are the serialized
        // weights of the SVM model. Returns the deserialized SVM model.

        return SVM.load(modelString);
    }

    private zScoreEEGFeatures(eeg_features: number[]): number[] {
        // Z-Scores the EEG features using the z-score method based on previously updated statistics.
        // eeg_features is an array of 64 EEG feature values. Returns an array of z-score normalized features,
        // which are used as input to the SVM model for emotion prediction.
        // Expects an array of 64 EEG features computed from the raw EEG data using the getWaveletFeatures method.

        if (eeg_features.length !== 64) {
            throw new Error("eeg_features must have a shape of 64");
        }

        return eeg_features.map((feature, index) => {
            const stat = this.eeg_features_stats[index];
            if (stat.n === 0) {
                return feature;
            }

            const mean = stat.avg;
            let std = stat.std;
            return (feature - mean) / std;
        });
    }

    private updateStatistics(eeg_features: number[]): void {
        // Updates the internal statistics (mean, standard deviation) for each EEG feature based on new
        // incoming stream of data using Welford's method. eeg_features is an array of 64 EEG feature values.
        // This method does not return anything.
        // Expects an array of 64 EEG features computed from the raw EEG data using the getWaveletFeatures method.

        if (eeg_features.length !== 64) {
            throw new Error("eeg_features must have a shape of 64");
        }

        eeg_features.forEach((feature, index) => {
            const stat = this.eeg_features_stats[index];
            stat.n += 1;

            if (stat.n === 1) {
                stat.m_oldM = stat.m_newM = feature;
                stat.m_oldS = 0.0;
            } else {
                stat.m_newM = stat.m_oldM + (feature - stat.m_oldM) / stat.n;
                stat.m_newS = stat.m_oldS + (feature - stat.m_oldM) * (feature - stat.m_newM);

                stat.m_oldM = stat.m_newM;
                stat.m_oldS = stat.m_newS;
            }
            stat.avg = stat.m_newM;

            if (stat.n > 1) {
                const variance = stat.m_newS / (stat.n - 1);
                stat.std = Math.sqrt(variance);
            }
        });
    }

    private getWaveletFeatures(raw_eeg_data: number[][], typeWav: any = "db4"): number[] {
        // Extracts wavelet features from raw EEG data. raw_eeg_data should be an array of 8 EEG channels,
        // each with at least 500 timepoints (~2s of data). typeWav specifies the wavelet type, with "db4" being
        // the recommended wavelet type for EEG signal decomposition. Returns a flat array of wavelet features
        // extracted from each channel, with 8 features per channel, thus returning an array of 64 features.
        // Throws an error if the input does not meet the expected shape (8 channels, >= 500 timepoints per channel).

        if (raw_eeg_data.length !== 8) {
            throw new Error(`Input must have 8 EEG channels, but got ${raw_eeg_data.length}`);
        }
        raw_eeg_data.forEach((channelData) => {
            if (channelData.length < 500) {
                throw new Error(
                    `Each EEG channel must have at least 500 timepoints, but got ${channelData.length}`
                );
            }
        });

        const slicedData = raw_eeg_data.map((channelData) => channelData.slice(-500));

        let channelFeatures: number[][] = [];

        for (let channelData of slicedData) {
            const coeffs: any = wt.wavedec(channelData, typeWav, "symmetric", 5);
            const detailCoeffs: any[] = coeffs.slice(1);

            const cD_Energy = math.mean(
                detailCoeffs.map((coeff: any) => math.sum(math.map(coeff, math.square)))
            );
            const cA_Energy = math.sum(math.map(coeffs[0], math.square));
            const D_Entropy = math.mean(
                detailCoeffs.map((coeff: any) => {
                    const squares = math.map(coeff, math.square);
                    return math.sum(math.map(squares, (x: any) => math.log(x)));
                })
            );
            const A_Entropy = math.sum(
                math.map(math.map(coeffs[0], math.square), (x: any) => math.log(x))
            );
            const D_mean = math.mean(detailCoeffs.map((coeff: any) => math.mean(coeff)));
            const A_mean = math.mean(coeffs[0]);
            const D_std = math.mean(detailCoeffs.map((coeff: any) => math.std(coeff)));
            const A_std = math.std(coeffs[0]);

            channelFeatures.push([
                cD_Energy,
                cA_Energy,
                D_Entropy,
                A_Entropy,
                D_mean,
                A_mean,
                D_std,
                A_std,
            ]);
        }

        return channelFeatures.flat();
    }

    public predict(raw_eeg_data: number[][]): {
        prediction: string;
        probabilities: Record<string, number>;
    } {
        // Main method. Predicts the emotional state from raw EEG data. raw_eeg_data is expected to be
        // an array of 8 EEG channels, each with at least 500 timepoints (~2s of data). The method extracts
        // the last 500 timepoints to make a prediction of the emotional state at that timepoint.
        // Returns an object with the predicted emotion label and a record of probabilities for each emotion.
        //
        // e.g. predict(raw_eeg_data) -> { prediction: "calm",
        //                                 probabilities: { calm: 0.4,
        //                                                  sad: 0.3,
        //                                                  anger: 0.2,
        //                                                  happiness: 0.1 }}
        //
        // We recommend calling this method every 10-50 timepoints by using the latest 500+ timepoints received
        // from the EEG device, as the method not only predicts the emotional state but also updates the internal
        // statistics used to Z-score the EEG features used to calibrate the decoder current for the subject.

        const waveletFeatures = this.getWaveletFeatures(raw_eeg_data);
        const waveletFeaturesCopy = JSON.parse(JSON.stringify(waveletFeatures));
        const zScoredFeatures = this.zScoreEEGFeatures(waveletFeatures);
        const predictionIndex = this.emotion_decoder_svm.predictOne(zScoredFeatures);
        const predictProb = this.emotion_decoder_svm.predictOneProbability(zScoredFeatures);

        const predictionLabel = this.emotion_mappings[predictionIndex];
        const probabilities: Record<string, number> = {};
        for (const estimate of predictProb["estimates"]) {
            const emotionLabel = this.emotion_mappings[estimate.label];
            probabilities[emotionLabel] = estimate.probability;
        }

        this.updateStatistics(waveletFeaturesCopy);

        return { prediction: predictionLabel, probabilities: probabilities };
    }

    public printEmotionPredictions(
        emotionPredictions: { prediction: string; probabilities: Record<string, number> }[]
    ) {
        // Prints the emotion predictions to the console.
        console.log("\n".repeat(8));
        for (const { prediction, probabilities } of emotionPredictions) {
            console.log("=".repeat(50));
            console.log(`Prediction: ${prediction}`);
            console.log("-".repeat(50));
            console.log("Probabilities:");
            for (const [emotion, prob] of Object.entries(probabilities)) {
                console.log(`  ${emotion.padEnd(10, " ")}: ${"#".repeat(Math.floor(35 * prob))}`);
            }
            console.log("-".repeat(50));
        }
    }
}

// ==========================================================================================
//                                     Example Usage
// ==========================================================================================

function generateData(num_channels: number, timePoints: number): number[][] {
    // Generates synthetic EEG data for testing. num_channels specifies the number
    // of EEG channels, and timePoints is the number of time points for each channel.
    // Returns an array of arrays of shape (num_channels, timePoints) with random EEG data.

    let data = new Array(num_channels);

    for (let c = 0; c < num_channels; c++) {
        data[c] = new Array(timePoints);
        for (let t = 0; t < timePoints; t++) {
            data[c][t] = Math.random() * 2 - 1;
        }
    }
    return data;
}

function testEmotionDecoder() {
    // Main function to demonstrate the use of the EmotionDecoder. It generates synthetic EEG data,
    // runs predictions on segments of this data, and prints the results.
    const decoder = new EmotionDecoder();
    const num_channels = 8;
    const timePoints = 50_000;
    const data = generateData(num_channels, timePoints);
    const raw_eeg_data_segment_length = 1000;

    for (let i = 0; i < timePoints; i += 10) {
        const raw_eeg_data = data.map((channelData) =>
            channelData.slice(i, i + raw_eeg_data_segment_length)
        );
        decoder.printEmotionPredictions([decoder.predict(raw_eeg_data)]);
    }
}

export { EmotionDecoder, testEmotionDecoder };
