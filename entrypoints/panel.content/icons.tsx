export const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <circle cx="10" cy="10" r="7.5" stroke="#999" strokeWidth="1.2" />
    <ellipse cx="10" cy="10" rx="3.5" ry="7.5" stroke="#999" strokeWidth="1.2" />
    <path d="M3 7.5h14M3 12.5h14" stroke="#999" strokeWidth="1.2" />
  </svg>
)

export const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <path
      d="M6 8l4 4 4-4"
      stroke="#999"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <path
      d="M5.8335 5.83337L14.1668 14.1667"
      stroke="#999999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.1668 5.83337V14.1667H5.8335"
      stroke="#999999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const SpinnerIcon = ({ spin = false }: { spin?: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    className={`shrink-0 ${spin ? 'animate-dc-spin' : ''}`}
  >
    <g clipPath="url(#clip0_spinner)">
      <path
        d="M10 1.66663V4.99996"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.49992L15.9167 4.08325"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 10H18.3333"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 13.5001L15.9167 15.9168"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 15V18.3333"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.0835 15.9168L6.50016 13.5001"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1.6665 10H4.99984"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.0835 4.08325L6.50016 6.49992"
        stroke="#CCCCCC"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_spinner">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

export const SadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <g clipPath="url(#clip0_sad)">
      <path
        d="M9.99984 18.3333C14.6022 18.3333 18.3332 14.6023 18.3332 9.99996C18.3332 5.39759 14.6022 1.66663 9.99984 1.66663C5.39746 1.66663 1.6665 5.39759 1.6665 9.99996C1.6665 14.6023 5.39746 18.3333 9.99984 18.3333Z"
        stroke="#C20000"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.3332 13.3333C13.3332 13.3333 12.0832 11.6666 9.99984 11.6666C7.9165 11.6666 6.6665 13.3333 6.6665 13.3333"
        stroke="#C20000"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 7.5H7.50833"
        stroke="#C20000"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7.5H12.5083"
        stroke="#C20000"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_sad">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

export const SmileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <g clipPath="url(#clip0_smile)">
      <path
        d="M9.99984 18.3333C14.6022 18.3333 18.3332 14.6023 18.3332 9.99996C18.3332 5.39759 14.6022 1.66663 9.99984 1.66663C5.39746 1.66663 1.6665 5.39759 1.6665 9.99996C1.6665 14.6023 5.39746 18.3333 9.99984 18.3333Z"
        stroke="#00C274"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.6665 11.6666C6.6665 11.6666 7.9165 13.3333 9.99984 13.3333C12.0832 13.3333 13.3332 11.6666 13.3332 11.6666"
        stroke="#00C274"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 7.5H7.50833"
        stroke="#00C274"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7.5H12.5083"
        stroke="#00C274"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_smile">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

export const CopyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <rect x="7" y="7" width="9" height="9" rx="1.5" stroke="#999" strokeWidth="1.2" />
    <path
      d="M13 7V5.5A1.5 1.5 0 0011.5 4h-7A1.5 1.5 0 003 5.5v7A1.5 1.5 0 005.5 14H7"
      stroke="#999"
      strokeWidth="1.2"
    />
  </svg>
)

export const QrIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <rect x="3" y="3" width="5.5" height="5.5" rx="1" stroke="#999" strokeWidth="1.2" />
    <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" stroke="#999" strokeWidth="1.2" />
    <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" stroke="#999" strokeWidth="1.2" />
    <rect x="12" y="12" width="2" height="2" fill="#999" />
    <rect x="15.5" y="12" width="2" height="2" fill="#999" />
    <rect x="12" y="15.5" width="2" height="2" fill="#999" />
    <rect x="15.5" y="15.5" width="2" height="2" fill="#999" />
  </svg>
)
