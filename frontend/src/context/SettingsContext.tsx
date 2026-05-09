import React, {
  createContext, useCallback, useContext, useEffect, useState,
} from 'react'
import {
  deviceApi, ruleApi, alertConfigApi,
  ApiDevice, ApiRule, ApiAlertConfig, ApiDeviceCredentials,
} from '../api/config'

interface SettingsContextValue {
  // Devices
  devices: ApiDevice[]
  devicesLoading: boolean
  fetchDevices: (zoneId?: string) => Promise<void>
  createDevice: (data: Parameters<typeof deviceApi.create>[0]) => Promise<ApiDevice>
  updateDevice: (id: string, data: Parameters<typeof deviceApi.update>[1]) => Promise<ApiDevice>
  deleteDevice: (id: string) => Promise<void>
  getDeviceCredentials: (id: string) => Promise<ApiDeviceCredentials>
  resetDeviceApiKey: (id: string) => Promise<ApiDeviceCredentials>

  // Rules
  rules: ApiRule[]
  rulesLoading: boolean
  fetchRules: (zoneId?: string) => Promise<void>
  createRule: (data: Parameters<typeof ruleApi.create>[0], zoneId?: string) => Promise<ApiRule>
  updateRule: (id: string, data: Parameters<typeof ruleApi.update>[1], zoneId?: string) => Promise<ApiRule>
  toggleRule: (id: string, zoneId?: string) => Promise<void>
  deleteRule: (id: string, zoneId?: string) => Promise<void>

  // Alert configs
  alertConfigs: ApiAlertConfig[]
  alertsLoading: boolean
  fetchAlertConfigs: (zoneId?: string) => Promise<void>
  createAlertConfig: (data: Parameters<typeof alertConfigApi.create>[0], zoneId?: string) => Promise<ApiAlertConfig>
  updateAlertConfig: (id: string, data: Parameters<typeof alertConfigApi.update>[1], zoneId?: string) => Promise<ApiAlertConfig>
  deleteAlertConfig: (id: string, zoneId?: string) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [devices, setDevices]         = useState<ApiDevice[]>([])
  const [rules, setRules]             = useState<ApiRule[]>([])
  const [alertConfigs, setAlertConfigs] = useState<ApiAlertConfig[]>([])
  const [devicesLoading, setDL]       = useState(false)
  const [rulesLoading, setRL]         = useState(false)
  const [alertsLoading, setAL]        = useState(false)

  // ── Devices ────────────────────────────────────────────────────────────────
  const fetchDevices = useCallback(async (zoneId?: string) => {
    setDL(true)
    try { setDevices(await deviceApi.list(zoneId)) } finally { setDL(false) }
  }, [])

  const createDevice = useCallback(async (data: Parameters<typeof deviceApi.create>[0]) => {
    const d = await deviceApi.create(data)
    await fetchDevices()
    return d
  }, [fetchDevices])

  const updateDevice = useCallback(async (id: string, data: Parameters<typeof deviceApi.update>[1]) => {
    const d = await deviceApi.update(id, data)
    await fetchDevices()
    return d
  }, [fetchDevices])

  const deleteDevice = useCallback(async (id: string) => {
    await deviceApi.delete(id)
    await fetchDevices()
  }, [fetchDevices])

  const getDeviceCredentials = useCallback(async (id: string) => (
    deviceApi.getCredentials(id)
  ), [])

  const resetDeviceApiKey = useCallback(async (id: string) => {
    const res = await deviceApi.resetKey(id)
    await fetchDevices()
    return res
  }, [fetchDevices])

  // ── Rules ─────────────────────────────────────────────────────────────────
  const fetchRules = useCallback(async (zoneId?: string) => {
    setRL(true)
    try { setRules(await ruleApi.list(zoneId)) } finally { setRL(false) }
  }, [])

  const createRule = useCallback(async (data: Parameters<typeof ruleApi.create>[0], zoneId?: string) => {
    const r = await ruleApi.create(data)
    setRules(prev => [...prev, r])
    fetchRules(zoneId).catch(err => console.error('refresh rules failed after create', err))
    return r
  }, [fetchRules])

  const updateRule = useCallback(async (id: string, data: Parameters<typeof ruleApi.update>[1], zoneId?: string) => {
    const r = await ruleApi.update(id, data)
    setRules(prev => prev.map(x => x.id === id ? r : x))
    fetchRules(zoneId).catch(err => console.error('refresh rules failed after update', err))
    return r
  }, [fetchRules])

  const toggleRule = useCallback(async (id: string, zoneId?: string) => {
    const toggled = await ruleApi.toggle(id)
    setRules(prev => prev.map(x => x.id === id ? toggled : x))
    fetchRules(zoneId).catch(err => console.error('refresh rules failed after toggle', err))
  }, [fetchRules])

  const deleteRule = useCallback(async (id: string, zoneId?: string) => {
    await ruleApi.delete(id)
    setRules(prev => prev.filter(x => x.id !== id))
    fetchRules(zoneId).catch(err => console.error('refresh rules failed after delete', err))
  }, [fetchRules])

  // ── Alert Configs ─────────────────────────────────────────────────────────
  const fetchAlertConfigs = useCallback(async (zoneId?: string) => {
    setAL(true)
    try { setAlertConfigs(await alertConfigApi.list(zoneId)) } finally { setAL(false) }
  }, [])

  const createAlertConfig = useCallback(async (data: Parameters<typeof alertConfigApi.create>[0], zoneId?: string) => {
    const a = await alertConfigApi.create(data)
    setAlertConfigs(prev => [...prev, a])
    fetchAlertConfigs(zoneId).catch(err => console.error('refresh alerts failed after create', err))
    return a
  }, [fetchAlertConfigs])

  const updateAlertConfig = useCallback(async (id: string, data: Parameters<typeof alertConfigApi.update>[1], zoneId?: string) => {
    const a = await alertConfigApi.update(id, data)
    setAlertConfigs(prev => prev.map(x => x.id === id ? a : x))
    fetchAlertConfigs(zoneId).catch(err => console.error('refresh alerts failed after update', err))
    return a
  }, [fetchAlertConfigs])

  const deleteAlertConfig = useCallback(async (id: string, zoneId?: string) => {
    await alertConfigApi.delete(id)
    setAlertConfigs(prev => prev.filter(x => x.id !== id))
    fetchAlertConfigs(zoneId).catch(err => console.error('refresh alerts failed after delete', err))
  }, [fetchAlertConfigs])

  return (
    <SettingsContext.Provider value={{
      devices, devicesLoading, fetchDevices, createDevice, updateDevice, deleteDevice, getDeviceCredentials, resetDeviceApiKey,
      rules, rulesLoading, fetchRules, createRule, updateRule, toggleRule, deleteRule,
      alertConfigs, alertsLoading, fetchAlertConfigs, createAlertConfig, updateAlertConfig, deleteAlertConfig,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettingsContext must be used inside <SettingsProvider>')
  return ctx
}
