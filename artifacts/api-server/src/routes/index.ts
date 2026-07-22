import { Router, type IRouter } from "express";
import healthRouter       from "./health";
import paymentRouter      from "./payment";
import authRouter         from "./auth";
import adminRouter        from "./admin";
import adminPlansRouter   from "./admin-plans";
import adminTxRouter      from "./admin-transactions";
import adminCmsRouter     from "./admin-cms";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(paymentRouter);
router.use(adminRouter);
router.use(adminPlansRouter);
router.use(adminTxRouter);
router.use(adminCmsRouter);

export default router;
