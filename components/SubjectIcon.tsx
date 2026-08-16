'use client';

import {
  Atom,
  Calculator,
  Landmark,
  Code,
  BookOpen,
  Palette,
  Music,
  Globe,
  TrendingUp,
  Brain,
  HeartPulse,
  Folder,
} from 'lucide-react';
import { detectSubjectIcon } from '@/lib/app';

interface SubjectIconProps {
  iconName?: string;
  name?: string;
  className?: string;
}

export default function SubjectIcon({ iconName, name, className = 'w-6 h-6' }: SubjectIconProps) {
  const resolvedIcon = iconName || (name ? detectSubjectIcon(name) : 'Folder');

  switch (resolvedIcon) {
    case 'Atom':
      return <Atom className={className} />;
    case 'Calculator':
      return <Calculator className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    case 'Code':
      return <Code className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Music':
      return <Music className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'Brain':
      return <Brain className={className} />;
    case 'HeartPulse':
      return <HeartPulse className={className} />;
    case 'Folder':
    default:
      return <Folder className={className} />;
  }
}
