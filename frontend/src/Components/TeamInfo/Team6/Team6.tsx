import { useState } from 'react';

// Importing CSS
import '../../About/About.css'
import profileImage from '../../../images/blankProfile.png'
import TeamMemberModal from '../../Modals/TeamMemberModal/TeamMemberModal';
import { Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Importing Team Member Images


import AidanAhern from '../../../images/Version5Photos/AidanAhern.png';
import GraftonLeGare from '../../../images/Version5Photos/GraftonLeGare.jpg';
import IsabellaFaile from '../../../images/Version5Photos/IsabellaFaile.jpg';
import SerinaChugani from '../../../images/Version5Photos/SerinaChugani.jpg';
import TsehaiBoucaud from '../../../images/Version5Photos/TsehaiBoucaud.jpg';
import VicenteVivanco from '../../../images/Version5Photos/VicenteVivanco.png';

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
        "\n\t\t◦ (TBD STUFF TO GO HERE)" +
        "\n\t\t◦ (TBD STUFF TO GO HERE)" +
        
        "\n\t• Updated headset design" +
        "\n\t\t◦ (TBD STUFF TO GO HERE)" +
        "\n\t\t◦ (TBD STUFF TO GO HERE)" +
        "\n\t\t◦ (TBD STUFF TO GO HERE)" +
    
        
        "\n\t• Improved Music algorithm" +
        "\n\t\t◦ (TBD STUFF TO GO HERE)",

        "github": "actual link not created yet",
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

       {name: "Alex X", position: "Music Algrithm/Generation", image: SerinaChugani, bio: "", 
       contributions: ""}, 

      {name: "Naomi Mbwambo", position: "Music Algrithm/Generation", image: IsabellaFaile, bio: "", 
        contributions: ""},

        {name: "Thomas Belyakov", position: "Back-end developer", image: AidanAhern, bio: "", 
        contributions:""},

        {name: "Kensley Cadet", position: "Full-stack developer", image: GraftonLeGare, bio: "",
        contributions: ""},

        {name: "Wess Aiken", position: "EEG software developer", image: VicenteVivanco, bio: "", 
     contributions: ""}, 

     {name: "Michael Parker", position: "Project Manager", image: TsehaiBoucaud, bio: "", 
     contributions: ""}, 
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
            <img src={''} id='version4-team-photo' alt="Team image" onClick={() => {}}/>

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