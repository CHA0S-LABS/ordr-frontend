"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full group", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-border select-none data-horizontal:h-[3px] data-horizontal:w-full data-vertical:h-full data-vertical:w-[3px]"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative flex items-center justify-center size-5 shrink-0 rounded-full border-[3.5px] border-primary bg-background ring-[6px] ring-primary/10 transition-[box-shadow,transform] select-none hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-primary/30 active:ring-primary/30 active:scale-110 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing hover:z-20"
          >
            <div className="absolute -top-8 px-1.5 py-0.5 rounded-[4px] bg-muted/90 backdrop-blur-sm shadow-sm text-[11px] font-mono text-primary font-medium tracking-tight pointer-events-none transition-opacity opacity-0 group-hover:opacity-100 group-active:opacity-100">
              {_values[index]}%
            </div>
          </SliderPrimitive.Thumb>
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }

