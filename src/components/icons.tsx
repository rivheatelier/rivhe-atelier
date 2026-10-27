import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </Svg>
);
export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.25" r="3.75" />
    <path d="M4.75 20c.9-3.6 3.8-5.5 7.25-5.5s6.35 1.9 7.25 5.5" />
  </Svg>
);
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.75" cy="10.75" r="6.25" />
    <path d="m15.5 15.5 4.75 4.75" />
  </Svg>
);
export const IconBag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.25 8.25h13.5l-1 12H6.25z" />
    <path d="M9 8.25V7a3 3 0 0 1 6 0v1.25" />
  </Svg>
);
export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15.5M14 6.5l5.5 5.5-5.5 5.5" />
  </Svg>
);
export const IconArrowLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12H4.5M10 6.5 4.5 12l5.5 5.5" />
  </Svg>
);
export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
  </Svg>
);
export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
  </Svg>
);
export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />
  </Svg>
);
export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 6.5h15M9.5 6.5V4.75h5V6.5M6.5 6.5l.9 13h9.2l.9-13M10 10.5v5.5M14 10.5v5.5" />
  </Svg>
);
export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
    <path d="M15.5 8.5V5.75c0-.69-.56-1.25-1.25-1.25h-8.5c-.69 0-1.25.56-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25H8.5" />
  </Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const IconCheckCircle = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.25" />
    <path d="m8 12.25 2.75 2.75L16 9.5" />
  </Svg>
);
export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.25" />
    <path d="M12 11v5.5M12 7.75v.01" />
  </Svg>
);
export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4 2.75 19.5h18.5z" />
    <path d="M12 10v4.5M12 17v.01" />
  </Svg>
);
export const IconZoom = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.75" cy="10.75" r="6.25" />
    <path d="m15.5 15.5 4.75 4.75M10.75 8.25v5M8.25 10.75h5" />
  </Svg>
);
export const IconInstagram = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4.5" />
    <circle cx="12" cy="12" r="3.9" />
    <circle cx="17.1" cy="6.9" r=".55" fill="currentColor" />
  </Svg>
);
export const IconChat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.25 19.75 5.4 16.3A7.75 7.75 0 1 1 8.3 19z" />
  </Svg>
);
export const IconMail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
    <path d="m4 6.5 8 6 8-6" />
  </Svg>
);
export const IconBank = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 9.25 12 4.5l8.5 4.75M5 9.75v8M9.75 9.75v8M14.25 9.75v8M19 9.75v8M3.5 19.5h17" />
  </Svg>
);
export const IconTruck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.75 6.25h11v10.5h-11zM13.75 9.75h4l3.5 3.5v3.5h-7.5" />
    <circle cx="6.75" cy="17.5" r="1.75" />
    <circle cx="17.25" cy="17.5" r="1.75" />
  </Svg>
);
export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 4.5h6v6M19.25 4.75 11 13M17.5 13.5v5.25c0 .41-.34.75-.75.75H5.25a.75.75 0 0 1-.75-.75V7.25c0-.41.34-.75.75-.75h5.25" />
  </Svg>
);
export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 4.5H6.25c-.41 0-.75.34-.75.75v13.5c0 .41.34.75.75.75h8.25M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" />
  </Svg>
);
export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3.75 10.5 8.25-6.75 8.25 6.75M6 9v10.5h4.5v-5.25h3V19.5H18V9" />
  </Svg>
);
export const IconReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.75 3.75h12.5v16.5l-2.1-1.4-2.05 1.4-2.1-1.4-2.05 1.4-2.1-1.4-2.1 1.4zM9 8.5h6M9 12h6M9 15.5h3.5" />
  </Svg>
);
export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.75" height="6.75" rx="1" />
    <rect x="13.25" y="4" width="6.75" height="6.75" rx="1" />
    <rect x="4" y="13.25" width="6.75" height="6.75" rx="1" />
    <rect x="13.25" y="13.25" width="6.75" height="6.75" rx="1" />
  </Svg>
);
export const IconPage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.25 3.75h8l3.5 3.5v13H6.25zM14 3.75v3.75h3.75M9 12h6M9 15.5h6" />
  </Svg>
);
export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 7h9M17.5 7h2M4.5 12h2M10.5 12h9M4.5 17h9M17.5 17h2" />
    <circle cx="15.5" cy="7" r="2" />
    <circle cx="8.5" cy="12" r="2" />
    <circle cx="15.5" cy="17" r="2" />
  </Svg>
);
export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.46 5.46l1.41 1.41M17.13 17.13l1.41 1.41M5.46 18.54l1.41-1.41M17.13 6.87l1.41-1.41" />
  </Svg>
);
export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19.5 14.6A7.75 7.75 0 0 1 9.4 4.5a7.75 7.75 0 1 0 10.1 10.1z" />
  </Svg>
);
export const IconAuto = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconYarn = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7.25" />
    <path d="M5.6 8.2c3 .3 7.3 2.4 10 6.3M4.4 12.4c2.9.1 6.7 2 8.6 5.3M8.6 4.4c2.6 1.6 5.4 5.2 6 9.3M16.6 16.1c1.7 1 3 2.6 3.4 4.4" />
  </Svg>
);
export const IconSparkle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 3.5c.6 4.4 2.4 6.2 6.8 6.8-4.4.6-6.2 2.4-6.8 6.8-.6-4.4-2.4-6.2-6.8-6.8 4.4-.6 6.2-2.4 6.8-6.8z" />
    <path d="M18.5 15.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5z" />
  </Svg>
);
export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.25" />
    <path d="M3.75 12h16.5M12 3.75c2.3 2.4 3.4 5.1 3.4 8.25S14.3 17.85 12 20.25c-2.3-2.4-3.4-5.1-3.4-8.25S9.7 6.15 12 3.75z" />
  </Svg>
);
export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.75" y="4.75" width="16.5" height="14.5" rx="1.5" />
    <circle cx="9" cy="9.75" r="1.5" />
    <path d="m4.25 17 5-4.75 3.5 3.25 2.75-2.25 4.25 3.75" />
  </Svg>
);
