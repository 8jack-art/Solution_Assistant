declare module '@tabler/icons-react' {
  import { FC, SVGProps } from 'react';
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    stroke?: number | string;
  }

  // 声明所有 Tabler 图标为 React 函数组件
  export const IconCalendar: FC<IconProps>;
  export const IconCurrencyDollar: FC<IconProps>;
  export const IconFileText: FC<IconProps>;
  export const IconBuildingFactory: FC<IconProps>;
  export const IconEdit: FC<IconProps>;
  export const IconTool: FC<IconProps>;
  export const IconChartBar: FC<IconProps>;
  export const IconArrowLeft: FC<IconProps>;
  export const IconCoin: FC<IconProps>;
}