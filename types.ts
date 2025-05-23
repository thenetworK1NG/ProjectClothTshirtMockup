
export enum Sender {
  User = 'User',
  AI = 'AI',
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
}
