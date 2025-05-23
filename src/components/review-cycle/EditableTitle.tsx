import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ReviewCycleType } from '@/types/survey'

interface EditableTitleProps {
  title: string
  dueDate: string
  type?: ReviewCycleType
  onSave: (newTitle: string, newDueDate?: string) => Promise<void>
  readOnly?: boolean
}

export function EditableTitle({ 
  title, 
  dueDate, 
  type = '360_review', 
  onSave,
  readOnly = false 
}: EditableTitleProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDueDate, setIsEditingDueDate] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [editedDueDate, setEditedDueDate] = useState(dueDate.split('T')[0]) // Format for date input

  const handleSaveTitle = async () => {
    await onSave(editedTitle)
    setIsEditingTitle(false)
  }

  const handleSaveDueDate = async () => {
    await onSave(title, editedDueDate)
    setIsEditingDueDate(false)
  }

  const handleCancelTitle = () => {
    setIsEditingTitle(false)
    setEditedTitle(title)
  }

  const handleCancelDueDate = () => {
    setIsEditingDueDate(false)
    setEditedDueDate(dueDate.split('T')[0])
  }

  const getSurveyTypeLabel = (type: ReviewCycleType) => {
    switch (type) {
      case 'manager_effectiveness':
        return 'Manager Survey'
      case '360_review':
      default:
        return '360° Feedback'
    }
  }

  return (
    <div>
      {/* Title editing */}
      {isEditingTitle ? (
        <div className="flex items-center gap-2 mb-2">
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="text-2xl font-bold h-auto py-1 px-2"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveTitle}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelTitle}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 group mb-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <Badge variant="outline" className="ml-2">{getSurveyTypeLabel(type)}</Badge>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditedTitle(title)
                setIsEditingTitle(true)
              }}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Due date editing */}
      {isEditingDueDate ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Due</span>
          <Input
            type="date"
            value={editedDueDate}
            onChange={(e) => setEditedDueDate(e.target.value)}
            className="w-auto text-sm"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveDueDate}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelDueDate}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 group">
          <p className="text-muted-foreground text-sm">Due {new Date(dueDate).toLocaleDateString()}</p>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditedDueDate(dueDate.split('T')[0])
                setIsEditingDueDate(true)
              }}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Calendar className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
} 