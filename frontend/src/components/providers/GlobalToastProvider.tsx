/**
 * Global Toast Provider
 * Renders the ToastContainer for the global toast manager
 */

import { ToastContainer } from '@/components/ui/Toast'
import { useGlobalToast } from '@/hooks/useToast'

export function GlobalToastProvider() {
  const { toasts } = useGlobalToast()

  return <ToastContainer toasts={toasts} position="top-right" />
}
