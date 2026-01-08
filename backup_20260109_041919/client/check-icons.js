// 检查 @tabler/icons-react v3 中可用的图标
// 运行: node check-icons.js

import * as icons from '@tabler/icons-react';

console.log('=== @tabler/icons-react v3 可用图标检查 ===\n');

// 检查项目中使用但可能不存在的图标
const problematicIcons = [
  'IconAlertTriangle',
  'IconRefresh',
  'IconTrash',
  'IconLogout',
  'IconSettings',
  'IconUser',
  'IconChevronDown',
  'IconFlame',
  'IconStar',
  'IconDots',
  'IconFilter',
  'IconSearch',
  'IconCheck',
  'IconX',
  'IconApi',
  'IconPlus',
  'IconChevronRight',
  'IconTrendingUp',
  'IconRocket',
  'IconKey',
  'IconArrowRight',
  'IconBrandPython',
  'IconBuilding',
  'IconDownload',
  'IconTable',
  'IconPackage',
  'IconGasStation',
  'IconUserDollar',
  'IconTools',
  'IconClearAll',
  'IconChartLine',
  'IconSparkles',
  'IconTrashX',
  'IconCopy',
  'IconBug',
  'IconInfoCircle',
  'IconMathFunction',
  'IconReceipt',
  'IconCalculator',
  'IconCode',
  'IconLock',
  'IconLockOpen',
  'IconChevronUp',
  'IconCalendar',
  'IconEye',
  'IconChartPie',
  'IconChartBar',
  'IconCurrencyDollar',
  'IconTerminal',
  'IconLink',
  'IconAlertCircle',
  'IconFileText',
  'IconTool'
];

console.log('图标可用性检查：');
console.log('----------------');

problematicIcons.forEach(iconName => {
  if (icons[iconName]) {
    console.log(`✅ ${iconName}: 可用`);
  } else {
    console.log(`❌ ${iconName}: 不可用`);
    // 尝试查找相似的图标
    const suggestions = Object.keys(icons).filter(k =>
      k.toLowerCase().includes(iconName.toLowerCase().replace('icon', ''))
    );
    if (suggestions.length > 0) {
      console.log(`   建议: ${suggestions.join(', ')}`);
    }
  }
});

console.log('\n=== 结束 ===');
