import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { api, ChatMessage } from '../services/api';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const AIAssistant: React.FC = () => {
  const { activeProject } = useProject();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    "Why is my project delayed?",
    "Show pending tasks.",
    "Predict project completion timeline.",
    "Suggest cost reductions based on budget.",
    "Generate weekly status report."
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load welcome prompt when project toggles
  useEffect(() => {
    if (activeProject) {
      setMessages([
        {
          role: 'assistant',
          content: 
            `### BuildWise AI Assistant Connected\n\n` +
            `I have established connection to the live telemetry for **${activeProject.name}**.\n\n` +
            `You can ask me questions about project delays, pending tasks, budget overruns, cost reductions, or ask me to compile operational weekly logs. Select a prompt below or type your question.`
        }
      ]);
    }
  }, [activeProject]);

  const handleSendMessage = async (msgText: string) => {
    if (!activeProject || !msgText.trim()) return;
    
    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Send history excluding welcome message
      const history = messages.slice(1);
      const res = await api.ai.chat(activeProject.id, msgText, history);
      
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Sorry, I failed to communicate with the BuildWise AI Agent. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-slate-400">Please select an active project to converse with the AI Assistant.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] w-full gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 flex-1 min-h-0">
        
        {/* Chat area */}
        <div className="lg:col-span-3 glass-panel rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col min-h-0 bg-white dark:bg-slate-950">
          
          {/* Chat Messages flow */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div key={idx} className={`flex gap-3.5 items-start ${isAssistant ? '' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`
                    flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-inner
                    ${isAssistant 
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 border border-brand-500/10' 
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300'}
                  `}>
                    {isAssistant ? <Bot size={16} /> : <User size={16} />}
                  </div>

                  {/* Body Text Card */}
                  <div className={`
                    max-w-[75%] rounded-2xl p-4 shadow-sm text-xs leading-relaxed border
                    ${isAssistant 
                      ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 text-slate-850 dark:text-slate-200' 
                      : 'bg-brand-600 border-brand-600 text-white shadow-brand-500/10'}
                  `}>
                    {renderFormattedText(m.content, isAssistant)}
                  </div>
                </div>
              );
            })}
            
            {loading && (
              <div className="flex gap-3.5 items-start">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 border border-brand-500/10 shadow-inner">
                  <Bot size={16} />
                </div>
                <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex gap-1.5 items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input box */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50 rounded-b-3xl">
            <div className="flex gap-2.5 items-center relative text-xs">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
                placeholder="Ask BuildWise AI a question about your project..."
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3.5 pl-4 pr-12 outline-none focus:border-brand-500 shadow-sm"
                disabled={loading}
              />
              <button
                onClick={() => handleSendMessage(input)}
                disabled={loading || !input.trim()}
                className="absolute right-2.5 p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* Right side suggestions checklist */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-brand-500 shrink-0" size={16} />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Suggested Questions</h4>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4 font-semibold">
            Query the active project database and generate summaries:
          </p>
          <div className="flex-1 space-y-2.5">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="w-full text-left p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 hover:border-brand-500 bg-white hover:bg-brand-50/30 dark:bg-slate-900 dark:hover:bg-brand-950/20 text-xs font-bold text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition-all flex items-center justify-between group"
              >
                <span className="truncate pr-1">{p}</span>
                <ArrowRight size={12} className="text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Custom client-side helper to format raw AI markdown output ---
const renderFormattedText = (text: string, isAssistant: boolean) => {
  if (!isAssistant) return <p className="whitespace-pre-wrap">{text}</p>;
  
  // Format simple markdown tokens:
  // - Headers: ### Title -> <h4 className="font-bold border-b pb-1 mb-2 mt-3">Title</h4>
  // - Subheaders: #### Title -> <h5 className="font-bold mb-1 mt-2">Title</h5>
  // - Bullet items: - Item -> <li className="ml-4 list-disc mb-1">Item</li>
  // - Boldings: **text** -> <b>text</b>
  // - Warning boxes: ⚠️ text -> highlight red box
  
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        
        // 1. Headers
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="font-bold font-display text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-1 mb-2 mt-3">{trimmed.replace('### ', '')}</h4>;
        }
        if (trimmed.startsWith('#### ')) {
          return <h5 key={idx} className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-2 mb-1">{trimmed.replace('#### ', '')}</h5>;
        }

        // 2. Warning check
        const isWarning = trimmed.startsWith('⚠️') || trimmed.startsWith('Warning:');
        
        // 3. Bullet checklist
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          let cleanText = trimmed.replace(/^[-*]\s+/, '');
          return (
            <li key={idx} className="ml-3.5 list-disc mb-0.5 text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
              {parseBold(cleanText)}
            </li>
          );
        }

        // 4. Standard text lines
        if (trimmed === '') return <div key={idx} className="h-2" />;
        
        return (
          <p key={idx} className={`
            leading-relaxed font-semibold text-slate-600 dark:text-slate-350 mb-1
            ${isWarning ? 'p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold mb-2' : ''}
          `}>
            {parseBold(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

// Parse bold markdown tags: **text** -> <b>text</b>
const parseBold = (text: string) => {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    // Every odd index contains the bold text segment
    if (index % 2 === 1) {
      return <strong key={index} className="text-slate-850 dark:text-slate-100 font-bold">{part}</strong>;
    }
    return part;
  });
};
