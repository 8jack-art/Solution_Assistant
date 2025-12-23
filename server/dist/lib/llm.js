export class LLMService {
    static async testConnection(config) {
        try {
            const apiKey = 'apiKey' in config ? config.apiKey : config.api_key;
            const baseUrl = 'baseUrl' in config ? config.baseUrl : config.base_url;
            const model = config.model;
            const provider = config.provider;
            // 构建完整的API路径
            let apiUrl = baseUrl;
            // 如果 baseUrl 不包含 chat/completions，则添加
            if (!baseUrl.includes('/chat/completions')) {
                // 移除末尾的斜杠
                apiUrl = baseUrl.replace(/\/$/, '');
                apiUrl = `${apiUrl}/chat/completions`;
            }
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'user',
                            content: '你好，这是一个连接测试。'
                        }
                    ],
                    max_tokens: 10,
                    temperature: 0.1
                })
            });
            if (!response.ok) {
                const errorData = await response.text();
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorData}`
                };
            }
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                return {
                    success: false,
                    error: '响应格式无效'
                };
            }
            return {
                success: true,
                content
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '未知错误'
            };
        }
    }
    static async generateContent(config, messages, options) {
        try {
            // 构建完整的API路径
            let apiUrl = config.base_url;
            // 如果 baseUrl 不包含 chat/completions，则添加
            if (!config.base_url.includes('/chat/completions')) {
                // 移除末尾的斜杠
                apiUrl = config.base_url.replace(/\/$/, '');
                apiUrl = `${apiUrl}/chat/completions`;
            }
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.api_key}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages,
                    max_tokens: options?.maxTokens || 1000,
                    temperature: options?.temperature || 0.7
                })
            });
            if (!response.ok) {
                const errorData = await response.text();
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorData}`
                };
            }
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                return {
                    success: false,
                    error: '响应格式无效'
                };
            }
            return {
                success: true,
                content
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '未知错误'
            };
        }
    }
}
export function generateInvestmentPrompt(projectInfo) {
    const systemPrompt = `你是一个专业的投资估算专家，请根据项目信息生成详细的工程费用项。

请按照以下格式输出JSON：
{
  "constructionCost": {
    "items": [
      {"name": "费用项名称", "unit": "单位", "quantity": 数量, "unitPrice": 单价, "total": 总价}
    ]
  },
  "equipmentCost": {
    "items": [
      {"name": "设备名称", "unit": "单位", "quantity": 数量, "unitPrice": 单价, "total": 总价}
    ]
  },
  "installationCost": {
    "items": [
      {"name": "安装费用项", "unit": "单位", "quantity": 数量, "unitPrice": 单价, "total": 总价}
    ]
  },
  "otherCost": {
    "items": [
      {"name": "其他费用项", "amount": 金额, "description": "描述"}
    ]
  },
  "landCost": {
    "amount": 金额,
    "description": "土地费用描述"
  }
}

注意事项：
1. 所有金额单位为万元
2. 总金额应合理匹配项目总投资
3. 费用项应具体且符合行业标准
4. 只返回JSON格式，不要包含其他文字`;
    const userPrompt = `请为以下项目生成详细的工程费用项：

项目名称：${projectInfo.projectName}
总投资：${projectInfo.totalInvestment}万元
建设年限：${projectInfo.constructionYears}年
${projectInfo.industry ? `行业类型：${projectInfo.industry}` : ''}

请根据项目特点生成合理的费用分解。`;
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
}
export function analyzeEngineeringItemsPrompt(projectName, projectDescription, totalInvestment) {
    // 添加时间戳和随机数，确保每次生成不同的结果
    const timestamp = new Date().toISOString();
    const randomSeed = Math.floor(Math.random() * 10000);
    const systemPrompt = `你是一个专业的工程投资估算专家。根据项目信息，为"第一部分 工程费用"生成2-5个合理的二级子项，并估算各子项的建设工程费、设备购置费、安装工程费、其它费用。

请严格按照以下JSON格式输出：
{
  "items": [
    {
      "name": "子项名称",
      "construction_cost": 建设工程费(万元),
      "equipment_cost": 设备购置费(万元),
      "installation_cost": 安装工程费(万元),
      "other_cost": 其它费用(万元),
      "remark": "简短说明"
    }
  ],
  "suggestions": [
    "建议1：具体建议内容",
    "建议2：具体建议内容"
  ],
  "analysis": {
    "project_type": "项目类型分析",
    "cost_breakdown": "费用构成分析",
    "reasoning": "子项划分依据"
  }
}

常见工程子项类型：
1. 主体工程：核心生产/服务设施（通常占工程费用的60-80%）
2. 辅助工程：配套设施（通常占10-20%）
3. 公用工程：供水供电、环保设施等（通常占5-10%）
4. 其它工程：绿化、道路、围墙等（通常占2-5%）

费用分配参考：
- 建设工程费：土建、基础设施等（通常占子项总额的40-60%）
- 设备购置费：生产设备、仪器等（通常占20-40%）
- 安装工程费：设备安装调试（通常占设备费的10-30%）
- 其它费用：临时设施、杂项等（通常占5-10%）

注意事项：
1. 子项数量控制在2-5个，根据项目复杂度决定
2. 所有子项的总费用应约为目标总投资的45-55%（因为还有工程其它费用、预备费、利息等）
3. 各子项名称要具体且符合项目特点
4. 费用估算要合理，避免过高或过低
5. **重要**：每次生成时，请尝试提供不同的子项划分方案和金额分配，以便用户有多种选择
6. 提供2-3条针对该项目投资的专业建议
7. 只返回JSON格式，不要包含其他文字说明`;
    const userPrompt = `项目名称：${projectName}
项目描述：${projectDescription || '无详细描述'}
目标总投资：${totalInvestment}万元

生成时间：${timestamp}
随机种子：${randomSeed}

要求：
1. 分析项目性质，确定2-5个合理的二级子项
2. 每个子项需要有明确的名称和功能说明
3. 估算每个子项的建设工程费、设备购置费、安装工程费、其它费用
4. 各子项的总费用应约为总投资的45-55%
5. 提供针对该项目的专业投资建议
6. 提供详细的分析过程（项目类型、费用构成、划分依据）

请为该项目的"第一部分 工程费用"生成合理的子项和费用估算。`;
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
}
export function subdivideEngineeringItemPrompt(itemName, itemRemark, totalAmount, projectName, projectDescription) {
    const systemPrompt = `你是一个专业的工程造价与工程量分析专家。根据二级子项的信息，将其细分为3-5个三级子项，并估算每个三级子项的工程量、单价和费用占比。

请严格按照以下JSON格式输出：
{
  "subItems": [
    {
      "name": "三级子项名称",
      "quantity": 工程量(数值),
      "unit": "单位(如: m², m³, 台, 套等)",
      "unit_price": 单价(元),
      "construction_ratio": 建设工程费占比(0-1的小数),
      "equipment_ratio": 设备购置费占比(0-1的小数),
      "installation_ratio": 安装工程费占比(0-1的小数),
      "other_ratio": 其它费用占比(0-1的小数)
    }
  ]
}

重要规则：
1. 工程量×单价 = 该三级子项的总价（万元）
2. 四个费用占比之和必须等于1 (construction_ratio + equipment_ratio + installation_ratio + other_ratio = 1)
3. 各费用 = 总价 × 对应占比
4. 所有三级子项的总价之和应等于二级子项的总金额
5. 单价以“元”为单位，不是万元
6. **数值不要太整：工程量和单价应带有小数，避免整数整十整百的数值，使数据更符合实际工程情况。**

费用占比参考：
- 土建类: construction_ratio=0.7-0.8, equipment_ratio=0.1-0.15, installation_ratio=0.05-0.1, other_ratio=0.05-0.1
- 设备类: construction_ratio=0.2-0.3, equipment_ratio=0.5-0.6, installation_ratio=0.1-0.2, other_ratio=0.05-0.1
- 安装类: construction_ratio=0.3-0.4, equipment_ratio=0.3-0.4, installation_ratio=0.2-0.3, other_ratio=0.05-0.1

注意事项：
1. 三级子项数量控制在3-5个
2. 工程量和单价要符合实际工程惯例，但应带有小数（如123.45而不是100，56.78而不是50）
3. 只返回JSON格式，不要包含其他文字说明`;
    const userPrompt = `项目名称：${projectName}
项目描述：${projectDescription || '无详细描述'}

二级子项信息：
- 名称：${itemName}
- 备注：${itemRemark || '无'}
- 总金额：${totalAmount}万元

请将该二级子项细分为3-5个三级子项，并估算：
1. 每个三级子项的名称
2. 工程量和单位
3. 单价（元）
4. 四项费用在总价中的占比

确保：
- 所有三级子项的（工程量×单价）之和 = ${totalAmount}万元
- 每个子项的四个占比之和 = 1`;
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
}
export function analyzeRevenueStructurePrompt(projectName, projectDescription, totalInvestment, engineeringItems) {
    const systemPrompt = `你是一个专业的产业收入结构分析专家。根据项目信息，从以下14个类别中选出2-6个最合适的营业收入类别，并为每个类别推荐3-8个具体的营业收入类型。

## 营业收入类型表（14个类别）：

| 序号 | 类别 | 可能的营业收入类型 |
|------|------|--------------------| n| 🔹 A | 🖥️ 数字平台类 | SaaS平台会员费、AI决策支持增值服务费、政府购买服务收入、系统运维年费、数据接口调用费、培训服务费、定制化开发费、广告位租赁费、平台推广佣金、数据分析报告订阅费、APP内购功能解锁、用户行为数据脱敏后授权使用费 |
| 🌱 B | 🌾 农业种植类 | 中药材销售收入（按品种）、种苗销售收入、技术服务输出费、有机/绿色认证农产品溢价销售、订单农业定金或预付款、土地托管服务费、农业物联网设备销售/租赁费、测土配肥服务收费、轮作规划咨询费 |
| 🐄 C | 🐷 畜牧养殖类 | 畜禽活体销售（猪牛羊鸡鸭）、禽蛋奶产品销售、饲料代加工费、疫病防控与动保技术服务费、良种繁育与人工授精服务费、粪污资源化处理服务费、生态养殖碳汇指标交易收入、牧场参观体验门票 |
| 🌲 D | 🪵 林业经营类 | 林下经济产品销售（菌菇、药材、山珍）、林木采伐权转让或分成、林地长期租赁收入、森林康养体验收费、林业碳汇项目交易收益、林权评估与抵押咨询服务费 |
| 🐟 E | 🌊 渔业水产类 | 水产品批发零售收入、池塘/网箱承包租金、鱼苗种销售、垂钓园门票及配套消费、水产品品牌加盟费、冷链运输协作分成、渔光互补发电上网收入（结合新能源） |
| 🏗️ F | 🔨 建筑营造类（工程建设） | 工程总承包（EPC）收入、农村危房改造补贴回款、装配式农房建造费、小型水利/灌溉设施建设收入、田园综合体景观施工费、建筑劳务分包收入、建材集中采购差价或返点、设计咨询服务费、BIM技术应用服务费、项目代建管理费 |
| 🏢 G | 🏭 建筑资产运营类（空间租赁与服务） | 标准厂房租赁费、定制厂房出售收入、厂房代建+回购协议收入、员工宿舍/人才公寓租金、商业门面/沿街商铺租金、物业管理费、停车位租赁费、楼宇广告位出租（电梯/外墙）、公共设施配套服务费（网络、安保、会务）、能源统供差价收益（水电气热） |
| 🏞️ H | 🌐 产业园区综合开发类 | 土地一级开发投资回报分成、二级工业用地出让溢价分成、产业招商落地奖励、园区整体品牌输出与委托运营费、企业注册代办服务费、孵化器/众创空间工位租金、政企合作特许经营收益（如污水处理BOT）、园区REITs发行管理费、轻资产输出管理提成 |
| 💼 I | 🔄 交易撮合类 | 农资集中采购佣金、中药材产地交易手续费、农机作业调度服务费、农产品电商代运营服务费、土地经营权流转中介费、农企融资对接成功奖励、跨境农产品贸易撮合佣金、厂房仓库租赁信息中介费、工业用地使用权转让撮合费、商业物业转租服务手续费 |
| 🏭 J | 🔧 加工服务类 | 委托加工费（代加工饮片/食品）、初加工服务费（清洗、分级、烘干）、仓储租赁费、冷链保鲜服务费、包装设计与代包装费、来料加工附加水电人工费、深加工附加值合作分成（如药食同源产品）、检测检验配套服务费 |
| 🌍 K | 🌾 综合农服类（农业生产性服务） | 全程机械化作业服务费（耕种管收）、无人机飞防服务费、土壤检测与改良方案费、智慧农业系统集成服务费、农业项目申报代理费、新型职业农民培训费、品牌策划与认证辅导费、农业标准化体系建设咨询费 |
| 💡 L | 🔋 新能源融合类 | 农光互补光伏发电上网收入、沼气工程集中供气收费、光伏大棚租赁分红、秸秆生物质能源转化收益、储能系统运营服务费、碳资产管理咨询服务费、绿证交易分成 |
| 🛒 M | 🎉 农旅融合类 | 民宿经营收入、农事体验活动门票、研学旅行接待收入、特色农产品伴手礼销售、节庆文旅活动策划执行费、田园文旅IP授权使用费、露营营地收费、亲子自然教育课程收入 |
| 💰 N | 📊 政策与金融服务类 | 农业保险协保费分成、农业补贴申报代办服务费、专项资金第三方监管服务收入、绿色金融产品推荐奖励、涉农信贷风险补偿基金参与分成、REITs资产打包顾问费、ESG评级咨询服务费 |

请严格按照以下JSON格式输出：
{
  "selected_categories": [
    {
      "category_code": "类别代码(A-N)",
      "category_name": "类别名称",
      "category_icon": "类别图标",
      "relevance_score": 0.0-1.0的相关度评分,
      "reasoning": "为什么选择这个类别的简短理由（50字以内）",
      "recommended_revenue_types": [
        {
          "type_name": "具体营业收入类型名称",
          "priority": "high|medium|low",
          "suggested_vat_rate": 增值税率(如0.13表示13%),
          "typical_pricing_model": "计费模式说明（如：按面积、按数量、按服务次数等）",
          "estimated_proportion": "预计占总收入的百分比(0-100)"
        }
      ]
    }
  ],
  "total_categories": 选中的类别数量,
  "analysis_summary": "整体分析总结（100字以内，说明项目收入结构特点）"
}

选择规则：
1. 根据项目名称、描述、工程项等信息，分析项目的产业类型和商业模式
2. 从14个类别中选出2-6个最相关的类别（相关度评分>0.6）
3. 每个类别推荐3-8个最合适的具体营业收入类型
4. 按相关度从高到低排序类别
5. 为每个收入类型标注优先级（high/medium/low）和建议的增值税率
6. 估算每个收入类型占总收入的大致比例
7. 所有推荐的收入类型必须来自上述14个类别的具体列表，不要自己创造新的类型

只返回JSON格式，不要包含其他文字说明`;
    const engineeringItemsText = engineeringItems && engineeringItems.length > 0
        ? `\n工程项明细：\n${engineeringItems.map(item => `- ${item.name}：${item.amount}万元`).join('\n')}`
        : '';
    const userPrompt = `项目名称：${projectName}
项目描述：${projectDescription || '无详细描述'}
总投资：${totalInvestment}万元${engineeringItemsText}

请分析该项目，从14个类别中选出最合适的营业收入类别，并为每个类别推荐具体的营业收入类型。`;
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
}
export function analyzeProjectInfoPrompt(projectInfo) {
    const systemPrompt = `你是一个专业的项目分析助手。请仔细分析用户提供的项目信息描述,提取关键信息并以JSON格式返回。

请严格按照以下JSON格式输出,所有字段都必须填写:
{
  "project_name": "项目名称",
  "total_investment": 数值(单位:万元),
  "construction_years": 整数(建设年限,单位:年),
  "operation_years": 整数(运营年限,单位:年),
  "loan_ratio": 数值(贷款比例,0-100的百分数,如70表示70%),
  "loan_interest_rate": 数值(贷款利率,0-100的百分数,如4.9表示4.9%),
  "land_mode": "A|B|C|D",
  "land_area": 数值(土地面积,单位:亩),
  "land_unit_price": 数值(土地单价,单位:万元/亩或万元/亩/年),
  "land_cost": 数值(土地费用,单位:万元),
  "land_remark": "土地信息备注",
  "land_lease_area": 数值(租赁面积,亩,混合模式时填写),
  "land_lease_unit_price": 数值(租赁单价,万元/亩/年,混合模式时填写),
  "land_purchase_area": 数值(征地面积,亩,混合模式时填写),
  "land_purchase_unit_price": 数值(征地单价,万元/亩,混合模式时填写),
  "seedling_compensation": 数值(青苗补偿费,万元,A和D模式时填写)
}

土地模式决策逻辑：
1. A(一次性征地): 政府主导、基础性、永久性项目(如水库、交通枢纽、数据中心)
   - 计算: land_cost = land_area × land_unit_price + seedling_compensation
   - 备注: "按一次性征地模式,[N]亩×[单价]万元/亩 + 青苗补偿[X]万元估算。"
   - 青苗补偿费一般为征地总价的10-20%

2. B(长期租赁用地): 市场化运营、纯农业种植或养殖项目
   - 计算: land_cost = construction_years × land_unit_price × land_area
   - 备注: "按租地模式估算,计入建设期[N]年租金,[M]亩×[单价]万元/亩/年。"

3. C(无土地需求): 纯软件、SaaS平台类项目
   - land_cost = 0
   - 备注: "纯软件类项目,无土地需求。"

4. D(混合用地模式): 包含种植/养殖+加工/仓储等永久性设施的项目
   - 需要填写: land_lease_area, land_lease_unit_price, land_purchase_area, land_purchase_unit_price, seedling_compensation
   - 计算: land_cost = (construction_years × land_lease_unit_price × land_lease_area) + (land_purchase_area × land_purchase_unit_price) + seedling_compensation
   - 备注: "混合用地模式。租赁部分:[...]; 征地部分:[...]; 青苗补偿:[...]万元"

注意事项:
1. 如果信息中没有明确说明某个字段,请根据行业惯例给出合理估算
2. 贷款比例一般为60-80%
3. 贷款利率一般为3-6%
4. 建设年限一般为2-5年
5. 运营年限一般为17-30年
6. 土地征收、租赁单价根据项目所在地区及《广西各地区土地征收、租赁单价区间》来确定
7. 只返回JSON格式,不要包含其他文字说明

广西各地区土地征收、租赁单价区间（2024-2025年，单位：元/亩）

一、土地征收单价区间（区片综合地价，含土地补偿费+安置补助费）

| 地区    | 基本农田      | 建设用地      | 未利用地      | 典型区域           |
|---------|---------------|---------------|---------------|--------------------|
| 南宁    | 3.5~4.8万     | 1.4~1.8万     | 0.4~1.8万     | 良庆区、武鸣县     |
| 柳州    | 3.8~4.4万     | 1.4~1.6万     | 0.35~1.6万    | 市辖区、柳江区     |
| 桂林    | 3.6~6.5万     | 1.3~2.4万     | 0.3~2.4万     | 临桂区、龙胜县     |
| 梧州    | 3.6~4.4万     | 1.3~1.6万     | 0.3~1.6万     | 藤县、蒙山县       |
| 北海    | 3.5~4.2万     | 1.3~1.5万     | 0.3~1.5万     | 市辖区             |
| 防城港  | 3.5~4.0万     | 1.3~1.5万     | 0.3~1.5万     | 港口区、东兴市     |
| 钦州    | 3.5~4.2万     | 1.3~1.5万     | 0.3~1.5万     | 市辖区             |
| 贵港    | 3.5~4.0万     | 1.3~1.5万     | 0.3~1.5万     | 港北区、平南县     |
| 玉林    | 3.5~4.0万     | 1.3~1.5万     | 0.3~1.5万     | 玉州区             |
| 百色    | 3.5~4.2万     | 1.3~1.5万     | 0.3~1.5万     | 田阳区、右江区     |
| 贺州    | 3.5~4.0万     | 1.3~1.5万     | 0.3~1.5万     | 八步区             |
| 河池    | 3.5~8.3万     | 1.3~3.0万     | 0.3~3.0万     | 金城江区、宜州区   |
| 来宾    | 3.5~4.3万     | 1.3~1.6万     | 0.3~1.6万     | 兴宾区、象州县     |
| 崇左    | 3.5~3.6万     | 1.3~1.4万     | 0.3~1.4万     | 江州区、凭祥市     |

二、土地租赁单价区间（实际成交与市场行情）

| 地区    | 农业用地（元/亩/年） | 工业用地（元/亩/年） | 建设用地（元/亩/年） | 市场案例说明                  |
|---------|----------------------|----------------------|----------------------|-------------------------------|
| 南宁    | 500~2000             | 1.5万~5万            | 0.8万~2万            | 宾阳县工业用地挂牌5万/亩/年   |
| 柳州    | 500~2000             | 1.5万~4万            | 0.8万~2万            | 柳州工业用地成交约15.7万/亩（折年租约1.6万） |
| 桂林    | 500~2000             | 1.5万~4万            | 0.8万~2万            | 农业地普遍1000-1500元/亩/年  |
| 梧州    | 500~2000             | 1.5万~4万            | 0.8万~2万            | —                             |
| 北海    | 500~2000             | 1.5万~4万            | 0.8万~2万            | —                             |
| 防城港  | 500~2000             | 1.5万~4万            | 0.8万~2万            | —                             |
| 钦州    | 500~2000             | 1.5万~4万            | 0.8万~2万            | —                             |
| 贵港    | 500~2000             | 1.5万~4万            | 0.8万~2万            | —                             |
| 玉林    | 500~2000             | 1.5万~4万            | 0.8万~2万            | —                             |
| 百色    | 500~2000             | 1.5万~4万            | 0.8万~2万            | —                             |
| 贺州    | 500~2000             | 1.5万~4万            | 0.8万~2万            | —                             |
| 河池    | 500~2000             | 1.5万~4万            | 0.8万~2万            | 天峨县工业用地挂牌1300元/亩/年|
| 来宾    | 500~2000             | 1.5万~4万            | 0.8万~2万            | —                             |
| 崇左    | 500~2000             | 1.5万~4万            | 0.8万~2万            | 凭祥市工业用地1.5万/亩/年     |




`;
    const userPrompt = `请分析以下项目信息并提取关键数据:

${projectInfo}

请返回JSON格式的结构化数据。`;
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
}
/**
 * 分析营业收入类型的税率和计费模式
 */
export function analyzePricingPrompt(typeName) {
    const systemPrompt = `作为一个专业的财务顾问，根据营业收入类型的名称，推理其合适的增值税税率和计费模式。

参考规则：
- 农产品销售：9%
- 服务业：6%
- 工业产品销售：13%
- 租赁服务：9%
- 不动产租赁：9%
- 现代服务（咨询、技术）：6%
- 生活服务：6%

计费模式示例：
- 销售类：按重量销售、按数量销售、按件销售
- 服务类：按服务次数、按面积、按小时、按天
- 租赁类：按月租赁、按年租赁、按平方米
- 订阅类：按月订阅、按年订阅
- 加工类：按重量加工、按件加工
- 技术类：按项目报价、按工作量

请严格按照以下JSON格式返回：
{
  "vat_rate": 增值税率（单位：%，如：9、13、6）,
  "pricing_model": "计费模式（不超过15字）"
}

只返回JSON格式，不要包含其他文字说明`;
    const userPrompt = `营业收入类型：${typeName}

请分析其合适的增值税税率和计费模式。`;
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
}
/**
 * 根据项目信息和营收结构表生成具体的收入项目表
 */
export function generateRevenueItemsPrompt(projectInfo, revenueSummary) {
    const systemPrompt = `作为一个专业的财务分析师，根据项目信息、投资数据和营收结构表，生成详细的营业收入项目表。

请严格按照以下JSON格式返回：
{
  "revenue_items": [
    {
      "name": "收入项名称",
      "category": "agriculture-crop | agriculture-livestock | agriculture-aquaculture | digital-platform | transaction-hub | processing | agri-service | new-energy | agri-tourism | other",
      "unit": "计量单位",
      "quantity": 年产量数值,
      "unitPrice": 单价数值(元),
      "vatRate": 增值税率数值(%)
    }
  ]
}

类别枚举值说明：
- agriculture-crop: 农业种植
- agriculture-livestock: 畜牧养殖
- agriculture-aquaculture: 渔业水产
- digital-platform: 数字平台
- transaction-hub: 交易撮合
- processing: 加工服务
- agri-service: 综合农服
- new-energy: 新能源融合
- agri-tourism: 农旅融合
- other: 其他

要求：
1. 生成 3-8 个收入项目，覆盖主要营收类型
2. 数据要符合行业常识和项目规模
3. category 必须是上述枚举值之一
4. 增值税率参考：农产品 9%、服务业 6%、工业产品 13%
5. 单价以"元"为单位
6. 年产量/规模要符合实际，考虑项目投资规模
7. 只返回JSON格式，不要包含其他文字说明`;
    const investmentSummary = `
总投资：${projectInfo.totalInvestment}万元
建设期：${projectInfo.constructionYears}年
运营期：${projectInfo.operationYears}年${projectInfo.constructionCost ? `
建筑工程费：${projectInfo.constructionCost}万元` : ''}${projectInfo.equipmentCost ? `
设备购置费：${projectInfo.equipmentCost}万元` : ''}
  `.trim();
    const userPrompt = `请为以下项目生成详细的营业收入项目表：

## 项目基本信息
项目名称：${projectInfo.name}
项目描述：${projectInfo.description || '无'}

## 投资简表数据
${investmentSummary}

## 营收结构表
${revenueSummary}

��根据上述信息，生成合理的营业收入项目表。确保：
1. 收入项与营收结构表对应
2. 规模与投资额匹配
3. 数据符合行业常识`;
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
}
/**
 * 单个收入项估算Prompt
 */
export function estimateSingleRevenueItemPrompt(projectInfo, revenueItemName) {
    const systemPrompt = `作为一个专业的财务分析师，根据项目信息和收入项名称，估算该收入项的关键指标。

请严格按照以下JSON格式返回：
{
  "category": "agriculture-crop | digital-platform | manufacturing | service | real-estate | other",
  "fieldTemplate": "quantity-price | area-yield-price | capacity-utilization | subscription | direct-amount",
  "quantity": 数量或面积或产能或订阅数,
  "unit": "数量单位（如：公斤、吨、台、个等）",
  "unitPrice": 单价(万元),
  "vatRate": 增值税率(0-1之间的小数),
  "area": 面积(亩)，仅area-yield-price模板,
  "yieldPerArea": 亩产量，仅area-yield-price模板,
  "capacity": 产能，仅capacity-utilization模板,
  "utilizationRate": 利用率(0-1之间的小数)，仅capacity-utilization模板,
  "subscriptions": 订阅数，仅subscription模板,
  "directAmount": 直接金额(万元)，仅direct-amount模板,
  "remark": "测算理由说明（150字以内，说明数据来源、估算逻辑和依据）"
}

类别说明：
- agriculture-crop: 农业种植
- digital-platform: 数字平台
- manufacturing: 制造业
- service: 服务业
- real-estate: 房地产
- other: 其他

字段模板说明：
- quantity-price: 数量 × 单价（通用）
- area-yield-price: 面积 × 亩产量 × 单价（农业种植）
- capacity-utilization: 产能 × 利用率 × 单件(制造业)
- subscription: 订阅数 × 单价（平台类）
- direct-amount: 直接金额（服务费等）

要求：
1. 根据收入项名称推断最合适的category和fieldTemplate
2. 数据要符合行业常识和项目规模
3. 增值税率参考：农产品 0.09、服务业 0.06、工业产品 0.13
4. 单价以"万元"为单位
5. unit字段必须填写，指明数量的单位（如：公斤、吨、台、个、人次等）
6. remark字段必须填写，说明估算依据、数据来源和计算逻辑，例如："根据项目总投资XXX万元和行业平均亩产YYY吨/亩，结合市场价格ZZZ元/吨推算"
7. 只返回JSON格式，不要包含其他文字说明`;
    const userPrompt = `请为以下项目的收入项进行估算：

## 项目基本信息
项目名称：${projectInfo.name}
项目描述：${projectInfo.description || '无'}
总投资：${projectInfo.totalInvestment}万元
建设期：${projectInfo.constructionYears}年
运营期：${projectInfo.operationYears}年

## 收入项名称
${revenueItemName}

请根据上述信息，估算该收入项的关键指标。确保：
1. 选择最合适的类别和模板
2. 数据与项目规模匹配
3. 符合行业常识`;
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];
}
//# sourceMappingURL=llm.js.map