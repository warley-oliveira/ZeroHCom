export interface Customer {
  id: string
  name: string
  email: string | null
  external_id: string | null
  portal_token: string
  portal_url: string
}
