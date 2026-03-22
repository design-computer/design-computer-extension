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
    <g clipPath="url(#clip0_copy)">
      <path
        d="M16.6665 6.66663H8.33317C7.4127 6.66663 6.6665 7.41282 6.6665 8.33329V16.6666C6.6665 17.5871 7.4127 18.3333 8.33317 18.3333H16.6665C17.587 18.3333 18.3332 17.5871 18.3332 16.6666V8.33329C18.3332 7.41282 17.587 6.66663 16.6665 6.66663Z"
        stroke="#999"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.33317 13.3333C2.4165 13.3333 1.6665 12.5833 1.6665 11.6666V3.33329C1.6665 2.41663 2.4165 1.66663 3.33317 1.66663H11.6665C12.5832 1.66663 13.3332 2.41663 13.3332 3.33329"
        stroke="#999"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_copy">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

export const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <path
      d="M4.5 10.5L8 14L15.5 6.5"
      stroke="black"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const QrIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
    <path
      d="M5.83333 2.5H3.33333C2.8731 2.5 2.5 2.8731 2.5 3.33333V5.83333C2.5 6.29357 2.8731 6.66667 3.33333 6.66667H5.83333C6.29357 6.66667 6.66667 6.29357 6.66667 5.83333V3.33333C6.66667 2.8731 6.29357 2.5 5.83333 2.5Z"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.6668 2.5H14.1668C13.7066 2.5 13.3335 2.8731 13.3335 3.33333V5.83333C13.3335 6.29357 13.7066 6.66667 14.1668 6.66667H16.6668C17.1271 6.66667 17.5002 6.29357 17.5002 5.83333V3.33333C17.5002 2.8731 17.1271 2.5 16.6668 2.5Z"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.83333 13.3334H3.33333C2.8731 13.3334 2.5 13.7065 2.5 14.1667V16.6667C2.5 17.1269 2.8731 17.5 3.33333 17.5H5.83333C6.29357 17.5 6.66667 17.1269 6.66667 16.6667V14.1667C6.66667 13.7065 6.29357 13.3334 5.83333 13.3334Z"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.5002 13.3334H15.0002C14.5581 13.3334 14.1342 13.509 13.8217 13.8215C13.5091 14.1341 13.3335 14.558 13.3335 15V17.5"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.5 17.5V17.5083"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.0002 5.83337V8.33337C10.0002 8.7754 9.82457 9.19932 9.51201 9.51188C9.19945 9.82445 8.77552 10 8.3335 10H5.8335"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.5 10H2.50833"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 2.5H10.0083"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 13.3334V13.3417"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.3335 10H14.1668"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.5 10V10.0083"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 17.5V16.6666"
      stroke="#999"
      strokeWidth="1.66667"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
