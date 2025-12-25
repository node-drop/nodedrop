import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { backupService, BackupData, BackupSummary, ExportOptions, ImportResult } from '@/services/backup.service'
import { Download, FileDown, HardDrive, AlertCircle, CheckCircle2, Loader2, Upload, FileJson, Database, Key, Workflow, Variable, ArrowRight } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

export const BackupPage: React.FC = () => {
  const [summary, setSummary] = useState<BackupSummary>({
    workflows: 0,
    variables: 0,
    credentials: 0,
    environments: 0,
  })
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeWorkflows: true,
    includeVariables: true,
    includeCredentials: true,
    includeEnvironments: true,
  })

  const [isExporting, setIsExporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [previewData, setPreviewData] = useState<BackupData | null>(null)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      setIsLoadingSummary(true)
      const data = await backupService.getBackupSummary()
      setSummary(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load backup summary')
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const handleExport = async () => {
    if (!exportOptions.includeWorkflows && !exportOptions.includeVariables && !exportOptions.includeCredentials && !exportOptions.includeEnvironments) {
      toast.error('Please select at least one item to export')
      return
    }

    try {
      setIsExporting(true)
      const backupData = await backupService.exportBackup(exportOptions)
      backupService.downloadBackupFile(backupData)
      toast.success('Backup exported successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export backup')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
      setPreviewData(null)
      setImportResult(null)
      
      backupService.readBackupFile(file)
        .then((data) => {
          setPreviewData(data)
          toast.success('Backup file loaded successfully')
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : 'Failed to read backup file')
        })
    }
  }

  const handleImport = async () => {
    if (!previewData) {
      toast.error('Please select a backup file to import')
      return
    }

    if (!window.confirm('This will import items from backup file. Are you sure you want to continue?')) {
      return
    }

    try {
      setIsImporting(true)
      const result = await backupService.importBackup(previewData, exportOptions)
      setImportResult(result)
      
      const totalImported = result.workflows.imported + result.variables.imported + result.credentials.imported + result.environments.imported
      const totalErrors = result.workflows.errors.length + result.variables.errors.length + result.credentials.errors.length + result.environments.errors.length
      
      if (totalErrors === 0) {
        toast.success(`Imported ${totalImported} items successfully`)
      } else {
        toast.warning(`Imported ${totalImported} items with ${totalErrors} errors`)
      }
      
      loadSummary()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import backup')
    } finally {
      setIsImporting(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getTotalErrors = () => {
    if (!importResult) return 0
    return importResult.workflows.errors.length + 
           importResult.variables.errors.length + 
           importResult.credentials.errors.length + 
           importResult.environments.errors.length
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-background">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6">
            <HardDrive className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">Backup & Restore</h1>
          <p className="text-xl text-muted-foreground">
            Export and import your workflows, variables, credentials, and environments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  <CardTitle>Export Backup</CardTitle>
                </div>
                <CardDescription>
                  Download your data as a JSON file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                {isLoadingSummary ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-foreground mb-4">
                          Select Items to Export
                        </h3>
                        <div className="space-y-3">
                          {[
                            { id: 'export-workflows', key: 'includeWorkflows', label: 'Workflows', count: summary.workflows, icon: Workflow },
                            { id: 'export-variables', key: 'includeVariables', label: 'Variables', count: summary.variables, icon: Variable },
                            { id: 'export-credentials', key: 'includeCredentials', label: 'Credentials', count: summary.credentials, icon: Key },
                            { id: 'export-environments', key: 'includeEnvironments', label: 'Environments', count: summary.environments, icon: Database },
                          ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={item.id}
                                  checked={exportOptions[item.key as keyof ExportOptions] as boolean}
                                  onCheckedChange={(checked) =>
                                    setExportOptions({ ...exportOptions, [item.key]: checked })
                                  }
                                />
                                <Label htmlFor={item.id} className="flex items-center gap-3 cursor-pointer font-medium">
                                  <item.icon className="w-4 h-4 text-muted-foreground" />
                                  <span>{item.label}</span>
                                </Label>
                              </div>
                              <span className="text-sm text-muted-foreground">({item.count})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button 
                        onClick={handleExport} 
                        disabled={isExporting} 
                        className="w-full h-11"
                        size="default"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <FileJson className="w-4 h-4 mr-2" />
                            Export Backup
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  <CardTitle>Import Backup</CardTitle>
                </div>
                <CardDescription>
                  Upload a backup file to restore your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                <div>
                  <Label htmlFor="import-file" className="block text-sm font-medium text-foreground mb-4">
                    Select Backup File
                  </Label>
                  <div className="relative">
                    <input
                      id="import-file"
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.document.getElementById('import-file')?.click()}
                      className="w-full h-32 flex-col gap-3 border-dashed"
                    >
                      <FileDown className="w-8 h-8 text-muted-foreground" />
                      <div className="text-center space-y-1">
                        <span className="text-sm font-medium text-foreground">
                          {importFile ? importFile.name : 'Click to select backup file'}
                        </span>
                        {importFile && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(importFile.size)}
                          </span>
                        )}
                      </div>
                    </Button>
                  </div>
                </div>

                {previewData && (
                  <>
                    <Separator />

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-foreground mb-4">
                          Select Items to Import
                        </h3>
                        <div className="space-y-3">
                          {[
                            { id: 'import-workflows', key: 'includeWorkflows', label: 'Workflows', count: previewData.workflows.length, icon: Workflow },
                            { id: 'import-variables', key: 'includeVariables', label: 'Variables', count: previewData.variables.length, icon: Variable },
                            { id: 'import-credentials', key: 'includeCredentials', label: 'Credentials', count: previewData.credentials.length, icon: Key },
                            { id: 'import-environments', key: 'includeEnvironments', label: 'Environments', count: previewData.environments.length, icon: Database },
                          ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={item.id}
                                  checked={exportOptions[item.key as keyof ExportOptions] as boolean}
                                  onCheckedChange={(checked) =>
                                    setExportOptions({ ...exportOptions, [item.key]: checked })
                                  }
                                />
                                <Label htmlFor={item.id} className="flex items-center gap-3 cursor-pointer font-medium">
                                  <item.icon className="w-4 h-4 text-muted-foreground" />
                                  <span>{item.label}</span>
                                </Label>
                              </div>
                              <span className="text-sm text-muted-foreground">({item.count})</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button 
                        onClick={handleImport} 
                        disabled={isImporting} 
                        className="w-full h-11"
                        size="default"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <HardDrive className="w-4 h-4 mr-2" />
                            Import Backup
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {importResult && (
          <Card className="mt-8">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-3">
                {getTotalErrors() === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                )}
                <div>
                  <CardTitle>Import Results</CardTitle>
                  <CardDescription>
                    {getTotalErrors() === 0 
                      ? 'All items were imported successfully' 
                      : `${getTotalErrors()} error${getTotalErrors() > 1 ? 's' : ''} occurred during import`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { 
                    label: 'Workflows', 
                    imported: importResult.workflows.imported, 
                    errors: importResult.workflows.errors.length, 
                    icon: Workflow 
                  },
                  { 
                    label: 'Variables', 
                    imported: importResult.variables.imported, 
                    errors: importResult.variables.errors.length, 
                    icon: Variable 
                  },
                  { 
                    label: 'Credentials', 
                    imported: importResult.credentials.imported, 
                    errors: importResult.credentials.errors.length, 
                    icon: Key 
                  },
                  { 
                    label: 'Environments', 
                    imported: importResult.environments.imported, 
                    errors: importResult.environments.errors.length, 
                    icon: Database 
                  },
                ].map((item) => (
                  <div key={item.label} className={`p-4 border border-border rounded-lg ${item.errors > 0 ? 'bg-red-50/50 dark:bg-red-950/20' : 'bg-muted/50'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{item.label}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-foreground">{item.imported}</div>
                      <div className="text-xs text-muted-foreground">imported successfully</div>
                      {item.errors > 0 && (
                        <div className="text-xs font-medium text-red-600 dark:text-red-400">
                          {item.errors} error{item.errors > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {getTotalErrors() > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      Error Details ({getTotalErrors()})
                    </h3>
                    <div className="rounded-lg border border-border bg-muted/50">
                      <div className="max-h-60 overflow-y-auto p-4 space-y-2">
                        {importResult.workflows.errors.map((error, i) => (
                          <div key={`workflow-${i}`} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                            <span className="mt-0.5 text-red-500">•</span>
                            <span>{error}</span>
                          </div>
                        ))}
                        {importResult.variables.errors.map((error, i) => (
                          <div key={`variable-${i}`} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                            <span className="mt-0.5 text-red-500">•</span>
                            <span>{error}</span>
                          </div>
                        ))}
                        {importResult.credentials.errors.map((error, i) => (
                          <div key={`credential-${i}`} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                            <span className="mt-0.5 text-red-500">•</span>
                            <span>{error}</span>
                          </div>
                        ))}
                        {importResult.environments.errors.map((error, i) => (
                          <div key={`env-${i}`} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
                            <span className="mt-0.5 text-red-500">•</span>
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

