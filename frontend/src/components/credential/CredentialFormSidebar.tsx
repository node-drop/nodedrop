import { Credential, CredentialType } from '@/types'
import { CredentialForm } from './CredentialForm'

interface CredentialFormSidebarProps {
  credentialType: CredentialType
  editingCredential?: Credential
  onSuccess: (credential: Credential) => void
  onCancel: () => void
}

export function CredentialFormSidebar({
  credentialType,
  editingCredential,
  onSuccess,
  onCancel
}: CredentialFormSidebarProps) {
  return (
    <div className="p-4 h-full">
      <CredentialForm
        credentialType={credentialType}
        credential={editingCredential}
        onSuccess={onSuccess}
        onCancel={onCancel}
        showHeader={true}
      />
    </div>
  )
}
