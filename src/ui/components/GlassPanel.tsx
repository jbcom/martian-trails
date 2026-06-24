import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * The core UNOMA Field Ops surface — a holographic glass panel (docs/DESIGN-SYSTEM.md).
 * A single source of truth for the glass language (gradient fill, blur, rust edge, inset
 * glow) so every screen reads as the same dusty pressurized console. Inline styles carry
 * the gradient/shadow the design spec fixes verbatim; tokens drive every color.
 */
const glassStyle = {
  background: "linear-gradient(135deg, var(--color-ui-glass) 0%, rgba(10,4,3,0.95) 100%)",
  backdropFilter: "blur(var(--blur-glass))",
  WebkitBackdropFilter: "blur(var(--blur-glass))",
  border: "1px solid var(--color-ui-border)",
  borderRadius: "var(--radius-panel)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.8), inset 0 0 15px rgba(204,112,82,0.1)",
} as const;

export function GlassPanel({
  children,
  className = "",
  motionProps,
}: {
  children: ReactNode;
  className?: string;
  motionProps?: React.ComponentProps<typeof motion.div>;
}) {
  return (
    <motion.div style={glassStyle} className={className} {...motionProps}>
      {children}
    </motion.div>
  );
}
