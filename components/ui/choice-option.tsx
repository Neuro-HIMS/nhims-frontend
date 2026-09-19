import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Clickable tile wrapping a radio or checkbox. Selected state is painted by `.choice-option`. */
function ChoiceOption({ className, ...props }: ComponentProps<"label">) {
  return <label data-slot="choice-option" className={cn("choice-option", className)} {...props} />;
}

export { ChoiceOption };
