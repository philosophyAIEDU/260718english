/*
 * Inline SVG icon set — consistent 24×24 stroke icons (Lucide-style) so the
 * UI reads as a designed product rather than platform emoji. Icons inherit
 * `currentColor`, so they follow the theme automatically.
 */

function Icon({ children, size = 20, strokeWidth = 1.8, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const BookOpenIcon = (p) => (
  <Icon {...p}>
    <path d="M12 7c-2-1.8-5.5-2-8-1v13c2.5-1 6-0.8 8 1 2-1.8 5.5-2 8-1V6c-2.5-1-6-0.8-8 1Z" />
    <path d="M12 7v13" />
  </Icon>
);

export const CameraIcon = (p) => (
  <Icon {...p}>
    <path d="M4 8h2.2l1.2-2.1A1.6 1.6 0 0 1 8.8 5h6.4a1.6 1.6 0 0 1 1.4.9L17.8 8H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" />
    <circle cx="12" cy="13.5" r="3.4" />
  </Icon>
);

export const ImageIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="8.7" cy="9.5" r="1.6" />
    <path d="m21 15.5-4.2-4.2a1.5 1.5 0 0 0-2.1 0L6 20" />
  </Icon>
);

export const LibraryIcon = (p) => (
  <Icon {...p}>
    <path d="M5 4h2.6v16H5z" />
    <path d="M10.4 4H13v16h-2.6z" />
    <path d="m15.4 5.4 2.5-.7 4 15-2.5.7z" />
  </Icon>
);

export const CardsIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="7" width="13" height="13" rx="2" />
    <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4H19a2 2 0 0 1 2 2v9.5a1.5 1.5 0 0 1-1.5 1.5H18" />
  </Icon>
);

export const SettingsIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.4 13.5a1.6 1.6 0 0 0 .33 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.33 1.6 1.6 0 0 0-.97 1.47V19.5a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .33-1.77 1.6 1.6 0 0 0-1.47-.97H3.5a2 2 0 1 1 0-4h.09a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.33-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.33h.08a1.6 1.6 0 0 0 .97-1.47V3.5a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.33 1.77v.08a1.6 1.6 0 0 0 1.47.97h.17a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.47.97Z" />
  </Icon>
);

export const MoonIcon = (p) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
  </Icon>
);

export const SunIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.3 4.3l1.4 1.4M18.3 18.3l1.4 1.4M2.5 12h2M19.5 12h2M4.3 19.7l1.4-1.4M18.3 5.7l1.4-1.4" />
  </Icon>
);

export const EyeIcon = (p) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

export const EyeOffIcon = (p) => (
  <Icon {...p}>
    <path d="M10.7 6c.43-.06.86-.1 1.3-.1 6 0 9.5 6.1 9.5 6.1a17.5 17.5 0 0 1-2.1 2.9M6.6 6.9C4 8.7 2.5 12 2.5 12S6 18.1 12 18.1c1.5 0 2.9-.36 4.1-.92" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="m3 3 18 18" />
  </Icon>
);

export const StarIcon = ({ filled = false, ...p }) => (
  <Icon {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="m12 3.6 2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8L12 3.6Z" />
  </Icon>
);

export const ArrowLeftIcon = (p) => (
  <Icon {...p}>
    <path d="M19 12H5" />
    <path d="m11 18-6-6 6-6" />
  </Icon>
);

export const ArrowRightIcon = (p) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);

export const SparklesIcon = (p) => (
  <Icon {...p}>
    <path d="M12 4.5 13.8 9l4.5 1.8-4.5 1.8L12 17l-1.8-4.4L5.7 10.8 10.2 9 12 4.5Z" />
    <path d="M19 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
    <path d="M5 3l.7 1.7L7.4 5.4l-1.7.7L5 7.8l-.7-1.7-1.7-.7 1.7-.7L5 3Z" />
  </Icon>
);

export const DownloadIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3.5V15" />
    <path d="m7 10.5 5 5 5-5" />
    <path d="M4 20.5h16" />
  </Icon>
);

export const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20.5 20.5-4.5-4.5" />
  </Icon>
);

export const TagIcon = (p) => (
  <Icon {...p}>
    <path d="M3.5 12.2V5a1.5 1.5 0 0 1 1.5-1.5h7.2a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8l-5.8 5.8a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1-.5-1.5Z" />
    <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
);

export const TrashIcon = (p) => (
  <Icon {...p}>
    <path d="M4 7h16" />
    <path d="M9.5 7V5.4A1.4 1.4 0 0 1 10.9 4h2.2a1.4 1.4 0 0 1 1.4 1.4V7" />
    <path d="M6.2 7l.8 12a1.8 1.8 0 0 0 1.8 1.7h6.4a1.8 1.8 0 0 0 1.8-1.7l.8-12" />
    <path d="M10 11.5v5M14 11.5v5" />
  </Icon>
);

export const ChevronDownIcon = (p) => (
  <Icon {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Icon>
);

export const BellIcon = (p) => (
  <Icon {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M10.3 19.5a2 2 0 0 0 3.4 0" />
  </Icon>
);

export const KeyIcon = (p) => (
  <Icon {...p}>
    <circle cx="8" cy="15.5" r="4.5" />
    <path d="m11.2 12.3 8.3-8.3" />
    <path d="M16.5 7 19 9.5M19.5 4 21 5.5" />
  </Icon>
);

export const LockIcon = (p) => (
  <Icon {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
);

export const AlertIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3.8 2.8 19.5a1.4 1.4 0 0 0 1.2 2.1h16a1.4 1.4 0 0 0 1.2-2.1L12 3.8Z" />
    <path d="M12 9.5v4.5" />
    <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const CheckIcon = (p) => (
  <Icon {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Icon>
);

export const RotateIcon = (p) => (
  <Icon {...p}>
    <path d="M3.5 8A9 9 0 0 1 20 10" />
    <path d="M20.5 16A9 9 0 0 1 4 14" />
    <path d="M20 4.5V10h-5.5" />
    <path d="M4 19.5V14h5.5" />
  </Icon>
);

export const QuoteIcon = (p) => (
  <Icon {...p}>
    <path d="M10 8c-2.8 0-4.5 1.9-4.5 4.6V19H10v-6H7.6c0-2 .9-3 2.4-3V8Z" fill="currentColor" stroke="none" />
    <path d="M18.5 8c-2.8 0-4.5 1.9-4.5 4.6V19h4.5v-6h-2.4c0-2 .9-3 2.4-3V8Z" fill="currentColor" stroke="none" />
  </Icon>
);

export const PencilIcon = (p) => (
  <Icon {...p}>
    <path d="M4 20h4.2L20 8.2a2.1 2.1 0 0 0 0-3L18.8 4a2.1 2.1 0 0 0-3 0L4 15.8V20Z" />
    <path d="m13.5 6.5 4 4" />
  </Icon>
);

export const ListIcon = (p) => (
  <Icon {...p}>
    <path d="M8.5 6h12M8.5 12h12M8.5 18h12" />
    <circle cx="4" cy="6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1.1" fill="currentColor" stroke="none" />
  </Icon>
);

export const MessageIcon = (p) => (
  <Icon {...p}>
    <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-3-.4-4.2-1.1L3 21l1.6-5.3A8.5 8.5 0 1 1 21 12Z" />
  </Icon>
);

export const BranchIcon = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="5" r="2.2" />
    <circle cx="6" cy="19" r="2.2" />
    <circle cx="18" cy="9" r="2.2" />
    <path d="M6 7.2v9.6" />
    <path d="M18 11.2c0 4-4 3.8-7 4.3-2 .3-3 1-3 1" />
  </Icon>
);

export const PrinterIcon = (p) => (
  <Icon {...p}>
    <path d="M7 8.5V4.6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V8.5" />
    <rect x="4.5" y="8.5" width="15" height="8" rx="1.6" />
    <path d="M7 14.5h10V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-5.5Z" />
    <circle cx="16.3" cy="11.3" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const CheckSquareIcon = (p) => (
  <Icon {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3.2" />
    <path d="m8 12.2 2.6 2.6L16.5 9" />
  </Icon>
);

export const ClockIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const MinusIcon = (p) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);

export const PlusIcon = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const HelpCircleIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.3 9.3a2.7 2.7 0 0 1 5.2.9c0 1.8-2.5 2-2.5 3.8" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const SpeakerIcon = (p) => (
  <Icon {...p}>
    <path d="M4 9.5v5h3.4l4.6 3.8V5.7L7.4 9.5H4Z" />
    <path d="M16 9a3.6 3.6 0 0 1 0 6" />
    <path d="M18.3 6.5a7 7 0 0 1 0 11" />
  </Icon>
);

export const HomeIcon = (p) => (
  <Icon {...p}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9.5a.9.9 0 0 0 .9.9H9.5v-6h5v6h2.6a.9.9 0 0 0 .9-.9V10" />
  </Icon>
);

export const FlameIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3s-1.5 2.6-1.5 4.6c0 1 .5 1.8 1.1 2.5-.3-1.3.1-2.3.9-3.1 0 1.6.9 2.6 1.9 3.7 1.1 1.2 1.8 2.5 1.8 4.1a5.2 5.2 0 0 1-10.4 0c0-2.6 1.4-4 2.4-5.4.9-1.3 1.3-2.7.8-4.4C10.5 4.6 12 3 12 3Z" />
  </Icon>
);

export const TrophyIcon = (p) => (
  <Icon {...p}>
    <path d="M7 5h10v5a5 5 0 0 1-10 0V5Z" />
    <path d="M7 6H4.5A2.5 2.5 0 0 0 4.5 11H7" />
    <path d="M17 6h2.5A2.5 2.5 0 0 1 19.5 11H17" />
    <path d="M12 15v3" />
    <path d="M8.5 21h7" />
    <path d="M9.5 18h5l.6 3H8.9l.6-3Z" />
  </Icon>
);

export const ShareIcon = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="18" cy="5.5" r="2.4" />
    <circle cx="18" cy="18.5" r="2.4" />
    <path d="m8.1 10.8 7.8-4.3M8.1 13.2l7.8 4.3" />
  </Icon>
);

export const UploadIcon = (p) => (
  <Icon {...p}>
    <path d="M12 15.5V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 15.5v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </Icon>
);

export const ChevronLeftIcon = (p) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);

export const ChevronRightIcon = (p) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

export const UsersIcon = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
    <path d="M16 8.4a3 3 0 1 1 3.6 2.9" />
    <path d="M15 13.9c2.6.4 4.5 2.3 4.5 5" />
  </Icon>
);

export const ShieldIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3.4 19 6v5.5c0 5-3 8.4-7 9.1-4-.7-7-4.1-7-9.1V6l7-2.6Z" />
    <path d="m8.6 12 2.5 2.5 4.3-4.6" />
  </Icon>
);

export const CopyIcon = (p) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const ExternalLinkIcon = (p) => (
  <Icon {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M18 13v5.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H11" />
  </Icon>
);

export const CalendarIcon = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.4" />
    <path d="M3.5 9.5h17" />
    <path d="M8 3v4M16 3v4" />
  </Icon>
);

/**
 * Google's "G", in its own colours rather than currentColor — a sign-in
 * button is the one place the mark has to look like Google's, so this one
 * doesn't use the stroke Icon wrapper above.
 */
export function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * Name → component map, so data-driven lists (challengeConfig's PILLARS and
 * RULES) can name their icon as a plain string instead of importing one.
 */
export const ICONS = {
  book: BookOpenIcon,
  sparkles: SparklesIcon,
  branch: BranchIcon,
  trophy: TrophyIcon,
  check: CheckIcon,
  speaker: SpeakerIcon,
  alert: AlertIcon,
  calendar: CalendarIcon,
  users: UsersIcon,
  flame: FlameIcon,
};

/** Brand mark: an open book with a golden bookmark ribbon. */
export function BrandMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="var(--accent)" />
      <path
        d="M24 14c-3.4-2.7-9.4-3-12.4-1.6v20c3-1.4 9-1.1 12.4 1.6 3.4-2.7 9.4-3 12.4-1.6v-20C33.4 11 27.4 11.3 24 14Z"
        stroke="var(--accent-contrast)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 14v20" stroke="var(--accent-contrast)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M30 11.5v8l2.6-2 2.6 2v-9" fill="var(--gold)" stroke="var(--gold)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
