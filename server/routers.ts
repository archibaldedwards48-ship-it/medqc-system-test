import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

// Feature routers
import { recordsRouter } from "./routers/recordsRouter";
import { qcRouter } from "./routers/qcRouter";
import { rulesRouter } from "./routers/rulesRouter";
import { drugKnowledgeRouter } from "./routers/drugKnowledgeRouter";
import { medicalTerminologyRouter } from "./routers/medicalTerminologyRouter";
import { configRouter } from "./routers/configRouter";
import { statisticsRouter } from "./routers/statisticsRouter";
import { spotCheckRouter } from "./routers/spotCheckRouter";
import { nlpRouter } from "./routers/nlpRouter";
import { reportRouter } from "./routers/reportRouter";
import { authExtRouter } from './routers/authRouter';
import { feedbackRouter } from './routers/feedbackRouter';

export const appRouter = router({
  system: systemRouter,

  // Platform auth (Manus OAuth) + extended auth procedures
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // Extended auth: role, permissions, user management
    ext: authExtRouter,
  }),

  // Medical Records
  records: recordsRouter,

  // Quality Control
  qc: qcRouter,

  // QC Rules
  rules: rulesRouter,

  // Drug Knowledge Base
  drugs: drugKnowledgeRouter,

  // Medical Terminology
  terminology: medicalTerminologyRouter,

  // System Config
  config: configRouter,

  // Statistics & Analytics
  statistics: statisticsRouter,

  // Spot Check
  spotCheck: spotCheckRouter,

  // NLP Pipeline
  nlp: nlpRouter,

  // Reports
  report: reportRouter,
  // QC Feedback (false-positive, confirmed, suggestion)
  feedback: feedbackRouter,
});

export type AppRouter = typeof appRouter;
