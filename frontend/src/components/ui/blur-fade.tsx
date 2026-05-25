import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  delay?: number   // ms
  className?: string
}

export default function BlurFade({ children, delay = 0, className }: Props) {
  return (
    <div
      className={cn('animate-blur-fade', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
