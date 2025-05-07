import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ReviewCycleType } from '@/types/survey'

interface EditableTitleProps {
  title: string
  dueDate: string
  type?: ReviewCycleType
  onSave: (newTitle: string) => Promise<void>
}

export function EditableTitle({ title, dueDate, type = '360_review', onSave }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)

  const handleSave = async () => {
    await onSave(editedTitle)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedTitle(title)
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

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          className="text-2xl font-bold h-auto py-1 px-2"
          autoFocus
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 group">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Badge variant="outline" className="ml-2">{getSurveyTypeLabel(type)}</Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditedTitle(title)
            setIsEditing(true)
          }}
          className="h-8 w-8"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">Due {new Date(dueDate).toLocaleDateString()}</p>
    </div>
  )
} 