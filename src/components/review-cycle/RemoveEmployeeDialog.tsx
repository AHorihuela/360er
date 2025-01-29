import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface RemoveEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName: string
  onConfirm: () => Promise<void>
}

export function RemoveEmployeeDialog({
  open,
  onOpenChange,
  employeeName,
  onConfirm
}: RemoveEmployeeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Employee</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {employeeName || 'this employee'} from the review cycle? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 