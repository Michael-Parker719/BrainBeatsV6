export interface DataStream8Ch {
    channel00:number;
    channel01:number;
    channel02:number;
    channel03:number;
    channel04:number;
    channel05:number;
    channel06:number;
    channel07:number;
    timeStamp:number;
}

export interface DataStream4Ch {
    channel00:number;
    channel01:number;
    channel02:number;
    channel03:number;
    timeStamp:number;
}

export interface MusicSettings {
    // Defines the Beats per Minute (BPM) of the output track
    octaves: number;
    numNotes: number;
    bpm: number;
    keyGroup: string; // major, minor, chromatic, etc
    scale: string; // G, A, D, etc
    deviceSettings:CytonSettings|GanglionSettings;
}

export type GanglionSettings = {
    // Defines what instument sound is to be associated with each node
    instruments: {
        _00: number,    // FP1
        _01: number,    // FP2
        _02: number,    // C3
        _03: number,    // C4
    }

    // Defines what duration of note each node will have
    durations: {
        _00: number,    // FP1
        _01: number,    // FP2
        _02: number,    // C3
        _03: number,    // C4x
    }
}

export type CytonSettings = {
    // Used to store the instrument each node should be used to output
    instruments: {
        _00: number; // FP1 Node
        _01: number; // FP2 Node
        _02: number; // C3 Node
        _03: number; // C4 Node
        _04: number;
        _05: number;
        _06: number;
        _07: number;
    }

    // Used to store the duration of each note a given node should be used to output
    durations: {
        _00: number; // FP1 Node
        _01: number; // FP2 Node
        _02: number; // C3 Node
        _03: number; // C4 Node
        _04: number;
        _05: number;
        _06: number;
        _07: number;
    }
}

export type Picture = {
    width: number,
    height: number,
    color: string,
    description: string,
    urls: {
        raw: string,
        full: string,
        regular: string,
        small: string,
        small_s3: string,
        thumb: string,
    },
}

export type Card = {
    textColor:{
        r: number,
        g: number,
        b: number,
        a: number,
    },
    backgroundColor: {
        r: number,
        g: number,
        b: number,
        a: number,
    },
    imageURL: string,
    audioURL: string,
    text: string,
    speed: number,
}

export interface Script {
    id: string,
    title: string,
    cards: Card[],
    userID: string,
    public: boolean,
    likeCount: number,
    // optional, assigned by mysql reference
    user?: User | null,
    
    // optional
    createdAt?: Date,
    token?: any
    fullname?: string // Used to display a users name above a track
    thumbnail?: string,
}

export interface Track {
    id: string,        
    title: string,
    bpm: number,
    key: string,
    scale: string,
    instruments: Object | null,
    noteTypes: Object | null,
    likeCount: number,
    midi: string,
    thumbnail: string,
    userID: string,
    public: boolean,
    
    // optional, assigned by mysql reference
    user?: User | null,
    
    // optional
    token?: any
    like?: Like | null,
    playlistTracks?: Array<PlaylistTracks> | null,
    createdAt?: Date,
    fullname?: string // Used to display a users name above a track
}

export interface Playlist {
    id: string,
    name: string,
    thumbnail: string,
    userID: string,
    
    // array of tables
    playlistPosts: Array<PlaylistTracks> | null,
    
    // assigned by mysql reference
    user?: User | null,
}

export interface PlaylistTracks {
    trackID: string,
    playlistID: string,
    
    // optional, assigned by mysql reference
    playlist: Playlist | null,
    track: Track | null,

    // optional
    createdAt?: Date,
}

export interface Like {
    objectID: string,
    userID: string,
    
    // optional, assigned by mysql reference
    user?: User | null,
    track?: Track | null,

    // optional
    createdAt?: Date,
    token?: any    // If we're sending this like to the backend
}


export interface BasicUser {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    username: string,
    bio: string,
    profilePicture: string,
    token?: any,
}

export interface User {
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    username: string,
    bio: string,
    profilePicture: string,
    
    // arrays of tables, optional
    tracks?: Array<Track> | null,
    playlists?: Array<Playlist> | null,
    likes?: Array<Like> | null | any,
    
    // optional
    verified?: boolean,
    password?: string,
    createdAt?: string,
    resetPasswordToken?: string,
    resetPasswordExpires?: string,
    token?: any,
}
