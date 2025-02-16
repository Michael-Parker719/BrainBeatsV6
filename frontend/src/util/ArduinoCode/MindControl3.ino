#include "fix_fft.h"

// Analog input pin
#define adc_input1 A0
#define adc_input2 A5

void setup() {
  Serial.begin(115200);
  pinMode(adc_input1, INPUT);
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastSampleTime >= INTERVAL) {
      lastSampleTime = currentTime;

      // Simulated EEG data (replace with real sensor reading)
      int eegData = analogRead(adc_input1); // Replace A0 with your EEG pin

      Serial.println(eegData); // Send EEG data to Processing
  }
}
