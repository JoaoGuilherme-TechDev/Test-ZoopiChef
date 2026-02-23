import { Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicMarketingSettings } from '@/hooks/useMarketingSettings';

interface SocialLinksProps {
  companyId: string | undefined | null;
  className?: string;
}

/**
 * Social media links footer for public pages
 * Only shows buttons when URLs are configured
 */
export function SocialLinks({ companyId, className = '' }: SocialLinksProps) {
  const { data: settings } = usePublicMarketingSettings(companyId);

  const hasFacebook = settings?.facebook_page_url;
  const hasInstagram = settings?.instagram_url;

  // Don't render if no social links configured
  if (!hasFacebook && !hasInstagram) return null;

  return (
    <div className={`flex items-center justify-center gap-3 py-4 ${className}`}>
      {hasFacebook && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(settings.facebook_page_url!, '_blank')}
          className="gap-2"
        >
          <Facebook className="w-4 h-4" />
          Facebook
        </Button>
      )}
      {hasInstagram && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(settings.instagram_url!, '_blank')}
          className="gap-2"
        >
          <Instagram className="w-4 h-4" />
          Instagram
        </Button>
      )}
    </div>
  );
}
