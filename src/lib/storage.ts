import CryptoJS from 'crypto-js';

// Kunci enkripsi statis default untuk backward compatibility dan global metadata
const DEFAULT_SECRET_KEY = "myAkuntansi_secure_key_2026";

// Session-level user dynamic encryption key
let activeUserKey: string | null = null;
let activeUserEmail: string | null = null;

/**
 * Hash password menggunakan SHA-256 dengan salt tetap berkualitas tinggi
 * untuk mencegah serangan Rainbow Table dan kebocoran sandi mentah.
 */
export const hashPassword = (password: string): string => {
  if (!password) return "";
  // Jika kata sandi sudah di-hash (hex 64 karakter), jangan di-hash ulang
  if (/^[a-f0-9]{64}$/i.test(password)) {
    return password;
  }
  const salt = "myAkuntansi_super_safe_salt_2026_pbkdf2_flavor";
  return CryptoJS.SHA256(password + salt).toString();
};

export const SecureStorage = {
  /**
   * Menetapkan sesi enkripsi aman berbasis pengguna yang terautentikasi.
   * Kunci database di-derivasi secara dinamis dari Email + Password Hash.
   */
  setUserSession(email: string, passwordHash: string) {
    if (email && passwordHash) {
      activeUserEmail = email;
      activeUserKey = CryptoJS.SHA256(email + passwordHash + "db_dynamic_passphrase_salt_2026_val").toString();
    } else {
      activeUserKey = null;
      activeUserEmail = null;
    }
  },

  /**
   * Mengambil kunci enkripsi yang sesuai tergantung jenis data yang diproses.
   * Data sensitif finansial menggunakan Kunci Dinamis Pengguna,
   * sedangkan data sistem menggunakan Kunci Default tingkat sistem.
   */
  getEncryptionKey(key: string): string {
    if (activeUserKey && (key.includes("txns") || key.includes("debts") || key.includes("inventory"))) {
      return activeUserKey;
    }
    return DEFAULT_SECRET_KEY;
  },

  setItem(key: string, value: any) {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const encryptionKey = this.getEncryptionKey(key);

      // Tingkat Enkripsi: AES-256
      const encryptedValue = CryptoJS.AES.encrypt(stringValue, encryptionKey).toString();

      // Tingkat Integritas (Anti-Tampering): HMAC-SHA256 Checksum
      // Menghasilkan tanda tangan digital untuk mencegah modifikasi database secara ilegal offline
      const signature = CryptoJS.HmacSHA256(encryptedValue, encryptionKey).toString();

      // Gabungkan data terenkripsi dan tanda tangan
      const securePayload = JSON.stringify({
        payload: encryptedValue,
        digest: signature,
        updatedAt: new Date().toISOString(),
        securedBy: "myAkuntansi_Shield_v1"
      });

      localStorage.setItem(key, securePayload);
    } catch (e) {
      // Gagal menyimpan secara aman, abaikan
    }
  },

  getItem<T>(key: string): T | null {
    try {
      const rawStored = localStorage.getItem(key);
      if (!rawStored) return null;

      const encryptionKey = this.getEncryptionKey(key);

      // Coba parse payload berformat aman baru
      let encryptedPayloadStr = "";
      let storedDigest = "";
      let isSecureFormat = false;

      try {
        const parsed = JSON.parse(rawStored);
        if (parsed && parsed.securedBy === "myAkuntansi_Shield_v1" && parsed.payload) {
          encryptedPayloadStr = parsed.payload;
          storedDigest = parsed.digest;
          isSecureFormat = true;
        }
      } catch {
        // Menggunakan format lawas (plain text atau encrypted string mentah)
        encryptedPayloadStr = rawStored;
      }

      if (isSecureFormat) {
        // VERIFIKASI INTEGRITAS DATABASE (Anti-Tampering Check)
        const computedDigest = CryptoJS.HmacSHA256(encryptedPayloadStr, encryptionKey).toString();
        if (computedDigest !== storedDigest) {
          console.error(`[CYBER SECURITY ALERT] Deteksi modifikasi ilegal atau kerusakan data pada database '${key}'!`);
          // Integritas gagal - Jangan kembalikan data yang rusak/dimodifikasi pihak luar
          return null;
        }
      }

      // DEKRIPSI KEMBALI DATA
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedPayloadStr, encryptionKey);
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        // Jika gagal dekripsi dengan dynamic key, mungkin kunci belum siap di awal init,
        // coba sebagai fallback menggunakan DEFAULT_SECRET_KEY
        if (encryptionKey !== DEFAULT_SECRET_KEY) {
          const fallbackBytes = CryptoJS.AES.decrypt(encryptedPayloadStr, DEFAULT_SECRET_KEY);
          const fallbackString = fallbackBytes.toString(CryptoJS.enc.Utf8);
          if (fallbackString) {
            try {
              return JSON.parse(fallbackString) as T;
            } catch {
              return fallbackString as unknown as T;
            }
          }
        }
        return null;
      }

      try {
        return JSON.parse(decryptedString) as T;
      } catch {
        return decryptedString as unknown as T;
      }
    } catch (e) {
      // Fallback mutlak pasca-migrasi atau jika data belum dienkripsi
      const rawValue = localStorage.getItem(key);
      if (rawValue) {
        try {
          // Jika data lawas berformat JSON plain
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
