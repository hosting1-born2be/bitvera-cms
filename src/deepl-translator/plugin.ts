import type { Config } from "payload";
import type { PluginTypes } from "./types";
import {
  createTranslatorHandler,
  createMissingTranslatorHandler,
  generateTextHandler,
} from "./handlers";
import { Field } from "payload";

export const deeplTranslatorPlugin = (pluginOptions: PluginTypes) => {
  return (incomingConfig: Config): Config => {
    const {
      collections: allCollectionOptions,
      enabled = true,
      fallbackLocales,
    } = pluginOptions;
    const config = { ...incomingConfig };

    // If plugin is disabled, return config without modifications
    if (enabled === false) {
      return config;
    }

    // Add fallback locales to global config for client-side access
    if (fallbackLocales) {
      config.globals = config.globals || [];
      config.globals.push({
        slug: "deepl-translator-config",
        fields: [
          {
            name: "fallbackLocales",
            type: "array",
            fields: [
              {
                name: "locale",
                type: "text",
              },
            ],
            defaultValue: fallbackLocales.map((loc: string) => ({
              locale: loc,
            })),
            admin: {
              readOnly: true,
            },
          },
        ],
        admin: {
          hidden: true,
        },
      });
    }

    // Add translation endpoints to collections
    config.collections = (config.collections || []).map(
      (existingCollection) => {
        // Check if this collection should have translator
        const collectionOptions = allCollectionOptions[existingCollection.slug];
        const shouldAddTranslator = !!collectionOptions;

        console.log(
          `🔍 Plugin: Processing collection "${existingCollection.slug}"`,
        );
        console.log(`  - Has collectionOptions:`, !!collectionOptions);
        console.log(
          `  - allCollectionOptions keys:`,
          Object.keys(allCollectionOptions),
        );
        console.log(`  - shouldAddTranslator:`, shouldAddTranslator);

        if (!shouldAddTranslator) {
          console.log(`  - Skipping collection "${existingCollection.slug}"`);
          return existingCollection;
        }

        console.log(
          `  - Adding translator to collection "${existingCollection.slug}"`,
        );
        return {
          ...existingCollection,
          fields: [
            ...(existingCollection.fields || []),
            // Add translator UI component
            {
              name: "translator",
              type: "ui",
              admin: {
                position: "sidebar",
                components: {
                  Field: "./deepl-translator/components/Translator#Translator",
                },
              },
            } as Field,
          ],
        };
      },
    );

    // Add global endpoints
    config.endpoints = [
      ...(config.endpoints || []),
      {
        path: "/collections/:collectionSlug/translate",
        method: "post",
        handler: createTranslatorHandler(pluginOptions),
      },
      {
        path: "/generate-text",
        method: "post",
        handler: generateTextHandler(pluginOptions),
      },
    ];

    return config;
  };
};

// Keep backward compatibility
export const aiTranslatorPlugin = deeplTranslatorPlugin;
