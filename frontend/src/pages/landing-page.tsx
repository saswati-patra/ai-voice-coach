import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogIn,
  Mic,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Volume2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { VoiceCoachWorkspace } from "@/hooks/use-voice-coach-workspace";
import { landingPrimaryCta } from "@/lib/auth-flow";
import { cn } from "@/lib/utils";

type LandingPageProps = {
  workspace: VoiceCoachWorkspace;
};

const workflowSteps = [
  {
    icon: UploadCloud,
    title: "Upload a source",
    description: "Add a PDF or text study document from the material you already have.",
  },
  {
    icon: Brain,
    title: "Generate concepts",
    description: "Use Gemini document understanding to summarize and extract review points.",
  },
  {
    icon: BookOpenCheck,
    title: "Build review lanes",
    description: "Turn key concepts into active recall items grouped by learning status.",
  },
  {
    icon: Mic,
    title: "Practice by voice",
    description: "Talk through the material with a live coach and session event stream.",
  },
];

const cloudProof = [
  { label: "AI", value: "Vertex Gemini Live + document ingestion" },
  { label: "Runtime", value: "FastAPI on Cloud Run with Docker" },
  { label: "Memory", value: "Firestore metadata and Cloud Storage uploads" },
  { label: "Delivery", value: "OpenTofu foundation and manual GitHub Actions deploys" },
];

export function LandingPage({ workspace }: LandingPageProps) {
  const workspaceAvailable = !workspace.auth.requiresFirebaseAuth || Boolean(workspace.auth.authUser);
  const primaryCta = landingPrimaryCta({ signedIn: workspaceAvailable });

  return (
    <div className="min-h-screen bg-[#f7faf9] text-slate-950">
      <HeroSection primaryCta={primaryCta} />
      <WorkflowSection />
      <ProductPreviewSection />
      <CloudProofSection />
      <FinalCtaSection primaryCta={primaryCta} />
      <LandingFooter />
    </div>
  );
}

type CtaProps = {
  primaryCta: ReturnType<typeof landingPrimaryCta>;
};

function HeroSection({ primaryCta }: CtaProps) {
  const PrimaryIcon = primaryCta.label === "Open workspace" ? LayoutDashboard : LogIn;
  const headerLabel = primaryCta.label === "Open workspace" ? "Open app" : "Sign in";

  return (
    <section className="relative isolate overflow-hidden bg-[#08111f] text-white">
      <div className="pointer-events-none absolute inset-0 landing-hero-gradient" aria-hidden="true" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pb-4 pt-5 sm:px-6 lg:min-h-[88svh] lg:px-8 lg:pb-8">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-400 text-slate-950 shadow-lg shadow-teal-950/30">
              <Sparkles className="size-5" />
            </span>
            <span className="truncate text-sm font-semibold tracking-normal sm:text-base">
              AI Voice Coach
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#workflow" className="transition-colors hover:text-white">
              Workflow
            </a>
            <a href="#product" className="transition-colors hover:text-white">
              Product
            </a>
            <a href="#cloud-proof" className="transition-colors hover:text-white">
              Cloud
            </a>
          </nav>
          <Link
            to={primaryCta.href}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "landing-button-hero-muted"
            )}
          >
            <PrimaryIcon className="size-4" />
            {headerLabel}
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)] lg:gap-12 lg:py-12">
          <div className="max-w-3xl">
            <Badge className="border-teal-300/30 bg-teal-300/10 text-teal-100" variant="outline">
              Premium AI study studio
            </Badge>
            <h1
              className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-white sm:mt-5 sm:text-5xl sm:leading-[1.04] lg:text-6xl"
              data-testid="landing-hero-title"
            >
              Practice out loud with a coach built from your notes.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-5 sm:text-lg sm:leading-7">
              Upload a study document, generate active recall prompts, and run a live voice
              session that helps you explain the material before the exam does.
            </p>
            <div className="mt-5 grid gap-3 sm:mt-7 sm:flex sm:flex-wrap">
              <Link
                to={primaryCta.href}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "landing-button-primary"
                )}
              >
                <PrimaryIcon className="size-4" />
                {primaryCta.label}
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#workflow"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "landing-button-hero-outline"
                )}
              >
                <ListChecks className="size-4" />
                See how it works
              </a>
            </div>
            <div className="mt-8 hidden flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400 sm:flex">
              <span>PDF + text ingestion</span>
              <span>Review queue</span>
              <span>Live voice practice</span>
              <span>Google Cloud build</span>
            </div>
          </div>

          <HeroPracticePanel />
        </div>
      </div>
    </section>
  );
}

function HeroPracticePanel() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:translate-y-6" data-testid="landing-hero-panel">
      <div className="rounded-lg border border-white/15 bg-[#111827]/95 p-3 shadow-2xl shadow-black/35 sm:p-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="size-4 text-teal-300" />
            <span className="text-sm font-semibold">Voice practice</span>
          </div>
          <span className="rounded-md bg-teal-300/10 px-2 py-1 text-xs font-medium text-teal-100">
            recording
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          <div className="rounded-lg bg-teal-700 p-4">
            <p className="text-sm font-semibold">Coach prompt</p>
            <p className="mt-2 text-sm leading-6 text-teal-50">
              Explain retrieval practice in 30 seconds.
            </p>
          </div>
          <div className="hidden rounded-lg bg-slate-800 p-4 sm:block">
            <p className="text-sm font-semibold">Concept queue</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Memory consolidation / spaced review
            </p>
          </div>
          <div className="grid h-12 grid-cols-12 items-end gap-1 rounded-lg bg-[#0b1220] p-3 sm:h-14" aria-hidden="true">
            {[42, 68, 36, 78, 48, 88, 56, 72, 34, 64, 46, 82].map((height, index) => (
              <span
                key={`${height}-${index}`}
                className="rounded-sm bg-teal-300"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="bg-[#f7faf9] px-4 py-16 sm:px-6 lg:px-8" data-testid="landing-workflow">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Workflow"
          title="From source file to spoken recall in four steps."
          description="A compact learning loop that feels like SaaS, while proving the end-to-end cloud architecture behind it."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <article key={step.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-[#e5f7f3] text-teal-800">
                  <step.icon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-slate-400">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-normal text-slate-950">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductPreviewSection() {
  return (
    <section id="product" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Product"
            title="A working study workspace, not a static demo."
            description="The landing page leads into the same authenticated app: upload materials, inspect review lanes, and connect the browser microphone harness."
          />
          <div className="mt-8 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <ProofPill icon={FileText} label="Study docs" />
            <ProofPill icon={BookOpenCheck} label="Review items" />
            <ProofPill icon={Mic} label="Voice session" />
            <ProofPill icon={ShieldCheck} label="Google sign-in" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-[#f4f8fb] p-3 shadow-xl shadow-slate-200/70">
          <div className="rounded-md bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Learning dashboard</p>
                <p className="text-xs text-slate-500">Study loop overview</p>
              </div>
              <Badge variant="secondary">ready</Badge>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <PreviewMetric icon={FileText} label="Materials" value="4" />
              <PreviewMetric icon={BookOpenCheck} label="Review items" value="18" />
              <div className="rounded-lg border border-slate-200 bg-[#fcf7ed] p-4 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-950">Concept radar</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["retrieval practice", "memory consolidation", "spaced review"].map((concept) => (
                    <span key={concept} className="rounded-md bg-white px-2.5 py-1 text-xs text-slate-700">
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-[#08111f] p-4 text-white sm:col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Live coach</p>
                  <span className="text-xs text-teal-200">connected</span>
                </div>
                <div className="mt-4 grid h-12 grid-cols-[repeat(16,minmax(0,1fr))] items-end gap-1" aria-hidden="true">
                  {[36, 58, 44, 72, 38, 82, 52, 70, 34, 62, 46, 78, 40, 66, 50, 74].map((height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className="rounded-sm bg-teal-300"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CloudProofSection() {
  return (
    <section id="cloud-proof" className="bg-[#edf4f7] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="Cloud proof"
            title="Designed as a SaaS product and an engineering portfolio."
            description="The page can sell the learner experience first, then reveal the cloud-native pieces that make the project credible."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {cloudProof.map((item) => (
              <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-normal text-teal-700">{item.label}</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.value}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection({ primaryCta }: CtaProps) {
  const PrimaryIcon = primaryCta.label === "Open workspace" ? LayoutDashboard : LogIn;

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800">
          Ready for a study session
        </Badge>
        <h2 className="mt-5 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
          Turn the next document into a conversation.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Start with the product flow, then keep iterating toward a deployable AI learning SaaS.
        </p>
        <div className="mt-7 flex justify-center">
          <Link to={primaryCta.href} className={cn(buttonVariants({ size: "lg" }), "landing-button-final")}>
            <PrimaryIcon className="size-4" />
            {primaryCta.label}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-[#f7faf9] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>AI Voice Coach</p>
        <p>Portfolio SaaS built with React, FastAPI, and Google Cloud.</p>
      </div>
    </footer>
  );
}

type SectionHeadingProps = {
  description: string;
  eyebrow: string;
  title: string;
};

function SectionHeading({ description, eyebrow, title }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-normal text-teal-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

type IconType = typeof FileText;

function ProofPill({ icon: Icon, label }: { icon: IconType; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-[#f7faf9] p-3">
      <span className="flex size-9 items-center justify-center rounded-md bg-white text-teal-700 shadow-sm">
        <Icon className="size-4" />
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function PreviewMetric({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-teal-700" />
        <span className="text-xl font-semibold text-slate-950">{value}</span>
      </div>
      <p className="mt-3 text-sm text-slate-600">{label}</p>
    </div>
  );
}
