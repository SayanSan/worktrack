"use client";

import { useEffect, useState, useTransition, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Waypoints,
  LayoutGrid,
  FolderKanban,
  ListChecks,
  Users2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  type LucideProps,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/lib/actions/onboarding";

interface Step {
  icon: ComponentType<LucideProps>;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: Waypoints,
    title: "Welcome to WorkTrack",
    body: "A quick tour of everything you can do here. It only takes a few taps — let's go.",
  },
  {
    icon: LayoutGrid,
    title: "Dashboard",
    body: "Your home base: a card for every teammate you can see, showing what each of them is actively working on right now.",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    body: "Open any project to see its tasks grouped by status. Change a task's status inline, and — if you own the project — add members and create new tasks.",
  },
  {
    icon: ListChecks,
    title: "My Tasks",
    body: "Everything assigned to you in one list, sorted by due date. Update status or edit a task without leaving the page.",
  },
  {
    icon: Users2,
    title: "Team",
    body: "See who reports to whom as an org tree. Managers and above can add new hires here — they're pre-authorized by email and just sign in with Google.",
  },
  {
    icon: ShieldCheck,
    title: "Who sees what",
    body: "Visibility follows the reporting line: you see yourself and everyone below you. Malik and Boss see the whole org. It's enforced in the database, not just the UI.",
  },
];

export function OnboardingTour() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinishing] = useTransition();

  // Lock background scroll while the mandatory tour is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  function next() {
    setError(null);
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    startFinishing(async () => {
      try {
        await completeOnboarding();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not finish. Please try again.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Icon className="h-6 w-6" strokeWidth={2} />
          </span>
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold text-slate-900">{current.title}</h2>
        <p className="mx-auto mb-6 max-w-sm text-center text-sm leading-relaxed text-slate-500">
          {current.body}
        </p>

        {/* Progress dots */}
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === step ? "w-5 bg-slate-900" : "w-1.5 bg-slate-200")
              }
            />
          ))}
        </div>

        {error && <p className="mb-3 text-center text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || finishing}
            className={step === 0 ? "invisible" : ""}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Back
          </Button>

          <span className="text-xs text-slate-400">
            {step + 1} of {STEPS.length}
          </span>

          <Button onClick={next} disabled={finishing}>
            {isLast ? (finishing ? "Finishing…" : "Get started") : "Next"}
            {!isLast && <ArrowRight className="h-4 w-4" strokeWidth={2} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
