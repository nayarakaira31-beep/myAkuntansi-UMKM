import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';

interface AiAssistantProps {
  txns: any[];
  setTxns: React.Dispatch<React.SetStateAction<any[]>>;
  catsMasuk: string[];
  catsKeluar: string[];
  onExport: () => void;
}

export function AiAssistant({ txns, setTxns, catsMasuk, catsKeluar, onExport }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([]);

  const handleSend = async () => {
    if (!prompt.trim()) return;
    const userText = prompt.trim();
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          txns: txns,
          catsMasuk,
          catsKeluar,
          mode: 'floating_ai'
        })
      });

      if (!response.ok) {
        throw new Error("Gagal menghubungi server");
      }

      const parsed = await response.json();

      setMessages(prev => [...prev, { role: 'assistant', text: parsed.reply }]);

      if (parsed.actions && parsed.actions.length > 0) {
        let shouldExport = false;
        setTxns(prev => {
          let newTxns = [...prev];
          parsed.actions.forEach((act: any) => {
            if (act.action === 'export') {
              shouldExport = true;
            } else if (act.action === 'add' && act.data) {
              newTxns.push({
                id: crypto.randomUUID(),
                ...act.data
              });
            } else if (act.action === 'edit' && act.id && act.data) {
              const idx = newTxns.findIndex(t => String(t.id) === String(act.id));
              if (idx !== -1) {
                newTxns[idx] = { ...newTxns[idx], ...act.data };
              }
            } else if (act.action === 'delete' && act.id) {
              newTxns = newTxns.filter(t => String(t.id) !== String(act.id));
            }
          });
          return newTxns;
        });
        if (shouldExport) {
          onExport();
        }
      }

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Tombol Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-4 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#6B705C] text-white border-none shadow-lg cursor-pointer flex items-center justify-center text-xl md:text-2xl z-50 transition-transform hover:scale-105 active:scale-95"
      >
        ✨
      </button>

      {/* Jendela Chat */}
      {isOpen && (
        <div className="fixed bottom-[80px] right-4 md:right-6 w-[calc(100vw-32px)] md:w-80 h-[450px] max-h-[75vh] bg-[#FAF9F6] border border-[#DCD9CC] rounded-2xl shadow-xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-[#E8E6DB] px-4 py-3 border-b border-[#DCD9CC] flex justify-between items-center shrink-0">
            <strong className="text-[#4A4A40] text-[13px] md:text-[14px]">✨ Asisten Keuangan</strong>
            <button onClick={() => setIsOpen(false)} className="bg-transparent border-none cursor-pointer text-[14px] md:text-[16px] text-[#A5A58D] hover:text-[#4A4A40]">&times;</button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 md:p-4 overflow-y-auto flex flex-col gap-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center text-[#A5A58D] text-[11px] md:text-[12px] mt-4">
                Ketik instruksi untuk menambah, mengubah, atau menghapus transaksi. Contoh: "Tambahkan pengeluaran bahan baku 150rb hari ini."
              </div>
            )}
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`px-3 py-2 rounded-xl text-[12px] md:text-[13px] leading-relaxed max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'self-end bg-[#6B705C] text-white rounded-br-sm' 
                    : 'self-start bg-[#E8E6DB] text-[#4A4A40] rounded-bl-sm'
                }`}
                style={{ whiteSpace: "pre-wrap" }}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="self-start text-[#A5A58D] text-[11px] md:text-[12px] p-1">
                Mengetik...
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-[#DCD9CC] bg-white flex gap-2 shrink-0">
            <input 
              type="text" 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ketik perintah..."
              className="flex-1 px-3 py-2 rounded-lg border border-[#DCD9CC] outline-none text-[12px] md:text-[13px] focus:border-[#6B705C]"
            />
            <button 
              onClick={handleSend}
              disabled={loading || !prompt.trim()}
              className="bg-[#B18B5E] text-white border-none rounded-lg px-3 md:px-4 cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-opacity text-[13px] md:text-[14px]"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
