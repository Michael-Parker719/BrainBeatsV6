import { useState, } from "react";
import { useNavigate } from "react-router-dom";
import { ReactHTMLElement } from "react";
import sendAPI from '../../SendAPI'
import { wait } from "@testing-library/user-event/dist/utils";
import './SetupGuide.css'

import bluetoothScreenshot from '../../images/BluetoothConnection.png';

function SetupGuide() {
    function closeTab() {
        window.opener = null;
        window.open("", "_self");
        window.close();
    };

    return (
    <div className="setup">
        <div className="setupDiv">
            <div className="setupHeader">
                <h1>Setup Guide</h1>
                <p>This page will help you set up your EEG device to work with BrainBeats. Please select the device you are using from the list below:</p>
            </div>
            <a href="#cytonHeader">Cyton Board</a><p> || </p> <a href="#arduinoHeader">Arduino Uno Device</a>
            <h2 className="cyton-heading" id="cytonHeader">Cyton Board</h2>
            <p>The cyton board from OpenBCI supports 8 channels of input, if you are looking to see how to set up the wiring for the board,
                reference the link to their website, which can be found <a className="links" href="https://docs.openbci.com/GettingStarted/Boards/CytonGS/" target="_blank">here.</a>
                <br />To set the device up to your head, you can use any of the nodes you desire, but our recommended nodes are here: <br />
                <ul className="positionsList">
                    <li>FPZ: Frontal Lobe</li>
                    <li>FT8: Frontal-Temporal (Between the Frontal and Temporal Lobes)</li>
                    <li>T7: Left Temporal Lobe</li>
                    <li>T8: Right Temporal Lobe</li>
                    <li>P7: Left Parietal Lobe</li>
                    <li>P8: Right Parietal Lobe</li>
                    <li>O1: Left Occipital Lobe</li>
                    <li>O2: Right Occipital Lobe</li>
                </ul>
                Highlighted below are these node locations:<br />
                <img className="img" src='/systemReference.png' alt="systemreference" /> <br />
    
                Once you have your device setup and plugged into your computer, simply turn the power switch on to the USB setting and hit record, you should see a
                bluetooth option display on your screen. It should look like this: <br />
                <br></br>
                <img className="img" src={bluetoothScreenshot} alt="bluetooth reference" /> <br />
                Finally, connect your device and begin recording.
            </p>
            <h2 className="cyton-heading" id="arduinoHeader">Arduino Uno Device Setup Guide:</h2>
            <p>The Arduino Uno device is an affordable EEG Device made from an Arduino Uno R3, an AD8232 Heart Monitor Chip, and a 3 piece electrode set with OpenBCI electrode caps. 
                Intsructions for building this device can be found <a href="https://www.instructables.com/Mind-Control-3-EEG-Monitor/">here</a> <br/>
                The current design for this device accepts 2 channels of input and one ground. The universal ground (black electrode) must  be placed on FPZ. The other two reference electrodes can 
                be placed on any of these recommended pairs<br />
                <ul>
                    <li>FP1 and FP2 (Frontal Lobe)</li>
                    <li>T3 and T4 (Temporal Lobe)</li>
                    <li>O1 and O2(Occipital Lobe)</li>
                </ul>
                Highlighted below are these node locations:<br />
                <img className="img" src='/1020SystemArduinoEEG.png' alt="1020SystemArduinoEEG" /> <br />
                To attach the electrodes to your head, simply measure on the velcro strap where the electrodes will be placed in relation to your head and attach them to the strap. 
                Then apply electrode gel on each electrode. <br />
                Once your device is connected to your head and plugged into your USB port, press record on the previous page and pick the COM port that your device is connected to so that you can upload the code to the arduino. You will then be asked to select the port again so pick the same one to listen to.<br />
                <br /><img className="img" src='/SerialPortArduinoSS.png' alt="SerialPortArduinoSS" /> <br />
            </p>
            <button className="acceptBtn" onClick={closeTab}>I understand, take me back</button>
            
            </div>
        </div>
        
);
}

export default SetupGuide;