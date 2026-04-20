'use client'

import React, { useState, useEffect } from 'react'
import { useDocumentInfo, useLocale, useConfig } from '@payloadcms/ui'

const Translator: React.FC = () => {
  const { id } = useDocumentInfo()
  const locale = useLocale()
  const config: any = useConfig()
  const [translatingStates, setTranslatingStates] = useState<Record<string, boolean>>({})
  const [statuses, setStatuses] = useState<Record<string, string>>({})
  const [isTranslatingAll, setIsTranslatingAll] = useState(false)
  const [statusAll, setStatusAll] = useState('')
  const [fallbackLocales, setFallbackLocales] = useState<string[]>(['en'])

  // Get fallback locales from global config on component mount
  useEffect(() => {
    const getFallbackLocalesFromGlobal = async () => {
      try {
        // Try to get from global config
        const response = await fetch('/api/globals/deepl-translator-config')
        if (response.ok) {
          const globalData = await response.json()
          if (globalData.fallbackLocales && globalData.fallbackLocales.length > 0) {
            const locales = globalData.fallbackLocales.map((item: any) => item.locale)
            console.log('✅ Got fallback locales from global config:', locales)
            setFallbackLocales(locales)
            return
          }
        }

        // Try to get from window config
        if (
          typeof window !== 'undefined' &&
          (window as any).__PAYLOAD_CONFIG__?.deeplTranslator?.fallbackLocales
        ) {
          const configLocales = (window as any).__PAYLOAD_CONFIG__.deeplTranslator.fallbackLocales
          console.log('✅ Got fallback locales from window config:', configLocales)
          setFallbackLocales(configLocales)
          return
        }

        // Try to get from config object
        if (config.deeplTranslator?.fallbackLocales) {
          console.log(
            '✅ Got fallback locales from config object:',
            config.deeplTranslator.fallbackLocales,
          )
          setFallbackLocales(config.deeplTranslator.fallbackLocales)
          return
        }

        console.log('⚠️ Using default fallback locales: lt, sk')
      } catch (error) {
        console.warn('❌ Could not get fallback locales, using defaults:', error)
      }
    }

    getFallbackLocalesFromGlobal()
  }, [config])

  // Debug logging
  console.log('🔍 Translator component debug:')
  console.log('  - fallbackLocales state:', fallbackLocales)
  console.log('  - config.localization:', config.localization)
  console.log('  - config.deeplTranslator:', config.deeplTranslator)

  // Get available languages from Payload configuration
  const availableLocales = config.localization?.locales || []

  const targetLanguages =
    availableLocales.length > 0
      ? availableLocales.filter((loc: any) => loc.code !== 'en').map((loc: any) => loc.code)
      : fallbackLocales

  // Show button only for English locale
  if (locale?.code !== 'en') {
    return null
  }

  // Check if there are languages for translation
  if (targetLanguages.length === 0) {
    return null
  }

  const getCollectionSlug = (): string => {
    try {
      // Try to get from URL path
      const pathParts = window.location.pathname.split('/')

      // Look for collection slug in URL path
      // Typical Payload admin URL: /admin/collections/insights/123
      const collectionsIndex = pathParts.indexOf('collections')
      if (collectionsIndex !== -1 && pathParts[collectionsIndex + 1]) {
        return pathParts[collectionsIndex + 1]
      }

      // Fallback: try to get from document info or config
      if (config.collections && Object.keys(config.collections).length > 0) {
        // Get the first collection as fallback
        return Object.keys(config.collections)[0]
      }

      // Final fallback
      return 'insights'
    } catch (error) {
      console.warn('Could not determine collection slug, using fallback:', error)
      return 'insights'
    }
  }

  const handleTranslate = async (targetLanguage: string) => {
    if (!id) {
      setStatuses((prev) => ({
        ...prev,
        [targetLanguage]: 'No document ID found',
      }))
      return
    }

    setTranslatingStates((prev) => ({
      ...prev,
      [targetLanguage]: true,
    }))
    setStatuses((prev) => ({
      ...prev,
      [targetLanguage]: 'Translating...',
    }))

    try {
      const collectionSlug = getCollectionSlug()
      console.log('Using collection slug:', collectionSlug)

      const response = await fetch(`/api/collections/${collectionSlug}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          locale: 'en', // Source language is always English
          codes: [targetLanguage], // Translate to single target language
          settings: {},
          collectionSlug: collectionSlug, // Pass collection slug in body as fallback
        }),
      })

      if (response.ok) {
        setStatuses((prev) => ({
          ...prev,
          [targetLanguage]: `Translation to ${targetLanguage.toUpperCase()} completed successfully!`,
        }))
        // Refresh the page to show updated translations
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        const error = await response.json()
        setStatuses((prev) => ({
          ...prev,
          [targetLanguage]: `Translation failed: ${error.message || 'Unknown error'}`,
        }))
      }
    } catch (error) {
      setStatuses((prev) => ({
        ...prev,
        [targetLanguage]: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }))
    } finally {
      setTranslatingStates((prev) => ({
        ...prev,
        [targetLanguage]: false,
      }))
    }
  }

  const handleTranslateAll = async () => {
    if (!id) {
      setStatusAll('No document ID found')
      return
    }

    setIsTranslatingAll(true)
    setStatusAll('Translating...')

    try {
      const collectionSlug = getCollectionSlug()
      console.log('Using collection slug:', collectionSlug)

      const response = await fetch(`/api/collections/${collectionSlug}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          locale: 'en', // Source language is always English
          codes: targetLanguages, // Translate to all available non-English locales
          settings: {},
          collectionSlug: collectionSlug, // Pass collection slug in body as fallback
        }),
      })

      if (response.ok) {
        setStatusAll(
          `Translation completed successfully! Document translated to: ${targetLanguages.join(', ').toUpperCase()}`,
        )
        // Refresh the page to show updated translations
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        const error = await response.json()
        setStatusAll(`Translation failed: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      setStatusAll(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTranslatingAll(false)
    }
  }

  return (
    <div className="field-type">
      <div
        className="field-input"
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        {/* Button to translate all languages at once */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={handleTranslateAll}
            disabled={isTranslatingAll}
            className="btn btn--style-primary"
            style={{
              backgroundColor: isTranslatingAll ? '#6c757d' : '#007cba',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: isTranslatingAll ? 'not-allowed' : 'pointer',
              width: '100%',
              fontWeight: 'bold',
            }}
          >
            {isTranslatingAll
              ? 'Translating...'
              : `Translate to All Languages (${targetLanguages.join(', ').toUpperCase()})`}
          </button>
          {statusAll && (
            <div
              style={{
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: statusAll.includes('successfully') ? '#d4edda' : '#f8d7da',
                color: statusAll.includes('successfully') ? '#155724' : '#721c24',
                border: `1px solid ${statusAll.includes('successfully') ? '#c3e6cb' : '#f5c6cb'}`,
                fontSize: '12px',
              }}
            >
              {statusAll}
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          style={{
            borderTop: '1px solid #e0e0e0',
            margin: '8px 0',
          }}
        />

        {/* Individual translation buttons for each language */}
        {targetLanguages.map((targetLanguage: string) => {
          const isTranslating = translatingStates[targetLanguage] || false
          const status = statuses[targetLanguage] || ''

          return (
            <div
              key={targetLanguage}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <button
                type="button"
                onClick={() => handleTranslate(targetLanguage)}
                disabled={isTranslating || isTranslatingAll}
                className="btn btn--style-primary"
                style={{
                  backgroundColor: isTranslating || isTranslatingAll ? '#6c757d' : '#007cba',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: isTranslating || isTranslatingAll ? 'not-allowed' : 'pointer',
                  width: '100%',
                }}
              >
                {isTranslating
                  ? `Translating to ${targetLanguage.toUpperCase()}...`
                  : `Translate to ${targetLanguage.toUpperCase()}`}
              </button>
              {status && (
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: status.includes('successfully') ? '#d4edda' : '#f8d7da',
                    color: status.includes('successfully') ? '#155724' : '#721c24',
                    border: `1px solid ${status.includes('successfully') ? '#c3e6cb' : '#f5c6cb'}`,
                    fontSize: '12px',
                  }}
                >
                  {status}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { Translator }
