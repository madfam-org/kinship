'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../lib/session';
import { fetchChatMessages, postChatMessage } from '../lib/api';
import { encryptText, decryptText } from '../lib/crypto';
import { useToast } from './ui/toast';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface ChatMessage {
  id: string;
  senderId: string;
  encryptedPayload: string;
  createdAt: string;
}

interface DecryptedMessage {
  id: string;
  senderId: string;
  originalName: string;
  text: string;
  createdAt: Date;
}

interface Props {
  eventId: string;
  groupSymmetricKey: CryptoKey;
}

export default function EventChat({ eventId, groupSymmetricKey }: Props) {
  const currentUser = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetchChatMessages(eventId);
        const rawMessages = res.data as unknown as ChatMessage[];
        
        const decryptedList: DecryptedMessage[] = [];
        for (const msg of rawMessages) {
          try {
            const plaintext = await decryptText(msg.encryptedPayload, groupSymmetricKey);
            const data = JSON.parse(plaintext);
            decryptedList.push({
              id: msg.id,
              senderId: msg.senderId,
              originalName: data.senderName || 'Unknown',
              text: data.text,
              createdAt: new Date(msg.createdAt)
            });
          } catch (e) {
            console.warn(`Could not decrypt message ${msg.id}`);
          }
        }
        setMessages(decryptedList);
      } catch (e) {
        toast('Failed to load chat history', 'error');
      }
    }
    loadHistory();
  }, [eventId, groupSymmetricKey]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;

    setIsSending(true);
    try {
      const payloadObj = {
        text: draft.trim(),
        senderName: currentUser.name
      };
      
      const encryptedPayload = await encryptText(JSON.stringify(payloadObj), groupSymmetricKey);
      
      const newRawMsg = await postChatMessage(eventId, currentUser.id, encryptedPayload) as unknown as ChatMessage;
      
      setMessages(prev => [...prev, {
        id: newRawMsg.id,
        senderId: currentUser.id,
        originalName: currentUser.name,
        text: draft.trim(),
        createdAt: new Date(newRawMsg.createdAt)
      }]);
      
      setDraft('');
    } catch (err) {
      toast('Failed to send encrypted message.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-64 border border-border rounded-lg bg-background/50 overflow-hidden mt-4">
      <div className="bg-muted p-2 text-xs text-center border-b border-border">
        🔒 End-to-End Encrypted Group Chat
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="text-secondary text-sm text-center my-auto italic">
            No messages yet. Start the conversation.
          </div>
        ) : (
          <>
            {messages.map(msg => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                  <span className="text-[10px] text-secondary mb-1 px-1">
                    {isMe ? 'You' : msg.originalName} • {msg.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="p-2 border-t border-border flex gap-2">
        <Input 
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Encrypted message..."
          className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 px-2"
          disabled={isSending}
        />
        <Button type="submit" disabled={isSending || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
