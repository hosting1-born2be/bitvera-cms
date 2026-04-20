import type { CollectionConfig } from "payload";
import slugify from "slugify";

export const Posts: CollectionConfig = {
  slug: "posts",
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
      label: "Post Title",
      required: true,
      localized: true,
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
      name: "image",
      type: "upload",
      relationTo: "media",
      label: "Image",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "excerpt",
      type: "text",
      label: "Excerpt",
      localized: true,
    },
    {
      name: "info",
      type: "richText",
      label: "Info",
      localized: true,
    },
    {
      name: "content",
      type: "richText",
      label: "Content",
      localized: true,
    },
    {
      name: "seo_title",
      type: "text",
      label: "SEO Title",
      required: false,
      localized: true,
    },
    {
      name: "seo_description",
      type: "text",
      label: "SEO Description",
      required: false,
      localized: true,
    },
  ],
  hooks: {
    /*afterChange: [
      async ({ doc }) => {
        try {
          const response = await fetch('https://modulixo.com/api/revalidate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tags: ['ideas'],
            }),
          })

          if (!response.ok) {
            console.error('Cache revalidation failed:', response.statusText)
          } else {
            console.log('Cache revalidation triggered successfully.')
          }
        } catch (error) {
          console.error('Error triggering cache revalidation:', error)
        }
      },
    ],*/
  },
};
