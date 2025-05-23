
import React from 'react';
import { ChatMessage, Sender } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === Sender.User;
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-xl shadow ${
          isUser
            ? 'bg-sky-500 text-white rounded-br-none'
            : 'bg-slate-600 text-gray-200 rounded-bl-none'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-sky-200 text-right' : 'text-gray-400 text-left'}`}>
          {message.timestamp.toLocaleTimeString([], options)}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
