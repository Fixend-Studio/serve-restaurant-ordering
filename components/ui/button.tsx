import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground hover:bg-[#742f23]",
        secondary: "bg-[#efe6da] text-foreground hover:bg-[#e7dccb]",
        ghost: "text-foreground hover:bg-black/5",
      },
      size: {
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
