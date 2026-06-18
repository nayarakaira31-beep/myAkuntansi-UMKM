import { useState, useMemo, useEffect } from "react";
import { AiAssistant } from "./AiAssistant";
import { Kalkulator } from "./Kalkulator";
import { Pengaturan } from "./Pengaturan";
import { motion, AnimatePresence } from "motion/react";
import { SecureStorage, hashPassword } from "./lib/storage";
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

export interface Debt {
  id: number;
  type: "hutang" | "piutang";
  name: string;
  amount: number;
  dueDate: string;
  status: "lunas" | "belum";
}

export interface Inventory {
  id: number;
  name: string;
  qty: number;
  price: number;
  cogs: number;
}

const CAT_MASUK = ["Penjualan Produk", "Jasa / Layanan", "Investasi Masuk", "Pinjaman", "Pendapatan Lain"];
const CAT_KELUAR = ["Bahan Baku", "Gaji Karyawan", "Operasional", "Marketing & Iklan", "Utilitas", "Pajak & Admin", "Pengeluaran Lain"];

const PIE_COLORS = ["#6B705C", "#8A8F78", "#A5A58D", "#B18B5E", "#C5A582", "#A08C75", "#7A6A55", "#4A4A40"];

const INIT_TXNS: Transaction[] = [];

const TABS = [
  { id:"dashboard", label:"Dashboard", icon:"📊" },
  { id:"transaksi", label:"Kas", icon:"💳" },
  { id:"hutang_piutang", label:"Hutang Piutang", icon:"🤝" },
  { id:"inventori", label:"Stok", icon:"📦" },
  { id:"laporan", label:"Laporan", icon:"📋" },
  { id:"asisten", label:"AI Asisten", icon:"🤖" },
  { id:"kalkulator", label:"Kalkulator", icon:"🧮" },
  { id:"pengaturan", label:"Pengaturan", icon:"⚙️" },
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return SecureStorage.getItem<string>("myAkuntansi_isLoggedIn") === "true";
    } catch {
      return false;
    }
  });

  const [showLoginConfirm, setShowLoginConfirm] = useState(false);
  const [loginType, setLoginType] = useState<"individu" | "workspace" | null>(null);
  
  const [authMode, setAuthMode] = useState<"options" | "login" | "register">("options");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  
  const [registeredUsers, setRegisteredUsers] = useState<any[]>(() => {
    try {
      const saved = SecureStorage.getItem<any[]>("myAkuntansi_users");
      if (saved) return saved;
    } catch {}
    return [{ email: "nayarakaira31@gmail.com", name: "Nayara Kaira", username: "Nayara31", businessName: "Usaha Nayara" }];
  });

  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = SecureStorage.getItem<any>("myAkuntansi_currentUser");
      if (saved) {
        const pwdToUse = saved.password ? hashPassword(saved.password) : "empty-google-oauth-session-key-part";
        SecureStorage.setUserSession(saved.email, pwdToUse);
        return saved;
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    try {
      SecureStorage.setItem("myAkuntansi_users", registeredUsers);
    } catch {}
  }, [registeredUsers]);

  useEffect(() => {
    try {
      if (currentUser) {
        SecureStorage.setItem("myAkuntansi_currentUser", currentUser);
      } else {
        SecureStorage.removeItem("myAkuntansi_currentUser");
      }
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      SecureStorage.setItem("myAkuntansi_isLoggedIn", String(isLoggedIn));
      if (!isLoggedIn) {
        SecureStorage.setUserSession("", "");
      }
    } catch {}
  }, [isLoggedIn]);

  // Auto-Lock feature: log out user after 15 minutes of inactivity
  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: number;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Auto lock after 15 minutes of inactivity
      timeoutId = window.setTimeout(() => {
        setIsLoggedIn(false);
      }, 15 * 60 * 1000);
    };

    resetTimer();

    const events = ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isLoggedIn]);

  const [txns, setTxns] = useState<Transaction[]>(() => {
    try {
      const saved = SecureStorage.getItem<Transaction[]>("myAkuntansi_txns");
      if (saved) {
        return saved.filter(t => !t.date.startsWith("2026-05"));
      }
    } catch {
      // clean catch block without console logs
    }
    return INIT_TXNS;
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    try {
      const saved = SecureStorage.getItem<Debt[]>("myAkuntansi_debts");
      if (saved) {
        return saved.filter(d => !d.dueDate.startsWith("2026-05"));
      }
    } catch {}
    return [];
  });

  const [inventory, setInventory] = useState<Inventory[]>(() => {
    try {
      const saved = SecureStorage.getItem<Inventory[]>("myAkuntansi_inventory");
      if (saved) return saved;
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      SecureStorage.setItem("myAkuntansi_txns", txns);
    } catch {}
  }, [txns]);

  useEffect(() => {
    try {
      SecureStorage.setItem("myAkuntansi_debts", debts);
    } catch {}
  }, [debts]);

  useEffect(() => {
    try {
      SecureStorage.setItem("myAkuntansi_inventory", inventory);
    } catch {}
  }, [inventory]);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), desc: "", cat: "", type: "masuk", amount: ""
  });
  const [filterType, setFilterType] = useState("semua");
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [msg, setMsg] = useState<{ ok: boolean, text: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);
  const [editId, setEditId] = useState<number | string | null>(null);

  const [editDebtId, setEditDebtId] = useState<number | null>(null);
  const [editDebtForm, setEditDebtForm] = useState<Partial<Debt>>({});

  const [editInvId, setEditInvId] = useState<number | null>(null);
  const [editInvForm, setEditInvForm] = useState<Partial<Inventory>>({});

  const [laporanTab, setLaporanTab] = useState<"lr" | "neraca" | "gl" | "pajak">("lr");

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
    
    if (filterMonth) {
      const [yearStr, monthStr] = filterMonth.split('-');
      if (yearStr && monthStr) {
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        // Tanggal 0 mendapatkan hari terakhir bulan sebelumnya (= hari terakhir di bulan ini)
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${filterMonth}-${i.toString().padStart(2, '0')}`;
          map[dateStr] = { date: i.toString().padStart(2, '0'), dateFull: dateStr, masuk: 0, keluar: 0 };
        }
      }
    } else {
      if (globalFilteredTxns.length > 0) {
        const sorted = [...globalFilteredTxns].sort((a,b) => a.date.localeCompare(b.date));
        const minDate = new Date(sorted[0].date);
        const maxDate = new Date(sorted[sorted.length-1].date);
        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().slice(0, 10);
          map[dateStr] = { date: dateStr.slice(8), dateFull: dateStr, masuk: 0, keluar: 0 };
        }
      }
    }

    globalFilteredTxns.forEach(t => {
      if (!map[t.date]) map[t.date] = { date: t.date.slice(8), dateFull: t.date, masuk: 0, keluar: 0 };
      if (t.type === "masuk") map[t.date].masuk += t.amount;
      else map[t.date].keluar += t.amount;
    });
    return Object.values(map).sort((a, b) => a.dateFull.localeCompare(b.dateFull));
  }, [globalFilteredTxns, filterMonth]);

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

  const exportFullReport = () => {
    const periodRaw = filterMonth || "Semua Periode";
    const reportYear = filterMonth ? filterMonth.split('-')[0] : new Date().getFullYear().toString();
    const periodText = filterMonth ? new Date(filterMonth + "-01").toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : "Semua Periode";
    const reportDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    
    // Calculate values
    const totalInvValue = inventory.reduce((a,b) => a + (b.cogs * b.qty), 0);
    const totalPiutangBelum = debts.filter(d => d.type === 'piutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0);
    const totalHutangBelum = debts.filter(d => d.type === 'hutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0);
    const totalAset = (totalMasuk - totalKeluar) + totalPiutangBelum + totalInvValue;
    const estimasiPajak = totalMasuk * 0.005;

    let content = `====================================================\n`;
    content += `     CATATAN LENGKAP - TAHUN PENYIMPANAN ${reportYear}\n`;
    content += `====================================================\n`;
    content += `Periode Data   : ${periodText}\n`;
    content += `Tanggal Ekspor : ${reportDate}\n\n`;

    content += `[1] KAS (Pemasukan & Pengeluaran)\n`;
    content += `----------------------------------------------------\n`;
    content += `Total Pemasukan  : ${fmt(totalMasuk)}\n`;
    content += `Total Pengeluaran: ${fmt(totalKeluar)}\n`;
    content += `Laba Bersih      : ${fmt(laba)}\n\n`;

    content += `[2] HUTANG & PIUTANG\n`;
    content += `----------------------------------------------------\n`;
    if (debts.length > 0) {
      debts.forEach(d => {
          content += `- [${d.type.toUpperCase()}] ${d.name} (${d.dueDate}): ${fmt(d.amount)} - ${d.status.toUpperCase()}\n`;
      });
    } else {
      content += `Tidak ada catatan hutang/piutang.\n`;
    }
    content += `\n`;

    content += `[3] STOK BARANG\n`;
    content += `----------------------------------------------------\n`;
    if (inventory.length > 0) {
      inventory.forEach(i => {
          content += `- ${i.name} | Stok: ${i.qty} | Harga Pokok: ${fmt(i.cogs)}\n`;
      });
    } else {
      content += `Tidak ada stok barang.\n`;
    }
    content += `\n`;

    content += `[4] LAPORAN LABA RUGI\n`;
    content += `----------------------------------------------------\n`;
    content += `Pendapatan        : ${fmt(totalMasuk)}\n`;
    content += `Pengeluaran       : ${fmt(totalKeluar)}\n`;
    content += `Total Laba/Rugi   : ${fmt(laba)}\n\n`;

    content += `[5] NERACA\n`;
    content += `----------------------------------------------------\n`;
    content += `Kas               : ${fmt(totalMasuk - totalKeluar)}\n`;
    content += `Piutang (Belum)   : ${fmt(totalPiutangBelum)}\n`;
    content += `Stok Persediaan   : ${fmt(totalInvValue)}\n`;
    content += `Total Aset        : ${fmt(totalAset)}\n\n`;
    content += `Hutang (Belum)    : ${fmt(totalHutangBelum)}\n`;
    content += `Modal & Laba      : ${fmt(laba)}\n\n`;

    content += `[6] BUKU BESAR (Saldo Berdasarkan Akun)\n`;
    content += `----------------------------------------------------\n`;
    const accounts = [...new Set(filteredTxns.map(t => t.cat))];
    if (accounts.length > 0) {
      accounts.forEach(c => {
           const txnsCat = filteredTxns.filter(t => t.cat === c);
           const total = txnsCat.reduce((acc, curr) => curr.type === 'masuk' ? acc + curr.amount : acc - curr.amount, 0);
           content += `- ${c}: ${fmt(Math.abs(total))} (${total >= 0 ? 'Surplus' : 'Defisit'})\n`;
      });
    } else {
      content += `Tidak ada data buku besar.\n`;
    }
    content += `\n`;
    
    content += `[7] PAJAK UMKM (0.5%)\n`;
    content += `----------------------------------------------------\n`;
    content += `Peredaran Bruto    : ${fmt(totalMasuk)}\n`;
    content += `Tarif PPh Final    : 0.5%\n`;
    content += `Estimasi Pajak     : ${fmt(estimasiPajak)}\n\n`;

    content += `====================================================\n`;
    content += `Detail Transaksi Harian:\n`;
    if (filteredTxns.length > 0) {
      filteredTxns.forEach(t => {
           content += `${t.date} | [${t.type.toUpperCase()}] ${t.cat} - ${t.desc} | ${fmt(t.amount)}\n`;
      });
    } else {
      content += `Tidak ada transaksi.\n`;
    }
    content += `====================================================\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Catatan_App_${periodRaw.replace('-', '_')}_Tahun_${reportYear}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setMsg({ ok: true, text: "Catatan berhasil disimpan." });
    setTimeout(() => setMsg(null), 3000);
  };

  const exportCSV = () => {
    if (filteredTxns.length === 0) {
      setMsg({ ok: false, text: "Tidak ada data untuk diekspor." });
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    const headers = ["ID", "Tanggal", "Kategori", "Deskripsi", "Jenis", "Nominal", "Saldo"];
    const rows = filteredTxns.map(t => [
      t.id, t.date, `"${t.cat}"`, `"${t.desc.replace(/"/g, '""')}"`, t.type, t.amount, t.saldo ?? ""
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          txns: summaryTxns,
          mode: 'asisten_tab'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
            MENGANALISIS KEUANGAN...
          </motion.p>
        </motion.div>
      </AnimatePresence>
    );
  }

  const cats = form.type === "masuk" ? CAT_MASUK : CAT_KELUAR;

  const CustomTip = ({ active, payload, label }: { active?: boolean, payload?: any[], label?: string }) => {
    if (!active || !payload?.length || !label) return null;
    const tLabel = label || "";
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(tLabel);
    const formattedLabel = isDate ? new Date(tLabel).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) : tLabel;
    return (
      <div className="bg-white border border-[#DCD9CC] rounded-[8px] px-3.5 py-2.5 text-xs shadow-sm">
        <p className="m-0 mb-1.5 font-medium text-[#4A4A40]">{formattedLabel}</p>
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
          <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: "#5194ff" }}></div>

          {authMode === "options" && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 bg-[#FAF9F6] border border-[#DCD9CC] rounded-full flex items-center justify-center shadow-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-7 h-7" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-[#4A4A40] mb-6">Masuk ke Akun Anda</h2>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { setLoginType("individu"); setShowLoginConfirm(true); }}
                  className="w-full bg-white border border-[#DCD9CC] text-[#4A4A40] font-medium py-3 md:py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" referrerPolicy="no-referrer" className="w-[18px] h-[18px] group-hover:scale-110 transition-transform"/>
                  <span className="text-[13px] md:text-sm">Lanjutkan dengan Google (Individu)</span>
                </button>

                <button 
                  onClick={() => { setLoginType("workspace"); setShowLoginConfirm(true); }}
                  className="w-full bg-white border border-[#DCD9CC] text-[#4A4A40] font-medium py-3 md:py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" referrerPolicy="no-referrer" className="w-[18px] h-[18px] group-hover:scale-110 transition-transform grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"/>
                  <span className="text-[13px] md:text-sm">Lanjutkan dengan Google Workspace</span>
                </button>
                
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-[#DCD9CC]"></div>
                  <div className="text-[11px] text-[#A5A58D] font-medium uppercase">Atau</div>
                  <div className="flex-1 h-px bg-[#DCD9CC]"></div>
                </div>

                <button 
                  onClick={() => setAuthMode("login")}
                  className="w-full text-white font-medium py-3 md:py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm group"
                  style={{ backgroundColor: "#5194ff" }}
                >
                  <span className="text-[13px] md:text-sm">Masuk dengan Email</span>
                </button>
                
                <div className="mt-2 text-[13px] text-[#4A4A40]">
                  Belum punya akun? <button onClick={() => setAuthMode("register")} className="text-[#007a07] font-semibold hover:underline" style={{ color: "#000000" }}>Daftar sekarang</button>
                </div>
              </div>

              <div className="mt-8 text-[11px] md:text-[12px] text-[#A5A58D]">
                Dengan melanjutkan, Anda menyetujui <br/>
                <span className="text-[#6B705C] hover:underline cursor-pointer">Syarat Ketentuan</span> dan <span className="text-[#6B705C] hover:underline cursor-pointer">Kebijakan Privasi</span> kami.
              </div>
            </>
          )}

          {authMode === "login" && (
            <div className="text-left">
              <button 
                onClick={() => setAuthMode("options")}
                className="text-[#6B705C] hover:text-[#4A4A40] flex items-center gap-1 text-[13px] font-medium mb-4"
              >
                ← Kembali
              </button>
              <h2 className="text-lg font-semibold text-[#4A4A40] mb-6">Masuk ke Akun</h2>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => { setLoginType("individu"); setShowLoginConfirm(true); }}
                  className="w-full bg-white border border-[#DCD9CC] text-[#4A4A40] font-medium py-3 md:py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group mb-1 text-center"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" referrerPolicy="no-referrer" className="w-[18px] h-[18px] group-hover:scale-110 transition-transform"/>
                  <span className="text-[13px] md:text-sm font-semibold">Masuk dengan Google</span>
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="h-px bg-[#DCD9CC] flex-1"></div>
                  <span className="text-[11px] text-[#A5A58D] font-medium uppercase tracking-wider">atau gunakan email</span>
                  <div className="h-px bg-[#DCD9CC] flex-1"></div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Email</label>
                  <input 
                    type="email" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
                    placeholder="nama@email.com"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Kata Sandi</label>
                  <input 
                    type="password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
                    placeholder="••••••••"
                  />
                </div>
                <button 
                  onClick={() => {
                    const hashedIn = hashPassword(authPassword);
                    const user = registeredUsers.find(u => {
                      return u.email === authEmail && (
                        u.password === authPassword || 
                        u.password === hashedIn
                      );
                    });
                    if (user) {
                      const pwdToUse = user.password ? hashPassword(user.password) : "empty-google-oauth-session-key-part";
                      SecureStorage.setUserSession(user.email, pwdToUse);
                      setCurrentUser(user);
                      setIsLoggedIn(true);
                    } else {
                      alert('Akun tidak ditemukan atau kata sandi salah. Silakan daftar terlebih dahulu.');
                      setAuthMode('register');
                    }
                  }}
                  className="w-full bg-[#007a07] text-white font-semibold py-3 px-4 rounded-xl mt-2 hover:bg-[#006606] transition-colors"
                >
                  Masuk Ke Akun
                </button>
                <div className="text-center mt-4 text-[13px] text-[#4A4A40]">
                  Belum punya akun? <button onClick={() => setAuthMode("register")} className="text-[#007a07] font-semibold hover:underline">Daftar sekarang</button>
                </div>
              </div>
            </div>
          )}

          {authMode === "register" && (
            <div className="text-left">
              <button 
                onClick={() => setAuthMode("options")}
                className="text-[#6B705C] hover:text-[#4A4A40] flex items-center gap-1 text-[13px] font-medium mb-4"
              >
                ← Kembali
              </button>
              <h2 className="text-lg font-semibold text-[#4A4A40] mb-6">Daftar Akun Baru</h2>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => { setLoginType("individu"); setShowLoginConfirm(true); }}
                  className="w-full bg-white border border-[#DCD9CC] text-[#4A4A40] font-medium py-3 md:py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group mb-2"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" referrerPolicy="no-referrer" className="w-[18px] h-[18px] group-hover:scale-110 transition-transform"/>
                  <span className="text-[13px] md:text-sm">Daftar dengan Google (Individu)</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-[#DCD9CC] flex-1"></div>
                  <span className="text-[12px] text-[#A5A58D] font-medium">atau daftar email</span>
                  <div className="h-px bg-[#DCD9CC] flex-1"></div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Nama Lengkap / Usaha</label>
                  <input 
                    type="text" 
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
                    placeholder="Toko Sejahtera"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Username UMKM (Harus mengandung angka)</label>
                  <input 
                    type="text" 
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
                    placeholder="Contoh: TokoKu123"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Email</label>
                  <input 
                    type="email" 
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
                    placeholder="nama@email.com"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Kata Sandi</label>
                  <input 
                    type="password" 
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
                    placeholder="••••••••"
                  />
                </div>
                <button 
                  onClick={() => {
                    if (!authEmail || !authPassword || !authName || !authUsername) {
                      alert('Harap lengkapi semua data.');
                      return;
                    }
                    if (!/\d/.test(authUsername)) {
                      alert('Username UMKM harus mengandung angka (contoh: Toko123).');
                      return;
                    }
                    if (registeredUsers.some(u => u.email === authEmail || u.username === authUsername)) {
                      alert('Email atau Username sudah terdaftar. Silakan masuk atau gunakan yang lain.');
                      return;
                    }
                    const securePassword = hashPassword(authPassword);
                    setRegisteredUsers([...registeredUsers, { email: authEmail, name: authName, username: authUsername, password: securePassword }]);
                    alert('Akun berhasil didaftar. Silakan masuk.');
                    setAuthMode("login");
                  }}
                  className="w-full bg-[#007a07] text-white font-semibold py-3 px-4 rounded-xl mt-2 hover:bg-[#006606] transition-colors"
                >
                  Daftar Akun
                </button>
                <div className="text-center mt-4 text-[13px] text-[#4A4A40]">
                  Sudah punya akun? <button onClick={() => setAuthMode("login")} className="text-[#007a07] font-semibold hover:underline">Masuk di sini</button>
                </div>
              </div>
            </div>
          )}

          {/* Konfirmasi Login Modal */}
          {showLoginConfirm && (
            <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl relative text-left"
              >
                <div className="w-12 h-12 bg-[#E8E6DB] rounded-full flex items-center justify-center mb-4">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google Logo" referrerPolicy="no-referrer" className="w-6 h-6"/>
                </div>
                <h3 className="text-[#4A4A40] text-lg font-bold mb-1">Pilih Akun</h3>
                <p className="text-[13px] text-[#A5A58D] mb-4 leading-relaxed">
                  Pilih akun Google untuk melanjutkan ke myAkuntansi.
                </p>
                <div className="flex flex-col gap-2 mt-2">
                  {[
                    { email: "nayarakaira31@gmail.com", name: "Nayara Kaira", avatar: "NK" },
                    { email: "usaha.anda@gmail.com", name: "Akun Bisnis Baru", avatar: "AB" }
                  ].map(acc => (
                    <button 
                      key={acc.email}
                      onClick={() => {
                        const user = registeredUsers.find(u => u.email === acc.email);
                        if (user) {
                          const pwdToUse = user.password ? hashPassword(user.password) : "empty-google-oauth-session-key-part";
                          SecureStorage.setUserSession(user.email, pwdToUse);
                          setShowLoginConfirm(false);
                          setCurrentUser(user);
                          setIsLoggedIn(true);
                        } else {
                          setShowLoginConfirm(false);
                          alert('Akun Google ini belum terdaftar. Silakan daftar terlebih dahulu.');
                          setAuthEmail(acc.email);
                          setAuthName(acc.name);
                          setAuthMode('register');
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 border border-[#DCD9CC] rounded-xl hover:bg-[#FAF9F6] hover:border-[#A5A58D] transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#FAF9F6] text-[#4A4A40] flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm border border-[#DCD9CC] relative">
                        {acc.avatar}
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                          alt="Google Logo" 
                          referrerPolicy="no-referrer" 
                          className="absolute -bottom-1 -right-1 w-[16px] h-[16px] bg-white rounded-full p-[2px] border border-[#DCD9CC] shadow-sm"
                        />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-[13px] font-semibold text-[#4A4A40] truncate group-hover:text-[#007a07] transition-colors">{acc.name}</div>
                        <div className="text-[11px] text-[#8A8F78] truncate">{acc.email}</div>
                      </div>
                    </button>
                  ))}
                  <button 
                    onClick={() => setShowLoginConfirm(false)}
                    className="w-full mt-3 py-2.5 px-4 bg-white border border-[#DCD9CC] rounded-xl text-[13px] font-semibold text-[#6B705C] hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const focusStyles = `
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) { font-family: system-ui; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) { color: #ffffff; background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) { border-radius: 10px; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) { font-family: system-ui; font-weight: bold; color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(3) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1) { background-color: #eadede; }

/* Baru */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(1) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(2) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(3) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(7) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(11) { background-color: #fefefe; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(15) { background-color: #ffffff; }

/* Update */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { border-radius: 17px; background-color: #09216c; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) { background-color: #368ccd; border-radius: 24px; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(3) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) { color: #ffffff; font-weight: bold; font-family: Arial; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > svg:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) { font-weight: bold; font-family: Arial; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) { font-weight: bold; font-family: Arial; }

/* Update 2 */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) { color: #ffffff; background-color: #09216c; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) { background-color: #09216c; }

/* Update 3 */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > label:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > label:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) > label:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(4) > label:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > button:nth-of-type(1) { background-color: #e3d6d6; color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(5) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(5) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(6) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(6) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(7) > div:nth-of-type(2) { color: #ffffff; }

/* Update 4 */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) { background-color: #fefefe; }

/* Update 5 */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1) { background-color: #368ccd; color: #ffffff; }

/* Update 6 */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > h3:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > h3:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > span:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > span:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > span:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > span:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > span:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > span:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > span:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(4) > span:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(4) > span:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > span:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(3) > span:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(4) > span:nth-of-type(2) { color: #000000; }
  
/* Update 7 */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) { background-color: #368ccd; }
  
/* Update 8 */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) { background-color: #368ccd; }

/* Update 9 */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) { background-color: #ffffff; color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(1) { background-color: #368ccd; color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(2) { background-color: #368ccd; color: #ffffff; }

/* Update 10 (Targeted style edits only) */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) { background-color: #ffffff; color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) { background-color: #f5faff; color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(3) { color: #000000; }

/* Update 11 (Targeted style edits only) */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) { color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { background-color: #368ccd; }

/* Update 12 (Targeted style edits only) */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) { background-color: #368ccd; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { color: #ffffff; }

/* Update 13 (Targeted style edits only) */
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) { background-color: #ffffff; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(4) > div:nth-of-type(3) { color: #000000; }
div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) { background-color: #09216c; }
  `;

  return (
    <div className="font-sans text-[#4A4A40] min-h-screen bg-[#FAF9F6] flex flex-col">
      <style>{focusStyles}</style>
      <AiAssistant txns={txns} setTxns={setTxns} catsMasuk={CAT_MASUK} catsKeluar={CAT_KELUAR} onExport={exportCSV} />
      {/* ── Header ─────────────────────────────── */}
      <div className="border-b border-[#DCD9CC] px-4 py-3 md:px-5 md:py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 sticky top-0 z-20" style={{ backgroundColor: "#09216c" }}>
        <div>
          <div className="flex items-center gap-2">
            <div className="text-white font-bold text-base tracking-[-0.3px]" style={{ fontFamily: "system-ui" }}>myAkuntansi</div>
            {currentUser && (
              <div 
                className="text-white px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-[#007a07]"
                style={{
                  backgroundColor: "#000765",
                  fontWeight: "bold",
                  fontStyle: "normal",
                  textDecorationLine: "none",
                  fontFamily: "Arial"
                }}
              >
                {currentUser.username}
              </div>
            )}
          </div>
          <div className="text-white text-[11px] mt-0.5 opacity-90">{currentUser?.name ? currentUser.name : "Sistem Akuntansi & Keuangan Usaha Kecil"}</div>
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
            <button 
              onClick={() => { setIsLoggedIn(false); setCurrentUser(null); }}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border border-white/20"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────── */}
      <div className="flex overflow-x-auto border-b-[0.5px] border-[#DCD9CC] sticky top-[72px] md:top-[60px] z-10 no-scrollbar" style={{ backgroundColor: "#368ccd" }}>
        {TABS.map((t, i) => (
          <button 
            key={t.id} 
            className={`whitespace-nowrap px-4 py-2.5 md:px-[18px] md:py-[11px] text-[13px] border-none bg-transparent cursor-pointer transition-colors ${tab === t.id ? 'font-semibold text-white border-b-2 border-white' : 'font-normal text-white/80 hover:text-white border-b-2 border-transparent'}`}
            style={i === 0 ? { textAlign: "center", height: "41.5px", lineHeight: "19.5px", fontSize: "13px", fontWeight: "bold" } : { fontWeight: "bold" }}
            onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 md:p-5 flex-1" style={{ backgroundColor: "#09216c" }}>

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
                <div key={i} className="rounded-[16px] md:rounded-[24px] p-3.5 md:p-4 border border-[#DCD9CC]" style={{ backgroundColor: "#ffffff" }}>
                  <div className="text-[10px] md:text-[11px] text-[#A5A58D] mb-1 tracking-[0.3px] uppercase font-bold" style={{ fontWeight: "bold" }}>{m.label}</div>
                  <div className="text-lg md:text-[20px] font-semibold tracking-[-0.5px]" style={{ color: m.color }}>{m.val}</div>
                  <div className="text-[10px] md:text-[11px] mt-1.5 font-medium" style={{ color: m.subColor }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Line Chart — Arus Kas */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mb-4">
              <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]" style={{ fontFamily: "Arial" }}>Grafik Arus Kas Harian — {filterMonth ? new Date(filterMonth + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : "Semua Periode"}</div>
              <div className="flex flex-wrap gap-4 mb-3">
                {[["#6B705C","Pemasukan"],["#B18B5E","Pengeluaran"]].map(([col, lbl]) => (
                  <span key={lbl} className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-[#A5A58D]">
                    <span className="w-[18px] h-[3px] rounded-sm" style={{ background: col }}></span>{lbl}
                  </span>
                ))}
              </div>
              <div className="h-[180px] md:h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                  <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCD9CC" vertical={false} />
                    <XAxis dataKey="dateFull" tickFormatter={(v) => v.slice(8)} tick={{ fontSize: 11, fill: '#A5A58D' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={v => fmtS(v).replace('Rp ', '')} tick={{ fontSize: 11, fill: '#A5A58D' }} tickLine={false} axisLine={false} />
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
                    <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
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
                  <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                    <BarChart data={pieMasuk} layout="vertical" margin={{ left: -10, right: 16, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#DCD9CC" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => fmtS(v).replace('Rp ', '')} tick={{ fontSize: 10, fill: '#A5A58D' }} axisLine={false} tickLine={false} />
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
                      <div className="text-[10px] md:text-[11px] text-[#A5A58D] mt-0.5">{new Date(t.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })} • {t.cat}</div>
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
            <div className="w-full lg:w-[320px] shrink-0 self-start rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm border border-[#DCD9CC]" style={{ backgroundColor: "#ffffff", fontFamily: "Arial" }}>
              <div className="text-[#4A4A40] text-base font-semibold mb-4" style={{ fontFamily: "Arial" }}>Tambah Transaksi Baru</div>

              {msg && (
                <div className={`px-3 py-2.5 rounded-lg text-xs mb-3 border ${msg.ok ? "bg-[#E8E6DB] text-[#6B705C] border-[#DCD9CC]" : "bg-[#F0EEE4] text-[#B18B5E] border-[#DCD9CC]"}`}>
                  {msg.ok ? "✓ " : "✕ "}{msg.text}
                </div>
              )}

              {/* Type Toggle */}
              <div className="mb-4">
                <div className="text-[11px] text-[#6B705C] mb-1.5 tracking-[0.3px] uppercase opacity-90 font-semibold">Jenis Transaksi</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setForm(f => ({ ...f, type: "masuk", cat: "" }))}
                    className="flex-1 py-1.5 rounded-lg border-[1.5px] text-white font-semibold text-[13px] cursor-pointer transition-all"
                    style={{ borderColor: form.type === "masuk" ? "#368ccd" : "#DCD9CC", backgroundColor: "#368ccd" }}>
                    ↑ Pemasukan
                  </button>
                  <button 
                    onClick={() => setForm(f => ({ ...f, type: "keluar", cat: "" }))}
                    className={`flex-1 py-1.5 rounded-lg border-[1.5px] font-medium text-[13px] cursor-pointer transition-all ${
                      form.type === "keluar" 
                        ? "text-white font-semibold" 
                        : "border-[#DCD9CC] bg-white text-[#A5A58D]"
                    }`}
                    style={form.type === "keluar" ? { backgroundColor: "#368ccd", borderColor: "#368ccd" } : {}}>
                    ↓ Pengeluaran
                  </button>
                </div>
              </div>

              {/* Fields */}
              {[
                { label: "Tanggal & Hari", el: <div className="flex gap-2"><input type="date" className="w-full p-2.5 rounded-lg border-[0.5px] border-[#DCD9CC] bg-white text-[#4A4A40] text-[13px] box-border" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /><div className="p-2.5 border border-transparent text-[#6B705C] text-[13px] font-semibold flex items-center">{form.date ? new Date(form.date).toLocaleDateString('id-ID', { weekday: 'long' }) : ""}</div></div> },
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
                  <div className="text-[11px] text-[#6B705C] mb-1.5 tracking-[0.3px] uppercase opacity-90 font-semibold">{label}</div>
                  {el}
                </div>
              ))}

              <div className="flex gap-2 mt-1">
                <button onClick={addTxn} className="flex-1 py-2.5 rounded-lg border-none text-white font-semibold text-[13px] cursor-pointer transition-colors" style={{ backgroundColor: "#5194ff" }}>
                  {editId ? "✓ Simpan Perubahan" : "+ Simpan Transaksi"}
                </button>
                {editId && (
                  <button onClick={cancelEdit} className="py-2.5 px-4 rounded-lg border border-[#DCD9CC] bg-[#FAF9F6] text-[#4A4A40] font-semibold text-[13px] cursor-pointer hover:bg-white transition-colors">
                    Batal
                  </button>
                )}
              </div>

              {/* Mini summary */}
              <div className="mt-5 pt-4 border-t border-dashed border-[#DCD9CC]">
                <div className="text-[11px] text-[#6B705C] mb-1 tracking-[0.3px] uppercase opacity-90 font-semibold">Saldo Saat Ini</div>
                <div className={`text-xl md:text-2xl font-bold tracking-[-0.5px] ${saldoAkhir >= 0 ? "text-[#007a07]" : "text-[#B18B5E]"}`} style={{ color: "#000000" }}>{fmtS(saldoAkhir)}</div>
                <div className="flex justify-between mt-3 bg-[#FAF9F6] border border-[#DCD9CC] p-3 rounded-lg">
                  <div>
                    <div className="text-[10px] text-[#A5A58D] uppercase mb-0.5 font-medium">Total Masuk</div>
                    <div className="text-[13px] font-semibold text-[#007a07]" style={{ color: "#000000" }}>{fmtS(totalMasuk)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#A5A58D] uppercase mb-0.5 font-medium">Total Keluar</div>
                    <div className="text-[13px] font-semibold text-[#B18B5E]">{fmtS(totalKeluar)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 min-w-0 relative bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm overflow-hidden flex flex-col">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 pb-4 border-b border-[#DCD9CC] gap-3 md:gap-0" style={{ backgroundColor: "#ffffff" }}>
                <div className="text-base font-semibold text-[#4A4A40]" style={{ color: "#000000" }}>Riwayat Transaksi ({filteredTxns.length})</div>
                <div className="flex flex-wrap gap-2 md:gap-4 items-center">
                  <button onClick={exportCSV} className="py-2 px-3 md:px-4 rounded-lg border border-[#A5A58D] text-white text-[12px] md:text-[13px] font-semibold cursor-pointer transition-colors flex items-center gap-1.5" style={{ backgroundColor: "#5194ff" }}>
                    📥 Ekspor CSV
                  </button>
                  <div className="flex gap-1.5 p-1 rounded-lg" style={{ color: "#000000", backgroundColor: "#ffffff" }}>
                    {[["semua","Semua"],["masuk","Masuk"],["keluar","Keluar"]].map(([val, lbl]) => (
                      <button key={val} onClick={() => setFilterType(val)} 
                        className={`py-1.5 px-3 md:px-3.5 rounded-md border-none text-[11px] md:text-[12px] cursor-pointer transition-all ${filterType === val ? "bg-white text-[#4A4A40] font-semibold shadow-sm" : "bg-transparent text-[#A5A58D] font-medium hover:text-[#4A4A40]"}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-auto min-h-[300px] pr-1 md:pr-2" style={{ backgroundColor: "#ffffff" }}>
                <table className="w-full border-collapse text-[12px] md:text-[13px] text-left whitespace-nowrap md:whitespace-normal">
                  <thead className="sticky top-0 bg-[#FAF9F6] z-10 shadow-[0_1px_0_#DCD9CC]">
                    <tr>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold md:w-[15%]" style={{ backgroundColor: "#5194ff", fontFamily: "Verdana", color: "#ffffff", textAlign: "center" }}>Tanggal</th>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold md:w-[35%] whitespace-normal" style={{ backgroundColor: "#5194ff", fontFamily: "Verdana", color: "#ffffff", textAlign: "center" }}>Keterangan</th>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold text-right" style={{ backgroundColor: "#5194ff", fontFamily: "Verdana", color: "#ffffff", textAlign: "center" }}>Debet (Masuk)</th>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold text-right" style={{ backgroundColor: "#5194ff", fontFamily: "Verdana", color: "#ffffff", textAlign: "center" }}>Kredit (Keluar)</th>
                      <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold text-center w-[60px]" style={{ backgroundColor: "#5194ff", fontFamily: "Verdana", color: "#ffffff" }}>Aksi</th>
                      {filterType === 'semua' && <th className="py-3 px-3 md:px-4 text-[#A5A58D] font-semibold text-right" style={{ backgroundColor: "#5194ff", fontSize: "12px", fontFamily: "Verdana", color: "#ffffff", paddingLeft: "13px", paddingBottom: "10px", textAlign: "center" }}>Saldo</th>}
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
                          <td className="py-3 px-3 md:px-4 text-[#4A4A40]" style={{ backgroundColor: "#ffffff" }}>{new Date(t.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</td>
                          <td className="py-3 px-3 md:px-4">
                            <div className="font-medium text-[#4A4A40] w-32 sm:w-auto truncate md:whitespace-normal xl:line-clamp-2" style={{ color: "#000000" }}>{t.desc}</div>
                            <div className="text-[11px] text-[#A5A58D] mt-1" style={{ color: "#000000" }}>{t.cat}</div>
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
                            <button onClick={() => setDeleteId(t.id)} className="bg-transparent border-none cursor-pointer text-[#B18B5E] px-1 md:px-2 py-1 rounded hover:bg-black/5 text-[14px] md:text-[16px]">
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

        {/* ══════════════════════════════ HUTANG PIUTANG ══════════════════════════════ */}
        {tab === "hutang_piutang" && (
          <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm">
            <div className="text-base font-semibold mb-4 text-[#4A4A40]" style={{ fontFamily: "Arial" }}>Manajemen Hutang & Piutang</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6" style={{ backgroundColor: "#ffffff" }}>
              <div className="border border-[#DCD9CC] p-4 rounded-xl" style={{ backgroundColor: "#ffffff" }}>
                <div className="text-[12px] font-bold text-[#A5A58D] mb-1">TOTAL PIUTANG (A/R) - BELUM LUNAS</div>
                <div className="text-[20px] font-bold text-[#4A4A40]">{fmt(debts.filter(d => d.type === 'piutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0))}</div>
              </div>
              <div className="border border-[#DCD9CC] p-4 rounded-xl" style={{ backgroundColor: "#ffffff" }}>
                <div className="text-[12px] font-bold text-[#A5A58D] mb-1">TOTAL HUTANG (A/P) - BELUM LUNAS</div>
                <div className="text-[20px] font-bold" style={{ color: "#000000" }}>{fmt(debts.filter(d => d.type === 'hutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0))}</div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#DCD9CC]">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#E8E6DB]">
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ textAlign: "center", backgroundColor: "#368ccd", color: "#ffffff" }}>Nama / Pihak</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ textAlign: "center", backgroundColor: "#368ccd", color: "#ffffff" }}>Jenis</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ textAlign: "center", backgroundColor: "#368ccd", color: "#ffffff" }}>Jatuh Tempo</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ textAlign: "center", backgroundColor: "#368ccd", color: "#ffffff" }}>Nominal</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ textAlign: "center", backgroundColor: "#368ccd", color: "#ffffff" }}>Status</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ textAlign: "center", backgroundColor: "#368ccd", color: "#ffffff" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {debts.map(d => (
                    <tr key={d.id} className="border-b border-[#DCD9CC] last:border-0 hover:bg-[#FAF9F6] transition-colors">
                      <td className="p-3 text-[13px] text-[#4A4A40] font-medium">
                        {editDebtId === d.id ? (
                          <input type="text" className="w-full border border-[#DCD9CC] p-1 rounded text-[12px]" value={editDebtForm.name || ""} onChange={e => setEditDebtForm({ ...editDebtForm, name: e.target.value })} />
                        ) : d.name}
                      </td>
                      <td className="p-3 text-[13px]">
                        {editDebtId === d.id ? (
                          <select className="border border-[#DCD9CC] p-1 rounded text-[12px]" value={editDebtForm.type || "hutang"} onChange={e => setEditDebtForm({ ...editDebtForm, type: e.target.value as "hutang" | "piutang" })}>
                            <option value="piutang">PIUTANG</option>
                            <option value="hutang">HUTANG</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${d.type === 'piutang' ? 'bg-[#e2eadc] text-[#367609]' : 'bg-[#faebd7] text-[#B18B5E]'}`}>
                            {d.type.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[13px] text-[#A5A58D]">
                        {editDebtId === d.id ? (
                          <input type="date" className="w-full border border-[#DCD9CC] p-1 rounded text-[12px]" value={editDebtForm.dueDate || ""} onChange={e => setEditDebtForm({ ...editDebtForm, dueDate: e.target.value })} />
                        ) : d.dueDate}
                      </td>
                      <td className="p-3 text-[13px] font-semibold text-[#4A4A40]">
                        {editDebtId === d.id ? (
                          <input type="number" className="w-full border border-[#DCD9CC] p-1 rounded text-[12px]" value={editDebtForm.amount || 0} onChange={e => setEditDebtForm({ ...editDebtForm, amount: Number(e.target.value) })} />
                        ) : fmt(d.amount)}
                      </td>
                      <td className="p-3 text-[13px]">
                        {editDebtId === d.id ? (
                          <select className="border border-[#DCD9CC] p-1 rounded text-[12px]" value={editDebtForm.status || "belum"} onChange={e => setEditDebtForm({ ...editDebtForm, status: e.target.value as "lunas" | "belum" })}>
                            <option value="belum">Belum Lunas</option>
                            <option value="lunas">Lunas</option>
                          </select>
                        ) : d.status === 'lunas' ? (
                           <span className="text-[#367609] font-semibold text-[12px]">✓ Lunas</span>
                        ) : (
                           <span className="text-[#B18B5E] font-semibold text-[12px]">⏱ Belum Lunas</span>
                        )}
                      </td>
                      <td className="p-3 flex gap-2">
                        {editDebtId === d.id ? (
                          <>
                            <button onClick={() => {
                              setDebts(debts.map(x => x.id === d.id ? { ...x, ...editDebtForm } as Debt : x));
                              setEditDebtId(null);
                            }} className="bg-[#367609] text-white px-2.5 py-1 rounded-md text-[11px] font-bold hover:bg-[#2e6408] transition-colors">Simpan</button>
                            <button onClick={() => setEditDebtId(null)} className="bg-gray-300 text-[#4A4A40] px-2.5 py-1 rounded-md text-[11px] font-bold hover:bg-gray-400 transition-colors">Batal</button>
                          </>
                        ) : (
                          <>
                            {d.status === 'belum' && (
                              <button 
                                onClick={() => setDebts(debts.map(x => x.id === d.id ? { ...x, status: 'lunas' } : x))}
                                className="bg-[#367609] text-white px-2.5 py-1 rounded-md text-[11px] font-bold hover:bg-[#2e6408] transition-colors">
                                Lunas
                              </button>
                            )}
                            <button onClick={() => { setEditDebtId(d.id); setEditDebtForm(d); }} className="text-[#6B705C] bg-[#FAF9F6] border border-[#DCD9CC] px-2.5 py-1 rounded-md text-[11px] font-bold hover:bg-white transition-colors">Edit</button>
                            <button onClick={() => setDebts(debts.filter(x => x.id !== d.id))} className="text-[#B18B5E] bg-[#FAF9F6] border border-[#DCD9CC] px-2.5 py-1 rounded-md text-[11px] font-bold hover:bg-white transition-colors">Hapus</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {debts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[13px] text-[#A5A58D]">Belum ada catatan hutang/piutang.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => setDebts([...debts, { id: Date.now(), type: 'piutang', name: 'Pelanggan Baru (Contoh)', amount: 500000, dueDate: new Date().toISOString().slice(0, 10), status: 'belum' }])}
                className="py-2 px-4 rounded-xl border border-[#DCD9CC] bg-[#FAF9F6] text-[#4A4A40] text-[12px] font-semibold hover:bg-white transition-colors">
                + Tambah Piutang
              </button>
              <button 
                onClick={() => setDebts([...debts, { id: Date.now()+1, type: 'hutang', name: 'Supplier Baru (Contoh)', amount: 300000, dueDate: new Date().toISOString().slice(0, 10), status: 'belum' }])}
                className="py-2 px-4 rounded-xl border border-[#DCD9CC] bg-[#FAF9F6] text-[#4A4A40] text-[12px] font-semibold hover:bg-white transition-colors">
                + Tambah Hutang
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ INVENTORI ══════════════════════════════ */}
        {tab === "inventori" && (
          <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm">
            <div className="text-base font-semibold mb-4 text-[#4A4A40]" style={{ fontFamily: "Arial" }}>Manajemen Stok / Inventori</div>
            <div className="border border-[#DCD9CC] p-4 rounded-xl mb-6" style={{ backgroundColor: "#368ccd" }}>
              <div className="text-[12px] font-bold mb-1" style={{ color: "#ffffff" }}>TOTAL NILAI PERSEDIAAN (COGS)</div>
              <div className="text-[20px] font-bold" style={{ color: "#ffffff" }}>{fmt(inventory.reduce((a,b) => a + (b.cogs * b.qty), 0))}</div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#DCD9CC]">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#E8E6DB]">
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ backgroundColor: "#368ccd", textAlign: "center", color: "#ffffff" }}>Nama Barang</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ color: "#ffffff", backgroundColor: "#368ccd", textAlign: "center" }}>Stok (Qty)</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ backgroundColor: "#368ccd", color: "#ffffff", textAlign: "center" }}>Harga Jual/pcs</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ backgroundColor: "#368ccd", color: "#ffffff", textAlign: "center" }}>HPP (COGS)/pcs</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ color: "#ffffff", backgroundColor: "#368ccd", textAlign: "center" }}>Nilai Total</th>
                    <th className="p-3 text-[12px] font-semibold border-b border-[#DCD9CC]" style={{ color: "#ffffff", backgroundColor: "#368ccd", textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {inventory.map(inv => (
                    <tr key={inv.id} className="border-b border-[#DCD9CC] last:border-0 hover:bg-[#FAF9F6] transition-colors">
                      <td className="p-3 text-[13px] text-[#4A4A40] font-medium">
                        {editInvId === inv.id ? (
                          <input type="text" className="w-full border border-[#DCD9CC] p-1 rounded text-[12px]" value={editInvForm.name || ""} onChange={e => setEditInvForm({ ...editInvForm, name: e.target.value })} />
                        ) : inv.name}
                      </td>
                      <td className="p-3 text-[13px] font-bold text-[#6B705C]">
                        {editInvId === inv.id ? (
                          <input type="number" className="w-[60px] border border-[#DCD9CC] p-1 rounded text-[12px]" value={editInvForm.qty || 0} onChange={e => setEditInvForm({ ...editInvForm, qty: Number(e.target.value) })} />
                        ) : inv.qty}
                      </td>
                      <td className="p-3 text-[13px] text-[#A5A58D]">
                        {editInvId === inv.id ? (
                          <input type="number" className="w-[100px] border border-[#DCD9CC] p-1 rounded text-[12px]" value={editInvForm.price || 0} onChange={e => setEditInvForm({ ...editInvForm, price: Number(e.target.value) })} />
                        ) : fmt(inv.price)}
                      </td>
                      <td className="p-3 text-[13px] text-[#A5A58D]">
                        {editInvId === inv.id ? (
                          <input type="number" className="w-[100px] border border-[#DCD9CC] p-1 rounded text-[12px]" value={editInvForm.cogs || 0} onChange={e => setEditInvForm({ ...editInvForm, cogs: Number(e.target.value) })} />
                        ) : fmt(inv.cogs)}
                      </td>
                      <td className="p-3 text-[13px] font-semibold text-[#4A4A40] text-right">{fmt(inv.cogs * inv.qty)}</td>
                      <td className="p-3 flex gap-2">
                        {editInvId === inv.id ? (
                          <>
                            <button onClick={() => {
                              setInventory(inventory.map(x => x.id === inv.id ? { ...x, ...editInvForm } as Inventory : x));
                              setEditInvId(null);
                            }} className="bg-[#367609] text-white px-2.5 py-1 rounded-md text-[11px] font-bold hover:bg-[#2e6408] transition-colors">Simpan</button>
                            <button onClick={() => setEditInvId(null)} className="bg-gray-300 text-[#4A4A40] px-2.5 py-1 rounded-md text-[11px] font-bold hover:bg-gray-400 transition-colors">Batal</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditInvId(inv.id); setEditInvForm(inv); }} className="text-[#6B705C] bg-[#FAF9F6] border border-[#DCD9CC] px-2.5 py-1 rounded-md text-[11px] font-bold hover:bg-white transition-colors">Edit</button>
                            <button onClick={() => setInventory(inventory.filter(x => x.id !== inv.id))} className="text-[#B18B5E] bg-[#FAF9F6] border border-[#DCD9CC] px-2.5 py-1 rounded-md text-[11px] font-bold hover:bg-white transition-colors">Hapus</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[13px] text-[#A5A58D]">Belum ada barang di inventori.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <button 
                onClick={() => setInventory([...inventory, { id: Date.now(), name: 'Produk Baru (Contoh)', qty: 10, price: 150000, cogs: 80000 }])}
                className="py-2 px-4 rounded-xl border border-[#DCD9CC] bg-[#FAF9F6] text-[12px] font-semibold hover:bg-white transition-colors"
                style={{ backgroundColor: "#368ccd", color: "#ffffff" }}>
                + Tambah Barang
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ LAPORAN ══════════════════════════════ */}
        {tab === "laporan" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
              <div className="flex bg-[#E8E6DB] p-1 rounded-xl">
                {[
                  { id: "lr", label: "Laba Rugi" },
                  { id: "neraca", label: "Neraca" },
                  { id: "gl", label: "Buku Besar" },
                  { id: "pajak", label: "Pajak (UMKM)" }
                ].map(lt => (
                  <button
                    key={lt.id}
                    onClick={() => setLaporanTab(lt.id as "lr" | "neraca" | "gl" | "pajak")}
                    className={`px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors ${laporanTab === lt.id ? "bg-white text-[#4A4A40] shadow-sm" : "bg-transparent text-[#A5A58D] hover:text-[#4A4A40]"}`}
                  >
                    {lt.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={exportFullReport}
                className="py-1.5 md:py-2 px-3 md:px-4 rounded-lg border border-[#A5A58D] text-white text-[12px] md:text-[13px] font-semibold cursor-pointer transition-colors flex items-center gap-1.5 hover:bg-[#286f99]"
                style={{ backgroundColor: "#368ccd" }}
              >
                💾 Simpan Catatan
              </button>
            </div>

            <div className="flex flex-col gap-4 bg-transparent">
            {laporanTab === "lr" && (
              <>
            {/* P&L Summary */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mb-4 print:shadow-none print:border-none print:m-0 print:p-0">
              <div className="text-sm md:text-base font-semibold mb-4 text-[#4A4A40]" style={{ fontFamily: "Arial", fontWeight: "bold" }}>Laporan Laba Rugi — {filterMonth ? new Date(filterMonth + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : "Semua Periode"}</div>
              <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1fr_260px] gap-6">

                {/* Pendapatan */}
                <div>
                  <div className="text-[11px] text-[#6B705C] font-bold mb-3 tracking-[0.5px]" style={{ color: "#007604", fontSize: "13px" }}>PENDAPATAN</div>
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
                    <span style={{ fontFamily: "Arial", color: "#000000" }}>Total Pendapatan</span><span>{fmt(totalMasuk)}</span>
                  </div>
                </div>

                {/* Pengeluaran */}
                <div>
                  <div className="text-[11px] text-[#B18B5E] font-bold mb-3 tracking-[0.5px]" style={{ color: "#8e0000", fontSize: "13px" }}>PENGELUARAN</div>
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
                    <span style={{ color: "#000000", fontFamily: "Arial" }}>Total Pengeluaran</span><span style={{ color: "#8e0000" }}>{fmt(totalKeluar)}</span>
                  </div>
                </div>

                {/* Ringkasan Box */}
                <div className={`rounded-xl p-5 ${laba >= 0 ? "bg-[#E8E6DB]" : "bg-[#F0EEE4]"}`} style={{ backgroundColor: "#ffffff" }}>
                  <div className={`text-[11px] font-bold mb-4 tracking-[0.5px] ${laba >= 0 ? "text-[#6B705C]" : "text-[#B18B5E]"}`} style={{ color: "#000000", fontFamily: "system-ui" }}>RINGKASAN L/R</div>
                  {[
                    { lbl: "Pendapatan", val: fmt(totalMasuk), col: "text-[#6B705C]" },
                    { lbl: "Pengeluaran", val: fmt(totalKeluar), col: "text-[#B18B5E]" },
                  ].map(m => (
                    <div key={m.lbl} className="flex justify-between mb-2 items-center">
                      <div className="text-[12px] text-[#A5A58D]" style={m.lbl === "Pendapatan" ? { color: "#007604" } : m.lbl === "Pengeluaran" ? { color: "#8e0000" } : undefined}>{m.lbl}</div>
                      <div className={`text-[13px] font-semibold ${m.col}`} style={m.lbl === "Pendapatan" ? { color: "#007604" } : m.lbl === "Pengeluaran" ? { color: "#8e0000" } : undefined}>{m.val}</div>
                    </div>
                  ))}
                  <div className={`pt-4 mt-3 border-t ${laba >= 0 ? "border-[#A5A58D]" : "border-[#DCD9CC]"}`}>
                    <div className="text-[12px] text-[#A5A58D] mb-1" style={{ color: "#000000" }}>Laba Bersih</div>
                    <div className={`text-[20px] md:text-[24px] font-bold tracking-[-0.5px] ${laba >= 0 ? "text-[#6B705C]" : "text-[#B18B5E]"}`} style={{ color: "#000000" }}>{fmt(laba)}</div>
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
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mb-4" style={{ backgroundColor: "#368ccd" }}>
              <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]" style={{ color: "#000000", fontFamily: "Arial" }}>Laporan Arus Kas — {filterMonth ? new Date(filterMonth + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : "Semua Periode"}</div>
              <div className="bg-[#FAF9F6] rounded-xl p-4 md:p-5 border border-[#DCD9CC] overflow-x-auto" style={{ backgroundColor: "#ffffff" }}>
                <table className="w-full border-collapse text-[13px] md:text-[14px]">
                  <tbody>
                    <tr className="border-b border-transparent">
                      <td className="py-2.5 md:py-3 text-[#6B705C] font-semibold whitespace-nowrap min-w-[200px]" style={{ color: "#007604" }}>Arus Kas Masuk (Penerimaan)</td>
                      <td className="py-2.5 md:py-3 text-right font-semibold text-[#6B705C]" style={{ color: "#007604" }}>{fmt(totalMasuk)}</td>
                    </tr>
                    <tr>
                      <td className="pb-3 pl-4 text-[#A5A58D] text-[12px] md:text-[13px] whitespace-normal">Dari Pendapatan Operasional & Lainnya</td>
                      <td className="pb-3 text-right text-[#A5A58D] text-[12px] md:text-[13px]">{fmt(totalMasuk)}</td>
                    </tr>
                    <tr className="border-t border-dashed border-[#DCD9CC]">
                      <td className="py-2.5 md:py-3 text-[#B18B5E] font-semibold whitespace-nowrap min-w-[200px]" style={{ color: "#8e0000" }}>Arus Kas Keluar (Pengeluaran)</td>
                      <td className="py-2.5 md:py-3 text-right font-semibold text-[#B18B5E]" style={{ color: "#8e0000" }}>{fmt(totalKeluar)}</td>
                    </tr>
                    <tr>
                      <td className="pb-3 pl-4 text-[#A5A58D] text-[12px] md:text-[13px] whitespace-normal">Untuk Pembayaran Operasional & Kas</td>
                      <td className="pb-3 text-right text-[#A5A58D] text-[12px] md:text-[13px]">{fmt(totalKeluar)}</td>
                    </tr>
                    <tr className="border-t-2 border-[#DCD9CC]">
                      <td className="py-3.5 md:py-4 text-[#4A4A40] font-bold text-[14px] md:text-[16px]" style={{ color: "#000000" }}>Kenaikan/Penurunan Kas Bersih</td>
                      <td className={`py-3.5 md:py-4 text-right font-bold text-[14px] md:text-[16px] ${laba >= 0 ? "text-[#6B705C]" : "text-[#B18B5E]"}`} style={{ color: "#000000" }}>{fmt(laba)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bar Chart Comparison */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm">
              <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]" style={{ fontFamily: "Arial", fontWeight: "bold" }}>Pemasukan vs Pengeluaran per Hari</div>
              <div className="flex gap-4 mb-3">
                {[["#6B705C","Pemasukan"],["#B18B5E","Pengeluaran"]].map(([col, lbl]) => (
                  <span key={lbl} className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-[#A5A58D]">
                    <span className="w-3 h-3 rounded-[3px]" style={lbl === "Pemasukan" ? { backgroundColor: "#007604" } : lbl === "Pengeluaran" ? { backgroundColor: "#8e0000" } : { background: col }}></span>{lbl}
                  </span>
                ))}
              </div>
              <div className="w-full h-[200px] md:h-[230px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={10} minHeight={10}>
                  <BarChart data={dailyData} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCD9CC" vertical={false} />
                    <XAxis dataKey="dateFull" tickFormatter={(v) => v.slice(8)} tick={{ fontSize: 11, fill: '#A5A58D' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={v => fmtS(v).replace('Rp ', '')} tick={{ fontSize: 11, fill: '#A5A58D' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTip />} cursor={{fill: '#DCD9CC'}} />
                    <Bar dataKey="masuk" name="Pemasukan" fill="#6B705C" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="keluar" name="Pengeluaran" fill="#B18B5E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rasio Keuangan */}
            <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm mt-4">
              <div className="text-sm md:text-base font-semibold mb-3 text-[#4A4A40]" style={{ fontFamily: "Arial", fontWeight: "bold" }}>Metrik Usaha</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { lbl: "Gross Profit Margin", val: `${margin}%`, desc: "Laba / Pendapatan", good: parseFloat(margin.toString()) >= 20, lblCol: "#ffffff", valCol: "#ffffff", descCol: "#ffffff", bgCol: "#368ccd" },
                  { lbl: "Biaya vs Pendapatan", val: totalMasuk > 0 ? `${((totalKeluar / totalMasuk) * 100).toFixed(1)}%` : "—", desc: "Pengeluaran / Pendapatan", good: (totalKeluar / totalMasuk) < 0.8, lblCol: "#ffffff", valCol: "#ffffff", descCol: "#ffffff", bgCol: "#368ccd" },
                  { lbl: "Jumlah Transaksi Masuk", val: txns.filter(t => t.type === "masuk").length, desc: "Entri pendapatan", good: true, lblCol: "#ffffff", valCol: "#ffffff", descCol: "#ffffff", bgCol: "#368ccd" },
                  { lbl: "Rata-rata per Transaksi", val: txns.length > 0 ? fmtS(Math.round((totalMasuk + totalKeluar) / txns.length)) : "—", desc: "Nilai rata-rata dari total", good: true, lblCol: "#ffffff", valCol: "#ffffff", descCol: "#ffffff", bgCol: "#368ccd" },
                ].map((r, i) => (
                  <div key={i} className={`rounded-[24px] p-3.5 md:p-4 border ${r.good ? "bg-[#FAF9F6] border-[#E8E6DB]" : "bg-[#F0EEE4] border-[#F0EEE4]"}`} style={{ backgroundColor: r.bgCol || undefined, color: r.bgCol ? r.bgCol : undefined }}>
                    <div className="text-[11px] md:text-[12px] text-[#A5A58D] mb-1.5" style={{ color: r.lblCol || undefined, fontWeight: r.lblCol ? "bold" : undefined }}>{r.lbl}</div>
                    <div className={`text-[18px] md:text-[20px] font-bold tracking-[-0.5px] ${r.good ? "text-[#6B705C]" : "text-[#B18B5E]"}`} style={{ color: r.valCol || undefined }}>{r.val}</div>
                    <div className={`text-[10px] md:text-[11px] mt-1.5 font-medium ${r.good ? "text-[#6B705C]" : "text-[#B18B5E]"}`} style={{ color: r.descCol || undefined }}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {laporanTab === "neraca" && (
          <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm print:shadow-none print:border-none print:m-0 print:p-0">
            <div className="text-base font-semibold mb-4 text-[#4A4A40]">Neraca (Balance Sheet)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Aktiva */}
              <div>
                <h3 className="text-[13px] font-bold text-[#6B705C] border-b border-[#DCD9CC] pb-2 mb-2">AKTIVA (ASET)</h3>
                <div className="flex justify-between text-[13px] py-2 border-b border-dashed border-[#DCD9CC]">
                  <span className="text-[#A5A58D]">Kas & Bank</span>
                  <span className="font-medium text-[#4A4A40]">{fmt(totalMasuk - totalKeluar)}</span>
                </div>
                <div className="flex justify-between text-[13px] py-2 border-b border-dashed border-[#DCD9CC]">
                  <span className="text-[#A5A58D]">Piutang Usaha</span>
                  <span className="font-medium text-[#4A4A40]">{fmt(debts.filter(d => d.type === 'piutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0))}</span>
                </div>
                <div className="flex justify-between text-[13px] py-2 border-b border-dashed border-[#DCD9CC]">
                  <span className="text-[#A5A58D]">Persediaan (Stok)</span>
                  <span className="font-medium text-[#4A4A40]">{fmt(inventory.reduce((a,b)=>a+(b.cogs*b.qty),0))}</span>
                </div>
                <div className="flex justify-between text-[14px] font-bold text-[#6B705C] pt-3 mt-1">
                  <span>Total Aktiva</span>
                  <span>{fmt((totalMasuk - totalKeluar) + debts.filter(d => d.type === 'piutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0) + inventory.reduce((a,b)=>a+(b.cogs*b.qty),0))}</span>
                </div>
              </div>
              {/* Pasiva */}
              <div>
                <h3 className="text-[13px] font-bold text-[#B18B5E] border-b border-[#DCD9CC] pb-2 mb-2">PASIVA (KEWAJIBAN & EKUITAS)</h3>
                <div className="flex justify-between text-[13px] py-2 border-b border-dashed border-[#DCD9CC]">
                  <span className="text-[#A5A58D]">Hutang Usaha</span>
                  <span className="font-medium text-[#4A4A40]">{fmt(debts.filter(d => d.type === 'hutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0))}</span>
                </div>
                <div className="flex justify-between text-[13px] py-2 border-b border-dashed border-[#DCD9CC]">
                  <span className="text-[#A5A58D]">Modal Awal (Estimasi)</span>
                  <span className="font-medium text-[#4A4A40]">{fmt(0)}</span>
                </div>
                <div className="flex justify-between text-[13px] py-2 border-b border-dashed border-[#DCD9CC]">
                  <span className="text-[#A5A58D]">Laba Ditahan (Laba Rugi)</span>
                  <span className="font-medium text-[#4A4A40]">{fmt(totalMasuk - totalKeluar)}</span>
                </div>
                <div className="flex justify-between text-[14px] font-bold text-[#B18B5E] pt-3 mt-1">
                  <span>Total Pasiva</span>
                  <span>{fmt(debts.filter(d => d.type === 'hutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0) + (totalMasuk - totalKeluar))}</span>
                </div>
              </div>
            </div>
            {((totalMasuk - totalKeluar) + debts.filter(d => d.type === 'piutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0) + inventory.reduce((a,b)=>a+(b.cogs*b.qty),0)) !== (debts.filter(d => d.type === 'hutang' && d.status === 'belum').reduce((a,b)=>a+b.amount,0) + (totalMasuk - totalKeluar)) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-[12px] rounded-xl text-center">
                Perhatian: Aktiva dan Pasiva belum selaras (unbalanced). Perbedaan ini wajar terjadi karena Laba Ditahan disederhanakan dan Modal Awal di-set 0.
              </div>
            )}
          </div>
        )}

        {laporanTab === "gl" && (
          <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm print:shadow-none print:border-none print:m-0 print:p-0">
            <div className="text-base font-semibold mb-4 text-[#4A4A40]" style={{ fontFamily: "Arial" }}>Buku Besar (General Ledger)</div>
            <div className="text-[13px] text-[#A5A58D] mb-4">Pengelompokan transaksi berdasarkan kategori / akun (Chart of Accounts).</div>
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {[...new Set(filteredTxns.map(t => t.cat))].map(c => (
                <div key={c} className="min-w-[260px] md:min-w-[300px] border border-[#DCD9CC] rounded-xl p-4 shrink-0" style={{ backgroundColor: "#ffffff" }}>
                  <div className="font-bold pb-3 border-b border-[#DCD9CC]" style={{ color: "#000000" }}>{c}</div>
                  {filteredTxns.filter(t => t.cat === c).map(t => (
                    <div key={t.id} className="flex flex-col py-2 border-b border-dashed border-[#DCD9CC] last:border-0" style={{ color: "#000000" }}>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#A5A58D]" style={{ color: "inherit" }}>{new Date(t.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className={t.type === 'masuk' ? 'font-semibold' : 'font-semibold'} style={{ color: "inherit" }}>
                          {t.type === 'masuk' ? '+' : '-'}{fmt(t.amount)}
                        </span>
                      </div>
                      <div className="text-[11px] italic truncate mt-1" style={{ color: "inherit" }}>{t.desc}</div>
                    </div>
                  ))}
                  <div className="flex justify-between text-[13px] font-bold mt-2 pt-2 border-t border-[#DCD9CC] text-[#4A4A40]">
                    <span>Mutasi</span>
                    <span>{fmt(filteredTxns.filter(t => t.cat === c).reduce((a,b)=> a + (b.type === 'masuk' ? b.amount : -b.amount), 0))}</span>
                  </div>
                </div>
              ))}
              {filteredTxns.length === 0 && <div className="text-[13px] text-[#A5A58D]">Belum ada riwayat jurnal.</div>}
            </div>
          </div>
        )}

        {laporanTab === "pajak" && (
          <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm print:shadow-none print:border-none print:m-0 print:p-0">
            <div className="text-base font-semibold mb-4 text-[#4A4A40]">Estimasi Pajak UMKM (PPh Final 0.5%)</div>
            <div className="text-[13px] text-[#A5A58D] mb-6 max-w-2xl leading-relaxed">
              Penghitungan estimasi pajak penghasilan final berdasarkan PP No. 23 Tahun 2018 (0,5% dari omzet bruto). Tarik data sesuai periode yang difilter.
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-[#DCD9CC] rounded-xl p-4 bg-white flex flex-col justify-center">
                <div className="text-[11px] font-bold text-[#A5A58D] mb-1">TOTAL OMZET/PENDAPATAN</div>
                <div className="text-[18px] md:text-[22px] font-bold text-[#6B705C]">{fmt(totalMasuk)}</div>
              </div>
              <div className="border border-[#DCD9CC] rounded-xl p-4 bg-[#E8E6DB] flex flex-col justify-center">
                <div className="text-[11px] font-bold text-[#4A4A40] mb-1">TARIF UMKM FINAL</div>
                <div className="text-[18px] md:text-[22px] font-bold text-[#4A4A40]">0.5%</div>
              </div>
              <div className="border border-[#E8C39E] rounded-xl p-4 bg-[#FAF5ED] shadow-sm flex flex-col justify-center">
                <div className="text-[11px] font-bold text-[#B18B5E] mb-1">ESTIMASI PAJAK TERHUTANG</div>
                <div className="text-[20px] md:text-[24px] font-bold text-[#B18B5E]">{fmt(totalMasuk * 0.005)}</div>
              </div>
            </div>
          </div>
        )}

        {/* ========== RINCIAN TRANSAKSI UNTUK EDIT/HAPUS (Hanya tampil di Laporan) ========== */}
        <div className="mt-8 bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm" style={{ backgroundColor: "#368ccd" }}>
          <div className="text-base font-semibold mb-4 text-[#4A4A40]" style={{ fontFamily: "Arial", color: "#ffffff" }}>Rincian Transaksi ({filterMonth ? new Date(filterMonth + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : "Semua Periode"})</div>
          
          <div className="overflow-x-auto min-h-[200px] pr-1 md:pr-2" style={{ backgroundColor: "#ffffff", height: "200px", width: "760px", borderRadius: "20px", borderStyle: "dashed", borderWidth: "-120px", marginLeft: "0px", marginRight: "0px", marginBottom: "0px", paddingRight: "0px" }}>
            <table className="w-full border-collapse text-[12px] md:text-[13px] text-left whitespace-nowrap md:whitespace-normal">
              <thead className="sticky top-0 bg-[#FAF9F6] z-10 shadow-[0_1px_0_#DCD9CC]">
                <tr>
                  <th className="py-3 px-3 md:px-4 font-semibold md:w-[15%]" style={{ backgroundColor: "#09216c", textAlign: "center", color: "#ffffff" }}>Tanggal</th>
                  <th className="py-3 px-3 md:px-4 font-semibold md:w-[35%] whitespace-normal" style={{ backgroundColor: "#09216c", textAlign: "center", color: "#ffffff" }}>Keterangan</th>
                  <th className="py-3 px-3 md:px-4 font-semibold text-right" style={{ backgroundColor: "#09216c", textAlign: "center", color: "#ffffff" }}>Debet (Masuk)</th>
                  <th className="py-3 px-3 md:px-4 font-semibold text-right" style={{ backgroundColor: "#09216c", textAlign: "center", color: "#ffffff" }}>Kredit (Keluar)</th>
                  <th className="py-3 px-3 md:px-4 font-semibold text-center w-[60px]" style={{ backgroundColor: "#09216c", color: "#ffffff" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#A5A58D]">Tidak ada transaksi.</td>
                  </tr>
                ) : (
                  filteredTxns.map((t, index) => (
                    <tr key={t.id} className={`border-b border-[#E8E6DB] ${index % 2 === 0 ? '' : 'bg-[#FAF9F6]'} hover:bg-gray-50`}>
                      <td className="py-3 px-3 md:px-4 text-[#4A4A40]" style={{ backgroundColor: "#ffffff" }}>{new Date(t.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</td>
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
                        <button onClick={() => setDeleteId(t.id)} className="bg-transparent border-none cursor-pointer text-[#B18B5E] px-1 md:px-2 py-1 rounded hover:bg-black/5 text-[14px] md:text-[16px]">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      </div>
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

        {/* ══════════════════════════════ KALKULATOR ══════════════════════════════ */}
        {tab === "kalkulator" && (
          <Kalkulator />
        )}

        {/* ══════════════════════════════ PENGATURAN ══════════════════════════════ */}
        {tab === "pengaturan" && (
          <div className="max-w-[700px] mx-auto mt-4">
            <Pengaturan 
              currentUser={currentUser} 
              setCurrentUser={setCurrentUser} 
              registeredUsers={registeredUsers} 
              setRegisteredUsers={setRegisteredUsers} 
            />
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