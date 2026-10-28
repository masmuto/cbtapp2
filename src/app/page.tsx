"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useApp } from "@/stores/app-store";
import { apiFetch } from "@/lib/client-api";
import { LoginForm } from "@/components/cbt/auth/login-form";
import { AppShell } from "@/components/cbt/layout/app-shell";
import { Loader2 } from "lucide-react";

// View components
import { AdminDashboard } from "@/components/cbt/admin/admin-dashboard";
import { TeacherDashboard } from "@/components/cbt/teacher/teacher-dashboard";
import { ProctorDashboard } from "@/components/cbt/proctor/proctor-dashboard";
import { StudentDashboard } from "@/components/cbt/student/student-dashboard";
import { SchoolsManager } from "@/components/cbt/admin/schools-manager";
import { AcademicYearsManager } from "@/components/cbt/admin/academic-years-manager";
import { ClassesManager } from "@/components/cbt/admin/classes-manager";
import { SubjectsManager } from "@/components/cbt/admin/subjects-manager";
import { TeachersManager } from "@/components/cbt/admin/teachers-manager";
import { StudentsManager } from "@/components/cbt/admin/students-manager";
import { ExamsManager } from "@/components/cbt/teacher/exams-manager";
import { QuestionBanksManager } from "@/components/cbt/teacher/question-banks-manager";
import { ExamBuilder } from "@/components/cbt/teacher/exam-builder";
import { ExamRunner } from "@/components/cbt/student/exam-runner";
import { GradingView } from "@/components/cbt/teacher/grading-view";
import { ResultsView } from "@/components/cbt/teacher/results-view";
import { TeacherMonitoring } from "@/components/cbt/teacher/teacher-monitoring";
import { StudentResults } from "@/components/cbt/student/student-results";
import { ProctorMonitoring } from "@/components/cbt/proctor/proctor-monitoring";
import { AuditLogViewer } from "@/components/cbt/admin/audit-log-viewer";
import { AdminMonitoring } from "@/components/cbt/admin/admin-monitoring";

export default function Home() {
  const { data: session, status } = useSession();
  const { user, setUser, view, viewParams } = useApp();
  const [loadingUser, setLoadingUser] = useState(true);

  // Fetch user data setelah login
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setUser(null);
      setLoadingUser(false);
      return;
    }
    // Fetch /api/me
    apiFetch("/api/me").then((res) => {
      if (res.ok && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
      setLoadingUser(false);
    });
  }, [status, setUser]);

  // Loading state awal
  if (status === "loading" || loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Memuat CBT Sekolah...</p>
        </div>
      </div>
    );
  }

  // Belum login → tampilkan login
  if (!session || !user) {
    return <LoginForm />;
  }

  // Render view sesuai view state
  const renderView = () => {
    // Exam runner (fullscreen) tidak pakai AppShell
    if (view === "student.exam-runner" || view === "exam-runner") {
      return <ExamRunner examId={viewParams?.examId} />;
    }

    // View lain pakai AppShell
    let content: React.ReactNode = null;
    if (view === "dashboard") {
      if (user.isSuperadmin || user.activeRole === "school_admin") content = <AdminDashboard />;
      else if (user.activeRole === "teacher") content = <TeacherDashboard />;
      else if (user.activeRole === "proctor") content = <ProctorDashboard />;
      else if (user.activeRole === "student") content = <StudentDashboard />;
    } else if (view === "schools") content = <SchoolsManager />;
    else if (view === "academic-years") content = <AcademicYearsManager />;
    else if (view === "classes") content = <ClassesManager />;
    else if (view === "subjects") content = <SubjectsManager />;
    else if (view === "teachers") content = <TeachersManager />;
    else if (view === "students") content = <StudentsManager />;
    else if (view === "exams") {
      if (user.activeRole === "student") content = <ExamsManager mode="student" />;
      else content = <ExamsManager mode="teacher" />;
    } else if (view === "exams.builder") content = <ExamBuilder examId={viewParams?.examId} />;
    else if (view === "question-banks") content = <QuestionBanksManager />;
    else if (view === "grading") content = <GradingView />;
    else if (view === "grading.detail") content = <GradingView attemptId={viewParams?.attemptId} />;
    else if (view === "results") {
      if (user.activeRole === "student") content = <StudentResults />;
      else content = <ResultsView />;
    } else if (view === "monitoring") {
      if (user.isSuperadmin || user.activeRole === "school_admin") content = <AdminMonitoring />;
      else if (user.activeRole === "teacher") content = <TeacherMonitoring />;
      else content = <ProctorMonitoring />;
    } else if (view === "audit") content = <AuditLogViewer />;
    else content = (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Halaman tidak ditemukan.</p>
      </div>
    );

    return <AppShell>{content}</AppShell>;
  };

  return renderView();
}
