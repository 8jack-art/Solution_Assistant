// 简化的 @tabler/icons-react 类型声明
// 用于解决 TypeScript 类型检查问题

declare module '@tabler/icons-react' {
  import React from 'react';

  export interface IconProps extends Partial<Omit<React.SVGProps<SVGSVGElement>, 'stroke'>> {
    size?: string | number;
    stroke?: string | number;
    title?: string;
  }

  export type TablerIcon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

  // 导出常用图标
  export const IconAlertTriangle: TablerIcon;
  export const IconRefresh: TablerIcon;
  export const IconTrash: TablerIcon;
  export const IconLogout: TablerIcon;
  export const IconSettings: TablerIcon;
  export const IconUser: TablerIcon;
  export const IconChevronDown: TablerIcon;
  export const IconFlame: TablerIcon;
  export const IconStar: TablerIcon;
  export const IconDots: TablerIcon;
  export const IconFilter: TablerIcon;
  export const IconSearch: TablerIcon;
  export const IconCheck: TablerIcon;
  export const IconX: TablerIcon;
  export const IconApi: TablerIcon;
  export const IconPlus: TablerIcon;
  export const IconChevronRight: TablerIcon;
  export const IconTrendingUp: TablerIcon;
  export const IconRocket: TablerIcon;
  export const IconKey: TablerIcon;
  export const IconArrowRight: TablerIcon;
  export const IconArrowLeft: TablerIcon;
  export const IconBrandPython: TablerIcon;
  export const IconBuilding: TablerIcon;
  export const IconBuildingFactory: TablerIcon;
  export const IconDownload: TablerIcon;
  export const IconTable: TablerIcon;
  export const IconPackage: TablerIcon;
  export const IconGasStation: TablerIcon;
  export const IconUserDollar: TablerIcon;
  export const IconTools: TablerIcon;
  export const IconClearAll: TablerIcon;
  export const IconChartLine: TablerIcon;
  export const IconSparkles: TablerIcon;
  export const IconTrashX: TablerIcon;
  export const IconCopy: TablerIcon;
  export const IconBug: TablerIcon;
  export const IconInfoCircle: TablerIcon;
  export const IconMathFunction: TablerIcon;
  export const IconReceipt: TablerIcon;
  export const IconCalculator: TablerIcon;
  export const IconCode: TablerIcon;
  export const IconLock: TablerIcon;
  export const IconLockOpen: TablerIcon;
  export const IconChevronUp: TablerIcon;
  export const IconCalendar: TablerIcon;
  export const IconEye: TablerIcon;
  export const IconChartPie: TablerIcon;
  export const IconChartBar: TablerIcon;
  export const IconCurrencyDollar: TablerIcon;
  export const IconTerminal: TablerIcon;
  export const IconLink: TablerIcon;
  export const IconAlertCircle: TablerIcon;
  export const IconFileText: TablerIcon;
  export const IconTool: TablerIcon;
  export const IconEdit: TablerIcon;
  export const IconCoin: TablerIcon;
  export const IconWand2: TablerIcon;
  export const IconRotateCcw: TablerIcon;
  export const IconBot: TablerIcon;
  export const IconClipboard: TablerIcon;
  export const IconPencil: TablerIcon;
  export const IconMapPin: TablerIcon;
  export const IconDollarSign: TablerIcon;
  export const IconZoomIn: TablerIcon;
  export const IconRotateCw: TablerIcon;
  export const IconFileSpreadsheet: TablerIcon;
  export const IconInfo: TablerIcon;
  export const IconAlertOctagon: TablerIcon;
  export const IconCoinFilled: TablerIcon;
  export const IconCoinOff: TablerIcon;

  // 允许导入所有其他图标
  export * from '@tabler/icons-react';
}
