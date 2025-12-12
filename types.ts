export enum AppState {
  IDLE = 'IDLE',
  CAMERA = 'CAMERA',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  HISTORY = 'HISTORY',
  ERROR = 'ERROR',
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface AnalysisResult {
  identifiedName: string; // Extracted name for history
  identifiedType: 'Band' | 'Album' | 'Unknown'; // Extracted type
  text: string; // The markdown description from Gemini
  sourceImage: string; // Base64 of the captured image
  groundingChunks?: GroundingChunk[]; // Search results
}

export interface HistoryItem extends AnalysisResult {
  id: string;
  timestamp: number;
}