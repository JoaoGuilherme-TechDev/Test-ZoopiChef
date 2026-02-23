import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Square,
  Circle,
  RectangleHorizontal,
  Move,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  RotateCw,
  Trash2,
  Plus,
  Minus,
  Users,
  DoorOpen,
  Bath,
  ChefHat,
  Wine,
  Music,
  TreePine,
  Type,
  MousePointer2,
  Pencil,
} from 'lucide-react';
import { useFloorPlanLayout, useFloorPlanElements, useTablesWithPositions, TablePosition, FloorPlanElement } from '@/hooks/useFloorPlan';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tool = 'select' | 'draw-rect' | 'add-tables';

interface DraggingItem {
  type: 'table' | 'element';
  id: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ResizingItem {
  type: 'table' | 'element';
  id: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  handle: 'e' | 'w' | 's' | 'n' | 'se' | 'sw' | 'ne' | 'nw';
}

interface DrawingRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const ELEMENT_ICONS: Record<string, { icon: typeof DoorOpen; label: string; defaultColor: string }> = {
  door: { icon: DoorOpen, label: 'Porta', defaultColor: '#8B4513' },
  bathroom: { icon: Bath, label: 'Banheiro', defaultColor: '#4299e1' },
  kitchen: { icon: ChefHat, label: 'Cozinha', defaultColor: '#ed8936' },
  bar: { icon: Wine, label: 'Bar', defaultColor: '#9f7aea' },
  band: { icon: Music, label: 'Palco/Banda', defaultColor: '#f56565' },
  playground: { icon: TreePine, label: 'Playground', defaultColor: '#48bb78' },
  label: { icon: Type, label: 'Texto', defaultColor: '#718096' },
};

export function FloorPlanEditor() {
  const { layout, isLoading: layoutLoading, createLayout, updateLayout } = useFloorPlanLayout();
  const { elements, createElement, updateElement, deleteElement } = useFloorPlanElements(layout?.id);
  const { tables, updateTablePosition } = useTablesWithPositions();

  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DraggingItem | null>(null);
  const [resizing, setResizing] = useState<ResizingItem | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [localSizes, setLocalSizes] = useState<Record<string, { width: number; height: number }>>({});
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [drawingRect, setDrawingRect] = useState<DrawingRect | null>(null);
  const [addTablesCount, setAddTablesCount] = useState(4);
  const [labelText, setLabelText] = useState('');
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize layout if not exists
  useEffect(() => {
    if (!layoutLoading && !layout) {
      createLayout.mutate({
        name: 'Salão Principal',
        width: 800,
        height: 600,
        background_color: '#f5f5f5',
        grid_enabled: true,
        grid_size: 20,
        is_active: true,
      });
    }
  }, [layoutLoading, layout]);

  const snapToGrid = useCallback((value: number) => {
    if (!showGrid || !layout) return value;
    const gridSize = layout.grid_size || 20;
    return Math.round(value / gridSize) * gridSize;
  }, [showGrid, layout]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  }, [zoom]);

  // Handle pointer down for dragging
  const handleItemPointerDown = (e: React.PointerEvent, type: 'table' | 'element', id: string) => {
    if (activeTool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    const coords = getCanvasCoords(e.clientX, e.clientY);
    
    const item = type === 'table' 
      ? tables.find(t => t.id === id)
      : elements.find(el => el.id === id);

    if (!item) return;

    const itemX = type === 'table' 
      ? (localPositions[id]?.x ?? (item as TablePosition).position_x ?? 50)
      : (localPositions[id]?.x ?? (item as FloorPlanElement).position_x);
    const itemY = type === 'table'
      ? (localPositions[id]?.y ?? (item as TablePosition).position_y ?? 50)
      : (localPositions[id]?.y ?? (item as FloorPlanElement).position_y);

    setDragging({
      type,
      id,
      startX: itemX,
      startY: itemY,
      offsetX: coords.x - itemX,
      offsetY: coords.y - itemY,
    });

    if (type === 'table') {
      setSelectedTable(id);
      setSelectedElement(null);
    } else {
      setSelectedElement(id);
      setSelectedTable(null);
    }
  };

  // Handle resize start
  const handleResizeStart = (e: React.PointerEvent, type: 'table' | 'element', id: string, handle: ResizingItem['handle']) => {
    e.preventDefault();
    e.stopPropagation();
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const item = type === 'table' 
      ? tables.find(t => t.id === id)
      : elements.find(el => el.id === id);

    if (!item) return;

    const currentWidth = localSizes[id]?.width ?? ((type === 'table' ? (item as TablePosition).width : (item as FloorPlanElement).width) || 80);
    const currentHeight = localSizes[id]?.height ?? ((type === 'table' ? (item as TablePosition).height : (item as FloorPlanElement).height) || 80);

    const coords = getCanvasCoords(e.clientX, e.clientY);

    setResizing({
      type,
      id,
      startX: coords.x,
      startY: coords.y,
      startWidth: currentWidth,
      startHeight: currentHeight,
      handle,
    });
  };

  // Handle pointer move for dragging/resizing/drawing
  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (dragging) {
      let newX = snapToGrid(coords.x - dragging.offsetX);
      let newY = snapToGrid(coords.y - dragging.offsetY);

      // Constrain to canvas
      newX = Math.max(0, Math.min(newX, (layout?.width || 800) - 40));
      newY = Math.max(0, Math.min(newY, (layout?.height || 600) - 40));

      setLocalPositions(prev => ({
        ...prev,
        [dragging.id]: { x: newX, y: newY },
      }));
    }

    if (resizing) {
      const deltaX = coords.x - resizing.startX;
      const deltaY = coords.y - resizing.startY;

      let newWidth = resizing.startWidth;
      let newHeight = resizing.startHeight;

      if (resizing.handle.includes('e')) newWidth = Math.max(40, snapToGrid(resizing.startWidth + deltaX));
      if (resizing.handle.includes('w')) newWidth = Math.max(40, snapToGrid(resizing.startWidth - deltaX));
      if (resizing.handle.includes('s')) newHeight = Math.max(40, snapToGrid(resizing.startHeight + deltaY));
      if (resizing.handle.includes('n')) newHeight = Math.max(40, snapToGrid(resizing.startHeight - deltaY));

      setLocalSizes(prev => ({
        ...prev,
        [resizing.id]: { width: newWidth, height: newHeight },
      }));
    }

    if (drawingRect) {
      setDrawingRect(prev => prev ? {
        ...prev,
        currentX: snapToGrid(coords.x),
        currentY: snapToGrid(coords.y),
      } : null);
    }
  };

  // Handle pointer up
  const handlePointerUp = () => {
    if (dragging) {
      const pos = localPositions[dragging.id];
      if (pos) {
        if (dragging.type === 'table') {
          updateTablePosition.mutate({
            id: dragging.id,
            position_x: pos.x,
            position_y: pos.y,
          });
        } else {
          updateElement.mutate({
            id: dragging.id,
            position_x: pos.x,
            position_y: pos.y,
          });
        }
      }
      setDragging(null);
    }

    if (resizing) {
      const size = localSizes[resizing.id];
      if (size) {
        if (resizing.type === 'table') {
          updateTablePosition.mutate({
            id: resizing.id,
            width: size.width,
            height: size.height,
          });
        } else {
          updateElement.mutate({
            id: resizing.id,
            width: size.width,
            height: size.height,
          });
        }
      }
      setResizing(null);
    }

    if (drawingRect) {
      const x = Math.min(drawingRect.startX, drawingRect.currentX);
      const y = Math.min(drawingRect.startY, drawingRect.currentY);
      const width = Math.abs(drawingRect.currentX - drawingRect.startX);
      const height = Math.abs(drawingRect.currentY - drawingRect.startY);

      if (width > 20 && height > 20) {
        createElement.mutate({
          element_type: 'wall',
          position_x: x,
          position_y: y,
          width,
          height,
          color: '#4a5568',
          z_index: 0,
        });
      }
      setDrawingRect(null);
      setActiveTool('select');
    }
  };

  // Handle canvas pointer down for drawing
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target !== canvasRef.current) return;

    if (activeTool === 'draw-rect') {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setDrawingRect({
        startX: snapToGrid(coords.x),
        startY: snapToGrid(coords.y),
        currentX: snapToGrid(coords.x),
        currentY: snapToGrid(coords.y),
      });
    } else if (activeTool === 'select') {
      setSelectedTable(null);
      setSelectedElement(null);
    }
  };

  const selectedTableData = selectedTable ? tables.find(t => t.id === selectedTable) : null;
  const selectedElementData = selectedElement ? elements.find(e => e.id === selectedElement) : null;

  const handleTableUpdate = (updates: Partial<TablePosition>) => {
    if (!selectedTable) return;
    
    // Update local sizes if width/height changed
    if (updates.width !== undefined || updates.height !== undefined) {
      setLocalSizes(prev => ({
        ...prev,
        [selectedTable]: {
          width: updates.width ?? prev[selectedTable]?.width ?? 80,
          height: updates.height ?? prev[selectedTable]?.height ?? 80,
        },
      }));
    }
    
    updateTablePosition.mutate({ id: selectedTable, ...updates });
  };

  const addElement = (type: FloorPlanElement['element_type']) => {
    if (!layout) return;
    
    const config = ELEMENT_ICONS[type] || { defaultColor: '#718096' };
    
    createElement.mutate({
      element_type: type,
      position_x: 100,
      position_y: 100,
      width: type === 'wall' ? 200 : 60,
      height: type === 'wall' ? 20 : 60,
      color: config.defaultColor,
      label: type === 'label' ? (labelText || 'Texto') : null,
      icon: type !== 'wall' && type !== 'label' ? type : null,
      z_index: 0,
    });
    
    if (type === 'label') {
      setLabelText('');
    }
  };

  const getTablePosition = (table: TablePosition) => {
    return localPositions[table.id] ?? { 
      x: table.position_x ?? (50 + tables.indexOf(table) * 100), 
      y: table.position_y ?? 50 
    };
  };

  const getTableSize = (table: TablePosition) => {
    return localSizes[table.id] ?? {
      width: table.width || 80,
      height: table.height || 80,
    };
  };

  const getElementPosition = (element: FloorPlanElement) => {
    return localPositions[element.id] ?? { 
      x: element.position_x, 
      y: element.position_y 
    };
  };

  const getElementSize = (element: FloorPlanElement) => {
    return localSizes[element.id] ?? {
      width: element.width,
      height: element.height,
    };
  };

  const renderResizeHandles = (id: string, type: 'table' | 'element', isSelected: boolean) => {
    if (!isSelected) return null;

    const handles: ResizingItem['handle'][] = ['e', 'w', 's', 'n', 'se', 'sw', 'ne', 'nw'];
    const handleStyles: Record<string, React.CSSProperties> = {
      e: { right: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
      w: { left: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
      s: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
      n: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' },
      se: { right: -4, bottom: -4, cursor: 'nwse-resize' },
      sw: { left: -4, bottom: -4, cursor: 'nesw-resize' },
      ne: { right: -4, top: -4, cursor: 'nesw-resize' },
      nw: { left: -4, top: -4, cursor: 'nwse-resize' },
    };

    return handles.map(handle => (
      <div
        key={handle}
        className="absolute w-2 h-2 bg-primary border border-white rounded-full z-50"
        style={handleStyles[handle]}
        onPointerDown={(e) => handleResizeStart(e, type, id, handle)}
      />
    ));
  };

  const renderElementIcon = (element: FloorPlanElement, scale: number) => {
    const iconType = element.icon || element.element_type;
    const config = ELEMENT_ICONS[iconType];
    
    if (!config) return null;
    
    const IconComponent = config.icon;
    const iconSize = Math.min(element.width, element.height) * 0.6 * scale;
    
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <IconComponent style={{ width: iconSize, height: iconSize }} />
        {element.label && (
          <span 
            className="mt-1 font-medium text-center px-1"
            style={{ fontSize: `${10 * scale}px` }}
          >
            {element.label}
          </span>
        )}
      </div>
    );
  };

  if (layoutLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Zoom & Grid */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant={showGrid ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Tools */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Ferramenta:</span>
            <Button
              variant={activeTool === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTool('select')}
            >
              <MousePointer2 className="h-4 w-4 mr-1" />
              Selecionar
            </Button>
            <Button
              variant={activeTool === 'draw-rect' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTool('draw-rect')}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Desenhar Área
            </Button>
          </div>
        </div>

        {/* Elements to add */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="text-sm font-medium">Adicionar:</span>
          {Object.entries(ELEMENT_ICONS).map(([type, config]) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              onClick={() => addElement(type as FloorPlanElement['element_type'])}
              style={{ borderColor: config.defaultColor }}
            >
              <config.icon className="h-4 w-4 mr-1" style={{ color: config.defaultColor }} />
              {config.label}
            </Button>
          ))}
        </div>

        {/* Text input for label */}
        <div className="flex items-center gap-2 mt-2">
          <Label className="text-sm">Texto do rótulo:</Label>
          <Input
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
            placeholder="Digite o texto..."
            className="w-48"
          />
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr,300px] gap-4">
        {/* Canvas */}
        <Card className="p-4 overflow-auto">
          <div
            ref={canvasRef}
            className={cn(
              "relative mx-auto border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden touch-none",
              activeTool === 'draw-rect' && "cursor-crosshair"
            )}
            style={{
              width: (layout?.width || 800) * zoom,
              height: (layout?.height || 600) * zoom,
              backgroundColor: layout?.background_color || '#f5f5f5',
              backgroundImage: showGrid 
                ? `linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
                   linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)`
                : undefined,
              backgroundSize: showGrid ? `${(layout?.grid_size || 20) * zoom}px ${(layout?.grid_size || 20) * zoom}px` : undefined,
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerDown={handleCanvasPointerDown}
          >
            {/* Drawing preview */}
            {drawingRect && (
              <div
                className="absolute border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
                style={{
                  left: Math.min(drawingRect.startX, drawingRect.currentX) * zoom,
                  top: Math.min(drawingRect.startY, drawingRect.currentY) * zoom,
                  width: Math.abs(drawingRect.currentX - drawingRect.startX) * zoom,
                  height: Math.abs(drawingRect.currentY - drawingRect.startY) * zoom,
                }}
              />
            )}

            {/* Render Elements (walls, doors, etc.) */}
            {elements.map((element) => {
              const pos = getElementPosition(element);
              const size = getElementSize(element);
              const isSelected = selectedElement === element.id;
              
              return (
                <div
                  key={element.id}
                  className={cn(
                    "absolute transition-shadow touch-none",
                    activeTool === 'select' && "cursor-move",
                    isSelected && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{
                    left: pos.x * zoom,
                    top: pos.y * zoom,
                    width: size.width * zoom,
                    height: size.height * zoom,
                    backgroundColor: element.color,
                    transform: `rotate(${element.rotation}deg)`,
                    zIndex: element.z_index,
                    borderRadius: element.element_type === 'wall' ? '2px' : '8px',
                  }}
                  onPointerDown={(e) => handleItemPointerDown(e, 'element', element.id)}
                >
                  {element.element_type === 'label' ? (
                    <span 
                      className="absolute inset-0 flex items-center justify-center text-white font-bold"
                      style={{ fontSize: `${14 * zoom}px` }}
                    >
                      {element.label}
                    </span>
                  ) : element.element_type !== 'wall' ? (
                    renderElementIcon(element, zoom)
                  ) : null}
                  {renderResizeHandles(element.id, 'element', isSelected)}
                </div>
              );
            })}

            {/* Render Tables */}
            {tables.map((table) => {
              const pos = getTablePosition(table);
              const size = getTableSize(table);
              const isSelected = selectedTable === table.id;
              const shape = table.shape || 'circle';
              
              return (
                <div
                  key={table.id}
                  className={cn(
                    "absolute flex items-center justify-center touch-none",
                    "bg-primary/80 text-primary-foreground font-bold shadow-lg",
                    activeTool === 'select' && "cursor-move",
                    isSelected && "ring-4 ring-primary ring-offset-2",
                    shape === 'circle' && "rounded-full",
                    shape === 'square' && "rounded-lg",
                    shape === 'rectangle' && "rounded-lg"
                  )}
                  style={{
                    left: pos.x * zoom,
                    top: pos.y * zoom,
                    width: size.width * zoom,
                    height: size.height * zoom,
                    transform: `rotate(${table.rotation || 0}deg)`,
                  }}
                  onPointerDown={(e) => handleItemPointerDown(e, 'table', table.id)}
                >
                  <div className="flex flex-col items-center" style={{ fontSize: `${14 * zoom}px` }}>
                    <span>{table.number}</span>
                    <span className="flex items-center gap-0.5" style={{ fontSize: `${10 * zoom}px` }}>
                      <Users className="h-3 w-3" style={{ width: `${12 * zoom}px`, height: `${12 * zoom}px` }} />
                      {table.capacity}
                    </span>
                  </div>
                  {renderResizeHandles(table.id, 'table', isSelected)}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Use "Desenhar Área" para criar paredes arrastando o mouse. Selecione mesas/elementos para mover e redimensionar pelos cantos.
          </p>
        </Card>

        {/* Properties Panel */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Propriedades</h3>
          
          {selectedTableData ? (
            <div className="space-y-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="font-medium">Mesa {selectedTableData.number}</p>
                {selectedTableData.name && (
                  <p className="text-sm text-muted-foreground">{selectedTableData.name}</p>
                )}
              </div>

              <div>
                <Label>Formato</Label>
                <Select
                  value={selectedTableData.shape || 'circle'}
                  onValueChange={(v) => handleTableUpdate({ shape: v as 'circle' | 'square' | 'rectangle' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="circle">
                      <div className="flex items-center gap-2">
                        <Circle className="h-4 w-4" />
                        Redonda
                      </div>
                    </SelectItem>
                    <SelectItem value="square">
                      <div className="flex items-center gap-2">
                        <Square className="h-4 w-4" />
                        Quadrada
                      </div>
                    </SelectItem>
                    <SelectItem value="rectangle">
                      <div className="flex items-center gap-2">
                        <RectangleHorizontal className="h-4 w-4" />
                        Retangular
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Capacidade (pessoas)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleTableUpdate({ capacity: Math.max(1, (selectedTableData.capacity || 4) - 1) })}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{selectedTableData.capacity || 4}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleTableUpdate({ capacity: (selectedTableData.capacity || 4) + 1 })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Largura</Label>
                <Slider
                  value={[localSizes[selectedTable!]?.width ?? selectedTableData.width ?? 80]}
                  min={40}
                  max={300}
                  step={10}
                  onValueChange={([v]) => handleTableUpdate({ width: v })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Altura</Label>
                <Slider
                  value={[localSizes[selectedTable!]?.height ?? selectedTableData.height ?? 80]}
                  min={40}
                  max={300}
                  step={10}
                  onValueChange={([v]) => handleTableUpdate({ height: v })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Rotação</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[selectedTableData.rotation || 0]}
                    min={0}
                    max={360}
                    step={15}
                    onValueChange={([v]) => handleTableUpdate({ rotation: v })}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleTableUpdate({ rotation: ((selectedTableData.rotation || 0) + 45) % 360 })}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedElementData ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: selectedElementData.color + '20' }}>
                <p className="font-medium">{ELEMENT_ICONS[selectedElementData.icon || selectedElementData.element_type]?.label || 'Elemento'}</p>
              </div>

              <div>
                <Label>Largura</Label>
                <Slider
                  value={[localSizes[selectedElement!]?.width ?? selectedElementData.width]}
                  min={20}
                  max={400}
                  step={10}
                  onValueChange={([v]) => {
                    setLocalSizes(prev => ({ ...prev, [selectedElement!]: { ...prev[selectedElement!], width: v } }));
                    updateElement.mutate({ id: selectedElement!, width: v });
                  }}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Altura</Label>
                <Slider
                  value={[localSizes[selectedElement!]?.height ?? selectedElementData.height]}
                  min={20}
                  max={400}
                  step={10}
                  onValueChange={([v]) => {
                    setLocalSizes(prev => ({ ...prev, [selectedElement!]: { ...prev[selectedElement!], height: v } }));
                    updateElement.mutate({ id: selectedElement!, height: v });
                  }}
                  className="mt-2"
                />
              </div>

              {selectedElementData.element_type === 'label' && (
                <div>
                  <Label>Texto</Label>
                  <Input
                    value={selectedElementData.label || ''}
                    onChange={(e) => updateElement.mutate({ id: selectedElement!, label: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label>Cor</Label>
                <Input
                  type="color"
                  value={selectedElementData.color}
                  onChange={(e) => updateElement.mutate({ id: selectedElement!, color: e.target.value })}
                  className="mt-1 h-10 w-full"
                />
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  deleteElement.mutate(selectedElement!);
                  setSelectedElement(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Elemento
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Move className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                Selecione uma mesa ou elemento para editar suas propriedades
              </p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Mesas não posicionadas</h4>
            <div className="flex flex-wrap gap-2">
              {tables.filter(t => t.position_x === null).map((table) => (
                <div
                  key={table.id}
                  className="px-3 py-1 bg-muted rounded-full text-sm cursor-pointer hover:bg-primary/20"
                  onClick={() => {
                    const pos = { x: 100, y: 100 };
                    setLocalPositions(prev => ({ ...prev, [table.id]: pos }));
                    updateTablePosition.mutate({
                      id: table.id,
                      position_x: 100,
                      position_y: 100,
                    });
                    setSelectedTable(table.id);
                    setSelectedElement(null);
                  }}
                >
                  Mesa {table.number}
                </div>
              ))}
              {tables.filter(t => t.position_x === null).length === 0 && (
                <p className="text-xs text-muted-foreground">Todas as mesas estão posicionadas</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
