export type Location = "Meeting Point"
    | "Second Location"
    | "Third Location"
    | "Fourth Location"

export type Locations = Record<Location, [number, number]>

export const coordinates: Locations = {
    "Meeting Point": [
        -37.820639, 144.959028
    ],
    "Second Location": [
        -37.820349, 144.960353
    ],
    "Third Location": [
        -37.821194, 144.961056
    ],
    "Fourth Location": [
        -37.820556, 144.96275
    ]
}

export const flavorText: Record<0 | 1 | 2 | 3, { year: string, name: string, coordinate: string}> = {
    0: {
        year: "2025",
        name: "The Water’s Edge.",
        coordinate: "[S37°49’14.3”, E144°57’32.5”]"
    },
    1: {
        year: "1889",
        name: "Enterprize Wharf.",
        coordinate: "[S37°49’13.3”, E144°57’37.3”]"
    },
    2: {
        year: "2100",
        name: "Yarra Promenade Green.",
        coordinate: "[S37°49’16.3”, 144°57’39.8”]"
    },
    3: {
        year: "2030",
        name: "Southbank Pontoon.",
        coordinate: "[S37°49’14.0”, 144°57’45.9”]"
    }
}

type AudioSlide = {
    type: "audio"
    audioSource: string
}

type TextSlide = {
    type: "text"
    paragraphs: string[]
}

type MapSlide = {
    type: "map"
    coordinateIndex: number
    paragraphs: string[]
}

export type Slide = (
    MapSlide | 
    TextSlide | 
    AudioSlide
) & {
    part: "none" | "1" | "2" | "3" | "4" | "end",
    coordinateIndex: number
}

export const slides: Slide[] = [
    {
        part: "none",
        type: "text",
        paragraphs: [
            "A journey led be N'arweet Carolyn Briggs AM walking with the Yarra Birrarung River exploring our relationship with water."
        ],
        coordinateIndex: 0
    },
    {
        part: "1",
        type: "map",
        paragraphs: [
            "The walk begins here...",
            "When you arrive at this location, press play..."
        ],
        coordinateIndex: 0
    },
    {
        part: "1",
        type: "audio",
        audioSource: "Body_of_Water_1a.mp3",
        coordinateIndex: 0
    },
    {
        part: "1",
        type: "text",
        paragraphs: [
            "Take your vessel and carefully collect water from the river.",
            "When you are ready press play…"
        ],
        coordinateIndex: 0
    },
    {
        part: "1",
        type: "audio",
        audioSource: "Body_of_Water_1b.mp3",
        coordinateIndex: 0
    },
    {
        part: "2",
        type: "map",
        paragraphs: [
            "Continue to the second location.",
            "When you arrive at this location, press play."
        ],
        coordinateIndex: 1
    },
    {
        part: "2",
        type: "audio",
        audioSource:  "Body_of_Water_2a.mp3",
        coordinateIndex: 1
    },
    {
        part: "2",
        type: "text",
        paragraphs: [
            "Disrupt the vessels of others by spilling their water!",
            "When you are ready press play…"
        ],
        coordinateIndex: 1
    },
    {
        part: "2",
        type: "audio",
        audioSource:  "Body_of_Water_2b.mp3",
        coordinateIndex: 1
    },
    {
        part: "3",
        type: "map",
        paragraphs: [
            "Continue to the third location.",
            "When you arrive at this location, press play."
        ],
        coordinateIndex: 2
    },
    {
        part: "3",
        type: "audio",
        audioSource: "Body_of_Water_3a.mp3",
        coordinateIndex: 2
    },
    {
        part: "3",
        type: "text",
        paragraphs: [
            "Imagine the city rising up to contaminate your companion.",
            "When you are ready press play…"
        ],
        coordinateIndex: 2
    },
    {
        part: "3",
        type: "audio",
        audioSource: "Body_of_Water_3b.mp3",
        coordinateIndex: 2
    },
    {
        part: "4",
        type: "map",
        paragraphs: [
            "Continue to the fourth location.",
            "When you arrive at this location, press play."
        ],
        coordinateIndex: 3
    },
    {
        part: "4",
        type: "audio",
        audioSource: "Body_of_Water_4a.mp3",
        coordinateIndex: 3
    },
    {
        part: "4",
        type: "text",
        paragraphs: [
            "Place your companion with others to make a body of water.",
            "When you are ready press play…"
        ],
        coordinateIndex: 3
    },
    {
        part: "4",
        type: "audio",
        audioSource: "Body_of_Water_4b.mp3",
        coordinateIndex: 3
    },
    {
        part: "end",
        type: "text",
        paragraphs: [
            "Thank you for playing!"
        ],
        coordinateIndex: 3
    }
] as const