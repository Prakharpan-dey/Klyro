import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  XCircleIcon,
  SpinnerIcon,
} from '@phosphor-icons/react'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4 text-local" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4 text-egress" />,
        error: <XCircleIcon className="size-4 text-destructive" />,
        loading: <SpinnerIcon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': '0px',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast font-mono text-xs',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
