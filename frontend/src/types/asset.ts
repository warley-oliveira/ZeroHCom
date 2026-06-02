export type AssetStatus = "available" | "rented" | "maintenance"

export interface Asset {
  id: string
  name: string
  asset_type: string | null
  status: AssetStatus
  metadata: Record<string, unknown>
}
