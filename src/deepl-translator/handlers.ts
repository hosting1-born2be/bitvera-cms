import { validateAccess } from './access'
import { translateCollection } from './aiTranslate'
import type { PluginTypes, TranslationRequest, TranslationResponse } from './types'
import type { PayloadHandler } from 'payload'

/**
 * Create translation handler for single document
 */
export const createTranslatorHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async (req) => {
    try {
      console.log('🔍 Translation handler debug info:')
      console.log('  - Request URL:', (req as any).url)
      console.log('  - Request params:', (req as any).params)
      console.log('  - Request method:', (req as any).method)

      // Try multiple ways to get collection slug
      let collectionSlug = (req as any).params?.collectionSlug
      console.log('  - Collection slug from params:', collectionSlug)

      // If not in params, try to extract from URL
      if (!collectionSlug) {
        const url = (req as any).url
        if (url) {
          const urlParts = url.split('/')
          const collectionsIndex = urlParts.indexOf('collections')
          console.log('  - URL parts:', urlParts)
          console.log('  - Collections index:', collectionsIndex)
          if (collectionsIndex !== -1 && urlParts[collectionsIndex + 1]) {
            collectionSlug = urlParts[collectionsIndex + 1]
            console.log('  - Collection slug from URL:', collectionSlug)
          }
        }
      }

      // If still no collection slug, try to get from request body
      if (!collectionSlug) {
        const requestBody = await getRequestBody(req)
        collectionSlug = requestBody.collectionSlug
        console.log('  - Collection slug from request body:', collectionSlug)
      }

      console.log('  - Final collection slug:', collectionSlug)

      if (!collectionSlug) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Collection not found in URL or request body',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const requestBody = await getRequestBody(req)
      const { id, locale, codes, settings } = requestBody

      console.log('  - Request body:', { id, locale, codes, settings })

      if (!id || !locale) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Document ID and locale are required',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const doc = await (req as any).payload.findByID({
        collection: collectionSlug,
        id,
        locale,
      })

      if (!doc) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Document not found',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const collectionOptions = pluginOptions.collections[collectionSlug]
      if (!collectionOptions) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Collection not configured for translation',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (!validateAccess(req, pluginOptions, collectionSlug)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Access denied',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const finalSettings = {
        ...(settings || {}),
        ...collectionOptions.settings,
      }

      await translateCollection({
        doc,
        req,
        collectionOptions,
        collection: { slug: collectionSlug },
        codes,
        sourceLanguage: locale,
        settings: finalSettings,
      })

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Translation completed successfully',
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    } catch (error) {
      console.error('Translation handler error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Translation failed',
          error: String(error),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }
}

/**
 * Create bulk translation handler for multiple documents
 */
export const createMissingTranslatorHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async (req) => {
    try {
      // Try multiple ways to get collection slug
      let collectionSlug = (req as any).params?.collectionSlug

      // If not in params, try to extract from URL
      if (!collectionSlug) {
        const url = (req as any).url
        if (url) {
          const urlParts = url.split('/')
          const collectionsIndex = urlParts.indexOf('collections')
          if (collectionsIndex !== -1 && urlParts[collectionsIndex + 1]) {
            collectionSlug = urlParts[collectionsIndex + 1]
          }
        }
      }

      // If still no collection slug, try to get from request body
      if (!collectionSlug) {
        const requestBody = await getRequestBody(req)
        collectionSlug = requestBody.collectionSlug
      }

      if (!collectionSlug) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Collection not found in URL or request body',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (!validateAccess(req, pluginOptions, collectionSlug)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Access denied',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const requestBody = await getRequestBody(req)
      const { locale, codes, settings } = requestBody

      const allDocs = await (req as any).payload.find({
        collection: collectionSlug,
        locale,
        limit: 10000,
      })

      if (!allDocs?.docs) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No documents found',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const collectionOptions = pluginOptions.collections[collectionSlug]
      const finalSettings = {
        ...(settings || {}),
        ...collectionOptions.settings,
      }

      for (const doc of allDocs.docs) {
        try {
          await translateCollection({
            doc,
            req,
            collectionOptions,
            collection: { slug: collectionSlug },
            codes,
            sourceLanguage: locale,
            settings: finalSettings,
          })
        } catch (error) {
          console.error(`Failed to translate document ${doc.id}:`, error)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Bulk translation completed',
        }),
        { headers: { 'Content-Type': 'application/json' } },
      )
    } catch (error) {
      console.error('Bulk translation handler error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Bulk translation failed',
          error: String(error),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }
}

/**
 * Create text generation handler
 */
export const generateTextHandler = (pluginOptions: PluginTypes): PayloadHandler => {
  return async (req) => {
    try {
      if (!validateAccess(req, pluginOptions, 'system')) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Access denied',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const { generateText } = await import('./generateText')
      const requestBody = await getRequestBody(req)
      const result = await generateText(requestBody)

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Generate text handler error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Text generation failed',
          error: String(error),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }
}

/**
 * Extract request body from different sources
 */
async function getRequestBody(req: any): Promise<any> {
  console.log('🔍 getRequestBody debug:')
  console.log('  - req.body:', (req as any).body)
  console.log('  - req.json function:', typeof (req as any).json)

  // Try req.body first
  if ((req as any).body && Object.keys((req as any).body).length > 0) {
    console.log('  - Using req.body')
    return (req as any).body
  }

  // Try req.json() if available
  if (typeof (req as any).json === 'function') {
    try {
      const body = await (req as any).json()
      console.log('  - Using req.json():', body)
      return body
    } catch (e) {
      console.log('  - req.json() failed:', e)
    }
  }

  // Try URL search params as fallback
  const url = (req as any).url
  if (url) {
    const urlObj = new URL(url)
    const id = urlObj.searchParams.get('id')
    const locale = urlObj.searchParams.get('locale')
    console.log('  - URL search params:', { id, locale })

    if (id && locale) {
      console.log('  - Using URL search params')
      return { id, locale }
    }
  }

  console.log('  - No request body found, returning empty object')
  return {}
}
