'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Permission } from '@/lib/rbac'

interface PermissionsState {
  role: string
  permissions: Permission[]
  loading: boolean
}

// ─── Global in-memory cache to avoid re-fetching on every page ────────────
let _cache: { role: string; permissions: Permission[] } | null = null
let _fetching = false
const _listeners: Array<() => void> = []

async function fetchPermissions() {
  if (_fetching) return
  _fetching = true
  try {
    const res = await fetch('/api/permissions')
    if (res.ok) {
      const data = await res.json()
      _cache = { role: data.role, permissions: data.permissions }
      _listeners.forEach(fn => fn())
    }
  } finally {
    _fetching = false
  }
}

export function usePermissions(): PermissionsState & { can: (p: Permission) => boolean; invalidate: () => void } {
  const [state, setState] = useState<PermissionsState>({
    role: '',
    permissions: _cache?.permissions ?? [],
    loading: !_cache,
  })

  const refresh = useCallback(() => {
    if (_cache) {
      setState({ role: _cache.role, permissions: _cache.permissions, loading: false })
    }
  }, [])

  useEffect(() => {
    if (_cache) {
      setState({ role: _cache.role, permissions: _cache.permissions, loading: false })
      return
    }
    _listeners.push(refresh)
    fetchPermissions()
    return () => {
      const idx = _listeners.indexOf(refresh)
      if (idx !== -1) _listeners.splice(idx, 1)
    }
  }, [refresh])

  const can = useCallback((permission: Permission) => {
    return state.permissions.includes(permission)
  }, [state.permissions])

  const invalidate = useCallback(() => {
    _cache = null
    setState(s => ({ ...s, loading: true }))
    fetchPermissions()
  }, [])

  return { ...state, can, invalidate }
}
