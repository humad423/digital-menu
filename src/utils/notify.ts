export const TOAST_EVENT = 'alfsouq_toast'

export interface ToastDetail {
  type: 'success' | 'error'
  message: string
}

function show(detail: ToastDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail }))
  }
}

export const notifySuccess = (message: string) => show({ type: 'success', message })
export const notifyError = (message: string) => show({ type: 'error', message })

/**
 * Tells the user when a database write failed, which RLS makes possible on any save.
 * Returns true when the write succeeded.
 */
export function reportWriteResult(result: { error: { message: string } | null }, failureMessage = 'تعذر حفظ التعديل، يرجى المحاولة مجدداً.'): boolean {
  if (result.error) {
    console.error(failureMessage, result.error)
    notifyError(failureMessage)
    return false
  }
  return true
}
