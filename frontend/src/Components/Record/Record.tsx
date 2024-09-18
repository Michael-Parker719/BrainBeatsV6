import { ConcreteCytonStream, ConcreteGanglionStream, ConcreteTestStream } from '../../util/DeviceAbstractFactory';
import { useAppSelector } from "../../Redux/hooks";
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";

import './Record.css'
import RecordCards from '../ScriptContainer/Scripts/Cards/RecordCards';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FormGroup, Modal, ToggleButton } from 'react-bootstrap';
import isDev from '../../util/isDev';
import { Link } from 'react-router-dom';

// Imports for saving a track
import UploadTrackModal from '../Modals/UploadTrackModal/UploadTrackModal';
import { emptyTrack, emptyUser } from '../../util/Constants';
import { Track } from '../../util/Interfaces';
import { useRecoilState } from 'recoil';
import { userModeState } from '../../JWT';
import algorithmNames from '../../util/MusicGeneration/Algorithms/names.json';
import enhancerNames from '../../util/MusicGeneration/Enhancers/names.json';
import Loading from '../Loading/Loading';
import { Comment } from 'html-react-parser';

function Record() {
    const settings = useAppSelector(state => state.musicGenerationSettingsSlice);
    const deviceName = useAppSelector(state => state.deviceSlice);
    const [MIDIUri, setMIDIURI] = useState('');
    const [isRecording, setRecording] = useState(false);
    const [debugOption1, setDebugOption1] = useState(false);
    const [debugOption2, setDebugOption2] = useState(false);
    const [debugOption3, setDebugOption3] = useState(false);
    const [genOption, setGenOption] = useState('Legacy');
    // const [enhanceOption, setEnhanceOption] = useState('None'); // original idea was to have separate enhancers that could be be used on any algorithm. Feel free to reimplement
    const [isLoading, setLoading] = useState(false);

    const algorithms = algorithmNames.algorithmNames;
    const enhancers = enhancerNames.enhancerNames;

    /*  Add the interface of a new stream here in the case that you've created a new one, you should define it in the DeviceAbstractFactory
    and import it. */
    const [device, setDevice] = useState<ConcreteGanglionStream | ConcreteCytonStream | ConcreteTestStream>();
    const navigate = useNavigate();

    /* This useEffect is crucial!
     * This will set/unset the device once the change has been detected from "doRecording()" */
    useEffect(() => {
        // set
        if (device) {
            setTimeout(() => {
                setRecording(true); // Used for the record button in the HTML.
                setLoading(true);
                device.setDebugOutput(debugOption1);
            }, 3000);

            device.initializeConnection();
        }
        // unset 
        else {
            setRecording(false);
            setLoading(false);
        }
    }, [device]);

    useEffect(() => {
        // set
        if(isLoading) {
            setLoading(true);
        }
        else {
            setLoading(false);
        }
    }, [isLoading]);

    /*  doRecording simply creates an instance of the device we're using, in our case we only have the ganglion board and the
        cyton board, the if condition that assigns the deviceType is checking to see the number of channels accepted, here you
        could define this earlier and pass it down to this function (in the case that you have different EEG device with the same
        number of channels) but we didn't see a need for it in our case. */
    async function doRecording() {
        // console.log("Device:", deviceName);

        var debugOptionObject = {
            debugOption1,
            debugOption2,
            debugOption3
        }

        let NoteHandler = await import("../../util/MusicGeneration/Algorithms/" + genOption + "/NoteGeneration");

        //more fragments from having separate enhancers
        
        let Enhancer = "None";
        /*
        if (enhanceOption != 'None') {
            Enhancer = await import("../../util/MusicGeneration/Enhancers/" + enhanceOption + "/Enhance");
        }
        */

        switch (deviceName) {
            case "random data":
                setDevice(new ConcreteTestStream(settings, debugOptionObject, NoteHandler, Enhancer));
                break;
            case "cyton":
                setDevice(new ConcreteCytonStream(settings, debugOptionObject, NoteHandler, Enhancer));
                break;
            case "ganglion":
                setDevice(new ConcreteGanglionStream(settings, debugOptionObject, NoteHandler, Enhancer));
                break;
            default: return;
        }
        /* ! Use Effect above will now be triggered */

        /*  Once we have defined the class we can initialize it. If you're to add another one of these it's important 
            to make sure that its class has an initializeConnection function to keep this function clean and avoid 
            conditionals here. In the case that somebody didn't connect a proper device, it's important not to call the
            initialize connection function to avoid errors. */
    }

    async function stopRecording() {
        // console.log('Recording stopped!');
        /* When the device is stopped it signals the call to return the MIDI since
            we are no longer recording input. 
            This will check for sucessful return of a MIDI base64 string to be stored 
            in the database and make it easily downloadable. */
        await device?.stopDevice()?.then(
            (url: string) => {
                // console.log("Midi URL from Record.tsx: ", url);
                setMIDIURI(url);
            }
        ).catch(err => {
            console.error('Unable to stop device: ', err);
        })
        setDevice(undefined);
        setRecording(false);
    }

    function handleForm(e: number) {
        switch (e) {
            case 1:
                setDebugOption1(!debugOption1);
                break;
            case 2:
                setDebugOption2(!debugOption2);
                break;
            case 3:
                setDebugOption3(!debugOption3);
                break;
            default:
                break;
        }
    }

    // ====================== Functions for saving a track ======================
    const [user, setUser] = useRecoilState(userModeState);
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);

    const [currentTrack, setCurrentTrack] = useState<Track>(emptyTrack);
    const defaultThumbnail = "bbmascot-wBackground-eyes_open_smiling.png";

    // Hanlde the model for the newly created Track
    function showEditTrackInfo() {

        // console.log("user: ", user);

        // User is logged in to post this track
        if (user) {

            // TODO: Grab the midi and place it in the track
            var newTrack: Track = {
                "id": "",
                "title": "",
                "bpm": settings.bpm,
                "key": settings.keyGroup,
                "scale": settings.scale,
                'instruments': settings.deviceSettings.instruments,
                "noteTypes": settings.deviceSettings.instruments,
                "likeCount": 0,
                "midi": MIDIUri,
                "thumbnail": defaultThumbnail,
                "user": user,
                "userID": user.id,
                "public": true,
            }


            setCurrentTrack(newTrack);
        }
        /* No user is logged in, they can download but can NOT save unless creating an account and logging in.
         * We should ask the user to login and or make an account, and store the midi temporarily in redux.
         * After the user has logged in / created account, if redux.midi is not empty, prompt user that they have 
         * an unsaved midi track, (aka just pull the model up and allow the user to fill in the information for the track
         * if they wish to post.)
         */
        else {
            // Open modal with no user info. The user would not be able to upload the track, only download
            var newTrack: Track = {
                "id": "",
                "title": "",
                "bpm": settings.bpm,
                "key": settings.keyGroup,
                "scale": settings.scale,
                'instruments': settings.deviceSettings.instruments,
                "noteTypes": settings.deviceSettings.instruments,
                "likeCount": 0,
                "midi": MIDIUri,
                "thumbnail": defaultThumbnail,
                "user": emptyUser,
                "userID": emptyUser.id,
                "public": true,
            }

            setCurrentTrack(newTrack);

            // easiest solution is to create a pop up model to do this so they never leave this page and
            // then continue saving the Track

            // Other solution is to save midi to redux like stated above, and once logged in trigger event to 
            // tell user a midi is in redux and is unsaved, and they need to save
        }

        setShow(true);
    }

    function showRecordTrackAlert() {
        alert("You can not save an empty recording. \nPlease record a track and then save.")
    }

    // Fucntion displays alert if midi file is empty, otherwise open save track modal
    function showSaveModal() {
        if (MIDIUri == '')
            showRecordTrackAlert();
        else
            showEditTrackInfo();
    }

    function goBackToCards() {
        navigate("/script-settings");
    }

    return (
        <div className='container' id='record-container'>
            <h2 className='record-heading'>Recording Music</h2>
            <div id='record-container-body'>
                <Modal id='pop-up' show={show} onHide={handleClose}>
                    <UploadTrackModal track={currentTrack} />
                </Modal>
                <div id='script-div'>
                    <RecordCards></RecordCards>
                    <div id='record-publish-buttons-div'>
                        <button type="button" className="btn btn-secondary" id='record-cancel-btn' onClick={() => { goBackToCards() }}>Back</button>
                        <button type="button" className="btn btn-secondary" id='record-publish-btn' onClick={() => { showSaveModal() }}>Save</button>
                    </div>
                </div>

                <div id='record-btns-div'>

                    {/* Debug checkboxes --------(from bootstrap)----------------- */}
                    {isDev() && <div className="devBox">
                        <h2>Debug options</h2>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" value="1" id="flexCheckDefault" checked={debugOption1} onClick={() => handleForm(1)} />
                            <label className="form-check-label" htmlFor="flexCheckDefault">
                                device info & datastream <br /> (File: DeviceAbstractFactory)
                            </label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" value="2" id="flexCheckDefault" checked={debugOption2} onClick={() => handleForm(2)} />
                            <label className="form-check-label" htmlFor="flexCheckDefault">
                                note generation stream <br /> (File: OriginalNoteGeneration)
                            </label>
                        </div>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" value="3" id="flexCheckDefault" checked={debugOption3} onClick={() => handleForm(3)} />
                            <label className="form-check-label" htmlFor="flexCheckDefault">
                                midi playback <br /> (File: MIDIManager)
                            </label>
                        </div>
                    </div>}

                    {isLoading==true?
                        <Loading/>:
                        <a id='download-midi-btn' download={'currentMIDI.MID'} href={MIDIUri}>
                            <FontAwesomeIcon icon={["fas", "arrow-up-from-bracket"]} />
                            download the midi
                        </a>
                    }
                    

                    {/* ------------------------------------- End Debug checkboxes */}
                    <div className="setupGuide">
                        <h2>New to BrainBeats?</h2>
                        <p>If you need to understand how to get started, view our setup guide <Link to="/setup" target="_blank">here.</Link><br />
                            Otherwise, continue by hitting the record button below:</p>
                        <label htmlFor="genselect">Select Music Generation Method: </label>
                        <select disabled={isRecording} name="genselect"value={genOption} id="genselect" onChange={(e) => setGenOption(e.target.value)}>
                            {algorithms.map((option, index) => {
                                return (
                                    <option key={index} value={option}>
                                        {option}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                    {!isRecording && <button type="button" className="btn btn-secondary" id='recording-play-btn' onClick={doRecording}>
                        <FontAwesomeIcon icon={["fas", "circle"]} />
                        Record
                    </button>}
                    {isRecording && <button type="button" className="btn btn-secondary" id='recording-stop-btn' onClick={stopRecording}>
                        <FontAwesomeIcon icon={["fas", "square"]} />
                        Stop
                    </button>}
                </div>
            </div>
        </div>
    )
}

export default Record;
