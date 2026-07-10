import 'server-only'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { decrypt, encrypt } from '@/lib/crypto'

const META_COOKIE = 'active_ai_meta_connection'
const META_COOKIE_MAX_AGE = 30 * 24 * 60 * 60
const DEFAULT_GRAPH_VERSION = 'v25.0'

const connectionSchema = z.object({
  userId: z.string().min(1),
  pageId: z.string().regex(/^\d+$/),
  pageName: z.string().min(1).max(200),
  accessToken: z.string().min(20).max(4096),
  connectedAt: z.string().datetime(),
  managedByEnvironment: z.boolean().optional(),
})

export type MetaConnection = z.infer<typeof connectionSchema>

export interface MetaForm {
  id: string
  name: string
  status?: string
}

export interface MetaLeadField {
  name: string
  values?: string[]
}

export interface MetaLead {
  id: string
  created_time?: string
  ad_id?: string
  ad_name?: string
  form_id?: string
  field_data?: MetaLeadField[]
}

export interface MetaLeadContact {
  id: string
  createdTime: string | null
  adName: string | null
  name: string
  email: string | null
  phone: string | null
}

interface MetaCollection<T> {
  data?: T[]
  paging?: { cursors?: { after?: string } }
}

interface MetaErrorPayload {
  error?: { message?: string; code?: number }
}

export class MetaApiError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message)
    this.name = 'MetaApiError'
  }
}

export function getMetaGraphVersion(): string {
  const configured = process.env.META_GRAPH_API_VERSION
  return configured && /^v\d+\.\d+$/.test(configured)
    ? configured
    : DEFAULT_GRAPH_VERSION
}

export async function metaGraphFetch<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${getMetaGraphVersion()}/${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))

  let response: Response
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new MetaApiError('تعذر الاتصال بخوادم Meta. حاول مرة أخرى.')
  }

  let payload: T & MetaErrorPayload
  try {
    payload = await response.json() as T & MetaErrorPayload
  } catch {
    throw new MetaApiError('استجابة غير صالحة من Meta')
  }

  if (!response.ok || payload.error) {
    const message = payload.error?.message || 'رفضت Meta الطلب. راجع صلاحيات التوكن والصفحة.'
    throw new MetaApiError(message, response.status >= 400 ? response.status : 502)
  }

  return payload
}

export async function getMetaPage(pageId: string, accessToken: string) {
  return metaGraphFetch<{ id: string; name: string }>(pageId, accessToken, {
    fields: 'id,name',
  })
}

export async function getMetaForms(connection: MetaConnection): Promise<MetaForm[]> {
  const result = await metaGraphFetch<MetaCollection<MetaForm>>(
    `${connection.pageId}/leadgen_forms`,
    connection.accessToken,
    { fields: 'id,name,status', limit: '100' }
  )
  return result.data ?? []
}

export async function getMetaLeads(
  connection: MetaConnection,
  formId: string
): Promise<MetaLead[]> {
  const result = await metaGraphFetch<MetaCollection<MetaLead>>(
    `${formId}/leads`,
    connection.accessToken,
    {
      fields: 'id,created_time,ad_id,ad_name,form_id,field_data',
      limit: '100',
    }
  )
  return result.data ?? []
}

export function mapMetaLead(lead: MetaLead): MetaLeadContact | null {
  const fields = new Map(
    (lead.field_data ?? []).map((field) => [
      field.name.trim().toLowerCase(),
      field.values?.map((value) => value.trim()).filter(Boolean) ?? [],
    ])
  )
  const first = (name: string) => fields.get(name)?.[0] || ''

  const fullName = first('full_name')
  const combinedName = [first('first_name'), first('last_name')].filter(Boolean).join(' ')
  const emailValue = first('email').toLowerCase()
  const email = z.string().email().safeParse(emailValue).success ? emailValue : null
  const phone = first('phone_number') || first('phone') || null
  const name = (fullName || combinedName || email || phone || '').trim().slice(0, 200)
  if (name.length < 2) return null

  return {
    id: lead.id,
    createdTime: lead.created_time || null,
    adName: lead.ad_name?.slice(0, 200) || null,
    name,
    email,
    phone: phone?.slice(0, 40) || null,
  }
}

export async function getMetaConnection(userId: string): Promise<MetaConnection | null> {
  const environmentPageId = process.env.META_PAGE_ID
  const environmentAccessToken = process.env.META_PAGE_ACCESS_TOKEN
  if (environmentPageId && environmentAccessToken && /^\d+$/.test(environmentPageId)) {
    return {
      userId,
      pageId: environmentPageId,
      pageName: process.env.META_PAGE_NAME || 'Meta Business Page',
      accessToken: environmentAccessToken,
      connectedAt: new Date().toISOString(),
      managedByEnvironment: true,
    }
  }

  const encrypted = (await cookies()).get(META_COOKIE)?.value
  if (!encrypted) return null

  try {
    const parsed = connectionSchema.safeParse(JSON.parse(decrypt(encrypted)))
    if (!parsed.success || parsed.data.userId !== userId) return null
    return parsed.data
  } catch {
    return null
  }
}

export async function saveMetaConnection(connection: MetaConnection): Promise<void> {
  const value = encrypt(JSON.stringify(connectionSchema.parse(connection)))
  const cookieStore = await cookies()
  cookieStore.set(META_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: META_COOKIE_MAX_AGE,
    path: '/api/meta',
    priority: 'high',
  })
}

export async function clearMetaConnection(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(META_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/meta',
  })
}
