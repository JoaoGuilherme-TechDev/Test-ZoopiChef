import { ExternalLink, MessageCircle } from 'lucide-react';
import { useCompany } from '@/hooks/useCompany';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-shim';

const DEFAULT_FOOTER = 'Zoopi Tecnologia';
const DEFAULT_WEBSITE = 'www.zoopi.app.br';

export function SystemFooter() {
  const { data: company } = useCompany();

  // Get footer settings from company
  const { data: footerSettings } = useQuery({
    queryKey: ['company-footer-settings', company?.id],
    enabled: !!company?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('footer_text, support_phone')
        .eq('id', company.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching footer settings:', error);
        return null;
      }
      
      return data as { footer_text: string | null; support_phone: string | null } | null;
    },
  });

  const footerText = footerSettings?.footer_text || DEFAULT_FOOTER;
  const supportPhone = footerSettings?.support_phone;

  const formatWhatsAppLink = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    return `https://wa.me/55${numbers}`;
  };


  return (
    <footer className="border-t border-border bg-card/50 py-3 px-4">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span className="font-semibold text-foreground">{footerText}</span>
        
        {!footerSettings?.footer_text && (
          <>
            <span>•</span>
            <a 
              href={`https://${DEFAULT_WEBSITE}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              {DEFAULT_WEBSITE}
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        )}
        
        {supportPhone && (
          <>
            <span>•</span>
            <a 
              href={formatWhatsAppLink(supportPhone)}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-green-500 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="h-3 w-3" />
              {supportPhone}
            </a>
          </>
        )}
      </div>
    </footer>
  );
}

/**
 * Public-facing footer that accepts company data as props
 * Used in PWAs and public pages where context might not be available
 */
interface PublicSystemFooterProps {
  footerText?: string | null;
  supportPhone?: string | null;
}

export function PublicSystemFooter({ footerText, supportPhone }: PublicSystemFooterProps) {
  const displayText = footerText || DEFAULT_FOOTER;

  const formatWhatsAppLink = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    return `https://wa.me/55${numbers}`;
  };


  return (
    <footer className="border-t border-border bg-card/50 py-3 px-4">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span className="font-semibold text-foreground">{displayText}</span>
        
        {!footerText && (
          <>
            <span>•</span>
            <a 
              href={`https://${DEFAULT_WEBSITE}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              {DEFAULT_WEBSITE}
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        )}
        
        {supportPhone && (
          <>
            <span>•</span>
            <a 
              href={formatWhatsAppLink(supportPhone)}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-green-500 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="h-3 w-3" />
              {supportPhone}
            </a>
          </>
        )}
      </div>
    </footer>
  );
}