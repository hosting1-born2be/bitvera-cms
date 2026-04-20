import type { CollectionConfig } from "payload";
import slugify from "slugify";

export const Policies: CollectionConfig = {
  slug: "policies",
  admin: {
    useAsTitle: "title",
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === "admin",
    update: ({ req }) => req.user?.role === "admin",
    delete: ({ req }) => req.user?.role === "admin",
  },
  fields: [
    {
      name: "title",
      type: "text",
      label: "Title",
      required: true,
      localized: true,
    },
    {
      name: "last_updated",
      type: "date",
      label: "Last Updated",
      required: false,
    },
    {
      name: "slug",
      type: "text",
      label: "Slug",
      unique: true,
      hooks: {
        beforeChange: [
          async ({ data }) => {
            if (data?.title) {
              return slugify(data.title, { lower: true, strict: true });
            }
          },
        ],
      },
    },
    {
      name: "content",
      type: "richText",
      label: "Content",
      localized: true,
    },
  ],
};
