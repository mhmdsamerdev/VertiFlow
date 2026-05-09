import React, {
  createContext, useCallback, useContext, useEffect, useState,
} from 'react'
import {
  deviceApi, ruleApi, alertConfigApi,
  ApiDevice, ApiRule, ApiAlertConfig,
} from '../api/config'

interface SettingsContextValue {
  // Devices
  devices: ApiDevice[]
  devicesLoading: boolean
  fetchDevices: (zoneId?: string) => Promise<void>
  createDevice: (data: Parameters<typeof deviceApi.create>[0]) => Promise<ApiDevice>
  updateDevice: (id: string, data: Parameters<typeof deviceApi.update>[1]) => Promise<ApiDevice>
  deleteDevice: (id: string) => Promise<void>

  // Rules
  rules: ApiRule[]
  rulesLoading: boolean
  fetchRules: (zoneId?: string) => Promise<void>
  createRule: (data: Parameters<typeof ruleApi.create>[0]) => Promise<ApiRule>
  updateRule: (id: string, data: Parameters<typeof ruleApi.update>[1]) => Promise<ApiRule>
  toggleRule: (id: string) => Promise<void>
  deleteRule: (id: string) => Promise<void>

  // Alert configs
  alertConfigs: ApiAlertConfig[]
  alertsLoading: boolean
  fetchAlertConfigs: (zoneId?: string) => Promise<void>
  createAlertConfig: (data: Parameters<typeof alertConfigApi.create>[0]) => Promise<ApiAlertConfig>
  updateAlertConfig: (id: string, data: Parameters<typeof alertConfigApi.update>[1]) => Promise<ApiAlertConfig>
  deleteAlertConfig: (id: string) => Promise<void>
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

  // ── Rules ─────────────────────────────────────────────────────────────────
  const fetchRules = useCallback(async (zoneId?: string) => {
    setRL(true)
    try { setRules(await ruleApi.list(zoneId)) } finally { setRL(false) }
  }, [])

  const createRule = useCallback(async (data: Parameters<typeof ruleApi.create>[0]) => {
    const r = await ruleApi.create(data)
    await fetchRules()
    return r
  }, [fetchRules])

  const updateRule = useCallback(async (id: string, data: Parameters<typeof ruleApi.update>[1]) => {
    const r = await ruleApi.update(id, data)
    await fetchRules()
    return r
  }, [fetchRules])

  const toggleRule = useCallback(async (id: string) => {
    await ruleApi.toggle(id)
    await fetchRules()
  }, [fetchRules])

  const deleteRule = useCallback(async (id: string) => {
    await ruleApi.delete(id)
    await fetchRules()
  }, [fetchRules])

  // ── Alert Configs ─────────────────────────────────────────────────────────
  const fetchAlertConfigs = useCallback(async (zoneId?: string) => {
    setAL(true)
    try { setAlertConfigs(await alertConfigApi.list(zoneId)) } finally { setAL(false) }
  }, [])

  const createAlertConfig = useCallback(async (data: Parameters<typeof alertConfigApi.create>[0]) => {
    const a = await alertConfigApi.create(data)
    await fetchAlertConfigs()
    return a
  }, [fetchAlertConfigs])

  const updateAlertConfig = useCallback(async (id: string, data: Parameters<typeof alertConfigApi.update>[1]) => {
    const a = await alertConfigApi.update(id, data)
    await fetchAlertConfigs()
    return a
  }, [fetchAlertConfigs])

  const deleteAlertConfig = useCallback(async (id: string) => {
    await alertConfigApi.delete(id)
    await fetchAlertConfigs()
  }, [fetchAlertConfigs])

  return (
    <SettingsContext.Provider value={{
      devices, devicesLoading, fetchDevices, createDevice, updateDevice, deleteDevice,
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
