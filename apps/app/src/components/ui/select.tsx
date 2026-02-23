import * as React from "react"
import { cn } from "@/lib/utils"

const Select = ({ children, ...props }: any) => <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" {...props}>{children}</select>
const SelectGroup = ({ children, ...props }: any) => <optgroup {...props}>{children}</optgroup>
const SelectValue = ({ placeholder, ...props }: any) => <option value="" disabled selected hidden {...props}>{placeholder}</option>
const SelectTrigger = ({ children, className, ...props }: any) => <div className={cn("relative", className)} {...props}>{children}</div>
const SelectContent = ({ children, ...props }: any) => <>{children}</>
const SelectLabel = ({ children, ...props }: any) => <option disabled {...props}>{children}</option>
const SelectItem = React.forwardRef<HTMLOptionElement, any>(({ className, children, value, ...props }, ref) => (
  <option ref={ref} value={value} className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}>
    {children}
  </option>
))
SelectItem.displayName = "SelectItem"
const SelectSeparator = () => <hr className="-mx-1 my-1 h-px bg-muted" />
const SelectScrollUpButton = () => null
const SelectScrollDownButton = () => null

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
