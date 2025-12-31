interface AvatarProps {
  name: string;
  isLocal?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export function Avatar({ name, isLocal = false, size = "md" }: AvatarProps) {
  const firstLetter = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`flex items-center justify-center rounded-full font-medium ${sizeClasses[size]} ${
        isLocal ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-200"
      }`}
    >
      {firstLetter}
    </div>
  );
}
