/* This code will obtain data from the device and pass it off to the music generation
 as a single line array. It makes use of the johnny-five npm library, which can 
 be found here: https://johnny-five.io/api/ */

import {Board, Sensor } from "johnny-five"; // IoT library for micro-controllers

const board = new Board();
const EEG_Sensor = new Sensor("A0");

// On board connection
board.on("connect", () => {
    // emit successful connection message
    console.log("Connected on port %s", board.port);
    board.info("Board", "Successful board connection");
});

// On board ready
board.on("ready", () => {
    console.log("Ready");

    EEG_Sensor.on("change", function(){
        console.log(this.scaleTo(0, 255));
    });
});

