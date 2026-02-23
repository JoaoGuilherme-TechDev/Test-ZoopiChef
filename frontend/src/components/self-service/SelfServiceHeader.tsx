import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Scale, Wifi, WifiOff } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface Comanda {
  id: string;
  code: string;
  status: string;
}

interface Table {
  id: string;
  number: number;
}

interface SelfServiceHeaderProps {
  comandas: Comanda[];
  tables: Table[];
  selectedComanda: string;
  selectedTable: string;
  manualWeight: string;
  scaleWeight: number;
  scaleConnected: boolean;
  currentWeight: number;
  onComandaChange: (value: string) => void;
  onTableChange: (value: string) => void;
  onManualWeightChange: (value: string) => void;
  onConnectScale: () => void;
}

export function SelfServiceHeader({
  comandas,
  tables,
  selectedComanda,
  selectedTable,
  manualWeight,
  scaleWeight,
  scaleConnected,
  currentWeight,
  onComandaChange,
  onTableChange,
  onManualWeightChange,
  onConnectScale,
}: SelfServiceHeaderProps) {
  // Filter only open comandas
  const openComandas = comandas.filter(c => c.status === "open");

  // Calculate example value (using R$ 59.90/kg as example)
  const examplePrice = 59.9;
  const calculatedValue = currentWeight * examplePrice;

  return (
    <Card className="m-4 mb-0">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Comanda Select */}
          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="comanda" className="text-sm font-medium">
              Comanda
            </Label>
            <Select value={selectedComanda} onValueChange={onComandaChange}>
              <SelectTrigger id="comanda" className="mt-1">
                <SelectValue placeholder="Selecione a comanda" />
              </SelectTrigger>
              <SelectContent>
                {openComandas.map((comanda) => (
                  <SelectItem key={comanda.id} value={comanda.id}>
                    {comanda.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table Select */}
          <div className="flex-1 min-w-[150px]">
            <Label htmlFor="table" className="text-sm font-medium">
              Mesa (opcional)
            </Label>
            <Select value={selectedTable} onValueChange={onTableChange}>
              <SelectTrigger id="table" className="mt-1">
                <SelectValue placeholder="Selecione a mesa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem mesa</SelectItem>
                {tables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    Mesa {table.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weight Input */}
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center justify-between">
              <Label htmlFor="weight" className="text-sm font-medium">
                Peso (kg)
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={onConnectScale}
                className={scaleConnected ? "text-green-500" : "text-muted-foreground"}
              >
                {scaleConnected ? (
                  <Wifi className="h-4 w-4 mr-1" />
                ) : (
                  <WifiOff className="h-4 w-4 mr-1" />
                )}
                {scaleConnected ? "Conectado" : "Conectar"}
              </Button>
            </div>
            <div className="relative mt-1">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="weight"
                type="number"
                step="0.001"
                min="0"
                placeholder={scaleConnected ? scaleWeight.toFixed(3) : "0.000"}
                value={scaleConnected ? scaleWeight.toFixed(3) : manualWeight}
                onChange={(e) => onManualWeightChange(e.target.value)}
                disabled={scaleConnected}
                className="pl-10 font-mono text-lg"
              />
            </div>
          </div>

          {/* Calculated Value Display */}
          <div className="flex-1 min-w-[150px]">
            <Label className="text-sm font-medium">Valor Calculado</Label>
            <div className="mt-1 p-2 bg-primary/10 rounded-md text-center">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(calculatedValue)}
              </span>
              <p className="text-xs text-muted-foreground">
                {currentWeight.toFixed(3)} kg × {formatCurrency(examplePrice)}/kg
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
