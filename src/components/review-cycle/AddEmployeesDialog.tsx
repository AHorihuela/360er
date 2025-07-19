import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LoadingButton, InlineLoading } from "@/components/ui/loading-variants"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from '@/lib/utils'
import { Employee } from '@/types/review'

interface AddEmployeesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableEmployees: Employee[]
  isLoading: boolean
  onAddEmployees: (selectedIds: string[]) => Promise<void>
  onCreateEmployee: (employee: { name: string; role: string }) => Promise<void>
}

export function AddEmployeesDialog({
  open,
  onOpenChange,
  availableEmployees,
  isLoading,
  onAddEmployees,
  onCreateEmployee
}: AddEmployeesDialogProps) {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [showNewEmployeeForm, setShowNewEmployeeForm] = useState(false)
  const [newEmployee, setNewEmployee] = useState({ name: '', role: '' })
  const [isAddingEmployees, setIsAddingEmployees] = useState(false)

  const handleAddEmployees = async () => {
    if (selectedEmployeeIds.size === 0) return
    setIsAddingEmployees(true)
    try {
      await onAddEmployees(Array.from(selectedEmployeeIds))
      setSelectedEmployeeIds(new Set())
      onOpenChange(false)
    } catch (error) {
      console.error('Error adding employees:', error)
    } finally {
      setIsAddingEmployees(false)
    }
  }

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmployee.name || !newEmployee.role) return
    
    setIsAddingEmployees(true)
    try {
      await onCreateEmployee(newEmployee)
      setNewEmployee({ name: '', role: '' })
      setShowNewEmployeeForm(false)
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating employee:', error)
    } finally {
      setIsAddingEmployees(false)
    }
  }

  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelection = new Set(selectedEmployeeIds)
    if (newSelection.has(employeeId)) {
      newSelection.delete(employeeId)
    } else {
      newSelection.add(employeeId)
    }
    setSelectedEmployeeIds(newSelection)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Add Employees</DialogTitle>
        </DialogHeader>

        {showNewEmployeeForm ? (
          <div className="p-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={newEmployee.role}
                onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                placeholder="Software Engineer"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowNewEmployeeForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateEmployee} className="flex-1">
                Create
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-8">
            <InlineLoading text="Loading employees..." />
          </div>
        ) : availableEmployees.length > 0 ? (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              {availableEmployees.map(employee => (
                <div
                  key={employee.id}
                  className={cn(
                    "relative rounded-lg border p-3 cursor-pointer transition-colors",
                    selectedEmployeeIds.has(employee.id) 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-primary/50"
                  )}
                  onClick={() => toggleEmployeeSelection(employee.id)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.has(employee.id)}
                      onChange={() => toggleEmployeeSelection(employee.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <h3 className="font-medium text-sm">{employee.name}</h3>
                      <p className="text-xs text-muted-foreground">{employee.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewEmployeeForm(true)}
              >
                Create New
              </Button>
              <LoadingButton
                onClick={handleAddEmployees}
                disabled={selectedEmployeeIds.size === 0}
                isLoading={isAddingEmployees}
                loadingText="Adding..."
              >
                Add ({selectedEmployeeIds.size})
              </LoadingButton>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground text-center">No employees available</p>
            <Button
              onClick={() => setShowNewEmployeeForm(true)}
              className="w-full"
            >
              Create New Employee
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 