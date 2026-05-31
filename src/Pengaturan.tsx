import React, { useState } from "react";
import { SecureStorage } from "./lib/storage";

export function Pengaturan({ 
  currentUser, 
  setCurrentUser, 
  registeredUsers, 
  setRegisteredUsers 
}: { 
  currentUser: any, 
  setCurrentUser: any, 
  registeredUsers: any[], 
  setRegisteredUsers: any 
}) {
  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    username: currentUser?.username || "",
    email: currentUser?.email || "",
    password: currentUser?.password || ""
  });
  const [msg, setMsg] = useState("");

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.username) {
      setMsg("Nama, Email, dan Username UMKM tidak boleh kosong.");
      return;
    }
    if (!/\d/.test(formData.username)) {
      setMsg("Username UMKM harus mengandung angka (contoh: Toko123).");
      return;
    }

    const otherUsers = registeredUsers.filter(u => u.username !== currentUser.username && u.email !== currentUser.email);
    if (otherUsers.some(u => u.email === formData.email || u.username === formData.username)) {
      setMsg("Email atau Username sudah digunakan pengguna lain.");
      return;
    }

    const updatedUser = { ...currentUser, ...formData };
    setCurrentUser(updatedUser);
    setRegisteredUsers([ ...otherUsers, updatedUser ]);
    setMsg("Pengaturan profil berhasil disimpan.");
    
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div className="bg-white border border-[#DCD9CC] rounded-[16px] md:rounded-[24px] p-4 md:p-6 shadow-sm">
      <div className="text-sm md:text-base font-semibold mb-4 text-[#4A4A40]">Pengaturan Akun</div>
      {msg && (
        <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${msg.includes("berhasil") ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[#ffebee] text-[#c62828]"}`}>
          {msg}
        </div>
      )}
      <div className="flex flex-col gap-4 max-w-md">
        <div>
          <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Nama Lengkap / Usaha</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-[#FAF9F6] text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Username UMKM (Dengan angka)</label>
          <input 
            type="text" 
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-[#FAF9F6] text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Email</label>
          <input 
            type="email" 
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-[#FAF9F6] text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#4A4A40] mb-1.5">Kata Sandi (Kosongkan jika tidak diubah)</label>
          <input 
            type="password" 
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full p-3 rounded-xl border border-[#DCD9CC] bg-[#FAF9F6] text-[#4A4A40] text-[13px] focus:outline-none focus:border-[#007a07]"
            placeholder="••••••••"
          />
        </div>
        
        <button 
          onClick={handleSave}
          className="mt-2 bg-[#007a07] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#006606] transition-colors"
        >
          Simpan Perubahan
        </button>

        <div className="mt-6 pt-6 border-t border-[#DCD9CC]">
          <div className="text-sm font-semibold text-[#4A4A40] mb-2">Bantuan & Dukungan</div>
          <div className="text-[12px] text-[#A5A58D] mb-4">Punya pertanyaan, kritik, atau saran? Hubungi pengembang kami.</div>
          <a
            href="mailto:studiodevelopmentmarsel@gmail.com?subject=Kritik dan Saran myAkuntansi"
            className="flex items-center justify-center w-full bg-[#FAF9F6] border border-[#DCD9CC] text-[#4A4A40] font-semibold py-3 px-4 rounded-xl hover:bg-[#E8E6DB] transition-colors"
          >
            ✉️ Kirim Kritik dan Saran
          </a>
        </div>

        <div className="mt-8 pt-6 border-t border-[#DCD9CC]">
          <div className="text-sm font-semibold text-[#c62828] mb-2">Zona Berbahaya</div>
          <div className="text-[12px] text-[#A5A58D] mb-4">Menghapus semua data keuangan (Kas, Hutang, Stok). Tindakan ini tidak dapat dibatalkan.</div>
          <button 
            onClick={() => {
              if (window.confirm("Apakah Anda yakin ingin menghapus semua data keuangan?")) {
                SecureStorage.removeItem("myAkuntansi_txns");
                SecureStorage.removeItem("myAkuntansi_debts");
                SecureStorage.removeItem("myAkuntansi_inventory");
                window.location.reload();
              }
            }}
            className="w-full bg-white border border-[#c62828] text-[#c62828] font-semibold py-3 px-4 rounded-xl hover:bg-[#ffebee] transition-colors"
          >
            Kosongkan Semua Data Keuangan
          </button>
        </div>
      </div>
    </div>
  );
}
