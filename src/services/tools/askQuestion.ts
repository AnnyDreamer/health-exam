import type { ChatOption } from '@/types/chat';
import type { ToolImpl, ToolContext, ToolResult } from './types';

const GUIDED_TOTAL_STEPS = 10;

/** 引导式问卷的题目定义（代码控制，不依赖 AI） */
interface QuestionDef {
  label: string;
  profileKey: string;
  options: ChatOption[];
  valueMap: Record<string, string>;
}

const QUESTIONS: Record<number, QuestionDef> = {
  1: {
    label: '性别',
    profileKey: 'gender',
    options: [
      { label: '男性', value: 'guided_gender_male' },
      { label: '女性', value: 'guided_gender_female' },
    ],
    valueMap: { guided_gender_male: '男', guided_gender_female: '女' },
  },
  2: {
    label: '年龄段',
    profileKey: 'ageRange',
    options: [
      { label: '30岁以下', value: 'guided_age_under30' },
      { label: '30-45岁', value: 'guided_age_30to45', primary: true },
      { label: '45-60岁', value: 'guided_age_45to60' },
      { label: '60岁以上', value: 'guided_age_over60' },
    ],
    valueMap: {
      guided_age_under30: '30岁以下',
      guided_age_30to45: '30-45岁',
      guided_age_45to60: '45-60岁',
      guided_age_over60: '60岁以上',
    },
  },
  3: {
    label: '健康状况',
    profileKey: 'concerns',
    options: [
      { label: '没有特殊情况', value: 'guided_concern_none' },
      { label: '三高相关', value: 'guided_concern_metabolic' },
      { label: '消化系统', value: 'guided_concern_digest' },
      { label: '颈椎/腰椎', value: 'guided_concern_spine' },
    ],
    valueMap: {
      guided_concern_none: '没有特殊情况',
      guided_concern_metabolic: '三高相关（高血压/高血糖/高血脂）',
      guided_concern_digest: '消化系统问题',
      guided_concern_spine: '颈椎/腰椎问题',
    },
  },
  4: {
    label: '家族病史',
    profileKey: 'familyHistory',
    options: [
      { label: '没有', value: 'guided_family_none' },
      { label: '高血压', value: 'guided_family_hypertension' },
      { label: '糖尿病', value: 'guided_family_diabetes' },
      { label: '癌症家族史', value: 'guided_family_cancer' },
    ],
    valueMap: {
      guided_family_none: '没有',
      guided_family_hypertension: '高血压家族史',
      guided_family_diabetes: '糖尿病家族史',
      guided_family_cancer: '癌症家族史',
    },
  },
  5: {
    label: '职业类型',
    profileKey: 'jobType',
    options: [
      { label: '办公室久坐', value: 'guided_job_office' },
      { label: '体力劳动', value: 'guided_job_labor' },
      { label: '经常出差', value: 'guided_job_travel' },
      { label: '户外作业', value: 'guided_job_outdoor' },
    ],
    valueMap: {
      guided_job_office: '办公室久坐',
      guided_job_labor: '体力劳动',
      guided_job_travel: '经常出差',
      guided_job_outdoor: '户外作业',
    },
  },
  6: {
    label: '运动习惯',
    profileKey: 'exercise',
    options: [
      { label: '很少运动', value: 'guided_exercise_rarely' },
      { label: '每周1-2次', value: 'guided_exercise_1to2' },
      { label: '每周3次以上', value: 'guided_exercise_3plus' },
      { label: '每天运动', value: 'guided_exercise_daily' },
    ],
    valueMap: {
      guided_exercise_rarely: '很少运动',
      guided_exercise_1to2: '每周1-2次',
      guided_exercise_3plus: '每周3次以上',
      guided_exercise_daily: '每天运动',
    },
  },
  7: {
    label: '睡眠质量',
    profileKey: 'sleepQuality',
    options: [
      { label: '良好', value: 'guided_sleep_good' },
      { label: '一般偶尔失眠', value: 'guided_sleep_fair' },
      { label: '经常失眠', value: 'guided_sleep_poor' },
      { label: '长期用药助眠', value: 'guided_sleep_medicated' },
    ],
    valueMap: {
      guided_sleep_good: '良好',
      guided_sleep_fair: '一般偶尔失眠',
      guided_sleep_poor: '经常失眠',
      guided_sleep_medicated: '长期用药助眠',
    },
  },
  8: {
    label: '烟酒习惯',
    profileKey: 'habits',
    options: [
      { label: '不吸烟不喝酒', value: 'guided_habit_none' },
      { label: '吸烟', value: 'guided_habit_smoke' },
      { label: '饮酒', value: 'guided_habit_drink' },
      { label: '烟酒都有', value: 'guided_habit_both' },
    ],
    valueMap: {
      guided_habit_none: '不吸烟不喝酒',
      guided_habit_smoke: '吸烟',
      guided_habit_drink: '饮酒',
      guided_habit_both: '烟酒都有',
    },
  },
  9: {
    label: '关注方向',
    profileKey: 'focus',
    options: [
      { label: '全面筛查', value: 'guided_focus_comprehensive', primary: true },
      { label: '心脑血管', value: 'guided_focus_cardio' },
      { label: '肿瘤早筛', value: 'guided_focus_tumor' },
      { label: '职场亚健康', value: 'guided_focus_office' },
    ],
    valueMap: {
      guided_focus_comprehensive: '全面筛查',
      guided_focus_cardio: '心脑血管风险',
      guided_focus_tumor: '肿瘤早筛',
      guided_focus_office: '职场亚健康',
    },
  },
  10: {
    label: '预算',
    profileKey: 'budget',
    options: [
      { label: '1000以下 · 基础筛查', value: 'guided_budget_low' },
      { label: '1000-2000 · 重点专项', value: 'guided_budget_mid', primary: true },
      { label: '2000以上 · 深度全面', value: 'guided_budget_high' },
    ],
    valueMap: {
      guided_budget_low: 'low',
      guided_budget_mid: 'mid',
      guided_budget_high: 'high',
    },
  },
};

export const askQuestionTool: ToolImpl = {
  definition: {
    type: 'function',
    function: {
      name: 'ask_guided_question',
      description: '向用户提出健康问卷的下一个问题，收集信息用于定制体检方案',
      parameters: {
        type: 'object',
        properties: {
          question_text: {
            type: 'string',
            description: '自然语言问题文本，简短友好，50字以内',
          },
        },
        required: ['question_text'],
      },
    },
  },

  async execute(args, context): Promise<ToolResult> {
    const step = context.guidedStep;
    const questionDef = QUESTIONS[step];

    if (!questionDef) {
      return {
        display: 'none',
        aiResponse: '引导流程已完成',
        stateUpdate: { currentFlow: 'package', guidedStep: 0 },
      };
    }

    // 构建选项列表（3题后追加"跳过"）
    const options = [...questionDef.options];
    if (step >= 4 && step <= GUIDED_TOTAL_STEPS) {
      options.push({ label: '跳过，直接生成方案', value: 'guided_early_finish' });
    }

    const isBudget = step === 10;

    return {
      display: 'options',
      data: {
        options,
        progress: { current: step, total: GUIDED_TOTAL_STEPS },
        label: isBudget ? '请选择您的体检预算：' : undefined,
      },
      stateUpdate: { guidedStep: step },
      aiResponse: `已展示第${step}/${GUIDED_TOTAL_STEPS}题: ${questionDef.label}`,
    };
  },
};

/** 解析用户选择，更新 profile，返回是否结束 */
export function processGuidedSelection(
  value: string,
  step: number,
  profile: Record<string, string>,
): { finished: boolean; earlyFinish: boolean } {
  if (value === 'guided_early_finish') {
    return { finished: true, earlyFinish: true };
  }

  const questionDef = QUESTIONS[step];
  if (questionDef) {
    const mapped = questionDef.valueMap[value];
    if (mapped) {
      profile[questionDef.profileKey] = mapped;
    }
  }

  const nextStep = step + 1;
  const finished = nextStep > GUIDED_TOTAL_STEPS;
  return { finished, earlyFinish: false };
}

/** 构建引导式画像汇总文本 */
export function buildGuidedProfileSummary(profile: Record<string, string>): string {
  const parts: string[] = [];
  if (profile.gender) parts.push(`性别${profile.gender}`);
  if (profile.ageRange) parts.push(`年龄段${profile.ageRange}`);
  if (profile.concerns) parts.push(`健康状况：${profile.concerns}`);
  if (profile.familyHistory) parts.push(`家族病史：${profile.familyHistory}`);
  if (profile.jobType) parts.push(`职业类型：${profile.jobType}`);
  if (profile.exercise) parts.push(`运动习惯：${profile.exercise}`);
  if (profile.sleepQuality) parts.push(`睡眠质量：${profile.sleepQuality}`);
  if (profile.habits) parts.push(`烟酒习惯：${profile.habits}`);
  if (profile.focus) parts.push(`关注方向：${profile.focus}`);
  return parts.join('，');
}

export { GUIDED_TOTAL_STEPS, QUESTIONS };
