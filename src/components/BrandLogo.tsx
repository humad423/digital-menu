interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark' | 'colored'
  className?: string
}

const SIZES = {
  sm: { mark: 'w-9 h-9 text-lg', title: 'text-lg' },
  md: { mark: 'w-11 h-11 text-xl', title: 'text-xl' },
  lg: { mark: 'w-14 h-14 text-2xl', title: 'text-3xl' },
}

export default function BrandLogo({ size = 'md', variant = 'colored', className = '' }: BrandLogoProps) {
  const { mark, title } = SIZES[size]

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <span className={`flex items-center justify-center rounded-xl bg-brand text-white font-black leading-none ${mark}`}>أ</span>
      <span className={`font-black leading-none ${title} ${variant === 'light' ? 'text-white' : 'text-ink'}`}>ألف سوق</span>
    </div>
  )
}
