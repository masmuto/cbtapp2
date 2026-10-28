"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, CheckCircle2, Clock } from "lucide-react";
import { formatDateID } from "@/lib/helpers";

export function StudentResults() {
  const [results, setResults] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/exams"),
    ]).then(async ([e]) => {
      if (e.ok) {
        const allExams = e.data?.exams || [];
        setExams(allExams);
        // Fetch results for each exam
        const published = [];
        for (const ex of allExams) {
          const r = await apiFetch(`/api/exams/${ex.id}/results`);
          if (r.ok && r.data?.results) {
            published.push(...r.data.results.map((res: any) => ({ ...res, examTitle: ex.title, subjectName: ex.subject?.name })));
          }
        }
        setResults(published);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Nilai Saya" description="Hasil ujian yang sudah dipublikasikan" />

      {results.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Belum ada nilai yang dipublikasikan"
          description="Nilai Anda akan muncul di sini setelah guru menerbitkan hasil ujian."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{r.examTitle}</p>
                    <p className="text-xs text-muted-foreground">{r.subjectName}</p>
                  </div>
                  {r.isPassed ? (
                    <Badge className="bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Lulus</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">Belum Lulus</Badge>
                  )}
                </div>
                <div className="bg-primary/5 rounded-lg p-4 text-center mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Nilai Akhir</p>
                  <p className={`text-4xl font-bold ${r.isPassed ? "text-emerald-600" : "text-amber-600"}`}>{r.finalScore}</p>
                  <p className="text-xs text-muted-foreground">KKM: {r.passingScore}</p>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> Submit: {formatDateID(r.submittedAt)}</p>
                  <p>Dipublikasi: {formatDateID(r.publishedAt)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
