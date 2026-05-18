import { useId } from 'react'

type BrushTickProps = {
  className?: string
  width?: number
  height?: number
}

/**
 * A small sumi brush stroke that reads as one coherent mark.
 *
 * Built from a single curved body stroke + two thin edge-echoes for bristle
 * texture + two dry-trail wisps on the lift-off side + one denser ink lobe
 * on the press-down side. All passed through the same paper-edge filter so
 * the marks share the same wobble. Color follows `currentColor`.
 */
export function BrushTick({
  className = '',
  width = 28,
  height = 10,
}: BrushTickProps) {
  const id = useId().replace(/[:]/g, '')

  return (
    <svg
      viewBox="0 0 28 10"
      width={width}
      height={height}
      className={className}
      aria-hidden
    >
      <defs>
        <filter id={`bt-${id}`} x="-5%" y="-25%" width="110%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="1.0" />
        </filter>
      </defs>

      <g
        transform="translate(14 5) rotate(-3) translate(-14 -5)"
        filter={`url(#bt-${id})`}
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      >
        {/* Body — one bold curved stroke */}
        <path d="M 2 5.1 C 8 4.5, 18 4.8, 26 5.0" strokeWidth="3.0" />

        {/* Edge echoes — bristle hair lines along top and bottom */}
        <path
          d="M 3 4.0 C 10 3.4, 19 3.5, 25.5 4.0"
          strokeWidth="0.55"
          opacity="0.55"
        />
        <path
          d="M 3 6.0 C 10 6.6, 19 6.5, 25.5 6.0"
          strokeWidth="0.55"
          opacity="0.55"
        />

        {/* Dry trailing wisps on the lift-off (left) end */}
        <path d="M 4 5.0 L 0 4.7" strokeWidth="0.4" opacity="0.4" />
        <path d="M 4 5.4 L 0 5.75" strokeWidth="0.35" opacity="0.35" />
      </g>

      {/* Concentrated ink at the press-down (right) end */}
      <ellipse
        cx="25.5"
        cy="5"
        rx="1.7"
        ry="1.4"
        fill="currentColor"
        opacity="0.45"
        filter={`url(#bt-${id})`}
      />
    </svg>
  )
}
