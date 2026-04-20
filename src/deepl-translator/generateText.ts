import { DeepLService } from './deeplService'
import type { GenerateTextRequest, GenerateTextResponse } from './types'

export async function generateText(request: GenerateTextRequest): Promise<GenerateTextResponse> {
  try {
    const deeplService = new DeepLService({
      deeplApiKey: process.env.DEEPL_API_KEY,
    })

    const translatedText = await deeplService.translateText(
      request.text,
      request.targetLanguage,
      request.sourceLanguage,
      request.settings,
    )

    return {
      success: true,
      translatedText,
    }
  } catch (error) {
    console.error('Text generation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
