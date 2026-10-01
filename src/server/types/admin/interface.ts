import Admin from "@server/models/sql/Admin";

export interface IAdminRepository {
  getAdminByEmail(email: string): Promise<Admin | null>
  getAdminByID(id: number): Promise<Admin | null>
}

export interface IAdminAuthService {
  authenticate(email: string, password: string): Promise<string>
  getProfile(id: number): Promise<Admin>
}
