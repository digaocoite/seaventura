
export enum Sender {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface MapSource {
  uri: string;
  title: string;
  placeId?: string;
}

export interface GroundingChunk {
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        content: string;
      }[];
    }[];
  };
  web?: {
    uri: string;
    title: string;
  };
}

// The structured data returned by the AI for a game turn
export interface GameTurnData {
  locationName: string;
  locationType: string; // e.g., "library", "gym", "restaurant", "outdoors" for image matching
  englishQuestion: string; // "What is the main rule in this quiet room?"
  spanishConcept: string; // "We need to be quiet" (Context for the user's input)
  question: string; // "Por eso, el letrero dice: '_____ (exigir) silencio'."
  options: string[]; // ["Se exige", "Busca", "Se buscan"]
  correctAnswer: string; // "Se exige"
  explanation: string; // "Singular object (silencio) -> Se exige."
  isGameOver?: boolean;
}

export interface ChatMessage {
  id: string;
  role: Sender;
  text?: string; // For user messages or fallback
  structuredContent?: GameTurnData; // For AI messages
  groundingChunks?: GroundingChunk[];
  timestamp: number;
  isCorrect?: boolean; // To style user answers
  step?: 'concept' | 'grammar'; // To track which part of the turn this message belongs to
}

export interface GameState {
  status: 'intro' | 'playing' | 'loading' | 'finished' | 'error';
  location: {
    lat: number;
    lng: number;
  } | null;
  currentTurn: number;
  maxTurns: number;
  activeChallenge: GameTurnData | null; // The current challenge waiting to be answered
  turnStep: 'concept' | 'grammar'; // Are we answering the English question or the Spanish grammar?
}
