import { MenuCategory } from '@/hooks/useMenuByToken';
import { ClassicLayout } from './ClassicLayout';
import { GridLayout } from './GridLayout';
import { PremiumLayout } from './PremiumLayout';

export type MenuLayoutType = 'classic' | 'grid' | 'premium';

interface MenuLayoutProps {
  layout: MenuLayoutType;
  categories: MenuCategory[];
  companyId?: string;
}

export function MenuLayout({ layout, categories, companyId }: MenuLayoutProps) {
  switch (layout) {
    case 'grid':
      return <GridLayout categories={categories} companyId={companyId} />;
    case 'premium':
      return <PremiumLayout categories={categories} companyId={companyId} />;
    case 'classic':
    default:
      return <ClassicLayout categories={categories} companyId={companyId} />;
  }
}

export { ClassicLayout, GridLayout, PremiumLayout };
