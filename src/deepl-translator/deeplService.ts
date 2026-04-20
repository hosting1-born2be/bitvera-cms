import type {
  DeepLTranslationRequest,
  DeepLTranslationResponse,
  DeepLTranslationSettings,
} from './types'

export class DeepLService {
  private apiKey: string
  private apiUrl: string

  constructor(pluginOptions: { deeplApiKey?: string; deeplApiUrl?: string }) {
    this.apiKey = pluginOptions.deeplApiKey || process.env.DEEPL_API_KEY || ''
    this.apiUrl = pluginOptions.deeplApiUrl || 'https://api.deepl.com/v2/translate'

    if (!this.apiKey) {
      throw new Error(
        'DeepL API key is required. Set DEEPL_API_KEY environment variable or pass deeplApiKey in plugin options.',
      )
    }
  }

  /**
   * Translate text using DeepL API
   */
  async translateText(
    text: string,
    targetLang: string,
    sourceLang?: string,
    settings?: DeepLTranslationSettings,
  ): Promise<string> {
    try {
      const requestBody: DeepLTranslationRequest = {
        text: [text],
        target_lang: this.normalizeLanguageCode(targetLang),
        source_lang: sourceLang ? this.normalizeLanguageCode(sourceLang) : undefined,
        formality: settings?.formality,
        preserve_formatting: settings?.preserveFormatting,
        tag_handling: settings?.tagHandling,
        split_sentences: settings?.splitSentences,
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: this.buildFormData(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`DeepL API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result: DeepLTranslationResponse = await response.json()

      if (!result.translations || result.translations.length === 0) {
        throw new Error('No translation returned from DeepL API')
      }

      return result.translations[0].text
    } catch (error) {
      console.error('DeepL translation failed:', error)
      throw error
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(
    texts: string[],
    targetLang: string,
    sourceLang?: string,
    settings?: DeepLTranslationSettings,
  ): Promise<string[]> {
    try {
      const requestBody: DeepLTranslationRequest = {
        text: texts,
        target_lang: this.normalizeLanguageCode(targetLang),
        source_lang: sourceLang ? this.normalizeLanguageCode(sourceLang) : undefined,
        formality: settings?.formality,
        preserve_formatting: settings?.preserveFormatting,
        tag_handling: settings?.tagHandling,
        split_sentences: settings?.splitSentences,
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: this.buildFormData(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`DeepL API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const result: DeepLTranslationResponse = await response.json()

      if (!result.translations || result.translations.length !== texts.length) {
        throw new Error(
          `Expected ${texts.length} translations, got ${result.translations?.length || 0}`,
        )
      }

      return result.translations.map((t) => t.text)
    } catch (error) {
      console.error('DeepL batch translation failed:', error)
      throw error
    }
  }

  /**
   * Normalize language codes for DeepL API
   * DeepL uses different codes than ISO 639-1
   */
  private normalizeLanguageCode(code: string): string {
    const languageMap: { [key: string]: string } = {
      en: 'EN',
      de: 'DE',
      fr: 'FR',
      it: 'IT',
      ja: 'JA',
      es: 'ES',
      pt: 'PT',
      ru: 'RU',
      zh: 'ZH',
      nl: 'NL',
      pl: 'PL',
      bg: 'BG',
      cs: 'CS',
      da: 'DA',
      el: 'EL',
      et: 'ET',
      fi: 'FI',
      hu: 'HU',
      id: 'ID',
      ko: 'KO',
      lt: 'LT',
      lv: 'LV',
      nb: 'NB',
      ro: 'RO',
      sk: 'SK',
      sl: 'SL',
      sv: 'SV',
      tr: 'TR',
      uk: 'UK',
      ar: 'AR',
      hi: 'HI',
      th: 'TH',
      vi: 'VI',
    }

    return languageMap[code.toLowerCase()] || code.toUpperCase()
  }

  /**
   * Build form data for DeepL API request
   */
  private buildFormData(data: DeepLTranslationRequest): string {
    const params = new URLSearchParams()

    // Add text array
    data.text.forEach((text) => params.append('text', text))

    // Add target language
    params.append('target_lang', data.target_lang)

    // Add optional parameters
    if (data.source_lang) params.append('source_lang', data.source_lang)
    if (data.formality) params.append('formality', data.formality)
    if (data.preserve_formatting !== undefined)
      params.append('preserve_formatting', data.preserve_formatting ? '1' : '0')
    if (data.tag_handling) params.append('tag_handling', data.tag_handling)
    if (data.split_sentences) params.append('split_sentences', data.split_sentences)

    return params.toString()
  }

  /**
   * Check if DeepL service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl.replace('/translate', '/usage')}`, {
        method: 'GET',
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        },
      })
      return response.ok
    } catch (error) {
      console.error('DeepL health check failed:', error)
      return false
    }
  }
}
