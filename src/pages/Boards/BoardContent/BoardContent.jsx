import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import { sortOrder } from '~/utils/sorts'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import Column from './ListColumns/Column/Column'
import Card from './ListColumns/Column/ListCards/Card/Card'
import { cloneDeep } from 'lodash'

const ACTIVE_DRAG_ITEM_TYPE = {
  COLUMN: 'ACTIVE_DRAG_ITEM_TYPE_COLOUMN',
  CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD'
}

const BoardContent = ({ board }) => {
  // Require the mouse to move by 10 pixels before activating, Block click event
  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } })

  // Press delay of 250ms, with tolerance of 5px of movement to trigger the event
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 500 } })

  const sensor = useSensors(mouseSensor, touchSensor)
  const [orderedColumns, setOrderedColumns] = useState([])

  // Only one element is dragged at a time (Column or Card)
  const [activeDragItemId, setActiveDragItemId] = useState(null)
  const [activeDragItemType, setActiveDragItemType] = useState(null)
  const [activeDragItemData, setActiveDragItemData] = useState(null)

  // Find Column by CardId
  const findColumnByCardId = (cardId) => {
    return orderedColumns.find(col => col?.cards?.map(card => card._id)?.includes(cardId))
  }

  //Trigger when Drag Start
  const handleDragStart = (e) => {
    // console.log('handleDragStart: ', e)
    setActiveDragItemId(e?.active?.id)
    setActiveDragItemData(e?.active?.current)
    setActiveDragItemType(e?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN)
  }

  // Trigger while dragging an element
  const handleDragOver = (e) => {
    // console.log('handleDragOver: ', e)
    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) { return }

    const { active, over } = e

    if (!active || !over) return

    // activeDraggingCard: the Card is being dragged
    const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
    // overCard: the Card that is interacting above or below the Card being dragged
    const { id: overCardId } = over

    // Find two Columns By CardId
    const activeCol = findColumnByCardId(activeDraggingCardId)
    const overCol = findColumnByCardId(overCardId)

    // If either column does not exist, Return
    if (!activeCol || !overCol) return

    // Logic when dragging Card in two different Columns
    if (activeCol._id !== overCol._id) {
      setOrderedColumns(preColumns => {
        // Find the overCard Index in the destination Column
        const overCardIndex =overCol?.cards.findIndex(card => card._id)

        // New Card Index calculation logic ( Code from dndKit Library )
        let newCardIndex
        const isBelowOverItem = active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height
        const modifier = isBelowOverItem ? 1 : 0
        newCardIndex = overCardIndex >= 0 ? overCardIndex + modifier : overCol?.cards?.length + 1

        // Clone the old OrderedColumnState array into a new one to process the data and update the new OrderedColumnState.
        const nextColumns = cloneDeep(preColumns)
        const nextActiveColumn = nextColumns.find(col => col._id === activeCol._id)
        const nextOverColumn = nextColumns.find(col => col._id === overCol._id)

        if (nextActiveColumn) {
          // Delete Card in Column Active
          nextActiveColumn.cards = nextActiveColumn.cards.filter(card => card._id !== activeDraggingCardId)

          // Update cardOrderIds array
          nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map(card => card._id)
        }

        if (nextOverColumn) {
          // Check the Card being Dragged exists in the overColumn, if so that need to delete it first
          nextOverColumn.cards = nextOverColumn.cards.filter(card => card._id !== activeDraggingCardId)

          // Add the Card being dragged to overColumn according to the new Index position
          nextOverColumn.cards = nextOverColumn.cards.toSpliced(newCardIndex, 0, activeDraggingCardData)

          // Update cardOrderIds array
          nextOverColumn.cardOrderIds = nextOverColumn.cards.map(card => card._id)
        }

        return nextColumns
      })
    }
  }

  // //Trigger when Drag End
  const handleDragEnd = (e) => {
    // console.log('handleDragEnd: ', e)

    if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
      console.log('Drag & Drop Card Action')
      return
    }

    const { active, over } = e

    // Check if over does not exist
    if (!active || !over) return

    // If the position after dragg and dropp is different from the original position
    if (active.id !== over.id) {
      const oldIndex = orderedColumns.findIndex(col => col._id === active.id)
      const newIndex = orderedColumns.findIndex(col => col._id === over.id)

      // Use arrayMove to rearrange the original Columns array
      const dndOrderedColumns = arrayMove(orderedColumns, oldIndex, newIndex)
      // const dndOrderedColumnsIds = dndOrderedColumns.map(col => col._id)

      // Update the original state columns after dragging and dropping
      setOrderedColumns(dndOrderedColumns)
    }

    setActiveDragItemId(null)
    setActiveDragItemData(null)
    setActiveDragItemType(null)
  }

  const dropAnimation = { sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }

  useEffect(() => {
    setOrderedColumns(sortOrder(board?.columns, board?.columnOrderIds, '_id'))
  }, [board])

  return (
    <>
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} sensors={sensor}>
        <Box sx={{
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#34495e' : '#1976d2'),
          width: '100%',
          height: (theme) => theme.layoutCustom.boardContentHeight,
          display: 'flex',
          p: '10px 0'
        }}>
          <ListColumns columns={orderedColumns} />
          <DragOverlay dropAnimation={dropAnimation}>
            {!activeDragItemType && null}
            {(activeDragItemId && activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) && <Column column={activeDragItemData}/>}
            {(activeDragItemId && activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) && <Card card={activeDragItemData}/>}
          </DragOverlay>
        </Box>
      </DndContext>
    </>
  )
}

export default BoardContent