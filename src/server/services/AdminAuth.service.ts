import { IAdminAuthService, IAdminRepository } from "@server/types/admin";
import { AppErrorCode } from "@server/types/app";
import AppError from "@server/utils/AppError";
import Validator from "validatorjs";
import bcrypt from 'bcryptjs';
import { encryptor } from "@server/utils/jwt";
import { IRedisRepository } from "@server/types/redis.interface";

export default class AdminAuthService implements IAdminAuthService {
  constructor(
    private readonly adminRepo: IAdminRepository,
    private readonly redisRepo: IRedisRepository,
  ) {}

  async authenticate(email: string, password: string) {
    const validator = new Validator({ email, password }, {
      email: 'required|email',
      password: 'required'
    });

    if (validator.fails()) {
      throw new AppError({
        code: AppErrorCode.Unauthorized,
        message: 'Invalid email/password',
      });
    }

    const admin = await this.adminRepo.getAdminByEmail(email);
    if (admin) {
      const valid = await bcrypt.compare(password, admin.password);
      if (valid) {
        const token = await encryptor({ id: admin.id }, 1, 'day');
        await this.redisRepo.set(`admin_session:${admin.id}`, JSON.stringify({ id: admin.id, email: admin.email }), 1, 'day');
        return token;
      }

      throw new AppError({
        code: AppErrorCode.Unauthorized,
        message: 'Invalid email/password',
      });
    }

    throw new AppError({
      code: AppErrorCode.Unauthorized,
      message: 'Invalid email/password',
    });
  }

  async getProfile(id: number) {
    const profile = await this.adminRepo.getAdminByID(id);
    if (!profile) {
      throw new AppError({
        code: AppErrorCode.BadRequest,
        message: 'Profile not found'
      });
    }

    return profile;
  }
}
