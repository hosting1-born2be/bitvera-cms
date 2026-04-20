import { deeplTranslatorPlugin, aiTranslatorPlugin } from './plugin'
import { DeepLService } from './deeplService'
import { translateTextAndObjects } from './translateTextAndObjects'
import { generateText } from './generateText'

export { deeplTranslatorPlugin, aiTranslatorPlugin }
export { DeepLService }
export { translateTextAndObjects }
export { generateText }
export type {
  PluginTypes,
  CollectionOptions,
  DeepLTranslationSettings,
  DeepLTranslationRequest,
  DeepLTranslationResponse,
  GenerateTextRequest,
  GenerateTextResponse,
} from './types'

// Default export for backward compatibility
export default deeplTranslatorPlugin
