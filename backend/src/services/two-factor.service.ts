import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { env } from '../config/env.js';

export class TwoFactorService {
  private static algorithm = 'aes-256-gcm';

  /**
   * Deriva una clave de 32 bytes a partir de ENCRYPTION_KEY
   */
  private static getKey(): Buffer {
    const rawKey = env.ENCRYPTION_KEY || 'vuelto-256-bit-aes-encryption-key-32ch';
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encripta el secreto TOTP usando AES-256-GCM
   */
  static encryptSecret(plainSecret: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.getKey(), iv) as crypto.CipherGCM;
    let encrypted = cipher.update(plainSecret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Desencripta el secreto TOTP usando AES-256-GCM
   */
  static decryptSecret(encryptedPayload: string): string {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de secreto encriptado inválido');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.getKey(),
      Buffer.from(ivHex, 'hex')
    ) as crypto.DecipherGCM;
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Genera un nuevo secreto TOTP y un código QR en base64 para escanear con Google Authenticator
   */
  static async generateSecret(userEmail: string, issuer: string = 'Vuelto'): Promise<{
    secret: string;
    encryptedSecret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
  }> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({ secret, label: userEmail, issuer });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    const encryptedSecret = this.encryptSecret(secret);

    return {
      secret,
      encryptedSecret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Verifica un token TOTP de 6 dígitos
   */
  static verifyToken(encryptedOrPlainSecret: string, token: string): boolean {
    if (!encryptedOrPlainSecret || !token) return false;
    let plainSecret = encryptedOrPlainSecret;
    if (encryptedOrPlainSecret.includes(':')) {
      try {
        plainSecret = this.decryptSecret(encryptedOrPlainSecret);
      } catch {
        return false;
      }
    }
    const result = verifySync({ secret: plainSecret, token: token.trim() });
    return !!result && result.valid;
  }
}
