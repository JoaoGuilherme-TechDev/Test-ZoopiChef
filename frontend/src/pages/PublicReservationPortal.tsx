import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Loader2, 
  CalendarDays, 
  Clock, 
  Users, 
  Phone, 
  User, 
  UtensilsCrossed,
  AlertTriangle,
  MapPin,
  Mail,
  XCircle,
  CheckCircle,
  Search,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, differenceInHours, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Reservation {
  id: string;
  company_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: string;
  confirmation_token: string;
  notes: string | null;
  special_requests: string | null;
  created_at: string;
  table?: { id: string; number: number; name: string | null };
}

interface Company {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Aguardando Confirmação', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <Clock className="h-4 w-4" />
  },
  confirmed: { 
    label: 'Confirmada', 
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: <CheckCircle className="h-4 w-4" />
  },
  cancelled: { 
    label: 'Cancelada', 
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: <XCircle className="h-4 w-4" />
  },
  completed: { 
    label: 'Concluída', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <CheckCircle className="h-4 w-4" />
  },
  no_show: { 
    label: 'Não Compareceu', 
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: <XCircle className="h-4 w-4" />
  },
};

export default function PublicReservationPortal() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Can come from URL or form input - filter out "null" string values
  const tokenFromUrl = searchParams.get('token');
  const phoneFromUrl = searchParams.get('phone');
  const validToken = tokenFromUrl && tokenFromUrl !== 'null' ? tokenFromUrl : '';
  const validPhone = phoneFromUrl && phoneFromUrl !== 'null' ? phoneFromUrl : '';
  
  const [searchMode, setSearchMode] = useState<'token' | 'phone'>(validToken ? 'token' : 'phone');
  const [searchToken, setSearchToken] = useState(validToken);
  const [searchPhone, setSearchPhone] = useState(validPhone);
  const [isSearching, setIsSearching] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch company by slug
  const { data: companyData, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['public-company-portal', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, phone, address, logo_url')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as Company;
    },
    enabled: !!slug,
  });

  // Auto-search if token is in URL
  const handleSearch = async () => {
    if (searchMode === 'token' && !searchToken.trim()) {
      toast.error('Digite o código da reserva');
      return;
    }
    if (searchMode === 'phone' && !searchPhone.trim()) {
      toast.error('Digite seu telefone');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setReservation(null);

    try {
      let query = supabase
        .from('reservations')
        .select(`
          *,
          table:tables(id, number, name)
        `)
        .eq('company_id', companyData?.id);

      if (searchMode === 'token') {
        query = query.eq('confirmation_token', searchToken.toUpperCase());
      } else {
        // Search by phone - get most recent active reservation
        const cleanPhone = searchPhone.replace(/\D/g, '');
        query = query
          .or(`customer_phone.ilike.%${cleanPhone}%`)
          .in('status', ['pending', 'confirmed'])
          .order('reservation_date', { ascending: false })
          .limit(1);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        setSearchError(
          searchMode === 'token' 
            ? 'Reserva não encontrada. Verifique o código digitado.'
            : 'Nenhuma reserva ativa encontrada para este telefone.'
        );
        return;
      }

      setReservation(data as Reservation);
      setCompany(companyData || null);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Erro ao buscar reserva. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  // Check if cancellation is allowed (5 hours before)
  const canCancel = () => {
    if (!reservation) return false;
    if (reservation.status !== 'pending' && reservation.status !== 'confirmed') return false;

    const reservationDateTime = new Date(
      `${reservation.reservation_date}T${reservation.reservation_time}`
    );
    const hoursUntil = differenceInHours(reservationDateTime, new Date());
    
    return hoursUntil >= 5;
  };

  const handleCancelReservation = async () => {
    if (!reservation) return;

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: 'Cancelado pelo cliente',
        })
        .eq('id', reservation.id);

      if (error) throw error;

      // Send cancellation notification
      await supabase.functions.invoke('reservation-notifications', {
        body: {
          reservation_id: reservation.id,
          notification_type: 'cancellation',
        },
      });

      toast.success('Reserva cancelada com sucesso');
      setReservation({ ...reservation, status: 'cancelled' });
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Erro ao cancelar reserva');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoadingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!companyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Estabelecimento não encontrado</h2>
            <p className="text-muted-foreground">
              O link que você acessou não corresponde a um estabelecimento válido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {companyData.logo_url && (
            <img 
              src={companyData.logo_url} 
              alt={companyData.name}
              className="h-16 w-16 mx-auto rounded-full object-cover border-2"
            />
          )}
          <h1 className="text-2xl font-bold">{companyData.name}</h1>
          <p className="text-muted-foreground">Portal de Reservas</p>
        </div>

        {/* Search Card */}
        {!reservation && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Consultar Reserva
              </CardTitle>
              <CardDescription>
                Encontre sua reserva usando o código ou seu telefone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  variant={searchMode === 'token' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setSearchMode('token')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Por Código
                </Button>
                <Button
                  variant={searchMode === 'phone' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setSearchMode('phone')}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Por Telefone
                </Button>
              </div>

              {searchMode === 'token' ? (
                <div className="space-y-2">
                  <Label>Código da Reserva</Label>
                  <Input
                    placeholder="Ex: ABC12345"
                    value={searchToken}
                    onChange={(e) => setSearchToken(e.target.value.toUpperCase())}
                    className="text-center text-lg tracking-widest font-mono"
                    maxLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    O código foi enviado por WhatsApp no momento da reserva
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    type="tel"
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite o telefone usado no cadastro da reserva
                  </p>
                </div>
              )}

              {searchError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{searchError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Reserva
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Reservation Details Card */}
        {reservation && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    Sua Reserva
                  </CardTitle>
                  <Badge className={STATUS_CONFIG[reservation.status]?.color || 'bg-gray-100'}>
                    {STATUS_CONFIG[reservation.status]?.icon}
                    <span className="ml-1">
                      {STATUS_CONFIG[reservation.status]?.label || reservation.status}
                    </span>
                  </Badge>
                </div>
                <CardDescription>
                  Código: <span className="font-mono font-bold">{reservation.confirmation_token}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{reservation.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{reservation.customer_phone}</p>
                    </div>
                  </div>
                </div>

                {reservation.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{reservation.customer_email}</p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Reservation Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {format(parseISO(reservation.reservation_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Horário</p>
                      <p className="font-medium">{reservation.reservation_time.slice(0, 5)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Lugares</p>
                      <p className="font-medium">{reservation.party_size} pessoas</p>
                    </div>
                  </div>
                  {reservation.table && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Mesa</p>
                        <p className="font-medium">
                          {reservation.table.name || `Mesa ${reservation.table.number}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {(reservation.notes || reservation.special_requests) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm">
                        {reservation.notes || reservation.special_requests}
                      </p>
                    </div>
                  </>
                )}

                {/* Policies Reminder */}
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Lembrete:</strong> Tolerância de 10 minutos após o horário marcado. 
                    Cancelamentos devem ser feitos com no mínimo 5 horas de antecedência.
                  </AlertDescription>
                </Alert>
              </CardContent>

              {/* Cancel Button */}
              {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                <CardFooter className="flex-col gap-3">
                  {canCancel() ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar Reserva
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar Reserva?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Sua reserva para{' '}
                            {format(parseISO(reservation.reservation_date), "dd 'de' MMMM", { locale: ptBR })} às{' '}
                            {reservation.reservation_time.slice(0, 5)} será cancelada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelReservation}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isCancelling ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Confirmar Cancelamento'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <div className="w-full text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Cancelamentos só são permitidos até 5 horas antes do horário da reserva.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Para cancelar, entre em contato:
                      </p>
                      {companyData.phone && (
                        <a 
                          href={`https://wa.me/55${companyData.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-sm"
                        >
                          WhatsApp: {companyData.phone}
                        </a>
                      )}
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setReservation(null)}
                  >
                    Buscar Outra Reserva
                  </Button>
                </CardFooter>
              )}

              {reservation.status === 'cancelled' && (
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setReservation(null)}
                  >
                    Buscar Outra Reserva
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Contact Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Precisa de ajuda?</p>
                  {companyData.phone && (
                    <a 
                      href={`https://wa.me/55${companyData.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {companyData.phone}
                    </a>
                  )}
                  {companyData.address && (
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {companyData.address}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
