import React from 'react'

interface SliderProps {
  value: number
  min?: number
  max: number
  label?: string
  showValue?: boolean
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max,
  label,
  showValue = true,
  onChange,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          {label && <span>{label}</span>}
          {showValue && <span>{value}</span>}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        disabled={disabled}
        className={`
          w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-primary-500
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:hover:bg-primary-400
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />
    </div>
  )
}
