import CryptoJS from 'crypto-js';

// Kunci enkripsi statis untuk mengamankan data di local storage 
// (Dalam aplikasi produksi nyata, key ini idealnya didapatkan dari PIN/Password pengguna saat login)
const SECRET_KEY = "myAkuntansi_secure_key_2026";

export const SecureStorage = {
  setItem(key: string, value: any) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const encryptedValue = CryptoJS.AES.encrypt(stringValue, SECRET_KEY).toString();
      localStorage.setItem(key, encryptedValue);
    } catch (e) {
      // ignore
    }
  },

  getItem<T>(key: string): T | null {
    try {
      const encryptedValue = localStorage.getItem(key);
      if (!encryptedValue) return null;
      
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedValue, SECRET_KEY);
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) return null;
      
      try {
        return JSON.parse(decryptedString) as T;
      } catch {
        return decryptedString as unknown as T; // Kembalikan string jika bukan JSON
      }
    } catch (e) {
      // ignore
      // Fallback: coba baca sebagai data tidak terenkripsi (untuk backward compatibility / migrasi saat update)
      const rawValue = localStorage.getItem(key);
      if (rawValue) {
        try {
          return JSON.parse(rawValue) as T;
        } catch {
          return rawValue as unknown as T;
        }
      }
      return null;
    }
  },

  removeItem(key: string) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  }
};
