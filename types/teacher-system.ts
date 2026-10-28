// 教师系统类型定义
export interface Teacher {
  id: string;
  name: string;
  teacherId: string;
  teacherNo: string;
  gender?: string;
  department?: string;
  title?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface TeacherSearchParams {
  department?: string;
  departmentId?: string;
  title?: string;
  subject?: string;
  status?: 'active' | 'inactive' | 'suspended';
  search?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateTeacherDTO {
  name: string;
  teacherId: string;
  gender?: string;
  department?: string;
  title?: string;
  email?: string;
  phone?: string;
}

export interface UpdateTeacherDTO {
  name?: string;
  teacherId?: string;
  gender?: string;
  department?: string;
  title?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface SearchResult<T> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: T[];
  data?: T[];
}
