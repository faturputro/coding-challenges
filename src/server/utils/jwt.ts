import { APP_PKCS8_KEY } from '@server/config/app.config';
import { AppErrorCode } from '@server/types/app';
import AppError from '@server/utils/AppError';
import dayjs, { ManipulateType } from 'dayjs';
import * as jose from 'jose';

type JWTClaim<T extends Record<string, unknown>> = { exp: number, iss: string, iat: number } & T;

export const encryptor = async (payload: Record<string, unknown>,  exp?: number, unit?: ManipulateType): Promise<string> => {
  const data = JSON.stringify({
    ...payload,
    exp: exp ? dayjs().add(exp, unit || 'day').unix() : dayjs().add(1, unit || 'day').unix(),
    iat: dayjs().unix(),
  });

  const key = await jose.importPKCS8(String(APP_PKCS8_KEY), 'RSA-OAEP-256');

  const encrypted = await new jose.CompactEncrypt(new TextEncoder().encode(data))
    .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
    .encrypt(key);

  return encrypted;
};

export const decryptor = async <T extends Record<string, unknown>>(str: string, iss: string): Promise<JWTClaim<T>> => {
  const key = await jose.importPKCS8(String(APP_PKCS8_KEY), 'RSA-OAEP-256');
  const { plaintext } = await jose.compactDecrypt(str, key);
  const decoded = JSON.parse(new TextDecoder().decode(plaintext));

  if (decoded.exp !== -1 && dayjs().isAfter(dayjs.unix(decoded.exp))) {
    throw new AppError({ code: AppErrorCode.TokenExpired, message: 'Token expired' });
  }

  return decoded as JWTClaim<T>;
};