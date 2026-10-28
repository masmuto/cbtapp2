// Tipe-tipe bersama untuk client & server

export type Role = "superadmin" | "school_admin" | "teacher" | "proctor" | "student";

export type ExamStatus = "draft" | "published" | "archived";
export type AttemptStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "graded"
  | "reviewed"
  | "published";

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_RESPONSE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "ESSAY";

export interface SafeQuestionOption {
  id: string;
  code: string;
  text: string;
  // isCorrect TIDAK pernah diekspos ke siswa
}

export interface SafeQuestion {
  id: string;
  type: QuestionType;
  stem: string;
  imageUrl?: string | null;
  explanation?: string | null; // hanya dikirim setelah submit
  difficulty: string;
  points: number;
  options: SafeQuestionOption[];
}

export interface SafeExamQuestion extends SafeQuestion {
  examQuestionId: string;
  orderIndex: number;
  shuffledOrder?: string[]; // kode opsi urut acak per sesi
}

export interface SafeAttempt {
  id: string;
  status: AttemptStatus;
  attemptNo: number;
  startedAt: string | null;
  serverEndsAt: string | null;
  submittedAt: string | null;
  durationMinutes: number;
  exam: {
    id: string;
    title: string;
    allowBackNav: boolean;
    allowAnswerChange: boolean;
    shuffleQuestions: boolean;
  };
}

export interface StudentListRow {
  id: string;
  fullName: string;
  email: string;
  username: string;
  nis?: string | null;
  className?: string | null;
  status: string;
}

export interface TeacherListRow {
  id: string;
  fullName: string;
  email: string;
  username: string;
  subjectCount: number;
  classCount: number;
  status: string;
}

export interface StatsCard {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
}

export interface ToastMsg {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}
