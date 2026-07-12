import { generateId } from '@/lib/utils';
import { streamQuestion } from '@/services/api';
import type { Message } from '@/types';
import { FileCode2, Send, StopCircle } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type Props = {
  repoSlug: string;
};

const QUICK_PROMPTS = [
  'What does this project do?',
  'What frameworks are used?',
  'Explain the folder structure',
  'What are the key components?',
  'Is there authentication logic?',
  'What stands out about the code quality?',
];

function ChatWindow({ repoSlug }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setStreaming(false);
    ctrlRef.current?.abort();
  }, [repoSlug]);

  const sendMessage = (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: text,
    };

    const assistantId = generateId();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      loading: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);

    ctrlRef.current = streamQuestion(
      repoSlug,
      text,
      (token) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + token, loading: false }
              : m
          )
        );
      },
      (sources) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, sources } : m))
        );
      },
      () => setStreaming(false),
      (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.message}`, loading: false }
              : m
          )
        );
        setStreaming(false);
      }
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const stop = () => {
    ctrlRef.current?.abort();
    setStreaming(false);
  };

  return (
    <section className="chat-window">
      {messages.length === 0 ? (
        <div className="chat-empty">
          <FileCode2 size={40} />
          <h3>Ask anything about this codebase</h3>
          <p>RepoIQ uses retrieval over the repo to answer with real code context.</p>
          <div className="quick-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="quick-prompt-btn"
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="messages">
          {messages.map((msg) => (
            <article key={msg.id} className={`message message--${msg.role}`}>
              <div className="message-bubble">
                {msg.loading ? (
                  <span className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="message-sources">
                  <span className="sources-label">Sources:</span>
                  {msg.sources.map((s) => (
                    <span key={s} className="source-chip">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="chat-input-bar">
        <textarea
          className="chat-textarea"
          rows={2}
          placeholder="Ask about the repository..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={streaming}
        />
        {streaming ? (
          <button className="btn-stop" onClick={stop} aria-label="Stop generation">
            <StopCircle size={20} />
          </button>
        ) : (
          <button
            className="btn-send"
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </section>
  );
}

export default ChatWindow;