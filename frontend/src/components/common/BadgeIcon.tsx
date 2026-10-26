import React from "react";
import {
  Award,
  Zap,
  CheckCircle2,
  CheckSquare,
  Layers,
  CheckCheck,
  Crown,
  Clock,
  Coffee,
  Timer,
  Hourglass,
  Activity,
  Shield,
  CalendarCheck,
  Calendar,
  CalendarDays,
  Building,
  Laptop,
  Sparkles,
  Flame,
  BookOpen,
  Library,
  Database,
  Code,
  AlertCircle,
  Lightbulb,
  ListTree,
  Gift,
  Star,
  Palette,
  FileSpreadsheet,
  Download,
  Moon,
  Flag,
  Monitor,
  Layout,
  FolderPlus,
  ClipboardList,
  Sun,
  ShieldAlert,
  ShieldCheck,
  Compass,
} from "lucide-react";

interface BadgeIconProps {
  name?: string;
  className?: string;
}

export function BadgeIcon({ name, className = "h-6 w-6" }: BadgeIconProps) {
  switch (name?.toLowerCase()) {
    case "check-circle":
      return <CheckCircle2 className={className} />;
    case "zap":
      return <Zap className={className} />;
    case "check-square":
      return <CheckSquare className={className} />;
    case "layers":
      return <Layers className={className} />;
    case "check-check":
      return <CheckCheck className={className} />;
    case "crown":
      return <Crown className={className} />;
    case "clock":
      return <Clock className={className} />;
    case "coffee":
      return <Coffee className={className} />;
    case "timer":
      return <Timer className={className} />;
    case "hourglass":
      return <Hourglass className={className} />;
    case "activity":
      return <Activity className={className} />;
    case "shield":
      return <Shield className={className} />;
    case "calendar-check":
      return <CalendarCheck className={className} />;
    case "calendar":
      return <Calendar className={className} />;
    case "calendar-days":
      return <CalendarDays className={className} />;
    case "building":
      return <Building className={className} />;
    case "laptop":
      return <Laptop className={className} />;
    case "sparkler":
    case "sparkle":
    case "sparkles":
      return <Sparkles className={className} />;
    case "flame":
      return <Flame className={className} />;
    case "award":
      return <Award className={className} />;
    case "book-open":
      return <BookOpen className={className} />;
    case "library":
      return <Library className={className} />;
    case "database":
      return <Database className={className} />;
    case "code":
      return <Code className={className} />;
    case "alert-circle":
      return <AlertCircle className={className} />;
    case "lightbulb":
      return <Lightbulb className={className} />;
    case "list-tree":
      return <ListTree className={className} />;
    case "gift":
      return <Gift className={className} />;
    case "star":
      return <Star className={className} />;
    case "palette":
      return <Palette className={className} />;
    case "file-spreadsheet":
      return <FileSpreadsheet className={className} />;
    case "download":
      return <Download className={className} />;
    case "moon":
      return <Moon className={className} />;
    case "flag":
      return <Flag className={className} />;
    case "monitor":
      return <Monitor className={className} />;
    case "layout":
      return <Layout className={className} />;
    case "folder-plus":
      return <FolderPlus className={className} />;
    case "clipboard-list":
      return <ClipboardList className={className} />;
    case "sun":
      return <Sun className={className} />;
    case "shield-alert":
      return <ShieldAlert className={className} />;
    case "shield-check":
      return <ShieldCheck className={className} />;
    case "compass":
      return <Compass className={className} />;
    default:
      return <Award className={className} />;
  }
}
