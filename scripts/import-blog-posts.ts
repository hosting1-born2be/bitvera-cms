import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getPayload } from "payload";

import configPromise from "@payload-config";
import type { Post } from "../src/payload-types";
import { parseBlogPostsMarkdown } from "../src/seed/blogPosts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const ARTICLES_SOURCE_PATH = path.resolve(dirname, "..", "docs", "Bitvera articles.md");

const BLOG_IMAGE_PATH = path.resolve(
  dirname,
  "..",
  "..",
  "bitvera-front",
  "public",
  "images",
  "blog",
  "bitvera",
  "card-image.png",
);

const BLOG_IMAGE_ALT = "Bitvera blog article image";

async function ensureBlogMedia(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existingMedia = await payload.find({
    collection: "media",
    limit: 1,
    where: {
      alt: {
        equals: BLOG_IMAGE_ALT,
      },
    },
  });

  const existingEntry = existingMedia.docs[0];

  if (existingEntry) {
    return existingEntry.id;
  }

  const createdMedia = await payload.create({
    collection: "media",
    data: {
      alt: BLOG_IMAGE_ALT,
    },
    filePath: BLOG_IMAGE_PATH,
  });

  return createdMedia.id;
}

async function upsertPost(
  payload: Awaited<ReturnType<typeof getPayload>>,
  imageId: number | string,
  post: ReturnType<typeof parseBlogPostsMarkdown>[number],
) {
  const existingPost = await payload.find({
    collection: "posts",
    locale: "en",
    limit: 1,
    where: {
      slug: {
        equals: post.slug,
      },
    },
  });

  const normalizedImageId =
    typeof imageId === "string" ? Number(imageId) : imageId;

  const data = {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    info: post.info as Post["info"],
    content: post.content as Post["content"],
    seo_title: post.seoTitle,
    seo_description: post.seoDescription,
    image: normalizedImageId as Post["image"],
  } as Omit<Post, "sizes" | "createdAt" | "deletedAt" | "updatedAt" | "id">;

  const current = existingPost.docs[0];

  if (current) {
    await payload.update({
      collection: "posts",
      id: current.id,
      locale: "en",
      data,
    });
    console.log(`Updated post: ${post.slug}`);
    return;
  }

  await payload.create({
    collection: "posts",
    locale: "en",
    data,
  });
  console.log(`Created post: ${post.slug}`);
}

async function main() {
  const payload = await getPayload({
    config: await configPromise,
  });
  const source = await fs.readFile(ARTICLES_SOURCE_PATH, "utf8");
  const blogPosts = parseBlogPostsMarkdown(source);

  const imageId = await ensureBlogMedia(payload);

  for (const post of blogPosts) {
    await upsertPost(payload, imageId, post);
  }

  console.log(`Imported ${blogPosts.length} blog posts from ${ARTICLES_SOURCE_PATH}.`);
}

void main().catch((error) => {
  console.error("Failed to import blog posts.", error);
  process.exit(1);
});
