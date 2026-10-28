// 学生系统类型定义
export interface Student {
  id: string;
  name: string;
  studentId: string;
  studentNo: string; // 别名，兼容旧代码
  gender?: string;
  grade: string;
  class: string;
  major?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface StudentSearchParams {
  grade?: string;
  gradeId?: string;
  class?: string;
  classId?: string;
  major?: string;
  majorId?: string;
  status?: 'active' | 'inactive' | 'suspended';
  search?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateStudentDTO {
  name: string;
  studentId: string;
  grade: string;
  class: string;
  major?: string;
  email?: string;
  phone?: string;
}

export interface UpdateStudentDTO {
  name?: string;
  studentId?: string;
  grade?: string;
  class?: string;
  major?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface StudentFilters {
  grade?: string;
  class?: string;
  major?: string;
  status?: 'active' | 'inactive' | 'suspended';
  search?: string;
}
