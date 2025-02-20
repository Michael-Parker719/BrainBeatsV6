// This code never runs, only used for context. THe hex code is what is actually run on the Arduino

const int SAMPLE_RATE = 128; // Hz
const int INTERVAL = 1000 / SAMPLE_RATE; // Time between samples in ms

unsigned long lastSampleTime = 0;

void setup() {
    Serial.begin(9600); // Ensure a fast serial rate
}

void loop() {
    unsigned long currentTime = millis();

    if (currentTime - lastSampleTime >= INTERVAL) {
        lastSampleTime = currentTime;

        // Simulated EEG data (replace with real sensor reading)
        int eegData = analogRead(A5); // Replace A0 with your EEG pin

        Serial.println(eegData); // Send EEG data to Processing
    }
}
