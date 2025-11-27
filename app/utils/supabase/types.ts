export type UUID = string;

export type Schedule = {
  id: UUID;
  class_id?: UUID;
  subject_id?: UUID;
  faculty_id?: UUID;
  room_id?: UUID;
  department_id?: UUID;
  day?: string;
  start_time?: string;
  end_time?: string;
  semester?: string;
  mode?: string;
  academic_year?: string;
};

export type SchedulePeriod = {
  id: UUID;
  schedule_id: UUID;
  period_id: UUID;
};

export type Faculty = {
  id: UUID;
  auth_user_id?: UUID;
  department_id?: UUID;
};
