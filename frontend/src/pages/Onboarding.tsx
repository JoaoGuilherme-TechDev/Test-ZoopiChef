import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Building2, 
  Palette, 
  MessageCircle, 
  Layout, 
  Package, 
  Link2,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  ExternalLink,
  Copy,
  CheckCircle2,
  Circle,
  Smartphone
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Identidade Visual', description: 'Logo e cores da sua marca', icon: Palette },
  { id: 2, title: 'Contato', description: 'WhatsApp para atendimento', icon: MessageCircle },
  { id: 3, title: 'Layout do Cardápio', description: 'Como seu cardápio será exibido', icon: Layout },
  { id: 4, title: 'Primeiro Produto', description: 'Adicione seu primeiro item', icon: Package },
  { id: 5, title: 'Seus Links', description: 'Links públicos prontos para usar', icon: Link2 },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: company, isLoading: companyLoading } = useCompany();
  const updateCompany = useUpdateCompany();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  // Form states
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [whatsapp, setWhatsapp] = useState('');
  const [menuLayout, setMenuLayout] = useState('classic');

  useEffect(() => {
    if (company) {
      setLogoUrl(company.logo_url || '');
      setPrimaryColor(company.primary_color || '#6366f1');
      setSecondaryColor(company.secondary_color || '#8b5cf6');
      setWhatsapp(company.whatsapp || '');
      setMenuLayout(company.public_menu_layout || 'classic');
      
      // Mark steps as completed based on existing data
      const completed: number[] = [];
      if (company.primary_color || company.logo_url) completed.push(1);
      if (company.whatsapp) completed.push(2);
      if (company.public_menu_layout) completed.push(3);
      setCompletedSteps(completed);
    }
  }, [company]);

  if (companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Card className="max-w-md bg-slate-900/50 border-slate-700/50">
          <CardHeader className="text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <CardTitle className="text-white text-2xl">Empresa não encontrada</CardTitle>
            <CardDescription className="text-slate-400">
              Você precisa criar uma empresa para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/company')} className="w-full bg-purple-600 hover:bg-purple-700">
              Criar Empresa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = (currentStep / steps.length) * 100;
  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId);

  const handleSaveStep = async () => {
    if (!company) return;
    setIsSaving(true);

    try {
      if (currentStep === 1) {
        await updateCompany.mutateAsync({
          id: company.id,
          logo_url: logoUrl || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        });
        if (!completedSteps.includes(1)) {
          setCompletedSteps([...completedSteps, 1]);
        }
      } else if (currentStep === 2) {
        await updateCompany.mutateAsync({
          id: company.id,
          whatsapp: whatsapp,
        });
        if (!completedSteps.includes(2)) {
          setCompletedSteps([...completedSteps, 2]);
        }
      } else if (currentStep === 3) {
        await updateCompany.mutateAsync({
          id: company.id,
          public_menu_layout: menuLayout,
        });
        if (!completedSteps.includes(3)) {
          setCompletedSteps([...completedSteps, 3]);
        }
      }

      toast.success('Salvo com sucesso!');

      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      } else {
        toast.success('🎉 Onboarding concluído! Bem-vindo ao Zoopi!');
        navigate('/');
      }
    } catch (error) {
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado!');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300">URL do Logo</Label>
              <Input
                placeholder="https://exemplo.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500">Cole a URL de uma imagem ou deixe em branco para usar o padrão</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Cor Primária</Label>
                <div className="flex gap-2">
                  <div 
                    className="w-12 h-10 rounded-lg border border-slate-700 cursor-pointer overflow-hidden"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Cor Secundária</Label>
                <div className="flex gap-2">
                  <div 
                    className="w-12 h-10 rounded-lg border border-slate-700 cursor-pointer overflow-hidden"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-3">Pré-visualização</p>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-white/10" />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-white">{company.name}</p>
                  <div className="flex gap-2 mt-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: primaryColor }} />
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: secondaryColor }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Número do WhatsApp</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-slate-800 border border-slate-700 rounded-md">
                  <span className="text-slate-400">+55</span>
                </div>
                <Input
                  placeholder="11999999999"
                  value={whatsapp.replace(/^55/, '')}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    setWhatsapp('55' + cleaned);
                  }}
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                />
              </div>
              <p className="text-xs text-slate-500">DDD + número (sem espaços ou traços)</p>
            </div>

            <Alert className="bg-emerald-500/10 border-emerald-500/30">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <AlertDescription className="text-emerald-300">
                Este número será usado nos botões "Falar no WhatsApp" do seu cardápio público.
              </AlertDescription>
            </Alert>

            {/* Preview */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-3">Como ficará o botão</p>
              <Button className="bg-emerald-600 hover:bg-emerald-700 w-full">
                <MessageCircle className="w-4 h-4 mr-2" />
                Falar no WhatsApp
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <p className="text-slate-400">Escolha como seu cardápio será exibido:</p>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'classic', name: 'Clássico', desc: 'Lista tradicional com produtos em linha', icon: '📋' },
                { id: 'modern', name: 'Moderno', desc: 'Cards grandes com imagens em destaque', icon: '✨' },
                { id: 'minimal', name: 'Minimal', desc: 'Design limpo e focado', icon: '⚡' },
                { id: 'grid', name: 'Grid', desc: 'Produtos organizados em grade', icon: '🔲' },
              ].map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setMenuLayout(layout.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    menuLayout === layout.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{layout.icon}</span>
                  <p className="font-medium text-white">{layout.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{layout.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <Package className="w-12 h-12 text-purple-400" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Adicione seu primeiro produto</h3>
              <p className="text-slate-400">
                Agora que sua empresa está configurada, adicione produtos ao seu cardápio.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/products')}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Package className="w-4 h-4 mr-2" />
                Ir para Produtos
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
              
              <p className="text-sm text-slate-500">
                Você pode adicionar produtos agora ou pular e fazer depois
              </p>
            </div>
          </div>
        );

      case 5:
        const baseUrl = window.location.origin;
        const links = [
          { label: 'Cardápio Digital', path: `/m/${company.menu_token}`, desc: 'Link principal do cardápio', icon: Smartphone },
        ];

        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Seus Links Públicos</h3>
              <p className="text-slate-400">Compartilhe estes links com seus clientes</p>
            </div>

            <div className="space-y-3">
              {links.map((link) => {
                const LinkIcon = link.icon;
                return (
                  <div key={link.label} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                          <LinkIcon className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{link.label}</p>
                          <p className="text-xs text-slate-500">{link.desc}</p>
                          <p className="text-xs text-purple-400 mt-1 font-mono break-all">
                            {baseUrl}{link.path}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => copyToClipboard(baseUrl + link.path)}
                        className="text-slate-400 hover:text-purple-400 flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Alert className="bg-purple-500/10 border-purple-500/30">
              <Link2 className="w-4 h-4 text-purple-400" />
              <AlertDescription className="text-purple-300">
                Acesse "Meus Links" no menu para gerenciar todos os seus links e gerar QR Codes.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/20">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">
            Configuração Inicial
          </Badge>
          <h1 className="text-3xl font-bold text-white mb-2">
            Bem-vindo ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Zoopi</span>!
          </h1>
          <p className="text-slate-400">
            Configure sua empresa em poucos passos e comece a vender
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-slate-400">Etapa {currentStep} de {steps.length}</span>
            <span className="text-purple-400 font-medium">{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps indicator */}
        <div className="flex justify-between mb-8 relative">
          {/* Connection line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-700 -z-10" />
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = isStepCompleted(step.id) || step.id < currentStep;
            const isCurrent = step.id === currentStep;
            
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className="flex flex-col items-center group"
                disabled={step.id > currentStep + 1}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 ${
                  isCompleted 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : isCurrent 
                      ? 'bg-purple-500 border-purple-500 text-white' 
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  {isCompleted && step.id < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-xs mt-2 hidden md:block transition-colors ${
                  isCurrent ? 'text-purple-400 font-medium' : 'text-slate-500'
                }`}>
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Current Step Card */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              {(() => {
                const StepIcon = steps[currentStep - 1].icon;
                return (
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <StepIcon className="w-6 h-6 text-purple-400" />
                  </div>
                );
              })()}
              <div>
                <CardTitle className="text-white">{steps[currentStep - 1].title}</CardTitle>
                <CardDescription className="text-slate-400">
                  {steps[currentStep - 1].description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip} className="text-slate-400 hover:text-white">
              {currentStep === steps.length ? 'Finalizar depois' : 'Pular'}
            </Button>
            <Button 
              onClick={handleSaveStep} 
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 min-w-[120px]"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : currentStep === steps.length ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Concluir
                </>
              ) : (
                <>
                  Salvar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Skip to Dashboard */}
        {currentStep < steps.length && (
          <div className="text-center mt-8">
            <Button 
              variant="link" 
              onClick={() => navigate('/')}
              className="text-slate-500 hover:text-slate-300"
            >
              Pular configuração e ir para o Dashboard
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
