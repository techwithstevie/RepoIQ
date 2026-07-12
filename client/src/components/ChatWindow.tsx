import { generateId } from '@/lib/utils';
import { streamQuestion } from '@/services/api';
import type { Message } from '@/types';
import { FileCode2, Send, Sparkles, StopCircle } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type Props = {
  repoSlug: string;
};

const QUICK_PROMPTS = [
  'What does this repository do?',
  'Explain the architecture in plain English.',
  'What parts of the code feel strongest?',
  'What should a recruiter know first?',
  'How is the RAG pipeline implemented?',
  'What backend patterns are used here?',
];

export function ChatWindow({ repoSlug }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    ctrlRef.current?.abort();
    setMessages([]);
    setInput('');
    setStreaming(false);
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
            m.id === assistantId ? { ...m, content: m.content + token, loading: false } : m
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
    <div className="chat-premium">
      <div className="chat-premium-header">
        <div>
          <div className="panel-kicker">Guided analysis</div>
          <h3>Ask RepoIQ about the codebase</h3>
        </div>
        <div className="mini-pill">
          <Sparkles size={14} />
          Retrieval-backed answers
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="chat-empty-premium">
          <div className="chat-empty-icon">
            <FileCode2 size={32} />
          </div>
          <h4>Start with a high-signal question</h4>
          <p>
            The best questions focus on architecture, stack choices, implementation patterns,
            and recruiter-facing strengths.
          </p>

          <div className="quick-prompt-grid">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="quick-prompt-card"
                onClick={() => sendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="messages-premium">
          {messages.map((msg) => (
            <article key={msg.id} className={`message-premium message-premium--${msg.role}`}>
              <div className="message-surface">
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
                <div className="source-row">
                  {msg.sources.map((s) => (
                    <span key={s} className="source-tag">
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

      <div className="chat-composer">
        <textarea
          className="chat-composer-input"
          rows={2}
          placeholder="Ask about architecture, stack, quality, or implementation details..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={streaming}
        />
        {streaming ? (
          <button className="composer-btn composer-btn-stop" onClick={stop} aria-label="Stop">
            <StopCircle size={18} />
          </button>
        ) : (
          <button
            className="composer-btn composer-btn-send"
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}