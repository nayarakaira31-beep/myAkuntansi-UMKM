import { useState, useMemo, useEffect } from "react";
import { AiAssistant } from "./AiAssistant";
import { motion, AnimatePresence } from "motion/react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const fmtS = (n: number) => {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}rb`;
  return `Rp ${n}`;
};

export interface Transaction {
  id: string | number;
  date: string;
  desc: string;
  cat: string;
  type: "masuk" | "keluar";
  amount: number;
  saldo?: number;
}

const CAT_MASUK = ["Penjualan Produk", "Jasa / Layanan", "Investasi Masuk", "Pinjaman", "Pendapatan Lain"];
const CAT_KELUAR = ["Bahan Baku", "Gaji Karyawan", "Operasional", "Marketing & Iklan", "Utilitas", "Pajak & Admin", "Pengeluaran Lain"];

const PIE_COLORS = ["#6B705C", "#8A8F78", "#A5A58D", "#B18B5E", "#C5A582", "#A08C75", "#7A6A55", "#4A4A40"];

const INIT_TXNS: Transaction[] = [
  { id:1, date:"2026-05-01", desc:"Penjualan produk batch pertama", cat:"Penjualan Produk", type:"masuk", amount:2500000 },
  { id:2, date:"2026-05-02", desc:"Pembelian bahan baku mingguan", cat:"Bahan Baku", type:"keluar", amount:750000 },
  { id:3, date:"2026-05-03", desc:"Gaji karyawan bulan Mei", cat:"Gaji Karyawan", type:"keluar", amount:1500000 },
  { id:4, date:"2026-05-04", desc:"Penjualan online marketplace", cat:"Penjualan Produk", type:"masuk", amount:1850000 },
  { id:5, date:"2026-05-05", desc:"Tagihan listrik dan air", cat:"Utilitas", type:"keluar", amount:380000 },
  { id:6, date:"2026-05-06", desc:"Jasa desain logo klien", cat:"Jasa / Layanan", type:"masuk", amount:600000 },
  { id:7, date:"2026-05-07", desc:"Iklan Instagram dan Facebook", cat:"Marketing & Iklan", type:"keluar", amount:250000 },
  { id:8, date:"2026-05-08", desc:"Penjualan produk premium", cat:"Penjualan Produk", type:"masuk", amount:3200000 },
  { id:9, date:"2026-05-08", desc:"Sewa tempat usaha bulanan", cat:"Operasional", type:"keluar", amount:1200000 },
];

const TABS = [
  { id:"dashboard", label:"Dashboard", icon:"📊" },
  { id:"transaksi", label:"Transaksi", icon:"💳" },
  { id:"laporan", label:"Laporan", icon:"📋" },
  { id:"asisten", label:"AI Asisten", icon:"🤖" },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem("myAkuntansi_isLoggedIn") === "true";
    } catch {
      return false;
    }
  });
  
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("myAkuntansi_isLoggedIn", String(isLoggedIn));
    } catch {}
  }, [isLoggedIn]);

  const [txns, setTxns] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem("myAkuntansi_txns");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Gagal membaca data dari storage", e);
    }
    return INIT_TXNS;
  });

  useEffect(() => {
    try {
      localStorage.setItem("myAkuntansi_txns", JSON.stringify(txns));
    } catch {}
  }, [txns]);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), desc: "", cat: "", type: "masuk", amount: ""
  });
  const [filterType, setFilterType] = useState("semua");
  const [filterMonth, setFilterMonth] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean, text: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterType]);

  // Fungsi untuk memulai edit
  const startEdit = (t: Transaction) => {
    setForm({
      date: t.date,
      desc: t.desc,
      cat: t.cat,
      type: t.type,
      // Format angka dengan titik agar rapi di form
      amount: t.amount.toLocaleString('id-ID') 
    });
    setEditId(t.id);
    setTab("transaksi"); // Pastikan tetap di tab transaksi
  };

  // Fungsi untuk membatalkan edit
  const cancelEdit = () => {
    setEditId(null);
    setForm({ date: new Date().toISOString().split("T")[0], desc: "", cat: "", type: "masuk", amount: "" });
  };
  // States for AI Prompt feature
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<{ id: string; timestamp: string; role: 'user' | 'ai'; content: string }[]>([]);

  const availableMonths = useMemo(() => {
    const m = new Set(txns.map(t => t.date.substring(0, 7)));
    return Array.from(m).sort().reverse();
  }, [txns]);

  const globalFilteredTxns = useMemo(() => {
    let list = txns;
    if (filterMonth) {
      list = list.filter(t => t.date.startsWith(filterMonth));
    }
    return list;
  }, [txns, filterMonth]);

  const filteredTxns = useMemo(() => {
    // 1. Urutkan SEMUA transaksi dari awal mula (kronologis)
    const sortedAllAsc = [...txns].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 2. Hitung running balance untuk seluruh sejarah transaksi
    let currentBalance = 0;
    const allWithBalance = sortedAllAsc.map(t => {
      if (t.type === 'masuk') currentBalance += t.amount;
      else currentBalance -= t.amount;
      return { ...t, saldo: currentBalance };
    });

    // 3. BARU LAKUKAN FILTERING sesuai pilihan user di UI
    let finalList = allWithBalance;
    if (filterMonth) {
      finalList = finalList.filter(t => t.date.startsWith(filterMonth));
    }
    if (filterType !== "semua") {
      finalList = finalList.filter(t => t.type === filterType);
    }
    
    // 4. Return secara descending agar transaksi terbaru ada di paling atas
    return finalList.reverse();
  }, [txns, filterMonth, filterType]);

  const { saldoAwal, totalMasuk, totalKeluar, saldoAkhir } = useMemo(() => {
    let _saldoAwal = 0;
    let _masuk = 0;
    let _keluar = 0;

    txns.forEach(t => {
      // Is transaction before our filtered month?
      if (filterMonth && t.date < filterMonth + '-01') {
        if (t.type === 'masuk') _saldoAwal += t.amount;
        else _saldoAwal -= t.amount;
      } 
      // Is transaction IN our filtered month (or no filter)?
      else if (!filterMonth || t.date.startsWith(filterMonth)) {
        if (t.type === 'masuk') _masuk += t.amount;
        else _keluar += t.amount;
      }
    });

    return { 
      saldoAwal: _saldoAwal, 
      totalMasuk: _masuk, 
      totalKeluar: _keluar, 
      saldoAkhir: _saldoAwal + _masuk - _keluar 
    };
  }, [txns, filterMonth]);
  
  const laba = totalMasuk - totalKeluar;
  const margin = totalMasuk > 0 ? ((laba / totalMasuk) * 100).toFixed(1) : "0";

  const dailyData = useMemo(() => {
    const map: Record<string, { date: string; dateFull: string; masuk: number; keluar: number }> = {};
    globalFilteredTxns.forEach(t => {
      if (!map[t.date]) map[t.date] = { date: t.date.slice(8), dateFull: t.date, masuk: 0, keluar: 0 };
      if (t.type === "masuk") map[t.date].masuk += t.amount;
      else map[t.date].keluar += t.amount;
    });
    return Object.values(map).sort((a, b) => a.dateFull.localeCompare(b.dateFull));
  }, [globalFilteredTxns]);

  const pieKeluar = useMemo(() => {
    const map: Record<string, number> = {};
    globalFilteredTxns.filter(t => t.type === "keluar").forEach(t => { map[t.cat] = (map[t.cat] || 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [globalFilteredTxns]);

  const pieMasuk = useMemo(() => {
    const map: Record<string, number> = {};
    globalFilteredTxns.filter(t => t.type === "masuk").forEach(t => { map[t.cat] = (map[t.cat] || 0) + t.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [globalFilteredTxns]);

  const exportCSV = () => {
    if (filteredTxns.length === 0) {
      setMsg({ ok: false, text: "Tidak ada data untuk diekspor." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    const headers = ["ID", "Tanggal", "Kategori", "Deskripsi", "Jenis", "Nominal"];
    const rows = filteredTxns.map(t => [
      t.id, t.date, `"${t.cat}"`, `"${t.desc.replace(/"/g, '""')}"`, t.type, t.amount
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Data_Transaksi${filterMonth ? '_' + filterMonth : ''}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAskAI = async () => {
    if (aiPrompt.trim() === "") return;
    
    setIsAiLoading(true);
    const now = new Date();
    const timestamp = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + " · " + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    const promptText = aiPrompt;
    const userMsg = { id: crypto.randomUUID(), timestamp, role: 'user' as const, content: promptText };
    setAiChatHistory(prev => [...prev, userMsg]);
    setAiPrompt("");

    try {
      const summaryTxns = globalFilteredTxns.map(t => ({
        date: t.date,
        type: t.type,
        amount: t.amount,
        cat: t.cat
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          txns: summaryTxns,
          mode: 'asisten_tab'
        })
      });

      if (!response.ok) {
        throw new Error("Gagal menghubungi AI");
      }

      const parsed = await response.json();
      
      const aiNow = new Date();
      const aiTimestamp = aiNow.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + " · " + aiNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const aiMsg = { id: crypto.randomUUID(), timestamp: aiTimestamp, role: 'ai' as const, content: parsed.reply };
      
      setAiChatHistory(prev => [...prev, aiMsg]);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const aiNow = new Date();
      const aiTimestamp = aiNow.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + " · " + aiNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const aiMsg = { id: crypto.randomUUID(), timestamp: aiTimestamp, role: 'ai' as const, content: "Maaf, terjadi kesalahan atau AI sedang tidak bisa diakses: " + errorMsg };
      setAiChatHistory(prev => [...prev, aiMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const addTxn = () => {
    if (!form.date) {
      setMsg({ ok: false, text: "Tanggal tidak boleh kosong." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(form.date) || isNaN(new Date(form.date).getTime())) {
      setMsg({ ok: false, text: "Format tanggal tidak valid." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    if (!form.desc.trim()) {
      setMsg({ ok: false, text: "Deskripsi tidak boleh kosong." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    if (!form.cat) {
      setMsg({ ok: false, text: "Pilih kategori transaksi." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    if (!form.amount) {
      setMsg({ ok: false, text: "Nominal tidak boleh kosong." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    const rawAmount = String(form.amount).replace(/\./g, "").trim();
    if (!/^\d+$/.test(rawAmount)) {
      setMsg({ ok: false, text: "Nominal hanya boleh berisi angka bulat." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    const amt = parseInt(rawAmount, 10);
    if (!amt || amt <= 0) {
      setMsg({ ok: false, text: "Nominal harus lebih besar dari 0." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }

    if (editId) {
      // Jika mode edit, perbarui data yang ada
      setTxns(prev => prev.map(t => 
        String(t.id) === String(editId) 
          ? { ...t, date: form.date, desc: form.desc, cat: form.cat, type: form.type, amount: amt } 
          : t
      ));
      setMsg({ ok: true, text: "Transaksi berhasil diperbarui!" });
      setEditId(null); // Keluar dari mode edit
    } else {
      // Jika bukan edit, buat data baru
      setTxns(prev => [...prev, { id: crypto.randomUUID(), date: form.date, desc: form.desc, cat: form.cat, type: form.type, amount: amt }]);
      setMsg({ ok: true, text: "Transaksi berhasil disimpan!" });
    }

    setForm({ date: new Date().toISOString().split("T")[0], desc: "", cat: "", type: "masuk", amount: "" });
    setTimeout(() => setMsg(null), 3000);
  };

  if (showSplash) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="font-sans min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-20 h-20 bg-[#007a07] rounded-3xl flex items-center justify-center text-white text-4xl mb-6 shadow-xl shadow-[#007a07]/30"
          >
            📊
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="text-3xl md:text-4xl font-bold text-[#4A4A40] mb-2 tracking-tight"
          >
            myAkuntansi
          </motion.h1>
          
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
            className="text-[14px] text-[#A5A58D] tracking-wide"
          >
            MENGANALISIS KEUANGAN..
          </motion.p>
        </motion.div>
      </AnimatePresence>
    );
  }

  const cats = form.type === "masuk" ? CAT_MASUK : CAT_KELUAR;

  const CustomTip = ({ active, payload, label }: { active?: boolean, payload?: any[], label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-[#DCD9CC] rounded-[8px] px-3.5 py-2.5 text-xs shadow-sm">
        <p className="m-0 mb-1.5 font-medium text-[#4A4A40]">{label}</p>
        {payload.map((p: { color: string; name: string; value: number }, i: number) => (
          <p key={i} className="m-0 my-0.5" style={{ color: p.color }}>{p.name}: {fmtS(p.value)}</p>
        ))}
      </div>
    );
  };

  if (!isLoggedIn) {
    return (
      <div className="font-sans text-[#4A4A40] min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm mb-6 text-center">
          <div className="w-16 h-16 bg-[#007a07] rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-5 shadow-lg shadow-[#007a07]/20">
            📊
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#4A4A40] mb-2 tracking-tight">myAkuntansi</h1>
          <p className="text-[13px] md:text-sm text-[#A5A58D] max-w-[280px] mx-auto leading-relaxed">
            Sistem pencatatan keuangan modern untuk UMKM yang praktis dan efisien.
          </p>
        </div>

        <div className="bg-white border border-[#DCD9CC] rounded-[24px] w-full max-w-sm p-6 md:p-8 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#007a07] to-[#B18B5E]"></div>
          
          <h2 className="text-lg font-semibold text-[#4A4A40] mb-6">Masuk ke Akun Anda</h2>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => setIsLoggedIn(true)}
              className="w-full bg-white border border-[#DCD9CC] text-[#4A4A40] font-medium py-3 md:py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google Logo" className="w-[18px] h-[18px] group-hover:scale-110 transition-transform"/>
              <span className="text-[13px] md:text-sm">Lanjutkan dengan Google (Individu)</span>
            </button>

            <button 
              onClick={() => setIsLoggedIn(true)}
              className="w-full bg-white border border-[#DCD9CC] text-[#4A4A40] font-medium py-3 md:py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google Logo" className="w-[18px] h-[18px] group-hover:scale-110 transition-transform grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"/>
              <span className="text-[13px] md:text-sm">Lanjutkan dengan Google Workspace</span>
            </button>
          </div>

          <div className="mt-8 text-[11px] md:text-[12px] text-[#A5A58D]">
            Dengan melanjutkan, Anda menyetujui <br/>
            <a href="#" className="text-[#6B705C] hover:underline">Syarat Ketentuan</a> dan <a href="#" className="text-[#6B705C] hover:underline">Kebijakan Privasi</a> kami.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans text-[#4A4A40] min-h-screen bg-[#FAF9F6] flex flex-col">
      <AiAssistant txns={txns} setTxns={setTxns} catsMasuk={CAT_MASUK} catsKeluar={CAT_KELUAR} onExport={exportCSV} />
      {/* ── Header ─────────────────────────────── */}
      <div className="bg-[#007a07] border-b border-[#DCD9CC] px-4 py-3 md:px-5 md:py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 sticky top-0 z-20">
        <div>
          <div className="text-white font-bold text-base tracking-[-0.3px]">myAkuntansi UMKM</div>
          <div className="text-white text-[11px] mt-0.5 opacity-90">Sistem Akuntansi & Keuangan Usaha Kecil</div>
        </div>
        <div className="flex w-full md:w-auto gap-3 md:gap-4 items-center justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-white/30 bg-white/10 text-white text-[13px] cursor-pointer outline-none [color-scheme:dark]"
            />
            {filterMonth ? (
              <button 
                onClick={() => setFilterMonth("")}
                className="text-white hover:text-white px-2.5 py-1.5 text-[12px] bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20"
                title="Tampilkan Semua Periode"
              >
                ✕ Semua
              </button>
            ) : (
              <span className="text-white/80 text-[12px] px-2 hidden sm:inline-block">Semua Periode</span>
            )}
          </div>
          <div className="flex gap-4 items-center shrink-0">
            <div className="flex gap-2 items-center">
              <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_0_2px_rgba(255,255,255,0.3)]"></div>
              <span className="text-[11px] text-white font-medium opacity-90">Live</span>
            </div>
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border border-white/20"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────── */}
      <div className="flex overflow-x-auto bg-[#ad9e6d] border-b-[0.5px] border-[#DCD9CC] sticky top-[72px] md:top-[60px] z-10 no-scrollbar">
        {TABS.map(t => (
          <button 
            key={t.id} 
            className={`whitespace-nowrap px-4 py-2.5 md:px-[18px] md:py-[11px] text-[13px] border-none bg-transparent cursor-pointer transition-colors ${tab === t.id ? 'font-semibold text-white border-b-2 border-white' : 'font-normal text-white/80 hover:text-white border-b-2 border-transparent'}`}
            onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 md:p-5 flex-1">

        {/* ══════════════════════════════ DASHBOARD ══════════════════════════════ */}
        {tab === "dashboard" && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-5">
              {[
                { label: "Total Pemasukan", val: fmtS(totalMasuk), color: "#6B705C", sub: `${pieMasuk.length} sumber`, subColor: "#6B705C" },
                { label: "Total Pengeluaran", val: fmtS(totalKeluar), color: "#6b705c", sub: `${pieKeluar.length} kategori`, subColor: "#B18B5E" },
                { label: "Laba Bersih", val: fmtS(laba), color: laba >= 0 ? "#6B705C" : "#B18B5E", sub: `Margin ${margin}%`, subColor: laba >= 0 ? "#6B705C" : "#B18B5E" },
                { label: "Total Transaksi", val: txns.length, color: "#4A4A40", sub: "Periode ini", subColor: "#A5A58D" },
              ].map((m, i) => (
                <div key={i} className="bg-[#dad2c6] text-[#6b705c] rounded-[16px] md:rounded-[24px] p-3.5 md:p-4 border border-[#DCD9CC]">
                  <div className="text-[10px] md:text-[11px] text-[#A5A58D] mb-1 tracking-[0.3px] uppercase">{m.label}</div>
                  <div className="text-lg md:text-[20px] font-semibold tracking-[-0.5px]" style={{ color: m.color }}>{m.val}</div>
                  <div className="text-[10px] md:text-[11px] mt-1.5 font-medium" style={{ color: m.subColor }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Line Chart — Arus Kas */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mb-4">
              <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]">Grafik Arus Kas Harian — {filterMonth ? new Date(filterMonth + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : "Semua Periode"}</div>
              <div className="flex flex-wrap gap-4 mb-3">
                {[["#6B705C","Pemasukan"],["#B18B5E","Pengeluaran"]].map(([col, lbl]) => (
                  <span key={lbl} className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-[#A5A58D]">
                    <span className="w-[18px] h-[3px] rounded-sm" style={{ background: col }}></span>{lbl}
                  </span>
                ))}
              </div>
              <div className="h-[180px] md:h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCD9CC" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A5A58D' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={v => `${(v/1000000).toFixed(1)}jt`} tick={{ fontSize: 11, fill: '#A5A58D' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTip />} />
                    <Line type="monotone" dataKey="masuk" name="Pemasukan" stroke="#6B705C" strokeWidth={2} dot={{ r: 3, fill:"#6B705C" }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="keluar" name="Pengeluaran" stroke="#B18B5E" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill:"#B18B5E" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie + Bar row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
              {/* Pie Pengeluaran */}
              <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm">
                <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]">Breakdown Pengeluaran</div>
                <div className="flex items-center flex-col sm:flex-row gap-4 sm:gap-0">
                  <div className="w-[140px] h-[140px] md:w-[160px] md:h-[160px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieKeluar} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" nameKey="name" paddingAngle={2}>
                          {pieKeluar.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmtS(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 sm:ml-4 w-full">
                    {pieKeluar.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                        <span className="text-[10px] md:text-[11px] text-[#A5A58D] flex-1 truncate">{d.name}</span>
                        <span className="text-[11px] font-medium text-[#4A4A40] whitespace-nowrap">{fmtS(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar Sumber Pendapatan */}
              <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm">
                <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]">Sumber Pemasukan</div>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieMasuk} layout="vertical" margin={{ left: -10, right: 16, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DCD9CC" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => `${(v/1000000).toFixed(1)}jt`} tick={{ fontSize: 10, fill: '#A5A58D' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#4A4A40' }} width={90} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTip />} cursor={{fill: '#DCD9CC'}} />
                      <Bar dataKey="value" name="Jumlah" fill="#6B705C" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick recent txns */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mt-3 md:mt-4">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm md:text-base font-semibold text-[#4A4A40]">5 Transaksi Terakhir</div>
              </div>
              <div className="flex flex-col gap-2">
                {[...globalFilteredTxns].reverse().slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center p-2.5 md:p-3 bg-[#FAF9F6] rounded-lg border border-[#DCD9CC] hover:bg-white transition-colors group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm shrink-0 ${t.type === "masuk" ? "bg-[#E8E6DB] text-[#6B705C]" : "bg-[#F0EEE4] text-[#B18B5E]"}`}>
                      {t.type === "masuk" ? "↑" : "↓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] md:text-[13px] font-medium truncate text-[#4A4A40]">{t.desc}</div>
                      <div className="text-[10px] md:text-[11px] text-[#A5A58D] mt-0.5">{t.date} • {t.cat}</div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className={`font-semibold text-[12px] md:text-[13px] ${t.type === "masuk" ? "text-[#6B705C]" : "text-[#B18B5E]"}`}>
                        {t.type === "masuk" ? "+" : "−"}{fmtS(t.amount)}
                      </div>
                      <div className="flex gap-1 pl-2 md:pl-3 border-l border-[#DCD9CC] opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(t)} className="bg-transparent border-none cursor-pointer text-[#6B705C] px-1 md:px-1.5 py-1 rounded hover:bg-black/5 text-[14px]">✏️</button>
                        <button onClick={() => setDeleteId(t.id)} className="bg-transparent border-none cursor-pointer text-[#B18B5E] px-1 md:px-1.5 py-1 rounded hover:bg-black/5 text-[14px]">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
                {globalFilteredTxns.length === 0 && (
                  <div className="text-center text-[12px] md:text-[13px] text-[#A5A58D] py-4">Belum ada transaksi di periode ini.</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════ TRANSAKSI ══════════════════════════════ */}
        {tab === "transaksi" && (
          <div className="flex flex-col lg:flex-row gap-4 md:gap-5">
            {/* Form Panel */}
            <div className="w-full lg:w-[320px] shrink-0 self-start bg-[#125927] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm border border-[#DCD9CC]">
              <div className="text-white text-base font-semibold mb-4 text-[#fff]">Tambah Transaksi Baru</div>

              {msg && (
                <div className={`px-3 py-2.5 rounded-lg text-xs mb-3 border ${msg.ok ? "bg-[#E8E6DB] text-[#6B705C] border-[#DCD9CC]" : "bg-[#F0EEE4] text-[#B18B5E] border-[#DCD9CC]"}`}>
                  {msg.ok ? "✓ " : "✕ "}{msg.text}
                </div>
              )}

              {/* Type Toggle */}
              <div className="mb-4">
                <div className="text-[11px] text-white mb-1.5 tracking-[0.3px] uppercase opacity-90">Jenis Transaksi</div>
                <div className="flex gap-2">
                  {[["masuk","Pemasukan","↑","#6B705C"],["keluar","Pengeluaran","↓","#B18B5E"]].map(([val, lbl, arrow, col]) => (
                    <button key={val} onClick={() => setForm(f => ({ ...f, type: val, cat: "" }))}
                      className={`flex-1 py-2 rounded-lg border-[1.5px] font-medium text-[13px] cursor-pointer transition-all ${
                        form.type === val 
                          ? (val === "masuk" ? "border-[#6B705C] bg-[#6B705C]/10 text-white font-semibold" : "border-[#B18B5E] bg-[#B18B5E]/10 text-[#B18B5E] font-semibold") 
                          : "border-[#DCD9CC] bg-white text-[#A5A58D]"
                      }`}>
                      {arrow} {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              {[
                { label: "Tanggal", el: <input type="date" className="w-full p-2.5 rounded-lg border-[0.5px] border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] box-border" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /> },
                { label: "Deskripsi", el: <input type="text" className="w-full p-2.5 rounded-lg border-[0.5px] border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] box-border" placeholder="Keterangan singkat..." value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /> },
                { label: "Kategori", el: (
                  <select className="w-full p-2.5 rounded-lg border-[0.5px] border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] box-border" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
                    <option value="">Pilih kategori...</option>
                    {cats.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                )},
                { label: "Nominal (Rp)", el: (
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[#A5A58D] text-[13px]">Rp</span>
                    <input type="text" className="w-full p-2.5 pl-9 rounded-lg border-[0.5px] border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] box-border" placeholder="0" value={form.amount} onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setForm(f => ({ ...f, amount: val ? parseInt(val, 10).toLocaleString('id-ID') : "" }));
                    }} />
                  </div>
                )},
              ].map(({ label, el }) => (
                <div key={label} className="mb-3">
                  <div className="text-[11px] text-white mb-1.5 tracking-[0.3px] uppercase opacity-90">{label}</div>
                  {el}
                </div>
              ))}

              <div className="flex gap-2 mt-1">
                <button onClick={addTxn} className={`flex-1 py-2.5 rounded-lg border-none text-white font-semibold text-[13px] cursor-pointer transition-colors ${editId ? "bg-[#B18B5E] hover:bg-[#a07c52]" : "bg-[#367609] hover:bg-[#2e6408]"}`}>
                  {editId ? "✓ Simpan Perubahan" : "+ Simpan Transaksi"}
                </button>
                {editId && (
                  <button onClick={cancelEdit} className="py-2.5 px-4 rounded-lg border border-[#DCD9CC] bg-[#FAF9F6] text-[#4A4A40] font-semibold text-[13px] cursor-pointer hover:bg-white transition-colors">
                    Batal
                  </button>
                )}
              </div>

              {/* Mini summary */}
              <div className="mt-5 pt-4 border-t border-dashed border-white/30">
                <div className="text-[11px] text-white mb-1 tracking-[0.3px] uppercase opacity-90">Saldo Saat Ini</div>
                <div className={`text-xl md:text-2xl font-bold tracking-[-0.5px] ${saldoAkhir >= 0 ? "text-white" : "text-[#ffb0b0]"}`}>{fmtS(saldoAkhir)}</div>
                <div className="flex justify-between mt-3 bg-white/10 p-3 rounded-lg">
                  <div>
                    <div className="text-[10px] text-white/70 uppercase mb-0.5">Total Masuk</div>
                    <div className="text-[13px] font-semibold text-white">{fmtS(totalMasuk)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-white/70 uppercase mb-0.5">Total Keluar</div>
                    <div className="text-[13px] font-semibold text-[#ffb0b0]">{fmtS(totalKeluar)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 min-w-0 relative bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm overflow-hidden flex flex-col">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 pb-4 border-b border-[#DCD9CC] gap-3 md:gap-0">
                <div className="text-base font-semibold text-[#4A4A40]">Riwayat Transaksi ({filteredTxns.length})</div>
                <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                  <button onClick={exportCSV} className="py-2 px-3 md:px-4 rounded-lg border border-[#A5A58D] bg-[#007a07] text-white text-[12px] md:text-[13px] font-semibold cursor-pointer transition-colors flex items-center gap-1.5 hover:bg-[#006606]">
                    📥 Ekspor CSV
                  </button>
                  <div className="flex gap-1.5 bg-[#DCD9CC] p-1 rounded-lg">
                    {[["semua","Semua"],["masuk","Masuk"],["keluar","Keluar"]].map(([val, lbl]) => (
                      <button key={val} onClick={() => setFilterType(val)} 
                        className={`py-1.5 px-3 md:px-3.5 rounded-md border-none text-[11px] md:text-[12px] cursor-pointer transition-all ${filterType === val ? "bg-white text-[#4A4A40] font-semibold shadow-sm" : "bg-transparent text-[#A5A58D] font-medium hover:text-[#4A4A40]"}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-auto min-h-[300px] pr-1 md:pr-2">
                <table className="w-full border-collapse text-[12px] md:text-[13px] text-left whitespace-nowrap md:whitespace-normal">
                  <thead className="sticky top-0 bg-[#FAF9F6] z-10 shadow-[0_1px_0_#DCD9CC]">
                    <tr>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold md:w-[15%]">Tanggal</th>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold md:w-[35%] whitespace-normal">Keterangan</th>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold text-right">Debet (Masuk)</th>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold text-right">Kredit (Keluar)</th>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold text-center w-[60px]">Aksi</th>
                      {filterType === 'semua' && <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold text-right">Saldo</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxns.length === 0 ? (
                      <tr>
                        <td colSpan={filterType === 'semua' ? 6 : 5} className="py-8 text-center text-[#A5A58D]">Tidak ada transaksi.</td>
                      </tr>
                    ) : (
                      filteredTxns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((t, index) => (
                        <tr key={t.id} className={`border-b border-[#E8E6DB] ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F6]'} hover:bg-gray-50`}>
                          <td className="py-3 px-3 md:px-4 text-[#4A4A40]">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="py-3 px-3 md:px-4">
                            <div className="font-medium text-[#4A4A40] w-32 sm:w-auto truncate md:whitespace-normal xl:line-clamp-2">{t.desc}</div>
                            <div className="text-[11px] text-[#A5A58D] mt-1">{t.cat}</div>
                          </td>
                          <td className="py-3 px-3 md:px-4 text-right font-medium text-[#6B705C]">
                            {t.type === 'masuk' ? fmt(t.amount) : '-'}
                          </td>
                          <td className="py-3 px-3 md:px-4 text-right font-medium text-[#B18B5E]">
                           {t.type === 'keluar' ? fmt(t.amount) : '-'}
                          </td>
                          <td className="py-3 px-3 md:px-4 text-center whitespace-nowrap">
                            <button onClick={() => startEdit(t)} className="bg-transparent border-none cursor-pointer text-[#6B705C] px-1 md:px-2 py-1 rounded hover:bg-black/5 text-[14px] md:text-[16px]">
                              ✏️
                            </button>
                            <button onClick={() => setDeleteId(t.id as number)} className="bg-transparent border-none cursor-pointer text-[#B18B5E] px-1 md:px-2 py-1 rounded hover:bg-black/5 text-[14px] md:text-[16px]">
                              🗑️
                            </button>
                          </td>
                          {filterType === 'semua' && (
                            <td className={`py-3 px-3 md:px-4 text-right font-semibold ${t.saldo !== undefined && t.saldo >= 0 ? 'text-[#6B705C]' : 'text-[#B18B5E]'}`}>
                              {fmt(t.saldo || 0)}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {Math.ceil(filteredTxns.length / itemsPerPage) > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#DCD9CC]">
                  <div className="text-[12px] md:text-[13px] text-[#A5A58D]">
                    Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredTxns.length)} dari {filteredTxns.length}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-[#DCD9CC] bg-white rounded-lg text-[12px] font-medium text-[#4A4A40] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Sebelumnya
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTxns.length / itemsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(filteredTxns.length / itemsPerPage)}
                      className="px-3 py-1.5 border border-[#DCD9CC] bg-white rounded-lg text-[12px] font-medium text-[#4A4A40] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════ LAPORAN ══════════════════════════════ */}
        {tab === "laporan" && (
          <>
            {/* P&L Summary */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mb-4">
              <div className="text-sm md:text-base font-semibold mb-4 text-[#4A4A40]">Laporan Laba Rugi — {filterMonth ? filterMonth : "Semua Periode"}</div>
              <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1fr_260px] gap-6">

                {/* Pendapatan */}
                <div>
                  <div className="text-[11px] text-[#6B705C] font-bold mb-3 tracking-[0.5px]">PENDAPATAN</div>
                  <div className="bg-[#FAF9F6] rounded-lg p-2.5 px-3 border border-[#DCD9CC]">
                  {pieMasuk.map((d, i) => (
                    <div key={i} className={`flex justify-between text-[13px] py-2 ${i < pieMasuk.length-1 ? "border-b border-dashed border-[#DCD9CC]" : ""}`}>
                      <span className="text-[#A5A58D]">{d.name}</span>
                      <span className="font-medium text-[#6B705C]">{fmt(d.value)}</span>
                    </div>
                  ))}
                  {pieMasuk.length === 0 && <div className="text-[12px] text-[#A5A58D] py-1">Belum ada data</div>}
                  </div>
                  <div className="flex justify-between text-[13px] md:text-[14px] font-bold mt-3 text-[#6B705C] px-1">
                    <span>Total Pendapatan</span><span>{fmt(totalMasuk)}</span>
                  </div>
                </div>

                {/* Pengeluaran */}
                <div>
                  <div className="text-[11px] text-[#B18B5E] font-bold mb-3 tracking-[0.5px]">PENGELUARAN</div>
                  <div className="bg-[#FAF9F6] rounded-lg p-2.5 px-3 border border-[#DCD9CC]">
                  {pieKeluar.map((d, i) => (
                    <div key={i} className={`flex justify-between text-[13px] py-2 ${i < pieKeluar.length-1 ? "border-b border-dashed border-[#DCD9CC]" : ""}`}>
                      <span className="text-[#A5A58D]">{d.name}</span>
                      <span className="font-medium text-[#B18B5E]">{fmt(d.value)}</span>
                    </div>
                  ))}
                  {pieKeluar.length === 0 && <div className="text-[12px] text-[#A5A58D] py-1">Belum ada data</div>}
                  </div>
                  <div className="flex justify-between text-[13px] md:text-[14px] font-bold mt-3 text-[#B18B5E] px-1">
                    <span>Total Pengeluaran</span><span>{fmt(totalKeluar)}</span>
                  </div>
                </div>

                {/* Ringkasan Box */}
                <div className={`rounded-xl p-5 ${laba >= 0 ? "bg-[#E8E6DB]" : "bg-[#F0EEE4]"}`}>
                  <div className={`text-[11px] font-bold mb-4 tracking-[0.5px] ${laba >= 0 ? "text-[#6B705C]" : "text-[#B18B5E]"}`}>RINGKASAN L/R</div>
                  {[
                    { lbl: "Pendapatan", val: fmt(totalMasuk), col: "text-[#6B705C]" },
                    { lbl: "Pengeluaran", val: fmt(totalKeluar), col: "text-[#B18B5E]" },
                  ].map(m => (
                    <div key={m.lbl} className="flex justify-between mb-2 items-center">
                      <div className="text-[12px] text-[#A5A58D]">{m.lbl}</div>
                      <div className={`text-[13px] font-semibold ${m.col}`}>{m.val}</div>
                    </div>
                  ))}
                  <div className={`pt-4 mt-3 border-t ${laba >= 0 ? "border-[#A5A58D]" : "border-[#DCD9CC]"}`}>
                    <div className="text-[12px] text-[#A5A58D] mb-1">Laba Bersih</div>
                    <div className={`text-[20px] md:text-[24px] font-bold tracking-[-0.5px] ${laba >= 0 ? "text-[#6B705C]" : "text-[#B18B5E]"}`}>{fmt(laba)}</div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <div className={`rounded-md px-2 py-1 text-[11px] font-semibold border ${laba >= 0 ? "bg-[#DCD9CC] text-[#6B705C] border-[#DCD9CC]" : "bg-[#F0EEE4] text-[#B18B5E] border-[#DCD9CC]"}`}>
                        Margin {margin}%
                      </div>
                      <div className={`rounded-md px-2 py-1 text-[11px] font-semibold border ${laba >= 0 ? "bg-[#DCD9CC] text-[#6B705C] border-[#DCD9CC]" : "bg-[#F0EEE4] text-[#B18B5E] border-[#DCD9CC]"}`}>
                        {laba >= 0 ? "✓ Surplus" : "✕ Defisit"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Laporan Arus Kas */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mb-4">
              <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]">Laporan Arus Kas — {filterMonth ? filterMonth : "Semua Periode"}</div>
              <div className="bg-[#FAF9F6] rounded-xl p-4 md:p-5 border border-[#DCD9CC] overflow-x-auto">
                <table className="w-full border-collapse text-[13px] md:text-[14px]">
                  <tbody>
                    <tr className="border-b border-transparent">
                      <td className="py-2.5 md:py-3 text-[#6B705C] font-semibold whitespace-nowrap min-w-[200px]">Arus Kas Masuk (Penerimaan)</td>
                      <td className="py-2.5 md:py-3 text-right font-semibold text-[#6B705C]">{fmt(totalMasuk)}</td>
                    </tr>
                    <tr>
                      <td className="pb-3 pl-4 text-[#A5A58D] text-[12px] md:text-[13px] whitespace-normal">Dari Pendapatan Operasional & Lainnya</td>
                      <td className="pb-3 text-right text-[#A5A58D] text-[12px] md:text-[13px]">{fmt(totalMasuk)}</td>
                    </tr>
                    <tr className="border-t border-dashed border-[#DCD9CC]">
                      <td className="py-2.5 md:py-3 text-[#B18B5E] font-semibold whitespace-nowrap min-w-[200px]">Arus Kas Keluar (Pengeluaran)</td>
                      <td className="py-2.5 md:py-3 text-right font-semibold text-[#B18B5E]">{fmt(totalKeluar)}</td>
                    </tr>
                    <tr>
                      <td className="pb-3 pl-4 text-[#A5A58D] text-[12px] md:text-[13px] whitespace-normal">Untuk Pembayaran Operasional & Kas</td>
                      <td className="pb-3 text-right text-[#A5A58D] text-[12px] md:text-[13px]">{fmt(totalKeluar)}</td>
                    </tr>
                    <tr className="border-t-2 border-[#DCD9CC]">
                      <td className="py-3.5 md:py-4 text-[#4A4A40] font-bold text-[14px] md:text-[16px]">Kenaikan/Penurunan Kas Bersih</td>
                      <td className={`py-3.5 md:py-4 text-right font-bold text-[14px] md:text-[16px] ${laba >= 0 ? "text-[#6B705C]" : "text-[#B18B5E]"}`}>{fmt(laba)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bar Chart Comparison */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm">
              <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]">Pemasukan vs Pengeluaran per Hari</div>
              <div className="flex gap-4 mb-3">
                {[["#6B705C","Pemasukan"],["#B18B5E","Pengeluaran"]].map(([col, lbl]) => (
                  <span key={lbl} className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-[#A5A58D]">
                    <span className="w-3 h-3 rounded-[3px]" style={{ background: col }}></span>{lbl}
                  </span>
                ))}
              </div>
              <div className="w-full h-[200px] md:h-[230px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCD9CC" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A5A58D' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}jt`} tick={{ fontSize: 11, fill: '#A5A58D' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTip />} cursor={{fill: '#DCD9CC'}} />
                    <Bar dataKey="masuk" name="Pemasukan" fill="#6B705C" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="keluar" name="Pengeluaran" fill="#B18B5E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rasio Keuangan */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mt-4">
              <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]">Metrik Usaha</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { lbl: "Gross Profit Margin", val: `${margin}%`, desc: "Laba / Pendapatan", good: parseFloat(margin.toString()) >= 20 },
                  { lbl: "Biaya vs Pendapatan", val: totalMasuk > 0 ? `${((totalKeluar / totalMasuk) * 100).toFixed(1)}%` : "—", desc: "Pengeluaran / Pendapatan", good: (totalKeluar / totalMasuk) < 0.8 },
                  { lbl: "Jumlah Transaksi Masuk", val: txns.filter(t => t.type === "masuk").length, desc: "Entri pendapatan", good: true },
                  { lbl: "Rata-rata per Transaksi", val: txns.length > 0 ? fmtS(Math.round((totalMasuk + totalKeluar) / txns.length)) : "—", desc: "Nilai rata-rata dari total", good: true },
                ].map((r, i) => (
                  <div key={i} className={`rounded-[24px] p-3.5 md:p-4 border ${r.good ? "bg-[#FAF9F6] border-[#E8E6DB]" : "bg-[#F0EEE4] border-[#F0EEE4]"}`}>
                    <div className="text-[11px] md:text-[12px] text-[#A5A58D] mb-1.5">{r.lbl}</div>
                    <div className={`text-[18px] md:text-[20px] font-bold tracking-[-0.5px] ${r.good ? "text-[#6B705C]" : "text-[#B18B5E]"}`}>{r.val}</div>
                    <div className={`text-[10px] md:text-[11px] mt-1.5 font-medium ${r.good ? "text-[#6B705C]" : "text-[#B18B5E]"}`}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════ AI ASISTEN ══════════════════════════════ */}
        {tab === "asisten" && (
          <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mx-auto w-full md:max-w-[700px] flex flex-col h-[75vh] md:h-[calc(100vh-180px)] mt-4">
            <div className="mb-4">
              <div className="text-sm md:text-base font-semibold mb-1 text-[#4A4A40]">💬 AI Asisten: My Akuntansi</div>
              <div className="text-[12px] md:text-[13px] text-[#A5A58D]">Tanyakan informasi seputar kas, laba, pemasukan, atau pengeluaran Anda. Historis percakapan disimpan untuk referensi Anda.</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 md:p-4 border border-[#DCD9CC] bg-[#efeae2] rounded-xl mb-4 flex flex-col gap-2 relative">
              {aiChatHistory.length === 0 ? (
                <div className="mx-auto mt-4 bg-white/70 px-3 py-1.5 rounded-xl text-[#554] text-[12px] md:text-[13px] text-center">
                  Belum ada percakapan. Silakan mulai bertanya...
                </div>
              ) : (
                aiChatHistory.map(msg => (
                  <div key={msg.id} className={`flex flex-col mb-1 ${msg.role === 'user' ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[90%] md:max-w-[85%] px-3 py-2 pb-6 relative rounded-lg text-[13px] md:text-[14px] leading-relaxed shadow-[0_1px_0.5px_rgba(11,20,26,.13)] whitespace-pre-wrap ${msg.role === 'user' ? "rounded-tr-none bg-[#d9fdd3] text-[#111b21]" : "rounded-tl-none bg-white text-[#111b21]"}`}>
                      <div className="mb-0">{msg.content}</div>
                      <div className="absolute bottom-1 right-2 text-[10px] md:text-[11px] text-[#667781] flex items-center gap-1">
                        {msg.timestamp.split(' · ')[1] || msg.timestamp}
                        {msg.role === 'user' && <span className="text-[#53bdeb] font-semibold leading-none">✓✓</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isAiLoading && (
                <div className="flex flex-col items-start mb-1">
                  <div className="px-4 py-2 rounded-lg rounded-tl-none bg-white text-[13px] shadow-[0_1px_0.5px_rgba(11,20,26,.13)]">
                    <em className="text-[#8696a0]">Mengetik...</em>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2.5">
              <input 
                type="text" 
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskAI()}
                placeholder="Ketik pertanyaan di sini (cth: Berapa laba bulan ini?)" 
                className="flex-1 p-2.5 px-3.5 rounded-lg border border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] box-border outline-none focus:border-[#6B705C]"
              />
              <button 
                onClick={handleAskAI}
                disabled={isAiLoading || aiPrompt.trim() === ""}
                className="px-4 md:px-5 py-2.5 rounded-lg border-none text-white font-semibold text-[13px] md:text-[14px] cursor-pointer shadow-sm transition-colors disabled:bg-[#C8C4B7] disabled:cursor-not-allowed bg-[#367609] hover:bg-[#2e6408]"
              >
                Tanya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Hapus */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-5 md:p-6 rounded-xl w-full max-w-[320px] shadow-xl">
            <h3 className="mt-0 mb-2 text-[#4A4A40] text-base md:text-lg font-semibold">Hapus Transaksi</h3>
            <p className="text-[#A5A58D] text-[12px] md:text-[13px] leading-relaxed m-0">Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-2 mt-5 md:mt-6">
              <button 
                onClick={() => setDeleteId(null)} 
                className="py-2 px-4 border border-[#DCD9CC] bg-white rounded-lg cursor-pointer text-[12px] md:text-[13px] font-medium text-[#4A4A40] hover:bg-gray-50">
                Batal
              </button>
              <button 
                onClick={() => {
                  setTxns(prev => prev.filter(tx => tx.id !== deleteId));
                  setDeleteId(null);
                  setMsg({ ok: true, text: "Transaksi berhasil dihapus." });
                  setTimeout(() => setMsg(null), 3000);
                }} 
                className="py-2 px-4 border-none bg-[#B18B5E] text-white rounded-lg cursor-pointer text-[12px] md:text-[13px] font-medium hover:bg-[#a07c52]">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
