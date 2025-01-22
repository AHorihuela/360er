import { CalendarIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface Employee {
  id: string;
  name: string;
}

interface Props {
  selectedCycle: string;
  onCycleChange: (cycle: string) => void;
  selectedEmployees: Employee[];
  onEmployeesChange: (employees: Employee[]) => void;
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
  employees: Employee[];
  cycles: { id: string; title: string; }[];
}

const FEEDBACK_SOURCES = [
  { id: "senior", label: "Senior Colleagues" },
  { id: "peer", label: "Peer Colleagues" },
  { id: "junior", label: "Junior Colleagues" }
];

export function AnalyticsFilters({
  selectedCycle,
  onCycleChange,
  selectedEmployees,
  onEmployeesChange,
  selectedSources,
  onSourcesChange,
  employees,
  cycles
}: Props) {
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Filters</h3>
          {(selectedEmployees.length > 0 || selectedSources.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                onEmployeesChange([]);
                onSourcesChange([]);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Review Cycle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Review Cycle</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {cycles.find(c => c.id === selectedCycle)?.title || "Select cycle"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search cycles..." />
                  <CommandEmpty>No cycles found.</CommandEmpty>
                  <CommandGroup>
                    {cycles.map(cycle => (
                      <CommandItem
                        key={cycle.id}
                        value={cycle.id}
                        onSelect={() => onCycleChange(cycle.id)}
                      >
                        {cycle.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          {/* Employees */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Employees</label>
              {selectedEmployees.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {selectedEmployees.length} selected
                </Badge>
              )}
            </div>
            <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {selectedEmployees.length === 0
                        ? "Search employees..."
                        : `${selectedEmployees.length} selected`}
                    </span>
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search employees..." />
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-[200px]">
                      {employees.map(employee => (
                        <CommandItem
                          key={employee.id}
                          value={employee.id}
                          onSelect={() => {
                            if (selectedEmployees.some(e => e.id === employee.id)) {
                              onEmployeesChange(selectedEmployees.filter(e => e.id !== employee.id));
                            } else {
                              onEmployeesChange([...selectedEmployees, employee]);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {selectedEmployees.some(e => e.id === employee.id) && (
                              <span className="text-primary">✓</span>
                            )}
                            {employee.name}
                          </div>
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedEmployees.length > 0 && (
              <ScrollArea className="h-[100px] w-full rounded-md border">
                <div className="p-2 space-y-1">
                  {selectedEmployees.map(employee => (
                    <Badge
                      key={employee.id}
                      variant="secondary"
                      className="mr-1 mb-1"
                    >
                      {employee.name}
                      <button
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onClick={() => onEmployeesChange(selectedEmployees.filter(e => e.id !== employee.id))}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* Feedback Source */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Feedback Source</label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_SOURCES.map(source => (
                <Button
                  key={source.id}
                  variant={selectedSources.includes(source.id) ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8",
                    selectedSources.includes(source.id) && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => {
                    if (selectedSources.includes(source.id)) {
                      onSourcesChange(selectedSources.filter(s => s !== source.id));
                    } else {
                      onSourcesChange([...selectedSources, source.id]);
                    }
                  }}
                >
                  {source.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 