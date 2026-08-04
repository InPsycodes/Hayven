import type { IconProps } from "@tabler/icons-react";
import type { ComponentType } from "react";

type IconSize = "sm" | "md" | "lg";

const sizeMap: Record<IconSize, number> = { sm: 16, md: 20, lg: 24 };

interface AppIconProps extends Omit<IconProps, "size"> {
  icon: ComponentType<IconProps>;
  size?: IconSize;
}

/**
 * Consistent stroke-width/sizing wrapper around Tabler icons, so every
 * screen doesn't re-specify stroke weight and size ad hoc at the call site.
 */
export function Icon({
  icon: IconComponent,
  size = "md",
  stroke = 1.75,
  ...props
}: AppIconProps) {
  return <IconComponent size={sizeMap[size]} stroke={stroke} {...props} />;
}
