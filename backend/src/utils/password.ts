import { hash, verify } from '@node-rs/argon2';
import bcrypt from 'bcryptjs';

export class PasswordService {
  /**
   * Genera hash de contraseña utilizando Argon2id (Recomendación OWASP 2024 para almacenamiento seguro)
   */
  static async hash(password: string): Promise<string> {
    return hash(password, {
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
  }

  /**
   * Verifica la contraseña contra el hash almacenado.
   * Compatible hacia atrás: valida tanto hashes modernos Argon2id como hashes legacy bcrypt.
   */
  static async verify(password: string, hashStr: string): Promise<boolean> {
    if (!password || !hashStr) return false;

    // 1. Verificación nativa Argon2id
    if (hashStr.startsWith('$argon2')) {
      try {
        return await verify(hashStr, password);
      } catch {
        return false;
      }
    }

    // 2. Compatibilidad retroactiva con hashes bcrypt ($2a$, $2b$, $2y$)
    if (hashStr.startsWith('$2a$') || hashStr.startsWith('$2b$') || hashStr.startsWith('$2y$')) {
      try {
        return await bcrypt.compare(password, hashStr);
      } catch {
        return false;
      }
    }

    return false;
  }
}
