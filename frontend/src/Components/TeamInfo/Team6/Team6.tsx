import { useState } from 'react';

// Importing CSS
import '../../About/About.css'
import profileImage from '../../../images/blankProfile.png'
import TeamMemberModal from '../../Modals/TeamMemberModal/TeamMemberModal';
import { Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Importing Team Member Images


import AlexX from '../../../images/Version6Photos/AlexX.jpg';
import MichaelParker from '../../../images/Version6Photos/MichaelParker.jpg';
import KensleyCadet from '../../../images/Version6Photos/KensleyCadet.jpg';
import NaomiMbwambo from '../../../images/Version6Photos/NaomiMbwambo.jpg';
import ThomasBelyakov from '../../../images/Version6Photos/ThomasBelyakov.jpg';
import WessAiken from '../../../images/Version6Photos/WessAiken.jpg';

const Team6 = () => {

    // =============================  Enter values for TEAM info here ============================== 
    interface Team {
        number: number;
        yearsFound: string;
        objectives: string;
        contributions: string;
        github: string;
    }

    const teamInfo : Team = {
        "number": 6,  // Format as integer number
        "yearsFound": "2024-2025",  // format as string 'yyyy-yyyy'

        "objectives": "The primary goal of BrainBeats version 6 was to revamp and reorganize the fundamental innerworkings of BrainBeat's backend and database. We also had a focus on a more affordable and approachable user experince with a homebrew headset and reworks to the music algorithm", 

        "contributions": "Version ’s contributions include:" +
        "\n\t• A complete overhaul of the backend and database" +
        "\n\t\t◦ Refactored backend to remove Prisma and use pure SQL queries" +
        "\n\t\t◦ Updated database to store images by file path and modified id variables" +
        
        "\n\t• Updated headset design" +
        "\n\t\t◦ Researched, built, and tested a cheaper design for an EEG device" +
        "\n\t\t◦ EEG device built from Mind Control 3 (Arduino Uno)" +
        "\n\t\t◦ Implemented a Fast Fourier Transform to better extrapolate brain wave data" +
    
        "\n\t• Improved Music algorithm" +
        "\n\t\t◦ Created a new algorithm to interpret brain waves instead of raw EEG data" + 
        "\n\t\t◦ Modularized the music algorithm for the creation of newer modes of music",

        "github": "https://github.com/Michael-Parker719/BrainBeatsV6.git",
    }
    // ===============================  Enter TEAM MEMBERS info here =============================== 

    interface TeamMember {
        name: string;
        position: string;
        image: string;
        bio: string;
        contributions: string;
    }

    const emptyTeamMember: TeamMember = {
        "name": "",
        "position": "",
        "image": "",
        "bio": "",
        "contributions": "",
    }

    const defaultImage = profileImage;
    var teamMembers : TeamMember[] = [

       {name: "Alex X", position: "Music Algrithm/Generation", image: AlexX, bio: "", 
       contributions: "• Reworked one of the existing music algorithms to work with the new headset" + 
        "\n• Bug fixes and removal of some old code" + "\n• Added changes to some parts of the algorithm (volume and tempo limiters)"}, 

      {name: "Naomi Mbwambo", position: "Music Algrithm/Generation", image: NaomiMbwambo, bio: "", 
        contributions: "• Researched the different EEG brain waves and the meaning behind each one" + 
        "\n• Worked on the new music algorithm to use EEG waves instead of raw EEG data"},

        {name: "Thomas Belyakov", position: "Back-end developer", image: ThomasBelyakov, bio: "", 
        contributions:"• Refactored backend, removed Prisma ORM and replaced all Prisma calls with asynchronous SQL promise statements" + 
        "\n• Updated frontend and added the foundations for a community page"},

        {name: "Kensley Cadet", position: "Full-stack developer", image: KensleyCadet, bio: "",
        contributions: "• Refactored backend, removing Prisma ORM and added filebase for images and audio" + 
        "\n• Added import/export functionality to the frontend and backend" + 
        "\n• Reworked frontend modals for better UX" + 
        "\n• Supplemented search for user scripts and tracks"},

        {name: "Wess Aiken", position: "EEG software developer", image: WessAiken, bio: "", 
     contributions: "• Researched and developed a new affordable EEG Device using Arduino" + 
        "\n• Implemented remote arduino code upload and execution" + "\n• Bug Mucker"}, 

     {name: "Michael Parker", position: "Project Manager", image: MichaelParker, bio: "", 
     contributions: "• Researched and developed a new affordable EEG Device using Arduino" + 
        "\n• Implemented signal processing on the raw EEG data to describe the data in an array of brain waves using an FFT"}, 
    ];
    // ============================================================================================= 
    

    // For displaying Modal
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const [currentMember, setCurrentMember] = useState<TeamMember>(emptyTeamMember);

    function setTeamMember(currentMember:TeamMember) {
        setCurrentMember(currentMember);
        setShow(true);
    }

    function PopulateTeamMembers() {
        const MAX_COLS:number = 2;
        const MAX_ROWS:number = 5;
        var gridArray:any[] = [];
        var currentMemberCounter:number = 0;

        for(let i = 0; i < MAX_ROWS; i++){
            for(let j = 0; j < MAX_COLS; j++) {
                let currentMember = teamMembers[currentMemberCounter++];
                if(currentMember == null) break;
                currentMember.image = currentMember.image === "" ? defaultImage : currentMember.image;
                let name = currentMember.name;
                let position = currentMember.position;
    
                gridArray.push(currentMember);
            }
        }
        return gridArray;
    }
    
    var memberList = PopulateTeamMembers();
    
    return (
    <div className='about-teams-body'>
        <div className='about-team-info'>
            <h1 className='about-team-title'>Team {teamInfo.number}</h1>
            <h6 className='about-team-year'>({teamInfo.yearsFound})</h6>
            <h3 className='about-team-subtitle'>Goals and Objectives</h3>
            <p>{teamInfo.objectives}</p>
            <h3 className='about-team-subtitle'>Contributions</h3>
            <p>{teamInfo.contributions}</p>
            <h3 className='about-team-subtitle'>See Version {teamInfo.number} Project</h3>
            <h6>
                <FontAwesomeIcon className='modal-track-icons' icon={["fab", "github"]} />
                {'GitHub '} 
                <a href={teamInfo.github}>{teamInfo.github}</a>
            </h6>
            {/* <img src={''} id='version4-team-photo' alt="Team image" onClick={() => {}}/> */}

        </div>
        <div className='about-team-members'>
            {memberList.map((teamMember, index) => (
                    <div className="col track-col" key={index}>
                        <button className=" btn btn-primary card" id='member-card-body' onClick={() =>setTeamMember(teamMember)}>
                            <img src={teamMember.image} className="card-img-top" id="card-img-ID" alt="..."/>
                            <div className="card-body">
                                <h5 className="card-title">{teamMember.name}</h5>
                                <div className="card-text">
                                    <p id='card-author'>{teamMember.position}</p>
                                </div>
                                
                            </div>
                        </button>
                    </div>
                ))}
        </div>
        <Modal id='pop-up' show={show} onHide={handleClose}>
            <TeamMemberModal teamMember={currentMember}/>
        </Modal>
    </div>
    );
};

export default Team6;