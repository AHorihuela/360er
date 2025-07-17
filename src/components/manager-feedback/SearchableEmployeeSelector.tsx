import * as React from "react";
import { useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Employee } from "@/types/review";

interface SearchableEmployeeSelectorProps {
  employees: Employee[];
  selectedEmployeeId: string;
  onEmployeeChange: (employeeId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableEmployeeSelector({
  employees,
  selectedEmployeeId,
  onEmployeeChange,
  placeholder = "Select team member...",
  disabled = false
}: SearchableEmployeeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  const handleSelect = (employeeId: string) => {
    onEmployeeChange(employeeId);
    setOpen(false);
    setSearchValue("");
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !open) {
      setOpen(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[44px] px-3 py-2"
          disabled={disabled}
          onKeyDown={handleKeyDown}
        >
          {selectedEmployee ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {selectedEmployee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="font-medium text-left">{selectedEmployee.name}</span>
                <span className="text-xs text-muted-foreground">{selectedEmployee.role}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search team members..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {employees.length === 0 
                ? "No team members in this cycle." 
                : "No team members found."
              }
            </CommandEmpty>
            <CommandGroup>
              {employees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={`${employee.name} ${employee.role}`}
                  onSelect={() => handleSelect(employee.id)}
                  className="flex items-center gap-3 px-2 py-3 cursor-pointer data-[selected='true']:bg-accent data-[selected='true']:text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                      {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-medium">{employee.name}</span>
                    <span className="text-xs text-muted-foreground">{employee.role}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedEmployeeId === employee.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 