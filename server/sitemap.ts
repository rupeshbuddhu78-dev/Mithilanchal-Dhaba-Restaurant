import type { Express } from "express";
import { asc, eq } from "drizzle-orm";
import { categories, menuItems } from "../drizzle/schema";
import { getDb } from "./db";

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);

export function registerSitemap(app: Express) {
  app.get("/sitemap.xml", async (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    const db = await getDb();
    const pages = ["/", "/menu", "/about", "/contact"];
    if (db) {
      const [activeCategories, activeItems] = await Promise.all([
        db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)),
        db.select({ slug: menuItems.slug }).from(menuItems).where(eq(menuItems.isAvailable, true)).orderBy(asc(menuItems.name)),
      ]);
      pages.push(...activeCategories.map(category => `/menu/${category.slug}`), ...activeItems.map(item => `/product/${item.slug}`));
    }
    const urls = Array.from(new Set(pages)).map(path => `<url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`).join("");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });
}
