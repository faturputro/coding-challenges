import Admin from "@server/models/sql/Admin";
import { IAdminRepository } from "@server/types/admin";

export default class AdminRepository implements IAdminRepository {
  async getAdminByEmail(email: string) {
    return Admin.findOne({
      where: {
        email,
      },
    });
  }

  async getAdminByID(id: number) {
    return Admin.findByPk(id);
  }
}
