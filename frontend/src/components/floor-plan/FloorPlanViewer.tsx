import { cn } from '@/lib/utils';
import { Users, Check, DoorOpen, Bath, ChefHat, Wine, Music, TreePine, Type } from 'lucide-react';
import { FloorPlanLayout, FloorPlanElement, TablePosition } from '@/hooks/useFloorPlan';

interface FloorPlanViewerProps {
  layout: FloorPlanLayout | null;
  elements: FloorPlanElement[];
  tables: TablePosition[];
  selectedTableId?: string | null;
  onTableSelect?: (tableId: string) => void;
  reservedTableIds?: string[];
  className?: string;
  maxWidth?: number;
}

const ELEMENT_ICONS: Record<string, typeof DoorOpen> = {
  door: DoorOpen,
  bathroom: Bath,
  kitchen: ChefHat,
  bar: Wine,
  band: Music,
  playground: TreePine,
  label: Type,
};

export function FloorPlanViewer({
  layout,
  elements,
  tables,
  selectedTableId,
  onTableSelect,
  reservedTableIds = [],
  className,
  maxWidth = 400,
}: FloorPlanViewerProps) {
  if (!layout || tables.length === 0) {
    return null;
  }

  // Calculate scale to fit container - use smaller scale for mobile
  const layoutWidth = layout.width || 800;
  const layoutHeight = layout.height || 600;
  const scale = Math.min(1, maxWidth / layoutWidth);

  const renderElementIcon = (element: FloorPlanElement, elementScale: number) => {
    const iconType = element.icon || element.element_type;
    const IconComponent = ELEMENT_ICONS[iconType];
    
    if (!IconComponent) return null;
    
    const iconSize = Math.min(element.width, element.height) * 0.5 * elementScale;
    
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <IconComponent style={{ width: iconSize, height: iconSize }} />
        {element.label && element.element_type !== 'label' && (
          <span 
            className="mt-0.5 font-medium text-center px-1 truncate max-w-full"
            style={{ fontSize: `${8 * elementScale}px` }}
          >
            {element.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={cn("overflow-auto", className)}>
      <div
        className="relative mx-auto border-2 border-purple-300 rounded-lg overflow-hidden shadow-lg"
        style={{
          width: layoutWidth * scale,
          height: layoutHeight * scale,
          backgroundColor: layout.background_color || '#faf5ff',
        }}
      >
        {/* Render Elements (walls, doors, etc.) */}
        {elements.map((element) => (
          <div
            key={element.id}
            className="absolute"
            style={{
              left: element.position_x * scale,
              top: element.position_y * scale,
              width: element.width * scale,
              height: element.height * scale,
              backgroundColor: element.color,
              transform: `rotate(${element.rotation}deg)`,
              zIndex: element.z_index,
              borderRadius: element.element_type === 'wall' ? '2px' : '6px',
            }}
          >
            {element.element_type === 'label' ? (
              <span 
                className="absolute inset-0 flex items-center justify-center text-white font-bold truncate px-1"
                style={{ fontSize: `${10 * scale}px` }}
              >
                {element.label}
              </span>
            ) : element.element_type !== 'wall' ? (
              renderElementIcon(element, scale)
            ) : null}
          </div>
        ))}

        {/* Render Tables */}
        {tables.map((table) => {
          if (table.position_x === null || table.position_y === null) return null;

          const isSelected = selectedTableId === table.id;
          const isReserved = reservedTableIds.includes(table.id);
          const shape = table.shape || 'circle';
          const isClickable = onTableSelect && !isReserved;
          
          // Determine colors inline to ensure visibility
          const tableStyles = isReserved
            ? { bg: '#9ca3af', text: '#1f2937', border: '#6b7280' }
            : isSelected
            ? { bg: '#22c55e', text: '#ffffff', border: '#16a34a' }
            : { bg: '#7c3aed', text: '#ffffff', border: '#5b21b6' };

          return (
            <div
              key={table.id}
              className={cn(
                "absolute flex items-center justify-center transition-all shadow-lg",
                shape === 'circle' && "rounded-full",
                shape === 'square' && "rounded-lg",
                shape === 'rectangle' && "rounded-lg",
                isSelected && "ring-4 ring-green-300 scale-110",
                isClickable && "cursor-pointer hover:scale-105"
              )}
              style={{
                left: table.position_x * scale,
                top: table.position_y * scale,
                width: (table.width || 80) * scale,
                height: (table.height || 80) * scale,
                transform: `rotate(${table.rotation || 0}deg)`,
                backgroundColor: tableStyles.bg,
                color: tableStyles.text,
                borderWidth: '3px',
                borderStyle: 'solid',
                borderColor: tableStyles.border,
                opacity: isReserved ? 0.7 : 1,
              }}
              onClick={() => isClickable && onTableSelect(table.id)}
            >
              <div 
                className="flex flex-col items-center font-bold"
                style={{ 
                  fontSize: `${Math.max(12, 14 * scale)}px`,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                {isSelected ? (
                  <Check style={{ width: `${Math.max(16, 18 * scale)}px`, height: `${Math.max(16, 18 * scale)}px` }} />
                ) : (
                  <span className="font-extrabold">{table.number}</span>
                )}
                <span className="flex items-center gap-0.5" style={{ fontSize: `${Math.max(9, 10 * scale)}px` }}>
                  <Users style={{ width: `${Math.max(10, 10 * scale)}px`, height: `${Math.max(10, 10 * scale)}px` }} />
                  {table.capacity}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-700 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-purple-600 border border-purple-700" />
          <span className="font-medium">Disponível</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600 ring-1 ring-green-300" />
          <span className="font-medium">Selecionada</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-400 border border-gray-500 opacity-70" />
          <span className="font-medium">Reservada</span>
        </div>
      </div>
    </div>
  );
}
