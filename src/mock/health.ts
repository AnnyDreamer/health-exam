import { registerMock } from '@/api/request';
import type { HealthData, HealthReport, HealthProfile } from '@/types/health';
import { getUser } from '@/utils/storage';
import { MOCK_USER_IDS } from './auth';

/**
 * 陈雨萱的健康数据 - 个检有数据
 * 34岁女性，办公室久坐，轻度甲状腺结节，血脂偏高
 */
const chenYuxuanHealth: HealthData = {
  score: { score: 72, maxScore: 100, status: 'attention' },
  indicators: [
    { name: '血压', value: '128/82', status: 'high', label: '偏高' },
    { name: '空腹血糖', value: '5.8', status: 'normal', label: '正常' },
    { name: '总胆固醇', value: '6.1', status: 'high', label: '偏高' },
    { name: '甘油三酯', value: '2.3', status: 'high', label: '偏高' },
    { name: '低密度脂蛋白', value: '4.1', status: 'high', label: '偏高' },
    { name: 'TSH', value: '5.8', status: 'high', label: '偏高' },
    { name: 'BMI', value: '24.8', status: 'high', label: '偏高' },
    { name: '肝功能(ALT)', value: '22', status: 'normal', label: '正常' },
    { name: '肾功能(肌酐)', value: '62', status: 'normal', label: '正常' },
    { name: '血常规', value: '正常', status: 'normal', label: '正常' },
  ],
  lastCheckDate: '2025-11-20',
  hasData: true,
};

const chenYuxuanReport: HealthReport = {
  id: 'report-001',
  date: '2025-11-20',
  summary: '整体健康状况需要关注。血压临界偏高，血脂多项指标超标，甲状腺功能轻度异常(TSH偏高)，BMI接近超重。建议调整饮食结构，增加有氧运动，3个月后复查血脂和甲状腺功能。',
  score: chenYuxuanHealth.score,
  indicators: chenYuxuanHealth.indicators,
  risks: [
    {
      name: '心血管风险',
      level: 'medium',
      description: '血压临界偏高，总胆固醇和低密度脂蛋白均超标，甘油三酯偏高，存在动脉粥样硬化风险',
      suggestion: '建议减少高脂饮食，每周至少150分钟中等强度有氧运动',
    },
    {
      name: '甲状腺功能异常',
      level: 'low',
      description: 'TSH轻度升高(5.8 mIU/L)，提示亚临床甲状腺功能减退可能',
      suggestion: '建议3个月后复查甲状腺功能全套(TSH、FT3、FT4)，必要时进行甲状腺彩超',
    },
    {
      name: '超重',
      level: 'low',
      description: 'BMI 24.8，接近超重标准(>=25)，与血脂异常相关',
      suggestion: '建议控制饮食总热量，目标减重3-5kg',
    },
  ],
};

/** 陈雨萱 - 健康档案（完整版） */
const chenYuxuanProfile: HealthProfile = {
  id: 'profile-001',
  patientName: '陈雨萱',
  score: chenYuxuanHealth.score,
  medicalVisits: [
    {
      id: 'visit-001',
      date: '2025-11-20',
      department: '内分泌科',
      hospital: '福鑫互联网医院',
      diagnosis: '亚临床甲状腺功能减退',
      doctor: '张明华',
      summary: 'TSH 5.8 mIU/L，FT3、FT4正常范围。甲状腺彩超未见明显结节。目前无需药物干预，建议3个月后复查甲状腺功能全套，观察TSH变化趋势。注意保持规律作息，避免过度疲劳。',
    },
    {
      id: 'visit-002',
      date: '2025-09-05',
      department: '心内科',
      hospital: '福鑫互联网医院',
      diagnosis: '高脂血症',
      doctor: '李文清',
      summary: '总胆固醇6.1 mmol/L，低密度脂蛋白4.1 mmol/L，甘油三酯2.3 mmol/L，均高于正常范围。心电图正常，颈动脉彩超未见斑块。处方阿托伐他汀钙片10mg，每晚一次，配合饮食控制，6周后复查血脂。',
    },
    {
      id: 'visit-003',
      date: '2025-03-12',
      department: '全科',
      hospital: '福鑫互联网医院',
      diagnosis: '年度体检异常指标随访',
      doctor: '王丽萍',
      summary: '2024年度体检发现血压128/82 mmHg，处于正常偏高范围。家族无高血压病史。建议低盐低脂饮食，每日钠摄入控制在5g以内，增加有氧运动，每周至少150分钟中等强度运动，2周后复测血压。',
    },
    {
      id: 'visit-004',
      date: '2024-11-15',
      department: '体检中心',
      hospital: '福鑫互联网医院',
      diagnosis: '年度体检',
      doctor: '赵永安',
      summary: '年度健康体检，发现总胆固醇偏高(5.8 mmol/L)、BMI 24.8接近超重标准、维生素D偏低(18.2 ng/mL)。其余指标正常。建议控制体重、调整饮食结构、适当补充维生素D。',
    },
  ],
  examRecords: [
    {
      id: 'exam-001',
      date: '2025-11-20',
      institution: '福鑫互联网医院',
      type: '年度体检',
      abnormalCount: 6,
      indicators: [
        { name: '血压', value: '128/82', status: 'high', label: '偏高' },
        { name: '空腹血糖', value: '5.8', status: 'normal', label: '正常' },
        { name: '总胆固醇', value: '6.1', status: 'high', label: '偏高' },
        { name: '甘油三酯', value: '2.3', status: 'high', label: '偏高' },
        { name: '低密度脂蛋白', value: '4.1', status: 'high', label: '偏高' },
        { name: '高密度脂蛋白', value: '1.3', status: 'normal', label: '正常' },
        { name: 'TSH', value: '5.8', status: 'high', label: '偏高' },
        { name: 'FT3', value: '4.2', status: 'normal', label: '正常' },
        { name: 'FT4', value: '15.1', status: 'normal', label: '正常' },
        { name: 'BMI', value: '24.8', status: 'high', label: '偏高' },
        { name: '肝功能(ALT)', value: '22', status: 'normal', label: '正常' },
        { name: '肾功能(肌酐)', value: '62', status: 'normal', label: '正常' },
        { name: '血常规', value: '正常', status: 'normal', label: '正常' },
        { name: '尿常规', value: '正常', status: 'normal', label: '正常' },
        { name: '维生素D', value: '22.5', status: 'normal', label: '正常' },
      ],
      summary: '本次体检共6项异常：血压临界偏高，总胆固醇、甘油三酯、低密度脂蛋白超标，TSH轻度升高，BMI接近超重。与上年对比，血脂指标有所升高，甲状腺功能新增异常项。维生素D已恢复正常范围。建议积极干预血脂异常，定期监测甲状腺功能。',
    },
    {
      id: 'exam-002',
      date: '2024-11-15',
      institution: '福鑫互联网医院',
      type: '年度体检',
      abnormalCount: 3,
      indicators: [
        { name: '血压', value: '122/78', status: 'normal', label: '正常' },
        { name: '空腹血糖', value: '5.5', status: 'normal', label: '正常' },
        { name: '总胆固醇', value: '5.8', status: 'high', label: '偏高' },
        { name: '甘油三酯', value: '1.8', status: 'normal', label: '正常' },
        { name: '低密度脂蛋白', value: '3.5', status: 'normal', label: '正常' },
        { name: 'TSH', value: '4.2', status: 'normal', label: '正常' },
        { name: 'BMI', value: '24.8', status: 'high', label: '偏高' },
        { name: '肝功能(ALT)', value: '19', status: 'normal', label: '正常' },
        { name: '血常规', value: '正常', status: 'normal', label: '正常' },
        { name: '维生素D', value: '18.2', status: 'low', label: '偏低' },
      ],
      summary: '本次体检共3项异常：总胆固醇轻度偏高，BMI偏高接近超重标准，维生素D偏低。其余指标正常。建议调整饮食结构，减少高脂食物摄入，适当户外活动并补充维生素D。',
    },
  ],
  risks: [
    {
      id: 'risk-001',
      name: '高血压控制不佳伴靶器官损害风险',
      level: 'high',
      description: '诊断明确为高血压病3级（极高危），合并动脉粥样硬化、脑血管供血不足、双下肢动脉多发粥样硬化斑块，提示已存在明确靶器官损害；近30天内无复诊记录（末次就诊为2025-11-17），血压控制状态不明，失访显著增加心脑肾事件风险。',
      relatedVisits: ['visit-002', 'visit-003'],
      suggestion: '立即启动复诊提醒（短信+电话）；复诊时必须测量并记录血压、评估用药依从性；启动靶器官损害基线评估（如尿微量白蛋白、眼底检查、颈动脉超声）；优化降压方案并同步干预高脂血症。',
    },
    {
      id: 'risk-002',
      name: '甲状腺结节进展与功能异常风险',
      level: 'medium',
      description: '2025-11-03就诊明确诊断"甲状腺结节"，但无超声描述、大小、TI-RADS分级及甲状腺功能检验结果，无法判断良恶性倾向或是否合并甲功异常；作为老年女性，结节恶变与代谢紊乱风险需定期评估。',
      relatedVisits: ['visit-001'],
      suggestion: '复诊时同步开具甲状腺超声及功能检查；若TI-RADS ≥4a或甲功异常，转内分泌科会诊；建立甲状腺专项随访节点，建议6个月内完成甲状腺超声+TSH、FT4检查以明确性质。',
    },
    {
      id: 'risk-003',
      name: '动脉粥样硬化加速进展风险',
      level: 'medium',
      description: '已确诊动脉粥样硬化、脑血管供血不足及双下肢动脉多发粥样硬化斑块，三重证据证实全身性动脉粥样硬化负荷高；高血压+高脂血症共病，若未规范用药及生活方式干预，斑块进展及急性事件风险显著升高。',
      relatedVisits: ['visit-002'],
      suggestion: '复诊时评估阿司匹林、他汀类药物使用情况；开具颈动脉超声、ABI（踝臂指数）检查；开展戒烟、限盐、运动处方等生活方式指导，持续稳定化治疗以降低事件率。',
    },
    {
      id: 'risk-004',
      name: '睡眠障碍继发血压波动风险',
      level: 'low',
      description: '2025-11-03诊断"睡眠障碍"，老年患者常见，可导致夜间血压非杓型甚至反杓型，加重靶器官损害；但当前无动态血压监测或睡眠呼吸暂停筛查证据，暂无法评估严重程度，属潜在可干预诱因。',
      relatedVisits: ['visit-003'],
      suggestion: '复诊时询问睡眠质量（PSQI量表初筛）；如存在打鼾、晨起口干、日间嗜睡，建议行睡眠呼吸监测；提供非药物助眠指导，阳性者2周内转介耳鼻喉科或呼吸科。',
    },
  ],
};

/**
 * 王思琪的健康数据 - 团检用户
 * 39岁女性，企业员工，轻度颈椎问题，幽门螺杆菌阳性
 */
const wangSiqiHealth: HealthData = {
  score: { score: 81, maxScore: 100, status: 'attention' },
  indicators: [
    { name: '血压', value: '118/76', status: 'normal', label: '正常' },
    { name: '空腹血糖', value: '5.2', status: 'normal', label: '正常' },
    { name: '总胆固醇', value: '5.0', status: 'normal', label: '正常' },
    { name: '幽门螺杆菌(C14)', value: '阳性', status: 'high', label: '阳性' },
    { name: '颈椎', value: '曲度变直', status: 'high', label: '异常' },
    { name: '维生素D', value: '18.5', status: 'low', label: '偏低' },
    { name: 'BMI', value: '21.3', status: 'normal', label: '正常' },
    { name: '肝功能(ALT)', value: '18', status: 'normal', label: '正常' },
  ],
  lastCheckDate: '2025-10-08',
  hasData: true,
};

/** 王思琪 - 健康档案（完整版） */
const wangSiqiProfile: HealthProfile = {
  id: 'profile-003',
  patientName: '王思琪',
  score: wangSiqiHealth.score,
  medicalVisits: [
    {
      id: 'visit-w001',
      date: '2025-10-22',
      department: '消化内科',
      hospital: '福鑫互联网医院',
      diagnosis: '幽门螺杆菌感染',
      doctor: '陈志强',
      summary: 'C14呼气试验阳性，DPM值680。胃镜检查显示浅表性胃炎。予以四联疗法根除治疗：阿莫西林1g+克拉霉素0.5g+枸橼酸铋钾220mg+奥美拉唑20mg，bid，疗程14天。治疗结束后停药1个月复查C14呼气试验。',
    },
    {
      id: 'visit-w002',
      date: '2025-10-08',
      department: '骨科',
      hospital: '福鑫互联网医院',
      diagnosis: '颈椎病(颈型)',
      doctor: '刘建伟',
      summary: '颈椎X线示颈椎生理曲度变直，C4-C5椎间隙稍窄。长期伏案工作相关。建议调整工作姿势，每小时活动颈部5分钟，加强颈部肌肉锻炼。予以颈椎康复操指导，必要时理疗。',
    },
    {
      id: 'visit-w003',
      date: '2025-06-18',
      department: '全科',
      hospital: '福鑫互联网医院',
      diagnosis: '维生素D缺乏',
      doctor: '孙晓红',
      summary: '维生素D 18.5 ng/mL，低于正常范围(30-100)。无骨质疏松症状，骨密度检查正常。建议每日补充维生素D3 2000IU，增加户外活动时间，3个月后复查。',
    },
  ],
  examRecords: [
    {
      id: 'exam-w001',
      date: '2025-10-08',
      institution: '福鑫互联网医院',
      type: '企业年度体检',
      abnormalCount: 3,
      indicators: [
        { name: '血压', value: '118/76', status: 'normal', label: '正常' },
        { name: '空腹血糖', value: '5.2', status: 'normal', label: '正常' },
        { name: '总胆固醇', value: '5.0', status: 'normal', label: '正常' },
        { name: '甘油三酯', value: '1.2', status: 'normal', label: '正常' },
        { name: '幽门螺杆菌(C14)', value: '阳性', status: 'high', label: '阳性' },
        { name: '颈椎X线', value: '曲度变直', status: 'high', label: '异常' },
        { name: '维生素D', value: '18.5', status: 'low', label: '偏低' },
        { name: 'BMI', value: '21.3', status: 'normal', label: '正常' },
        { name: '肝功能(ALT)', value: '18', status: 'normal', label: '正常' },
        { name: '肾功能(肌酐)', value: '58', status: 'normal', label: '正常' },
        { name: '血常规', value: '正常', status: 'normal', label: '正常' },
        { name: '尿常规', value: '正常', status: 'normal', label: '正常' },
        { name: '甲状腺功能', value: '正常', status: 'normal', label: '正常' },
      ],
      summary: '本次体检共3项异常：幽门螺杆菌C14呼气试验阳性，建议消化内科就诊行根除治疗；颈椎X线示曲度变直，考虑与长期伏案工作相关；维生素D偏低，建议补充。其余指标正常。',
    },
    {
      id: 'exam-w002',
      date: '2024-09-20',
      institution: '福鑫互联网医院',
      type: '企业年度体检',
      abnormalCount: 1,
      indicators: [
        { name: '血压', value: '115/72', status: 'normal', label: '正常' },
        { name: '空腹血糖', value: '5.0', status: 'normal', label: '正常' },
        { name: '总胆固醇', value: '4.8', status: 'normal', label: '正常' },
        { name: '幽门螺杆菌(C14)', value: '阴性', status: 'normal', label: '阴性' },
        { name: '颈椎X线', value: '曲度变直', status: 'high', label: '异常' },
        { name: 'BMI', value: '21.0', status: 'normal', label: '正常' },
        { name: '肝功能(ALT)', value: '16', status: 'normal', label: '正常' },
        { name: '血常规', value: '正常', status: 'normal', label: '正常' },
      ],
      summary: '本次体检共1项异常：颈椎X线示生理曲度变直，建议注意工作姿势。其余指标均正常。整体健康状况良好。',
    },
  ],
  risks: [
    {
      id: 'risk-w001',
      name: '消化系统风险',
      level: 'medium',
      description: '幽门螺杆菌检测阳性，胃镜提示浅表性胃炎。幽门螺杆菌感染可增加胃溃疡、胃癌风险。',
      relatedVisits: ['visit-w001'],
      suggestion: '严格遵医嘱完成四联疗法根除治疗(14天)，治疗期间避免辛辣刺激食物和饮酒。停药1个月后复查C14呼气试验确认根除效果。',
    },
    {
      id: 'risk-w002',
      name: '颈椎退行性变',
      level: 'low',
      description: '颈椎生理曲度变直，C4-C5椎间隙稍窄，属于颈椎早期退行性改变。与长期伏案工作姿势相关。',
      relatedVisits: ['visit-w002'],
      suggestion: '调整工作姿势，显示器上缘与视线平齐。每工作1小时活动颈部5分钟，坚持颈椎康复操锻炼。避免长时间低头使用手机。',
    },
    {
      id: 'risk-w003',
      name: '骨骼健康风险',
      level: 'low',
      description: '维生素D水平18.5 ng/mL，低于正常参考范围(30-100 ng/mL)。维生素D缺乏可影响钙吸收，增加骨质疏松风险。',
      relatedVisits: ['visit-w003'],
      suggestion: '每日补充维生素D3 2000IU，增加户外活动时间(建议每日30分钟日光照射)。3个月后复查维生素D水平。',
    },
  ],
};

/** 无数据 */
const noHealthData: HealthData = {
  score: { score: 0, maxScore: 100, status: 'normal' },
  indicators: [],
  lastCheckDate: '',
  hasData: false,
};

/** 根据当前登录用户返回对应的健康数据 */
function getHealthByUser(): HealthData {
  const user = getUser<{ id: string }>();
  if (!user) return chenYuxuanHealth; // 默认

  switch (user.id) {
    case MOCK_USER_IDS.WITH_DATA:
      return chenYuxuanHealth;
    case MOCK_USER_IDS.NO_DATA:
      return noHealthData;
    case MOCK_USER_IDS.GROUP:
      return wangSiqiHealth;
    default:
      return chenYuxuanHealth;
  }
}

/** 根据当前登录用户返回对应的健康档案 */
function getProfileByUser(): HealthProfile | null {
  const user = getUser<{ id: string }>();
  if (!user) return chenYuxuanProfile;

  switch (user.id) {
    case MOCK_USER_IDS.WITH_DATA:
      return chenYuxuanProfile;
    case MOCK_USER_IDS.NO_DATA:
      return null;
    case MOCK_USER_IDS.GROUP:
      return wangSiqiProfile;
    default:
      return chenYuxuanProfile;
  }
}

export function setupHealthMock() {
  registerMock('/health/data', () => getHealthByUser());
  registerMock('/health/report/report-001', () => chenYuxuanReport);
  registerMock('/health/profile', () => getProfileByUser());
}
