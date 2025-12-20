import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { apiClient } from '@/services/api'
import { Credential, CredentialType } from '@/types'
import { useEffect, useState } from 'react'
import { NodeIcon } from '@/components/workflow/components/NodeIcon'
import { CredentialForm } from './CredentialForm'

interface CredentialModalProps {
  open: boolean
  credentialType: CredentialType
  credential?: Credential
  onClose: () => void
  onSave: (credential: Credential) => void
  nodeType?: string // Node type for context-specific defaults
}

export function CredentialModal({
  open,
  credentialType,
  credential,
  onClose,
  onSave,
  nodeType
}: CredentialModalProps) {
  const [contextualDisplayName, setContextualDisplayName] = useState<string>(credentialType.displayName)

  useEffect(() => {
    // Fetch context-specific displayName if nodeType is provided
    const fetchContextualInfo = async () => {
      if (nodeType && !credential) {
        try {
          const response = await apiClient.get(
            `/credentials/types/${credentialType.name}/defaults?nodeType=${nodeType}`
          )
          
          if (response.success && response.data?.credentialType?.displayName) {
            setContextualDisplayName(response.data.credentialType.displayName)
          }
        } catch (error) {
          console.warn('Failed to fetch contextual credential info:', error)
        }
      } else {
        setContextualDisplayName(credentialType.displayName)
      }
    }

    if (open) {
      fetchContextualInfo()
    }
  }, [open, nodeType, credentialType, credential])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <NodeIcon
              config={{
                icon: credentialType.icon,
                color: credentialType.color || '#6B7280',
                displayName: contextualDisplayName,
                nodeType: credentialType.name,
              }}
              size="md"
            />
            <div>
              <DialogTitle>
                {credential ? 'Edit' : 'Create'} {contextualDisplayName}
              </DialogTitle>
              <DialogDescription>
                {credentialType.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form */}
        <div className="overflow-y-auto max-h-[60vh] px-1">
          <CredentialForm
            credentialType={credentialType}
            credential={credential}
            onSuccess={onSave}
            onCancel={onClose}
            showHeader={false}
            nodeType={nodeType}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
