import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.ENCRYPTION_SECRET || "default-secret-key-change-in-production";


export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}


export function decrypt(encryptedText: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}


export function hash(text: string): string {
  return CryptoJS.SHA256(text).toString();
}





