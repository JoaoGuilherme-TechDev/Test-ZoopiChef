import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Headphones,
  Phone,
  Mail,
  MessageCircle,
  Instagram,
  Globe,
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Link as LinkIcon,
  Facebook,
  Youtube,
  Twitter,
  Linkedin,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { useSupportButtons, type SupportButton } from '../hooks/useSupportButtons';

// Custom TikTok icon component
const TikTokIcon: LucideIcon = Object.assign(
  ({ className, ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  ),
  { displayName: 'TikTok' }
) as unknown as LucideIcon;

// Ícones disponíveis para seleção
const AVAILABLE_ICONS = [
  { value: 'headphones', label: 'Headphones', Icon: Headphones },
  { value: 'phone', label: 'Telefone', Icon: Phone },
  { value: 'mail', label: 'E-mail', Icon: Mail },
  { value: 'message-circle', label: 'Chat', Icon: MessageCircle },
  { value: 'instagram', label: 'Instagram', Icon: Instagram },
  { value: 'facebook', label: 'Facebook', Icon: Facebook },
  { value: 'youtube', label: 'YouTube', Icon: Youtube },
  { value: 'tiktok', label: 'TikTok', Icon: TikTokIcon },
  { value: 'twitter', label: 'X (Twitter)', Icon: Twitter },
  { value: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  { value: 'globe', label: 'Website', Icon: Globe },
  { value: 'help-circle', label: 'Ajuda', Icon: HelpCircle },
  { value: 'external-link', label: 'Link Externo', Icon: ExternalLink },
] as const;

// Cores predefinidas
const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#64748b', // Slate
];

function getIconComponent(iconName: string) {
  const found = AVAILABLE_ICONS.find((i) => i.value === iconName);
  return found?.Icon || HelpCircle;
}

interface ButtonFormState {
  label: string;
  action_type: 'link' | 'phone';
  action_value: string;
  icon: string;
  color: string;
}

const defaultForm: ButtonFormState = {
  label: 'Suporte',
  action_type: 'link',
  action_value: '',
  icon: 'headphones',
  color: '#6366f1',
};

export function SupportButtonsSection() {
  const { buttons, isLoading, createButton, updateButton, deleteButton } = useSupportButtons();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ButtonFormState>(defaultForm);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (btn: SupportButton) => {
    setEditingId(btn.id);
    setForm({
      label: btn.label,
      action_type: btn.action_type,
      action_value: btn.action_value,
      icon: btn.icon,
      color: btn.color,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateButton.mutateAsync({ id: editingId, ...form });
    } else {
      await createButton.mutateAsync(form);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteButton.mutateAsync(id);
  };

  const handleClickButton = (btn: SupportButton) => {
    if (btn.action_type === 'phone') {
      window.open(`tel:${btn.action_value}`, '_self');
    } else {
      const url = btn.action_value.startsWith('http') ? btn.action_value : `https://${btn.action_value}`;
      window.open(url, '_blank');
    }
  };

  const isPending = createButton.isPending || updateButton.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            Suporte
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : buttons.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <Headphones className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Nenhum botão de suporte configurado.
            </p>
            <Button variant="outline" size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Criar primeiro botão
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {buttons.map((btn) => {
              const IconComp = getIconComponent(btn.icon);
              return (
                <div
                  key={btn.id}
                  className="group relative flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleClickButton(btn)}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: btn.color + '20', color: btn.color }}
                  >
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{btn.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {btn.action_type === 'phone' ? '📞 ' : '🔗 '}
                      {btn.action_value || 'Não configurado'}
                    </p>
                  </div>

                  {/* Admin actions overlay */}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(btn);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(btn.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Botão de Suporte' : 'Novo Botão de Suporte'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome, tipo, destino, ícone e cor do botão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Label */}
            <div className="space-y-2">
              <Label>Nome do Botão</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex: Suporte, Instagram, WhatsApp..."
              />
            </div>

            {/* Action Type */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.action_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, action_type: v as 'link' | 'phone' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">
                    <span className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" /> Link / URL
                    </span>
                  </SelectItem>
                  <SelectItem value="phone">
                    <span className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Número de Telefone
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Value */}
            <div className="space-y-2">
              <Label>{form.action_type === 'phone' ? 'Número' : 'URL / Link'}</Label>
              <Input
                value={form.action_value}
                onChange={(e) => setForm((f) => ({ ...f, action_value: e.target.value }))}
                placeholder={
                  form.action_type === 'phone'
                    ? '+55 11 99999-9999'
                    : 'https://instagram.com/suaempresa'
                }
              />
            </div>

            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ICONS.map((item) => {
                  const isSelected = form.icon === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon: item.value }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border hover:border-primary/40 text-muted-foreground'
                      }`}
                    >
                      <item.Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      form.color === c
                        ? 'border-foreground scale-110 ring-2 ring-primary/30'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <div className="flex items-center gap-1 ml-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs text-muted-foreground">Personalizar</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Pré-visualização</Label>
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: form.color + '20', color: form.color }}
                >
                  {(() => {
                    const Ic = getIconComponent(form.icon);
                    return <Ic className="h-5 w-5" />;
                  })()}
                </div>
                <div>
                  <p className="font-medium text-sm">{form.label || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground">
                    {form.action_type === 'phone' ? '📞 ' : '🔗 '}
                    {form.action_value || 'Sem destino'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending || !form.label}>
              {isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
