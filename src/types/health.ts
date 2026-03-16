export interface HealthScore {
  score: number;
  maxScore: number;
  status: 'normal' | 'attention' | 'warning';
}

export interface HealthIndicator {
  name: string;
  value: string;
  status: 'normal' | 'high' | 'low';
  label: string;
  reference?: string;    // 参考值，如 "0-40 U/L"、"<5.2 mmol/L"
  suggestion?: string;   // AI 建议（异常项），如 "转氨酶轻度升高，建议减少油腻饮食，1个月后复查"
  category?: string;     // 检查大类，如 "实验室检查"、"影像检查"、"体格检查"
}

export interface HealthData {
  score: HealthScore;
  indicators: HealthIndicator[];
  lastCheckDate: string;
  hasData: boolean;
}

export interface HealthRisk {
  name: string;
  level: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
}

export interface HealthReport {
  id: string;
  date: string;
  summary: string;
  score: HealthScore;
  indicators: HealthIndicator[];
  risks: HealthRisk[];
}

// ---- 健康档案新增类型 ----

/** 就医记录 */
export interface MedicalVisit {
  id: string;
  date: string;           // 就诊日期 2025-08-15
  department: string;     // 科室：心内科、内分泌科等
  hospital: string;       // 医院名称
  diagnosis: string;      // 诊断：高脂血症、亚临床甲减等
  doctor?: string;        // 医生姓名
  summary?: string;       // 就诊摘要
}

/** 体检记录 */
export interface ExamRecord {
  id: string;
  date: string;           // 体检日期
  institution: string;    // 体检机构
  type: string;           // 体检类型：年度体检、入职体检、专项体检
  abnormalCount: number;  // 异常项数
  indicators: HealthIndicator[];  // 该次体检的指标
  summary?: string;       // 体检小结
}

/** 健康风险项（扩展版） */
export interface HealthRiskDetail {
  id: string;
  name: string;           // 风险名称：心血管风险、甲状腺功能异常等
  level: 'low' | 'medium' | 'high';  // 风险等级
  description: string;    // 风险描述
  relatedVisits?: string[];  // 关联的就医记录ID
  suggestion: string;     // 建议
}

/** 健康档案（完整版） */
export interface HealthProfile {
  id: string;
  patientName: string;
  score: HealthScore;
  medicalVisits: MedicalVisit[];
  examRecords: ExamRecord[];
  risks: HealthRiskDetail[];
}
