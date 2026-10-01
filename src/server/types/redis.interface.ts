import { ManipulateType } from "dayjs"

export interface IRedisRepository {
  get(key: string): Promise<string | null>
  set(key: string, value: string, duration: number, expUnit: ManipulateType): Promise<void>
  del(key: string): Promise<void>
  getTTL(key: string): Promise<number>
  isKeyExists(key: string): Promise<boolean>
}