export interface Position {
  x: number;
  y: number;
}

export interface CardData {
  id: string;
  x: number;
  y: number;
  imageUrl: string;
  text: string;
  date: string;
  isTyping: boolean;
  aspect: '1:1' | '16:9' | '9:16';
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

export interface DragState {
  isDragging: boolean;
  cardId: string | null;
  offset: Position;
}

// Mode for the application: 'idle' (can drag), 'connecting' (selecting cards to link)
export type InteractionMode = 'idle' | 'connecting';
