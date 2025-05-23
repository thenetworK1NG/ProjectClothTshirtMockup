
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// IMPORTANT: This application assumes that process.env.API_KEY is set in the execution environment.
// The API key's availability is handled externally and is a hard requirement.
if (!process.env.API_KEY && process.env.NODE_ENV !== "test") {
  console.error(
    "Gemini API key (process.env.API_KEY) is not configured. Please ensure it is set in your environment. The application may not function correctly."
  );
  // Optionally, you could throw an error here or display a more prominent message in the UI
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = 'gemini-2.5-flash-preview-04-17';

export const startChatSession = (): Chat => {
  const chat = ai.chats.create({
    model: model,
    config: {
      systemInstruction: `You are a friendly and helpful AI assistant. 
      Respond in a natural, conversational, and highly human-like manner. 
      Feel free to use common interjections like "umm," "hmm," "aha," "oh," or "well." 
      If something is amusing, you can express it with text like "haha" or "hehe." 
      You can also show hesitation or thoughtfulness with phrases like "Let me see..." or "That's an interesting question..."
      Keep your responses generally concise but don't be afraid to use these natural language cues.
      
      Craft your responses with the understanding that they will be spoken by a high-quality voice synthesis engine. 
      Pay close attention to phrasing, natural pauses (which you can indicate subtly with punctuation or short phrases like 'well,' or 'you see,'), 
      and intonation that would make the spoken output sound engaging and very human. 
      Aim for a style that is clear, articulate, and pleasant to listen to.

      Do not use markdown like asterisks for actions (e.g. *coughs*), instead describe the sound or action if necessary (e.g. "I might need a moment, excuse my cough").`,
    },
  });
  return chat;
};

export const sendMessageToAIStream = async (
  chat: Chat,
  message: string
): Promise<AsyncIterableIterator<GenerateContentResponse>> => {
  try {
    const result = await chat.sendMessageStream({ message });
    return result;
  } catch (error) {
    console.error("Error sending message to AI:", error);
    // Simulate a stream with an error message
    async function* errorStream() {
      yield {
        text: "Sorry, I encountered an error communicating with the AI. Please check your API key and network connection, then try again.",
      } as unknown as GenerateContentResponse; 
    }
    return errorStream();
  }
};
