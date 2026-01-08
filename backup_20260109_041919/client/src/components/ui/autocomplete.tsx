import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface AutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suggestions?: string[]
  className?: string
  disabled?: boolean
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  placeholder = '请输入模型名称',
  suggestions = [],
  className,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && suggestions) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredSuggestions(filtered)
    }
  }, [value, suggestions, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setIsOpen(true)
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setIsOpen(false)
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={inputRef}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-background border border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}