// components/ui/Sheet/types.ts
import { ReactNode } from 'react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export interface SheetContentProps {
  children: ReactNode;
}

export interface SheetHeaderProps {
  children: ReactNode;
}

export interface SheetTitleProps {
  children: ReactNode;
}