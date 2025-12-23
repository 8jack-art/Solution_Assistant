/**
 * 检查收入项是否重复
 * @param existingItems 现有收入项列表
 * @param newItem 要检查的新收入项
 * @returns 如果存在重复项则返回重复项，否则返回null
 */
const checkDuplicateRevenueItem = (existingItems: RevenueItem[], newItem: Partial<RevenueItem>): RevenueItem | null => {
  // 生成唯一标识符用于重复检测
  const generateUniqueKey = (item: any) => {
    const keyComponents = [
      item.name?.trim().toLowerCase() || '',
      item.category || '',
      item.fieldTemplate || '',
      // 对于数量×单价模板，结合数量和单价作为标识
      (item.fieldTemplate === 'quantity-price' || item.fieldTemplate === 'area-yield-price') 
        ? `${item.quantity || 0}-${item.unitPrice || 0}` 
        : '',
      // 对于产能×利用率×单价模板，结合产能、利用率和单价
      item.fieldTemplate === 'capacity-utilization' 
        ? `${item.capacity || 0}-${item.utilizationRate || 0}-${item.unitPrice || 0}` 
        : '',
      // 对于订阅×单价模板，结合订阅数和单价
      item.fieldTemplate === 'subscription' 
        ? `${item.subscriptions || 0}-${item.unitPrice || 0}` 
        : '',
      // 对于直接金额，使用金额值
      item.fieldTemplate === 'direct-amount' 
        ? `${item.directAmount || 0}` 
        : ''
    ];
    
    return keyComponents.filter(Boolean).join('|');
  };
  
  // 检查是否存在重复项
  const newItemKey = generateUniqueKey(newItem);
  const existingItem = existingItems.find(item => {
    const existingKey = generateUniqueKey(item);
    return existingKey === newItemKey;
  });
  
  return existingItem || null;
};

/**
 * 更新addRevenueItem函数以包含重复检测
 */
const addRevenueItemWithDuplicateCheck = (state: any, set: any, item: Partial<RevenueItem>) => {
  // 检查是否存在重复项
  const existingDuplicate = checkDuplicateRevenueItem(state.revenueItems, item);
  
  if (existingDuplicate) {
    console.warn('⚠️ 检测到重复收入项:', {
      现有项: {
        id: existingDuplicate.id,
        name: existingDuplicate.name,
        category: existingDuplicate.category,
        template: existingDuplicate.fieldTemplate
      },
      新增项: {
        name: item.name,
        category: item.category,
        template: item.fieldTemplate
      }
    });
    
    // 不添加重复项，返回现有项ID
    return existingDuplicate.id;
  }
  
  // 不存在重复项，创建新项
  const newItem: RevenueItem = {
    id: `revenue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    index: state.revenueItems.length + 1,
    name: item.name || '新收入项',
    category: item.category || 'other',
    fieldTemplate: item.fieldTemplate || 'quantity-price',
    vatRate: item.vatRate || 0.13,
    ...item
  };
  
  set({ revenueItems: [...state.revenueItems, newItem] });
  return newItem.id;
};

/**
 * 更新updateRevenueItem函数以包含重复检测
 */
const updateRevenueItemWithDuplicateCheck = (state: any, set: any, id: string, updates: Partial<RevenueItem>) => {
  // 找到要更新的项
  const itemToUpdate = state.revenueItems.find(item => item.id === id);
  if (!itemToUpdate) {
    return null;
  }
  
  // 合并现有数据和新数据
  const updatedItem = { ...itemToUpdate, ...updates };
  
  // 创建排除当前项的其他项列表
  const otherItems = state.revenueItems.filter(item => item.id !== id);
  
  // 检查更新后是否与其他项重复
  const existingDuplicate = checkDuplicateRevenueItem(otherItems, updatedItem);
  
  if (existingDuplicate) {
    console.warn('⚠️ 更新会导致重复收入项:', {
      现有重复项: {
        id: existingDuplicate.id,
        name: existingDuplicate.name,
        category: existingDuplicate.category,
        template: existingDuplicate.fieldTemplate
      },
      更新项: {
        id: updatedItem.id,
        name: updatedItem.name,
        category: updatedItem.category,
        template: updatedItem.fieldTemplate
      }
    });
    
    // 不执行更新，返回null表示失败
    return null;
  }
  
  // 执行更新
  set({
    revenueItems: state.revenueItems.map(item =>
      item.id === id ? updatedItem : item
    )
  });
  
  return updatedItem;
};

// 导出函数以便在其他地方使用
export { checkDuplicateRevenueItem, addRevenueItemWithDuplicateCheck, updateRevenueItemWithDuplicateCheck };
