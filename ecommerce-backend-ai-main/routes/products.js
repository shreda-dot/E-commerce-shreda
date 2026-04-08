import express from "express";
import { Product } from "../models/Product.js";
import { badRequest, internalError, notFound } from "../utils/http.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const rawSearch = req.query.search;
    const search = typeof rawSearch === "string" ? rawSearch.trim() : "";

    const products = await Product.findAll();
    if (!search) {
      return res.json(products);
    }

    // Filter products by case-insensitive search on name or keywords.
    const lowerCaseSearch = search.toLowerCase().slice(0, 80);
    const filteredProducts = products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(lowerCaseSearch);
      const keywordsMatch = product.keywords.some((keyword) =>
        keyword.toLowerCase().includes(lowerCaseSearch),
      );
      return nameMatch || keywordsMatch;
    });

    res.json(filteredProducts);
  } catch (error) {
    return internalError(res, error);
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, image, priceCents, keywords, stock } = req.body || {};
    if (!name || !image || !Number.isInteger(Number(priceCents))) {
      return badRequest(
        res,
        "name, image and integer priceCents are required",
        "INVALID_PRODUCT_INPUT",
      );
    }

    const product = await Product.create({
      name: String(name).trim(),
      image: String(image).trim(),
      priceCents: Number(priceCents),
      stock: stock !== undefined ? Number(stock) : 10,
      keywords:
        Array.isArray(keywords) && keywords.length > 0 ? keywords : ["general"],
      rating: { stars: 0, count: 0 },
    });
    return res.status(201).json(product);
  } catch (error) {
    return internalError(res, error);
  }
});

router.put("/:productId", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.productId);
    if (!product) {
      return notFound(res, "Product not found", "PRODUCT_NOT_FOUND");
    }

    const { name, image, priceCents, keywords, stock } = req.body || {};
    if (name !== undefined) product.name = String(name).trim();
    if (image !== undefined) product.image = String(image).trim();
    if (priceCents !== undefined) {
      const parsed = Number(priceCents);
      if (!Number.isInteger(parsed)) {
        return badRequest(
          res,
          "priceCents must be an integer",
          "INVALID_PRICE",
        );
      }
      product.priceCents = parsed;
    }
    if (stock !== undefined) product.stock = Number(stock);
    if (
      keywords !== undefined &&
      Array.isArray(keywords) &&
      keywords.length > 0
    ) {
      product.keywords = keywords;
    }

    await product.save();
    return res.json(product);
  } catch (error) {
    return internalError(res, error);
  }
});

router.delete("/:productId", requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.productId);
    if (!product) {
      return notFound(res, "Product not found", "PRODUCT_NOT_FOUND");
    }
    await product.destroy();
    return res.status(204).send();
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
