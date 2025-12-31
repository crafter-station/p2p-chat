import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <CrafterLogo className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Crafter Chat
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

function CrafterLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-labelledby="crafter-logo-title"
      role="img"
    >
      <title id="crafter-logo-title">Crafter Chat Logo</title>
      {/* Hammer head */}
      <rect x="6" y="4" width="20" height="8" rx="2" className="fill-primary" />
      {/* Hammer handle */}
      <rect
        x="14"
        y="10"
        width="4"
        height="14"
        rx="1"
        className="fill-accent"
      />
      {/* Chat bubble */}
      <path
        d="M22 18C22 16.8954 22.8954 16 24 16H28C29.1046 16 30 16.8954 30 18V24C30 25.1046 29.1046 26 28 26H26L24 29V26H24C22.8954 26 22 25.1046 22 24V18Z"
        className="fill-secondary"
      />
      {/* Chat dots */}
      <circle cx="25" cy="21" r="1" className="fill-secondary-foreground" />
      <circle cx="27" cy="21" r="1" className="fill-secondary-foreground" />
    </svg>
  );
}

export { CrafterLogo };
