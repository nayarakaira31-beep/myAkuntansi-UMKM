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
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'assistant', text: "Error: API Key Gemini tidak ditemukan." }]);
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `Kamu adalah asisten keuangan UMKM. 
Daftar transaksi saat ini (JSON):
${JSON.stringify(txns.slice(-20))} // max 20 transaksi terbaru untuk konteks.

Kategori Masuk yang tersedia: ${catsMasuk.join(', ')}.
Kategori Keluar yang tersedia: ${catsKeluar.join(', ')}.

Waktu saat ini: ${new Date().toISOString().split('T')[0]}.

Tugasmu:
Berdasarkan permintaan pengguna, tentukan aksi apa yang harus dilakukan pada data transaksi atau sistem.
Format output harus JSON yang valid dengan skema berikut:
{
  "reply": "Pesan balasan ramah dalam bahasa Indonesia",
  "actions": [
    {
      "action": "add" atau "edit" atau "delete" atau "export",
      "id": ID transaksi (wajib untuk edit/delete, abaikan untuk add/export),
      "data": { // wajib untuk add/edit
         "desc": "deskripsi",
         "amount": nominal_angka,
         "cat": "kategori",
         "type": "masuk" atau "keluar",
         "date": "YYYY-MM-DD"
      }
    }
  ]
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userText,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
               reply: { type: Type.STRING, description: "Pesan balasan asisten" },
               actions: {
                 type: Type.ARRAY,
                 items: {
                   type: Type.OBJECT,
                   properties: {
                     action: { type: Type.STRING, description: "add, edit, delete, atau export" },
                     id: { type: Type.NUMBER, description: "ID transaksi jika edit/delete" },
                     data: {
                        type: Type.OBJECT,
                        properties: {
                           desc: { type: Type.STRING },
                           amount: { type: Type.NUMBER },
                           cat: { type: Type.STRING },
                           type: { type: Type.STRING },
                           date: { type: Type.STRING }
                        }
                     }
                   }
                 }
               }
            }
          }
        }
      });

      const responseText = response.text || "";
      let parsed = { reply: "Maaf, terjadi kesalahan.", actions: [] };
      try {
        parsed = JSON.parse(responseText);
      } catch(e) {
        console.error("Gagal parse JSON", responseText);
      }

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
                id: Date.now() + Math.floor(Math.random() * 1000),
                ...act.data
              });
            } else if (act.action === 'edit' && act.id && act.data) {
              const idx = newTxns.findIndex(t => t.id === act.id);
              if (idx !== -1) {
                newTxns[idx] = { ...newTxns[idx], ...act.data };
              }
            } else if (act.action === 'delete' && act.id) {
              newTxns = newTxns.filter(t => t.id !== act.id);
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
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#6B705C',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          zIndex: 1000,
          transition: 'transform 0.2s',
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        ✨
      </button>

      {/* Jendela Chat */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '24px',
          width: '320px',
          height: '450px',
          backgroundColor: '#FAF9F6',
          border: '1px solid #DCD9CC',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#E8E6DB',
            padding: '12px 16px',
            borderBottom: '1px solid #DCD9CC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <strong style={{ color: '#4A4A40', fontSize: '14px' }}>✨ Asisten Keuangan</strong>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#A5A58D' }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#A5A58D', fontSize: '12px', marginTop: '20px' }}>
                Ketik instruksi untuk menambah, mengubah, atau menghapus transaksi. Contoh: "Tambahkan pengeluaran bahan baku 150rb hari ini."
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? '#6B705C' : '#E8E6DB',
                color: msg.role === 'user' ? 'white' : '#4A4A40',
                padding: '8px 12px',
                borderRadius: '12px',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '12px',
                maxWidth: '85%',
                fontSize: '13px',
                lineHeight: '1.4'
              }}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#A5A58D', fontSize: '12px', padding: '4px' }}>
                Mengetik...
              </div>
            )}
          </div>

          {/* Input Area */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid #DCD9CC',
            backgroundColor: 'white',
            display: 'flex',
            gap: '8px'
          }}>
            <input 
              type="text" 
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ketik perintah..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #DCD9CC',
                outline: 'none',
                fontSize: '13px'
              }}
            />
            <button 
              onClick={handleSend}
              disabled={loading || !prompt.trim()}
              style={{
                backgroundColor: '#B18B5E',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0 12px',
                cursor: 'pointer',
                opacity: (loading || !prompt.trim()) ? 0.6 : 1,
                fontWeight: 'bold'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
