/** [FORK] Linear workflow-state glyph (Linear-parity Tasks page).
 *  Mirrors Linear's own status iconography: dashed ring for backlog, empty
 *  ring for unstarted, pie-fill ring for started, check disc for completed,
 *  x disc for canceled. Colors come from the Linear API state color. */
import React from 'react'

type LinearStateIconProps = {
  type: string
  color: string
  className?: string
}

export function LinearStateIcon({
  type,
  color,
  className
}: LinearStateIconProps): React.JSX.Element {
  const common = {
    viewBox: '0 0 14 14',
    className,
    'aria-hidden': true as const,
    focusable: false as const
  }
  switch (type) {
    case 'triage':
      return (
        <svg {...common} fill="none">
          <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.5" />
          <circle cx="4.5" cy="7" r="0.9" fill={color} />
          <circle cx="7" cy="7" r="0.9" fill={color} />
          <circle cx="9.5" cy="7" r="0.9" fill={color} />
        </svg>
      )
    case 'backlog':
      return (
        <svg {...common} fill="none">
          <circle
            cx="7"
            cy="7"
            r="6"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="2.4 2.2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'started':
      return (
        <svg {...common} fill="none">
          <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.5" />
          {/* Half-pie progress fill, matching Linear's In Progress glyph. */}
          <path d="M7 3.4 A3.6 3.6 0 0 1 7 10.6 Z" fill={color} />
        </svg>
      )
    case 'completed':
      return (
        <svg {...common} fill="none">
          <circle cx="7" cy="7" r="7" fill={color} />
          <path
            d="M4.2 7.2 6.2 9.2 9.8 5.2"
            stroke="var(--background)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'canceled':
      return (
        <svg {...common} fill="none">
          <circle cx="7" cy="7" r="7" fill={color} />
          <path
            d="M4.8 4.8 9.2 9.2 M9.2 4.8 4.8 9.2"
            stroke="var(--background)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )
    default:
      return (
        <svg {...common} fill="none">
          <circle cx="7" cy="7" r="6" stroke={color} strokeWidth="1.5" />
        </svg>
      )
  }
}
