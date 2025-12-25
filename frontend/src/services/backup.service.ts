import { apiClient } from './api'

export interface BackupData {
  version: string
  exportedAt: string
  userId: string
  workflows: unknown[]
  variables: unknown[]
  credentials: unknown[]
  environments: unknown[]
}

export interface ExportOptions {
  includeWorkflows: boolean
  includeVariables: boolean
  includeCredentials: boolean
  includeEnvironments: boolean
}

export interface ImportResult {
  workflows: { imported: number; errors: string[] }
  variables: { imported: number; errors: string[] }
  credentials: { imported: number; errors: string[] }
  environments: { imported: number; errors: string[] }
}

export interface BackupSummary {
  workflows: number
  variables: number
  credentials: number
  environments: number
}

class BackupService {
  async exportBackup(options: ExportOptions): Promise<BackupData> {
    const response = await apiClient.post<BackupData>('/backup/export', { options })
    if (!response.success || !response.data) {
      throw new Error('Failed to export backup')
    }
    return response.data
  }

  async importBackup(data: BackupData, options: ExportOptions): Promise<ImportResult> {
    const response = await apiClient.post<ImportResult>('/backup/import', { data, options })
    if (!response.success || !response.data) {
      throw new Error('Failed to import backup')
    }
    return response.data
  }

  async getBackupSummary(): Promise<BackupSummary> {
    const response = await apiClient.get<BackupSummary>('/backup/summary')
    if (!response.success || !response.data) {
      throw new Error('Failed to get backup summary')
    }
    return response.data
  }

  downloadBackupFile(backupData: BackupData, filename?: string) {
    const data = JSON.stringify(backupData, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = filename || `nodedrop-backup-${new Date().toISOString().split('T')[0]}.json`
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async readBackupFile(file: File): Promise<BackupData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          resolve(data)
        } catch (error) {
          reject(new Error('Invalid backup file format'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read backup file'))
      reader.readAsText(file)
    })
  }
}

export const backupService = new BackupService()
