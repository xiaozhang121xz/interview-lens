// 课程系统类型定义
export interface Course {
  id: string;
  name: string;
  code: string;
  teacher?: string;
  credits: number;
  grade?: string;
  major?: string;
  majorId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CourseSearchParams {
  grade?: string;
  gradeId?: string;
  major?: string;
  majorId?: string;
  teacherId?: string;
  type?: string;
  status?: 'active' | 'inactive';
  search?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCourseDTO {
  name: string;
  code: string;
  teacher?: string;
  credits: number;
  grade?: string;
  major?: string;
}

export interface UpdateCourseDTO {
  name?: string;
  code?: string;
  teacher?: string;
  credits?: number;
  grade?: string;
  major?: string;
  status?: 'active' | 'inactive';
}

export interface SearchResult<T> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: T[];
  data?: T[]; // 标准字段
}
