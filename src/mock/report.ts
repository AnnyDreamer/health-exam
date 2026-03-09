import { registerMock } from '@/api/request';
import type { ReportRecord } from '@/types/report';

const mockReports: ReportRecord[] = [
  {
    id: 'rpt-001',
    title: '2025年度体检报告解读',
    summary: '整体健康状况良好，血脂偏高需关注，建议调整饮食结构，增加有氧运动。',
    fullContent: `**整体评估**\n您的本次体检整体健康状况良好，大部分指标处于正常范围内。\n\n**异常指标分析**\n- **总胆固醇 5.8 mmol/L**（偏高）：正常参考值 < 5.2 mmol/L，建议减少高脂肪食物摄入\n- **低密度脂蛋白 3.9 mmol/L**（偏高）：正常参考值 < 3.4 mmol/L，需配合运动控制\n- **甘油三酯 2.1 mmol/L**（偏高）：正常参考值 < 1.7 mmol/L\n\n**正常指标**\n- 血常规各项指标正常\n- 肝功能正常\n- 肾功能正常\n- 空腹血糖 5.1 mmol/L（正常）\n- 心电图未见明显异常\n\n**健康建议**\n- 每周进行 3-5 次有氧运动，每次 30 分钟以上\n- 减少饱和脂肪酸摄入，多食用鱼类、坚果\n- 增加膳食纤维摄入，每日蔬果不少于 500g\n- 建议 3 个月后复查血脂`,
    createdAt: 1741420800000,
  },
  {
    id: 'rpt-002',
    title: '甲状腺功能检查解读',
    summary: 'TSH 略高于正常范围，提示亚临床甲减可能，建议内分泌科进一步评估。',
    fullContent: `**检查项目**\n甲状腺功能五项\n\n**结果分析**\n- **TSH 5.8 mIU/L**（偏高）：正常参考值 0.27-4.2 mIU/L\n- **FT3 4.2 pmol/L**（正常）：正常参考值 3.1-6.8 pmol/L\n- **FT4 14.5 pmol/L**（正常）：正常参考值 12.0-22.0 pmol/L\n- **TPOAb 阴性**\n- **TgAb 阴性**\n\n**临床意义**\nTSH 轻度升高而 FT3、FT4 正常，提示**亚临床甲状腺功能减退**可能。抗体阴性排除自身免疫性甲状腺炎。\n\n**建议**\n- 建议至内分泌科门诊进一步评估\n- 注意观察是否有乏力、怕冷、体重增加等症状\n- 4-6 周后复查甲状腺功能\n- 适量补充碘元素`,
    createdAt: 1740816000000,
  },
  {
    id: 'rpt-003',
    title: '肝功能检查解读',
    summary: '肝功能各项指标均在正常范围内，肝脏功能良好，继续保持健康生活方式。',
    fullContent: `**检查项目**\n肝功能全套\n\n**结果分析**\n- **ALT 25 U/L**（正常）：正常参考值 9-50 U/L\n- **AST 22 U/L**（正常）：正常参考值 15-40 U/L\n- **总胆红素 12.3 μmol/L**（正常）：正常参考值 3.4-20.5 μmol/L\n- **直接胆红素 3.1 μmol/L**（正常）：正常参考值 0-6.8 μmol/L\n- **白蛋白 45.2 g/L**（正常）：正常参考值 40-55 g/L\n- **GGT 28 U/L**（正常）：正常参考值 10-60 U/L\n\n**综合评估**\n肝功能各项指标均在正常范围，提示肝脏合成、代谢及排泄功能良好。\n\n**建议**\n- 继续保持健康的饮食和作息习惯\n- 避免过量饮酒和长期服用肝毒性药物\n- 建议每年定期复查肝功能`,
    createdAt: 1739606400000,
  },
];

function findReport(id: string) {
  return mockReports.find((r) => r.id === id) || null;
}

export function setupReportMock() {
  registerMock('/report/list', () => mockReports);

  registerMock('/report/detail', (_data: any, url?: string) => {
    const id = url?.split('/').pop() || '';
    return findReport(id);
  });
}
