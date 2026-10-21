const PATHS: Record<string, string> = {
  today: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  library: 'M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.5-1 3 15-3.5 1z',
  routines: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  history: 'M4 19V9M10 19V5M16 19v-7M21 19H3',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12M18 6L6 18',
  swap: 'M4 8h14l-3-3M20 16H6l3 3',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
  check: 'M5 12.5l4.5 4.5L19 7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  timer: 'M12 21a8 8 0 100-16 8 8 0 000 16zM12 9v4l2.5 2.5M9 2h6',
  inbox: 'M4 13l2.5-7h11L20 13v6H4zM4 13h5l1 2h4l1-2h5',
  flame: 'M12 21c4 0 7-2.7 7-6.5 0-3.5-2.5-5.5-4-8-1 2-2 3-3.5 3.5C11 7 11 4.5 12 3c-4 2-7 6-7 11.5C5 18.3 8 21 12 21z',
  dumbbell: 'M6 8v8M3.5 10v4M18 8v8M20.5 10v4M6 12h12',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5H5V6h5',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  pin: 'M9 4h6l-1 6 3 3H7l3-3zM12 13v7',
  skip: 'M6 5l9 7-9 7zM18 5v14',
  bookmark: 'M6 4h12v17l-6-4.5L6 21z',
  body: 'M12 6.7a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4zM5 9h14M12 9v6m0 0l-3.5 6M12 15l3.5 6',
  park: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  share: 'M12 15V4M8 8l4-4 4 4M6 11H5v9h14v-9h-1',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0112 7.3a4.2 4.2 0 017.5 2.5C19.5 15.4 12 20 12 20z',
  bowl: 'M3 11h18a9 9 0 01-18 0zM8.5 7.5c0-1.2 1-1.8 1-3M12 7.5c0-1.2 1-1.8 1-3M15.5 7.5c0-1.2 1-1.8 1-3',
}

export function Icon({ name, size = 20, className }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  )
}
