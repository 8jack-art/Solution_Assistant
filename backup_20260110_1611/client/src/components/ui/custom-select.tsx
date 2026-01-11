import React from 'react'

interface CustomSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}

export const CustomSelect = React.forwardRef<HTMLSelectElement, CustomSelectProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={`
            w-full h-9 px-2 pr-8
            bg-white border border-[#E5E6EB] rounded-sm
            text-sm text-[#1D2129]
            appearance-none cursor-pointer
            hover:border-[#1E6FFF]
            focus:outline-none focus:ring-2 focus:ring-[#1E6FFF] focus:border-transparent
            transition-colors duration-200
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
            ${className}
          `}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg 
            className="w-4 h-4 text-[#86909C]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 9l-7 7-7-7" 
            />
          </svg>
        </div>
      </div>
    )
  }
)

CustomSelect.displayName = 'CustomSelect'
