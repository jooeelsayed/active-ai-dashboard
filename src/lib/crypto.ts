import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY environment variable is not set')
  const keyBytes = Buffer.from(key, 'utf8')
  if (keyBytes.length < KEY_LENGTH) {
    throw new Error('ENCRYPTION_KEY must be at least 32 bytes')
  }
  return keyBytes.subarray(0, KEY_LENGTH)
}

export function encrypt(text: string): string {
  if (!text) return ''
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''
  const key = getKey()
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) return ''
    
    const [ivHex, authTagHex, encrypted] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch {
    return ''
  }
}

export function encryptFields(fields: {
  loginEmail?: string | null
  loginPassword?: string | null
  licenseKey?: string | null
  accessLink?: string | null
}) {
  return {
    encryptedLoginEmail: fields.loginEmail ? encrypt(fields.loginEmail) : null,
    encryptedLoginPassword: fields.loginPassword ? encrypt(fields.loginPassword) : null,
    encryptedLicenseKey: fields.licenseKey ? encrypt(fields.licenseKey) : null,
    encryptedAccessLink: fields.accessLink ? encrypt(fields.accessLink) : null,
  }
}

export function decryptFields(fields: {
  encryptedLoginEmail?: string | null
  encryptedLoginPassword?: string | null
  encryptedLicenseKey?: string | null
  encryptedAccessLink?: string | null
}) {
  return {
    loginEmail: fields.encryptedLoginEmail ? decrypt(fields.encryptedLoginEmail) : null,
    loginPassword: fields.encryptedLoginPassword ? decrypt(fields.encryptedLoginPassword) : null,
    licenseKey: fields.encryptedLicenseKey ? decrypt(fields.encryptedLicenseKey) : null,
    accessLink: fields.encryptedAccessLink ? decrypt(fields.encryptedAccessLink) : null,
  }
}
