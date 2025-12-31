interface AvatarProps {
  name: string;
  isLocal?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
};

export function Avatar({ name, isLocal = false, size = "md" }: AvatarProps) {
  const firstLetter = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`flex items-center justify-center rounded-full font-medium shadow-sm ${sizeClasses[size]} ${
        isLocal
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {firstLetter}
    </div>
  );
}
