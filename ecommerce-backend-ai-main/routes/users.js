import express from "express";
import { User } from "../models/User.js";
import { requireAdmin } from "../middleware/auth.js";
import { badRequest, internalError } from "../utils/http.js";

const router = express.Router();

const deleteUserController = async (req, res) => {
  try {
    const userId = String(req.params.id || "").trim();
    if (!userId) {
      return badRequest(res, "User ID is required", "MISSING_USER_ID");
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    }

    const configuredAdminEmail = (process.env.ADMIN_EMAIL || "ezinwaugochukw@gmail.com").toLowerCase();
    if (user.email === configuredAdminEmail) {
      return badRequest(res, "Configured admin user cannot be deleted", "PROTECTED_ADMIN");
    }

    await user.destroy();
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return internalError(res, error);
  }
};

router.delete("/:id", requireAdmin, deleteUserController);

export default router;
