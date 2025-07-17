import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Employee } from '@/types/review';

interface EmployeeSelectorProps {
  employees: Employee[];
  selectedEmployeeId: string;
  onEmployeeChange: (employeeId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmployeeSelector({ 
  employees, 
  selectedEmployeeId, 
  onEmployeeChange,
  placeholder = "Select an employee...",
  disabled = false
}: EmployeeSelectorProps) {
  const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);

  return (
    <Select 
      value={selectedEmployeeId} 
      onValueChange={onEmployeeChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selectedEmployee && (
            <div className="flex items-center gap-3">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {selectedEmployee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="font-medium">{selectedEmployee.name}</span>
                <span className="text-xs text-muted-foreground">{selectedEmployee.role}</span>
              </div>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {employees.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No team members found. Add employees in the Team Members section.
          </div>
        ) : (
          employees.map((employee) => (
            <SelectItem key={employee.id} value={employee.id}>
              <div className="flex items-center gap-3 py-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm">
                    {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{employee.name}</span>
                  <span className="text-xs text-muted-foreground">{employee.role}</span>
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
} 