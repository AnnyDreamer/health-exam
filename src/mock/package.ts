import { registerMock } from '@/api/request';
import type { ExamPackage } from '@/types/package';

const mockPackages: ExamPackage[] = [
  {
    id: 'pkg-001',
    name: '基础体检套餐',
    description: '适合年轻人的基础健康筛查',
    badge: '',
    items: [
      { id: 'item-01', name: '一般检查', description: '身高、体重、血压、体脂', price: 50 },
      { id: 'item-02', name: '血常规', description: '血红蛋白、白细胞、血小板等', price: 30 },
      { id: 'item-03', name: '尿常规', description: '尿蛋白、尿糖等', price: 20 },
      { id: 'item-04', name: '肝功能', description: 'ALT、AST、总蛋白等', price: 60 },
      { id: 'item-05', name: '肾功能', description: '肌酐、尿素氮等', price: 40 },
      { id: 'item-06', name: '心电图', description: '12导联心电图', price: 30 },
    ],
    totalPrice: 230,
    originalPrice: 298,
    discount: 7.7,
  },
  {
    id: 'pkg-002',
    name: '深度健康筛查套餐',
    description: '全面深度的健康评估方案',
    badge: '',
    items: [
      { id: 'item-01', name: '一般检查', description: '身高、体重、血压、体脂', price: 50 },
      { id: 'item-02', name: '血常规', description: '血红蛋白、白细胞、血小板等', price: 30 },
      { id: 'item-07', name: '生化全套', description: '肝肾功能、血糖、血脂全套', price: 180 },
      { id: 'item-08', name: '甲状腺功能', description: 'T3、T4、TSH', price: 120 },
      { id: 'item-09', name: '肿瘤标志物', description: 'AFP、CEA、CA199等', price: 280 },
      { id: 'item-10', name: '腹部B超', description: '肝胆脾胰双肾', price: 100 },
      { id: 'item-11', name: '胸部CT', description: '低剂量螺旋CT', price: 200 },
      { id: 'item-06', name: '心电图', description: '12导联心电图', price: 30 },
    ],
    totalPrice: 990,
    originalPrice: 1280,
    discount: 7.7,
  },
];

const mockAIPackage: ExamPackage = {
  id: 'pkg-ai-001',
  name: '心脑血管专项套餐',
  description: '根据您的健康数据和需求，AI 为您量身定制的体检方案',
  badge: 'AI定制',
  items: [
    { id: 'item-01', name: '一般检查', description: '身高、体重、血压、体脂', price: 50 },
    { id: 'item-07', name: '生化全套', description: '肝肾功能、血糖、血脂全套', price: 180 },
    { id: 'item-12', name: '心脏彩超', description: '心脏结构和功能评估', price: 180 },
    { id: 'item-13', name: '颈动脉彩超', description: '颈动脉内膜和斑块筛查', price: 120 },
    { id: 'item-08', name: '甲状腺功能', description: 'T3、T4、TSH', price: 120 },
    { id: 'item-10', name: '腹部B超', description: '肝胆脾胰双肾', price: 100 },
    { id: 'item-06', name: '心电图', description: '12导联心电图', price: 30 },
  ],
  totalPrice: 780,
  originalPrice: 980,
  discount: 8.0,
  notice: [
    '体检前一天请清淡饮食，晚上10点后禁食禁水',
    '体检当天空腹前往',
    '如有长期服用药物请携带药物清单',
    '女性请避开月经期',
  ],
};

const mockGroupPackage: ExamPackage = {
  id: 'pkg-group-001',
  name: '企业团检套餐 A',
  description: '公司为您准备的年度体检方案，含 AI 个性化加项',
  badge: '团检',
  isGroupPackage: true,
  items: [
    // ---- 常规检查（企业统一安排） ----
    { id: 'grp-std-01', name: '一般检查', description: '身高、体重、血压、体脂率', price: 50, category: 'standard' },
    { id: 'grp-std-02', name: '血常规', description: '血红蛋白、白细胞、血小板等20项', price: 30, category: 'standard' },
    { id: 'grp-std-03', name: '尿常规', description: '尿蛋白、尿糖、尿潜血等', price: 20, category: 'standard' },
    { id: 'grp-std-04', name: '肝功能', description: 'ALT、AST、总蛋白、白蛋白等', price: 60, category: 'standard' },
    { id: 'grp-std-05', name: '肾功能', description: '肌酐、尿素氮、尿酸', price: 40, category: 'standard' },
    { id: 'grp-std-06', name: '血脂四项', description: '总胆固醇、甘油三酯、高/低密度脂蛋白', price: 60, category: 'standard' },
    { id: 'grp-std-07', name: '空腹血糖', description: '空腹静脉血糖检测', price: 15, category: 'standard' },
    { id: 'grp-std-08', name: '心电图', description: '12导联静息心电图', price: 30, category: 'standard' },
    { id: 'grp-std-09', name: '腹部B超', description: '肝胆脾胰双肾超声', price: 100, category: 'standard' },
    { id: 'grp-std-10', name: '胸部X光', description: '胸部正位DR摄片', price: 80, category: 'standard' },

    // ---- AI 个性化加项（根据王思琪健康数据推荐） ----
    {
      id: 'grp-ai-01',
      name: '幽门螺杆菌复查(C14呼气试验)',
      description: '碳14标记尿素呼气试验，检测幽门螺杆菌感染状态',
      price: 120,
      category: 'ai-addon',
      aiReason: '您上次检查幽门螺杆菌呈阳性，建议复查确认是否需要根除治疗，长期感染可增加胃溃疡和胃癌风险',
    },
    {
      id: 'grp-ai-02',
      name: '颈椎X光/MRI',
      description: '颈椎正侧位X光或磁共振成像，评估颈椎结构',
      price: 260,
      category: 'ai-addon',
      aiReason: '您的颈椎曲度变直，建议进一步影像学检查评估颈椎退变程度，指导康复方案',
    },
    {
      id: 'grp-ai-03',
      name: '骨密度检测',
      description: '双能X线骨密度仪(DXA)检测腰椎及髋部骨密度',
      price: 180,
      category: 'ai-addon',
      aiReason: '您的维生素D水平偏低(18.5 ng/mL)，可能影响钙吸收，建议检测骨密度排查骨质疏松风险',
    },
    {
      id: 'grp-ai-04',
      name: '维生素D复查',
      description: '血清25-羟基维生素D定量检测',
      price: 90,
      category: 'ai-addon',
      aiReason: '维生素D 18.5 ng/mL 低于正常范围(30-100)，补充治疗后需复查确认恢复情况',
    },
  ],
  totalPrice: 0,
  originalPrice: 1135,
  notice: [
    '此为公司团检项目，常规检查部分无需个人付费',
    'AI加项为个性化推荐，需确认后加入体检方案',
    '体检前一天请清淡饮食，晚上10点后禁食禁水',
    '体检当天空腹前往',
  ],
};

export function setupPackageMock() {
  registerMock('/package/list', () => mockPackages);

  registerMock('/package/detail/pkg-001', () => mockPackages[0]);
  registerMock('/package/detail/pkg-002', () => mockPackages[1]);
  registerMock('/package/detail/pkg-ai-001', () => mockAIPackage);
  registerMock('/package/detail/pkg-group-001', () => mockGroupPackage);

  registerMock('/package/ai-recommend', () => mockAIPackage);
  registerMock('/package/group', () => mockGroupPackage);
}
