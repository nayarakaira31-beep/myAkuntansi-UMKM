import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for AI interactions
  app.post("/api/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ reply: "Error: API Key Gemini tidak ditemukan." });
      }

      const { prompt, txns, catsMasuk, catsKeluar, mode } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      if (mode === 'asisten_tab') {
        // Tab asisten: Simple response string
        const systemInstruction = `Kamu adalah asisten keuangan UMKM untuk konsultasi data.
Berdasarkan data berikut (dikirim dalam bentuk JSON list ringkasan):
Total Transaksi: ${txns.length}
Data Transaksi (sebagian): ${JSON.stringify(txns.slice(0, 15))}
Tugasmu: Jawab secara profesional, ringkas, dan jelas dalam bahasa Indonesia. Jangan menghasilkan aksi sistem, cukup analisis teks.`;

        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt,
          config: {
            systemInstruction
          }
        });
        
        return res.json({ reply: response.text || "Tidak ada jawaban." });
      } else {
        // Floating button asisten: JSON format with actions
        const simplifiedTxns = txns.map((t: { id: string, date: string, type: string, cat: string, amount: number, desc: string }) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          cat: t.cat,
          amount: t.amount,
          desc: t.desc.substring(0, 30)
        }));

        const systemInstruction = `Kamu adalah asisten keuangan UMKM. 
Daftar transaksi saat ini (JSON):
${JSON.stringify(simplifiedTxns)}

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
      "id": ID transaksi_number (wajib untuk edit/delete, abaikan untuk add/export),
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
          model: "gemini-1.5-flash",
          contents: prompt,
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
        } catch (e) {
          console.error("Failed parsing JSON", e, responseText);
        }
        return res.json(parsed);
      }

    } catch (e: unknown) {
      console.error(e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ reply: "Error: " + errorMsg });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
