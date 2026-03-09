import { registerMock } from '@/api/request';
import type { Appointment } from '@/types/appointment';
import { usePackageStore } from '@/stores/package';

const mockAppointments: Appointment[] = [];

let appointmentId = 1;

// 套餐名和项目映射（用于创建预约时填充真实数据）
const packageInfoMap: Record<string, { name: string; items: string[]; price: number }> = {
  'pkg-ai-001': {
    name: '心脑血管专项套餐',
    items: ['一般检查', '生化全套', '心脏彩超', '颈动脉彩超', '甲状腺功能', '腹部B超', '心电图'],
    price: 780,
  },
  'pkg-001': {
    name: '基础体检套餐',
    items: ['一般检查', '血常规', '尿常规', '肝功能', '肾功能', '心电图'],
    price: 230,
  },
  'pkg-002': {
    name: '深度健康筛查套餐',
    items: ['一般检查', '血常规', '生化全套', '甲状腺功能', '肿瘤标志物', '腹部B超', '胸部CT', '心电图'],
    price: 990,
  },
  'pkg-group-001': {
    name: '企业团检套餐 A',
    items: ['一般检查', '血常规', '生化全套', '腹部B超', '心电图', '胸部CT'],
    price: 0,
  },
};

function findAppointment(id: string) {
  return mockAppointments.find((a) => a.id === id) || null;
}

export function setupAppointmentMock() {
  registerMock('/appointment/list', () => mockAppointments);

  // 动态 detail 路由：匹配所有 /appointment/detail/:id
  registerMock('/appointment/detail', (_data: any, url?: string) => {
    const id = url?.split('/').pop() || '';
    return findAppointment(id);
  });

  registerMock('/appointment/create', (data: any) => {
    // 优先从静态映射查找，找不到则从 package store 查找 AI 生成的套餐
    let pkgInfo = packageInfoMap[data.packageId];
    if (!pkgInfo) {
      try {
        const packageStore = usePackageStore();
        const customPkg = packageStore.getPackageById(data.packageId);
        if (customPkg) {
          pkgInfo = {
            name: customPkg.name,
            items: customPkg.items.map((item) => item.name),
            price: customPkg.totalPrice,
          };
        }
      } catch (_e) {
        // package store 可能未初始化，忽略错误
      }
    }
    if (!pkgInfo) {
      pkgInfo = {
        name: '体检套餐',
        items: ['一般检查'],
        price: 0,
      };
    }
    const newApt: Appointment = {
      id: `apt-new-${++appointmentId}`,
      packageId: data.packageId,
      packageName: pkgInfo.name,
      date: data.date,
      time: data.time,
      location: '健康体检中心 3楼 VIP区',
      status: 'pending',
      items: pkgInfo.items,
      totalPrice: pkgInfo.price,
      createdAt: new Date().toISOString().split('T')[0],
      notice: ['体检前一天请清淡饮食，晚上10点后禁食禁水', '体检当天空腹前往', '请携带身份证原件'],
    };
    mockAppointments.push(newApt);
    return newApt;
  });

  // 动态 cancel 路由
  registerMock('/appointment/cancel', (_data: any, url?: string) => {
    const id = url?.split('/').pop() || '';
    const apt = findAppointment(id);
    if (apt) apt.status = 'cancelled';
    return { success: true };
  });
}
