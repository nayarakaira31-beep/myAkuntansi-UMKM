import { useState, useMemo } from "react";
import { AiAssistant } from "./AiAssistant";
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

const CAT_MASUK = ["Penjualan Produk", "Jasa / Layanan", "Investasi Masuk", "Pinjaman", "Pendapatan Lain"];
const CAT_KELUAR = ["Bahan Baku", "Gaji Karyawan", "Operasional", "Marketing & Iklan", "Utilitas", "Pajak & Admin", "Pengeluaran Lain"];

const PIE_COLORS = ["#6B705C", "#8A8F78", "#A5A58D", "#B18B5E", "#C5A582", "#A08C75", "#7A6A55", "#4A4A40"];

const INIT_TXNS = [
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
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [txns, setTxns] = useState(INIT_TXNS);
  const [form, setForm] = useState({
    date: "2026-05-09", desc: "", cat: "", type: "masuk", amount: ""
  });
  const [filterType, setFilterType] = useState("semua");
  const [filterMonth, setFilterMonth] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean, text: string } | null>(null);

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

  const totalMasuk  = useMemo(() => globalFilteredTxns.filter(t => t.type === "masuk").reduce((s, t) => s + t.amount, 0), [globalFilteredTxns]);
  const totalKeluar = useMemo(() => globalFilteredTxns.filter(t => t.type === "keluar").reduce((s, t) => s + t.amount, 0), [globalFilteredTxns]);
  const laba        = totalMasuk - totalKeluar;
  const margin      = totalMasuk > 0 ? ((laba / totalMasuk) * 100).toFixed(1) : "0";

  const dailyData = useMemo(() => {
    const map: Record<string, any> = {};
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

  const filteredTxns = useMemo(() => {
    let list = filterType === "semua" ? globalFilteredTxns : globalFilteredTxns.filter(t => t.type === filterType);
    
    // Calculate running balance
    const sortedAsc = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentBalance = 0;
    const withBalance = sortedAsc.map(t => {
      if (t.type === 'masuk') currentBalance += t.amount;
      else currentBalance -= t.amount;
      return { ...t, saldo: currentBalance };
    });
    
    // Return descending
    return withBalance.reverse();
  }, [globalFilteredTxns, filterType]);

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

    setTxns(prev => [...prev, { id: Date.now(), date: form.date, desc: form.desc, cat: form.cat, type: form.type, amount: amt }]);
    setForm({ date: new Date().toISOString().split("T")[0], desc: "", cat: "", type: "masuk", amount: "" });
    setMsg({ ok: true, text: "Transaksi berhasil disimpan!" });
    setTimeout(() => setMsg(null), 3000);
  };

  const cats = form.type === "masuk" ? CAT_MASUK : CAT_KELUAR;

  const CustomTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "#ffffff", border: "0.5px solid #DCD9CC", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
        <p style={{ margin: "0 0 6px 0", fontWeight: 500 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ margin: "2px 0", color: p.color }}>{p.name}: {fmtS(p.value)}</p>
        ))}
      </div>
    );
  };

  const c = {
    wrap: { fontFamily: "system-ui, -apple-system, sans-serif", color: "#4A4A40", minHeight: 640, background: "#FAF9F6" },
    header: { background: "#007a07", borderBottom: "1px solid #DCD9CC", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    nav: { display: "flex", background: "#ad9e6d", borderBottom: "0.5px solid #DCD9CC" },
    navBtn: (a: boolean) => ({ padding: "11px 18px", fontSize: 13, border: "none", background: "none", cursor: "pointer", fontWeight: a ? 600 : 400, color: "#ffffff", borderBottom: a ? "2px solid #ffffff" : "2px solid transparent" }),
    body: { padding: "18px 20px" },
    card: { background: "#ffffff", border: "0.5px solid #DCD9CC", borderRadius: 24, padding: "24px", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
    metric: { background: "#dad2c6", color: "#6b705c", borderRadius: 24, padding: "14px 16px", border: "1px solid #DCD9CC" },
    lbl: { fontSize: 11, color: "#A5A58D", marginBottom: 4, letterSpacing: 0.3, textTransform: "uppercase" as any },
    num: (color?: string) => ({ fontSize: 20, fontWeight: 600, color: color || "#4A4A40", letterSpacing: "-0.5px" }),
    sTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#4A4A40" },
    input: { width: "100%", padding: "9px 11px", borderRadius: 8, border: "0.5px solid #DCD9CC", background: "#ffffff", color: "#4A4A40", fontSize: 13, boxSizing: "border-box" as any },
    pill: (t: string) => ({ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: t === "masuk" ? "#E8E6DB" : "#F0EEE4", color: t === "masuk" ? "#6B705C" : "#B18B5E" }),
  };

  return (
    <div style={c.wrap}>
      <AiAssistant txns={txns} setTxns={setTxns} catsMasuk={CAT_MASUK} catsKeluar={CAT_KELUAR} onExport={exportCSV} />
      {/* ── Header ─────────────────────────────── */}
      <div style={c.header}>
        <div>
          <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>myAkuntansi UMKM</div>
          <div style={{ color: "#ffffff", fontSize: 11, marginTop: 2 }}>Sistem Akuntansi & Keuangan Usaha Kecil</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "#ffffff", fontSize: 13, cursor: "pointer", outline: "none", appearance: "none" }}
          >
            <option value="" style={{ color: '#000' }}>Semua Bulan</option>
            {availableMonths.map(m => (
              <option key={m} value={m} style={{ color: '#000' }}>{new Date(m + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffffff", boxShadow: "0 0 0 2px rgba(255,255,255,0.3)" }}></div>
            <span style={{ fontSize: 11, color: "#ffffff", fontWeight: 500, opacity: 0.9 }}>Live · {globalFilteredTxns.length} txns</span>
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────── */}
      <div style={c.nav}>
        {TABS.map(t => (
          <button key={t.id} style={c.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={c.body}>

        {/* ══════════════════════════════ DASHBOARD ══════════════════════════════ */}
        {tab === "dashboard" && (
          <>
            {/* KPI Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Total Pemasukan", val: fmtS(totalMasuk), color: "#6B705C", sub: `${pieMasuk.length} sumber`, subColor: "#6B705C" },
                { label: "Total Pengeluaran", val: fmtS(totalKeluar), color: "#6b705c", sub: `${pieKeluar.length} kategori`, subColor: "#B18B5E" },
                { label: "Laba Bersih", val: fmtS(laba), color: laba >= 0 ? "#6B705C" : "#B18B5E", sub: `Margin ${margin}%`, subColor: laba >= 0 ? "#6B705C" : "#B18B5E" },
                { label: "Total Transaksi", val: txns.length, color: "#4A4A40", sub: "Periode ini", subColor: "#A5A58D" },
              ].map((m, i) => (
                <div key={i} style={c.metric}>
                  <div style={c.lbl}>{m.label}</div>
                  <div style={c.num(m.color?.toString())}>{m.val}</div>
                  <div style={{ fontSize: 11, color: m.subColor, marginTop: 5, fontWeight: 500 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Line Chart — Arus Kas */}
            <div style={{ ...c.card, marginBottom: 14 }}>
              <div style={c.sTitle}>Grafik Arus Kas Harian — {filterMonth ? new Date(filterMonth + "-01").toLocaleDateString('id-ID', { year: 'numeric', month: 'long' }) : "Semua Periode"}</div>
              <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                {[["#6B705C","Pemasukan"],["#B18B5E","Pengeluaran"]].map(([col, lbl]) => (
                  <span key={lbl} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#A5A58D" }}>
                    <span style={{ width:18, height:3, background:col, borderRadius:2, display:"inline-block" }}></span>{lbl}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={210}>
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

            {/* Pie + Bar row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Pie Pengeluaran */}
              <div style={c.card}>
                <div style={c.sTitle}>Breakdown Pengeluaran</div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieKeluar} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" nameKey="name" paddingAngle={2}>
                        {pieKeluar.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtS(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, marginLeft: 12 }}>
                    {pieKeluar.map((d, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }}></span>
                        <span style={{ fontSize: 11, color: "#A5A58D", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#4A4A40' }}>{fmtS(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar Sumber Pendapatan */}
              <div style={c.card}>
                <div style={c.sTitle}>Sumber Pemasukan</div>
                <ResponsiveContainer width="100%" height={180}>
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

            {/* Quick recent txns */}
            <div style={{ ...c.card, marginTop: 14 }}>
              <div style={c.sTitle}>5 Transaksi Terakhir</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...txns].reverse().slice(0, 5).map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "8px 12px", background: "#FAF9F6", borderRadius: '8px', border: "1px solid #DCD9CC" }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.type === "masuk" ? "#E8E6DB" : "#F0EEE4", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, fontSize: 14, flexShrink: 0, color: t.type === "masuk" ? "#6B705C" : "#B18B5E" }}>
                      {t.type === "masuk" ? "↑" : "↓"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: '#4A4A40' }}>{t.desc}</div>
                      <div style={{ fontSize: 11, color: "#A5A58D", marginTop: 2 }}>{t.date} • {t.cat}</div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: t.type === "masuk" ? "#6B705C" : "#B18B5E", marginLeft: 10 }}>
                      {t.type === "masuk" ? "+" : "−"}{fmtS(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════ TRANSAKSI ══════════════════════════════ */}
        {tab === "transaksi" && (
          <div style={{ display: "flex", gap: 16 }}>

            {/* Form Panel */}
            <div style={{ ...c.card, width: 300, flexShrink: 0, alignSelf: 'flex-start', backgroundColor: '#125927' }}>
              <div style={c.sTitle}>Tambah Transaksi Baru</div>

              {msg && (
                <div style={{ padding: "9px 12px", borderRadius: 8, background: msg.ok ? "#E8E6DB" : "#F0EEE4", color: msg.ok ? "#6B705C" : "#B18B5E", fontSize: 12, marginBottom: 12, border: `1px solid ${msg.ok ? '#DCD9CC' : '#DCD9CC'}` }}>
                  {msg.ok ? "✓ " : "✕ "}{msg.text}
                </div>
              )}

              {/* Type Toggle */}
              <div style={{ marginBottom: 16 }}>
                <div style={c.lbl}>Jenis Transaksi</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["masuk","Pemasukan","↑","#6B705C"],["keluar","Pengeluaran","↓","#B18B5E"]].map(([val, lbl, arrow, col]) => (
                    <button key={val} onClick={() => setForm(f => ({ ...f, type: val, cat: "" }))}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1.5px solid ${form.type === val ? col : "#DCD9CC"}`, background: form.type === val ? col + "12" : "#fff", color: val === "masuk" ? "#fdfffb" : form.type === val ? col : "#A5A58D", fontWeight: form.type === val ? 600 : 400, fontSize: 13, cursor: "pointer", transition: 'all 0.2s' }}>
                      {arrow} {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fields */}
              {[
                { label: "Tanggal", el: <input type="date" style={c.input} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /> },
                { label: "Deskripsi", el: <input type="text" style={c.input} placeholder="Keterangan singkat..." value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /> },
                { label: "Kategori", el: (
                  <select style={c.input} value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
                    <option value="">Pilih kategori...</option>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )},
                { label: "Nominal (Rp)", el: (
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: 10, color: "#A5A58D", fontSize: 13 }}>Rp</span>
                    <input type="text" style={{ ...c.input, paddingLeft: 36 }} placeholder="0" value={form.amount} onChange={e => {
                      const val = e.target.value.replace(/\D/g, "");
                      setForm(f => ({ ...f, amount: val ? parseInt(val, 10).toLocaleString('id-ID') : "" }));
                    }} />
                  </div>
                )},
              ].map(({ label, el }) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={c.lbl}>{label}</div>
                  {el}
                </div>
              ))}

              <button onClick={addTxn} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "none", backgroundColor: "#367609", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 4, transition: 'background 0.2s' }}>
                + Simpan Transaksi
              </button>

              {/* Mini summary */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed #DCD9CC" }}>
                <div style={{ ...c.lbl, marginBottom: 4 }}>Saldo Saat Ini</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: laba >= 0 ? "#6B705C" : "#B18B5E", letterSpacing: '-0.5px' }}>{fmtS(laba)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, background: '#FAF9F6', padding: '10px', borderRadius: '8px' }}>
                  <div>
                    <div style={{fontSize: 10, color: '#A5A58D', textTransform: 'uppercase', marginBottom: 2}}>Total Masuk</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#6B705C" }}>{fmtS(totalMasuk)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{fontSize: 10, color: '#A5A58D', textTransform: 'uppercase', marginBottom: 2}}>Total Keluar</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#B18B5E" }}>{fmtS(totalKeluar)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction List */}
            <div style={{ ...c.card, flex: 1, minWidth: 0, position: 'relative' }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #DCD9CC' }}>
                <div style={c.sTitle}>Riwayat Transaksi ({filteredTxns.length})</div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <button onClick={exportCSV} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #A5A58D", backgroundColor: "#007a07", color: "#3b3b27", fontSize: 13, cursor: "pointer", fontWeight: 600, transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
                    📥 Ekspor CSV
                  </button>
                  <div style={{ display: "flex", gap: 6, background: '#DCD9CC', padding: '4px', borderRadius: '8px' }}>
                    {[["semua","Semua"],["masuk","Masuk"],["keluar","Keluar"]].map(([val, lbl]) => (
                      <button key={val} onClick={() => setFilterType(val)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 12, cursor: "pointer", background: filterType === val ? "#fff" : "transparent", color: filterType === val ? "#4A4A40" : "#A5A58D", fontWeight: filterType === val ? 600 : 500, boxShadow: filterType === val ? "0 1px 2px rgba(0,0,0,0.05)" : "none", transition: 'all 0.2s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ maxHeight: 520, overflowY: "auto", paddingRight: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#FAF9F6', zIndex: 1, boxShadow: '0 1px 0 #DCD9CC' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', color: '#A5A58D', fontWeight: 600, width: '15%' }}>Tanggal</th>
                      <th style={{ padding: '12px 16px', color: '#A5A58D', fontWeight: 600, width: '35%' }}>Keterangan</th>
                      <th style={{ padding: '12px 16px', color: '#A5A58D', fontWeight: 600, textAlign: 'right' }}>Debet (Masuk)</th>
                      <th style={{ padding: '12px 16px', color: '#A5A58D', fontWeight: 600, textAlign: 'right' }}>Kredit (Keluar)</th>
                      {filterType === 'semua' && <th style={{ padding: '12px 16px', color: '#A5A58D', fontWeight: 600, textAlign: 'right' }}>Saldo</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxns.length === 0 ? (
                      <tr>
                        <td colSpan={filterType === 'semua' ? 5 : 4} style={{ padding: '30px', textAlign: 'center', color: '#A5A58D' }}>Tidak ada transaksi.</td>
                      </tr>
                    ) : (
                      filteredTxns.map((t, index) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid #E8E6DB', background: index % 2 === 0 ? '#fff' : '#FAF9F6' }}>
                          <td style={{ padding: '12px 16px', color: '#4A4A40' }}>{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 500, color: '#4A4A40' }}>{t.desc}</div>
                            <div style={{ fontSize: 11, color: '#A5A58D', marginTop: 4 }}>{t.cat}</div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: '#6B705C' }}>
                            {t.type === 'masuk' ? fmt(t.amount) : '-'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: '#B18B5E' }}>
                           {t.type === 'keluar' ? fmt(t.amount) : '-'}
                          </td>
                          {filterType === 'semua' && (
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: t.saldo >= 0 ? '#6B705C' : '#B18B5E' }}>
                              {fmt(t.saldo)}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ LAPORAN ══════════════════════════════ */}
        {tab === "laporan" && (
          <>
            {/* P&L Summary */}
            <div style={{ ...c.card, marginBottom: 16 }}>
              <div style={{ ...c.sTitle, marginBottom: 16 }}>Laporan Laba Rugi — {filterMonth ? filterMonth : "Semua Periode"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 260px", gap: 24 }}>

                {/* Pendapatan */}
                <div>
                  <div style={{ fontSize: 11, color: "#6B705C", fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 }}>PENDAPATAN</div>
                  <div style={{ background: '#FAF9F6', borderRadius: '8px', padding: '8px 12px', border: '1px solid #DCD9CC' }}>
                  {pieMasuk.map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: i < pieMasuk.length-1 ? "1px dashed #DCD9CC" : "none" }}>
                      <span style={{ color: "#A5A58D" }}>{d.name}</span>
                      <span style={{ fontWeight: 500, color: "#6B705C" }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                  {pieMasuk.length === 0 && <div style={{ fontSize: 12, color: '#A5A58D', padding: '4px 0' }}>Belum ada data</div>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, marginTop: 12, color: "#6B705C", padding: '0 4px' }}>
                    <span>Total Pendapatan</span><span>{fmt(totalMasuk)}</span>
                  </div>
                </div>

                {/* Pengeluaran */}
                <div>
                  <div style={{ fontSize: 11, color: "#B18B5E", fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 }}>PENGELUARAN</div>
                  <div style={{ background: '#FAF9F6', borderRadius: '8px', padding: '8px 12px', border: '1px solid #DCD9CC' }}>
                  {pieKeluar.map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: i < pieKeluar.length-1 ? "1px dashed #DCD9CC" : "none" }}>
                      <span style={{ color: "#A5A58D" }}>{d.name}</span>
                      <span style={{ fontWeight: 500, color: "#B18B5E" }}>{fmt(d.value)}</span>
                    </div>
                  ))}
                  {pieKeluar.length === 0 && <div style={{ fontSize: 12, color: '#A5A58D', padding: '4px 0' }}>Belum ada data</div>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, marginTop: 12, color: "#B18B5E", padding: '0 4px' }}>
                    <span>Total Pengeluaran</span><span>{fmt(totalKeluar)}</span>
                  </div>
                </div>

                {/* Ringkasan Box */}
                <div style={{ background: laba >= 0 ? "#E8E6DB" : "#F0EEE4", borderRadius: 12, padding: "20px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: laba >= 0 ? "#6B705C" : "#B18B5E", marginBottom: 16, letterSpacing: 0.5 }}>RINGKASAN L/R</div>
                  {[
                    { lbl: "Pendapatan", val: fmt(totalMasuk), col: "#6B705C" },
                    { lbl: "Pengeluaran", val: fmt(totalKeluar), col: "#B18B5E" },
                  ].map(m => (
                    <div key={m.lbl} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: "#A5A58D" }}>{m.lbl}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: m.col }}>{m.val}</div>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${laba >= 0 ? "#A5A58D" : "#DCD9CC"}`, paddingTop: 16, marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: "#A5A58D", marginBottom: 4 }}>Laba Bersih</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: laba >= 0 ? "#6B705C" : "#B18B5E", letterSpacing: "-0.5px" }}>{fmt(laba)}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <div style={{ background: laba >= 0 ? "#DCD9CC" : "#F0EEE4", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: laba >= 0 ? "#6B705C" : "#B18B5E", border: `1px solid ${laba >= 0 ? '#DCD9CC' : '#DCD9CC'}` }}>
                        Margin {margin}%
                      </div>
                      <div style={{ background: laba >= 0 ? "#DCD9CC" : "#F0EEE4", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: laba >= 0 ? "#6B705C" : "#B18B5E", border: `1px solid ${laba >= 0 ? '#DCD9CC' : '#DCD9CC'}` }}>
                        {laba >= 0 ? "✓ Surplus" : "✕ Defisit"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Laporan Arus Kas */}
            <div style={{ ...c.card, marginBottom: 16 }}>
              <div style={c.sTitle}>Laporan Arus Kas — {filterMonth ? filterMonth : "Semua Periode"}</div>
              <div style={{ background: '#FAF9F6', borderRadius: '12px', padding: '16px 20px', border: '1px solid #DCD9CC' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '12px 0', color: '#6B705C', fontWeight: 600 }}>Arus Kas Masuk (Penerimaan)</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600, color: '#6B705C' }}>{fmt(totalMasuk)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0 12px 16px', color: '#A5A58D', fontSize: 13 }}>Dari Pendapatan Operasional & Lainnya</td>
                      <td style={{ padding: '4px 0 12px 16px', textAlign: 'right', color: '#A5A58D', fontSize: 13 }}>{fmt(totalMasuk)}</td>
                    </tr>
                    <tr style={{ borderTop: '1px dashed #DCD9CC' }}>
                      <td style={{ padding: '12px 0', color: '#B18B5E', fontWeight: 600 }}>Arus Kas Keluar (Pengeluaran)</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600, color: '#B18B5E' }}>{fmt(totalKeluar)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 0 12px 16px', color: '#A5A58D', fontSize: 13 }}>Untuk Pembayaran Operasional & Kas</td>
                      <td style={{ padding: '4px 0 12px 16px', textAlign: 'right', color: '#A5A58D', fontSize: 13 }}>{fmt(totalKeluar)}</td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #DCD9CC' }}>
                      <td style={{ padding: '16px 0', color: '#4A4A40', fontWeight: 700, fontSize: 16 }}>Kenaikan/Penurunan Kas Bersih</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: 700, fontSize: 16, color: laba >= 0 ? '#6B705C' : '#B18B5E' }}>{fmt(laba)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bar Chart Comparison */}
            <div style={c.card}>
              <div style={c.sTitle}>Pemasukan vs Pengeluaran per Hari</div>
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                {[["#6B705C","Pemasukan"],["#B18B5E","Pengeluaran"]].map(([col, lbl]) => (
                  <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#A5A58D" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: col, display: "inline-block" }}></span>{lbl}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={230}>
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

            {/* Rasio Keuangan */}
            <div style={{ ...c.card, marginTop: 16 }}>
              <div style={c.sTitle}>Metrik Usaha</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { lbl: "Gross Profit Margin", val: `${margin}%`, desc: "Laba / Pendapatan", good: parseFloat(margin.toString()) >= 20 },
                  { lbl: "Biaya vs Pendapatan", val: totalMasuk > 0 ? `${((totalKeluar / totalMasuk) * 100).toFixed(1)}%` : "—", desc: "Pengeluaran / Pendapatan", good: (totalKeluar / totalMasuk) < 0.8 },
                  { lbl: "Jumlah Transaksi Masuk", val: txns.filter(t => t.type === "masuk").length, desc: "Entri pendapatan", good: true },
                  { lbl: "Rata-rata per Transaksi", val: txns.length > 0 ? fmtS(Math.round((totalMasuk + totalKeluar) / txns.length)) : "—", desc: "Nilai rata-rata dari total", good: true },
                ].map((r, i) => (
                  <div key={i} style={{ background: r.good ? "#FAF9F6" : "#F0EEE4", border: `1px solid ${r.good ? '#E8E6DB' : '#F0EEE4'}`, borderRadius: 24, padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, color: "#A5A58D", marginBottom: 6 }}>{r.lbl}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: r.good ? "#6B705C" : "#B18B5E", letterSpacing: '-0.5px' }}>{r.val}</div>
                    <div style={{ fontSize: 11, color: r.good ? "#6B705C" : "#B18B5E", marginTop: 6, fontWeight: 500 }}>{r.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
