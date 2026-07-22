import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentRouter from "./payment";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(paymentRouter);

export default router;
