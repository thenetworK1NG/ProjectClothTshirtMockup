
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, Sender } from '../types';
import { startChatSession, sendMessageToAIStream } from '../services/geminiService';
import MessageBubble from './MessageBubble';
import { SendIcon } from './icons/SendIcon';
import { SpeakerOnIcon } from './icons/SpeakerOnIcon';
import { SpeakerOffIcon } from './icons/SpeakerOffIcon';
import { Chat } from '@google/genai';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean>(true);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSpokenGreetingRef = useRef(false);

  const getDefaultVoiceURI = (voices: SpeechSynthesisVoice[]): string | null => {
    const usEnglishVoices = voices.filter(voice => voice.lang === 'en-US');
    if (usEnglishVoices.length === 0) return null;

    const googleVoice = usEnglishVoices.find(voice => voice.name.toLowerCase().includes('google'));
    if (googleVoice) return googleVoice.voiceURI;

    const nonLocalVoice = usEnglishVoices.find(voice => !voice.localService);
    if (nonLocalVoice) return nonLocalVoice.voiceURI;

    return usEnglishVoices[0].voiceURI;
  };

  useEffect(() => {
    const loadVoices = () => {
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (!selectedVoiceURI && voices.length > 0) {
          const defaultURI = getDefaultVoiceURI(voices);
          setSelectedVoiceURI(defaultURI);
        }
      }
    };

    if (window.speechSynthesis) {
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      loadVoices(); 
    }

    setChatSession(startChatSession());
    inputRef.current?.focus();

    const initialGreeting = "Hello! I'm your AI assistant. How can I help you today?";
    setMessages([{
      id: crypto.randomUUID(),
      text: initialGreeting,
      sender: Sender.AI,
      timestamp: new Date(),
    }]);
    
    // Defer speaking greeting slightly
    // Speaking logic is now handled by the effect below that depends on availableVoices and selectedVoiceURI
  }, []); // selectedVoiceURI removed from deps to avoid re-triggering on voice selection


  const speakText = useCallback((text: string) => {
    if (!isTTSEnabled || !window.speechSynthesis || text.trim() === '' || text === '...') return;

    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    let voiceToUse: SpeechSynthesisVoice | null = null;
    if (selectedVoiceURI) {
        voiceToUse = availableVoices.find(v => v.voiceURI === selectedVoiceURI) || null;
    }

    if (voiceToUse) {
        utterance.voice = voiceToUse;
    } else {
        // Fallback if selectedVoiceURI is not set or voice not found (should be rare)
        const defaultURI = getDefaultVoiceURI(availableVoices);
        if (defaultURI) {
            const fallbackVoice = availableVoices.find(v => v.voiceURI === defaultURI);
            if (fallbackVoice) utterance.voice = fallbackVoice;
        }
    }
    
    utterance.rate = 0.9; 
    utterance.pitch = 1.0; 

    window.speechSynthesis.speak(utterance);
  }, [isTTSEnabled, availableVoices, selectedVoiceURI]);


  useEffect(() => {
    // Speak initial greeting when voices are loaded and a voice is selected (or default is set)
    if (isTTSEnabled && availableVoices.length > 0 && selectedVoiceURI && messages.length === 1 && messages[0].sender === Sender.AI && !hasSpokenGreetingRef.current) {
      if (messages[0].text === "Hello! I'm your AI assistant. How can I help you today?") {
        speakText(messages[0].text);
        hasSpokenGreetingRef.current = true;
      }
    }
  }, [isTTSEnabled, availableVoices, selectedVoiceURI, messages, speakText]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (inputValue.trim() === '' || !chatSession || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text: inputValue,
      sender: Sender.User,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const aiMessageId = crypto.randomUUID();
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      text: '...',
      sender: Sender.AI,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, initialAiMessage]);

    let streamedAiText = '';
    try {
      const stream = await sendMessageToAIStream(chatSession, userMessage.text);
      for await (const chunk of stream) {
        streamedAiText += chunk.text;
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === aiMessageId ? { ...msg, text: streamedAiText } : msg
          )
        );
      }
    } catch (error) {
      console.error('Streaming error:', error);
      streamedAiText = 'Sorry, I encountered an issue. Please try again.';
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === aiMessageId ? { ...msg, text: streamedAiText } : msg
        )
      );
    } finally {
      setIsLoading(false);
      if (streamedAiText.trim() !== '' && streamedAiText !== '...') {
        speakText(streamedAiText);
      }
      inputRef.current?.focus();
    }
  }, [inputValue, chatSession, isLoading, speakText]);

  const toggleTTS = () => {
    setIsTTSEnabled((prev) => {
      const newTTSEnabledState = !prev;
      if (!newTTSEnabledState && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return newTTSEnabledState;
    });
  };

  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoiceURI(event.target.value);
    // Optionally, re-speak the last AI message with the new voice if TTS is on
    if (isTTSEnabled && messages.length > 0) {
        const lastMessage = messages[messages.length -1];
        if (lastMessage.sender === Sender.AI && lastMessage.text !== "..." && lastMessage.text !== "Hello! I'm your AI assistant. How can I help you today?") {
            // Create a temporary utterance with the new voice to speak immediately
            if (!window.speechSynthesis || event.target.value === '') return;
            window.speechSynthesis.cancel(); 
            const tempUtterance = new SpeechSynthesisUtterance(lastMessage.text);
            const newVoice = availableVoices.find(v => v.voiceURI === event.target.value);
            if (newVoice) {
                tempUtterance.voice = newVoice;
                tempUtterance.lang = newVoice.lang; // Use lang from voice if available
            } else {
                tempUtterance.lang = 'en-US';
            }
            tempUtterance.rate = 0.9; 
            tempUtterance.pitch = 1.0;
            window.speechSynthesis.speak(tempUtterance);
        }
    }
  };
  
  const usEnglishVoices = availableVoices.filter(voice => voice.lang === 'en-US');

  return (
    <div className="w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col bg-slate-800 shadow-2xl rounded-lg overflow-hidden border border-slate-700">
      <header className="bg-slate-700 p-4 flex flex-col sm:flex-row justify-between items-center border-b border-slate-600 space-y-2 sm:space-y-0">
        <h1 className="text-xl font-semibold text-sky-400">AI Voice Chat</h1>
        <div className="flex items-center space-x-2">
          {usEnglishVoices.length > 0 && (
            <select
              value={selectedVoiceURI || ''}
              onChange={handleVoiceChange}
              className="bg-slate-600 text-white text-xs p-2 rounded-md hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
              aria-label="Select voice"
              disabled={!isTTSEnabled}
            >
              <option value="" disabled>Select a voice</option>
              {usEnglishVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={toggleTTS}
            className="p-2 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
            aria-label={isTTSEnabled ? "Disable Text-to-Speech" : "Enable Text-to-Speech"}
            aria-pressed={isTTSEnabled}
          >
            {isTTSEnabled ? <SpeakerOnIcon className="w-6 h-6 text-sky-400" /> : <SpeakerOffIcon className="w-6 h-6 text-gray-400" />}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-800/50" role="log" aria-live="polite">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {isLoading && messages[messages.length - 1]?.sender === Sender.AI && messages[messages.length - 1]?.text === '...' && (
        <div className="px-6 pb-2 text-sm text-gray-400 flex items-center" aria-label="AI is thinking">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-sky-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          AI is thinking...
        </div>
      )}

      <div className="p-4 border-t border-slate-600 bg-slate-700">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 p-3 bg-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder-gray-400 text-white disabled:opacity-50"
            disabled={isLoading}
            aria-label="Your message"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || inputValue.trim() === ''}
            className="p-3 bg-sky-500 rounded-lg hover:bg-sky-600 disabled:bg-sky-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-700 transition-colors"
            aria-label="Send message"
          >
            <SendIcon className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
