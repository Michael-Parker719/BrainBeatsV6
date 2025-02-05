#include "fix_fft.h"

// Analog input pin
#define adc_input1 A0
#define adc_input2 A5

void setup() {
  Serial.begin(115200);
  pinMode(adc_input1, INPUT);
}

void loop() {
  // Read the raw ADC value
  int value1 = analogRead(adc_input1);
  int value2 = analogRead(adc_input2);

  int add = value1 + value2;
  int avg = (value1 + value2)/2;
  int diff = value1-value2;

  // int value1 = map(value, 0, 1023, 0, 255);
  // Print the raw data to the Serial Monitor
  String message = String(value1) + "," + String(value2);
  Serial.println(value1);

  delay(50); // Adjust to match desired sampling rate

}
