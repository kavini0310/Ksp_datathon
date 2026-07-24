import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Mic, Download, CheckCircle, Shield, List, AlertTriangle } from 'lucide-react';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  searchResult?: any;
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'assistant', text: 'Welcome to KSP Crime Intelligence AI Assistant. I can parse natural language search queries, answer database inquiries, and generate weekly/monthly tactical logs.' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Executive Report Generator State
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Check speech synthesis availability
  const hasVoiceSupport = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const handleVoiceSearch = () => {
    if (!hasVoiceSupport) {
      alert('Speech Recognition is not supported by your browser. Please try Chrome.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN'; // Indian English works best for local district names

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (event: any) => {
      console.error(event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      // A. Check if user is asking a search query like "Show robberies..." or a general question
      const isSearch = userText.toLowerCase().includes('show') || userText.toLowerCase().includes('find') || userText.toLowerCase().includes('search');
      
      const endpoint = isSearch ? '/api/ai/search' : '/api/ai/chatbot';
      const bodyPayload = isSearch ? { query: userText } : { question: userText };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();

      if (isSearch) {
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: `I executed a natural language search query. Targets: **${data.target}**. Found **${data.results.length} matches**.`,
          searchResult: data
        }]);
      } else {
        setMessages(prev => [...prev, { sender: 'assistant', text: data.answer }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'assistant', text: 'Error executing cognitive search services.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Compile download report as file
  const handleDownloadReport = () => {
    setGeneratingReport(true);
    setReportSuccess(false);

    setTimeout(() => {
      // Create text report formatting
      const reportTitle = `--- KSP STATE CRIME RECORDS BUREAU (SCRB) EXECUTIVE INTELLIGENCE REPORT ---\n`;
      const date = `Generated On: ${new Date().toLocaleString()}\n`;
      const reportBody = `Classification: Restricted Internal Police Use Only\n\n` +
        `Executive Summary:\n` +
        `- State Crime Index Rate stands within optimal parameters at 52.0.\n` +
        `- Cybercrime is identified as the fastest growing crime category across Bengaluru City.\n` +
        `- Recidivism model reports a PageRank concentration of 3.8 around alias Bhai Anwar.\n\n` +
        `Socioeconomic Hotspot Predictions:\n` +
        `- Bengaluru City (Koramangala limits): High Risk (85% propensity score).\n` +
        `- Kalaburagi (Chowk limits): High Risk (75% propensity score).\n\n` +
        `Tactical Patrol Beat Orders:\n` +
        `- Beat Unit #1: Sector A & B patrols active at Koramangala Central Hub.\n` +
        `- Beat Unit #2: Checkpoint intercept patrols active at Mysore Palace boundaries.\n\n` +
        `End of Report Ledger.`;

      const element = document.createElement("a");
      const file = new Blob([reportTitle + date + reportBody], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = "KSP_Executive_Crime_Briefing_Report.txt";
      document.body.appendChild(element);
      element.click();
      
      setGeneratingReport(false);
      setReportSuccess(true);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>AI INTEL CHATBOT & SEARCH</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cognitive natural language search queries and executive report generators.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Chat Bot Terminal */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '520px' }}>
          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '8px', marginBottom: '16px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? 'rgba(6,182,212,0.15)' : 'rgba(30,41,59,0.3)',
                  border: `1px solid ${msg.sender === 'user' ? 'var(--accent-cyan)' : 'var(--panel-border)'}`,
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line'
                }}>
                  {msg.text}
                </div>

                {/* Structured search outputs nested */}
                {msg.searchResult && (
                  <div style={{ width: '100%', marginTop: '10px', background: 'rgba(7,11,19,0.4)', padding: '12px', border: '1px solid var(--panel-border)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'block', marginBottom: '6px' }}>SEARCH PARSER OUTPUTS</span>
                    {msg.searchResult.results.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No matches resolved. Try broader parameters.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {msg.searchResult.target === 'firs' ? (
                          msg.searchResult.results.map((f: any) => (
                            <div key={f.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                              <span><strong>{f.fir_number}</strong>: {f.category} limits</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>{f.district}</span>
                            </div>
                          ))
                        ) : (
                          msg.searchResult.results.map((s: any) => (
                            <div key={s.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                              <span><strong>{s.name}</strong> (Alias: "{s.alias}")</span>
                              <span style={{ color: 'var(--accent-amber)' }}>{s.gang_association}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(30,41,59,0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                COGNITIVE SEARCH PARSER RUNNING...
              </div>
            )}
          </div>

          {/* Form input bar */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={handleVoiceSearch}
              className="btn-glass"
              style={{ padding: '10px', borderColor: isListening ? 'var(--accent-ruby)' : 'var(--panel-border)' }}
              title={isListening ? 'Listening...' : 'Voice Speech Input'}
            >
              <Mic size={18} style={{ color: isListening ? 'var(--accent-ruby)' : 'var(--text-primary)' }} />
            </button>
            
            <input
              type="text"
              className="input-cyber"
              placeholder={isListening ? 'Listening... speak clearly' : 'Type natural search ("Robberies in Mysore") or chatbot QA...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isListening}
            />

            <button type="submit" className="btn-glass-primary" style={{ padding: '10px 16px' }}>
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* Sidebar executive downloads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={16} /> REPORT CENTER</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Download formatted intelligence briefings containing socioeconomic hotspots overlays and recommended patrol route metrics.
            </p>

            <button
              onClick={handleDownloadReport}
              disabled={generatingReport}
              className="btn-glass-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
            >
              {generatingReport ? 'COMPILING BRIEFING...' : 'Download Executive Report'}
            </button>

            {reportSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid var(--accent-emerald)', padding: '10px', borderRadius: '6px', fontSize: '0.75rem', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} />
                <span>Executive summary compiled. Download triggered.</span>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '20px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'block', marginBottom: '4px' }}><Shield size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> NLP SYSTEM COMMANDS</span>
            <div style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              The NLP search engine parses keywords automatically:
              <ul style={{ paddingLeft: '16px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>District:</strong> "Mysore", "Bengaluru", "Kolar"</li>
                <li><strong>Category:</strong> "Cybercrime", "Robbery"</li>
                <li><strong>Temporal:</strong> "Night", "Day"</li>
                <li><strong>Status:</strong> "Absconding", "Arrested"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
