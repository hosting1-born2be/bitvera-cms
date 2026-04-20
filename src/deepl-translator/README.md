# DeepL Translator Plugin for Payload CMS

A clean, efficient translation plugin for Payload CMS that integrates with DeepL's translation API.

## Features

- **Manual Translation**: Translate documents on-demand through the admin interface
- **RichText Support**: Full support for Payload's RichText fields
- **Batch Translation**: Translate multiple documents at once
- **Flexible Configuration**: Configure which fields to translate per collection
- **DeepL Integration**: Uses DeepL's professional translation API
- **Clean Architecture**: Well-structured, maintainable code
- **Configurable Fallback Locales**: Set fallback languages via plugin configuration

## Installation

1. Install the plugin:
```bash
npm install @your-org/deepl-translator
# or
yarn add @your-org/deepl-translator
```

2. Set your DeepL API key in environment variables:
```env
DEEPL_API_KEY=your-deepl-api-key-here
```

3. Import and configure the plugin in your Payload config:

```typescript
import { buildConfig } from 'payload/config'
import { deeplTranslatorPlugin } from '@your-org/deepl-translator'

export default buildConfig({
  // ... your existing config
  plugins: [
    deeplTranslatorPlugin({
      enabled: true,
      // Fallback locales when Payload localization is not configured
      fallbackLocales: ['lt', 'sk', 'de', 'fr'],
      collections: {
        posts: {
          fields: ['title', 'content', 'excerpt'],
          settings: {
            formality: 'prefer_more',
            preserveFormatting: true,
          },
          access: {
            translate: true,
          },
        },
        pages: {
          fields: ['title', 'content'],
          settings: {
            formality: 'less',
          },
        },
      },
    }),
  ],
})
```

## Configuration

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable the plugin |
| `collections` | `object` | `{}` | Collection-specific configuration |
| `deeplApiKey` | `string` | `process.env.DEEPL_API_KEY` | DeepL API key |
| `deeplApiUrl` | `string` | `https://api.deepl.com/v2/translate` | DeepL API URL |
| `fallbackLocales` | `string[]` | `['lt', 'sk']` | Fallback locales when Payload localization is not configured |

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DEEPL_API_KEY` | Your DeepL API key | `DEEPL_API_KEY=your-key-here` |

### Collection Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fields` | `string[]` | `[]` | Fields to translate |
| `settings` | `DeepLTranslationSettings` | `{}` | DeepL translation settings |
| `access` | `object` | `{}` | Access control settings |

### DeepL Translation Settings

| Option | Type | Description |
|--------|------|-------------|
| `formality` | `'more' \| 'less' \| 'prefer_more' \| 'prefer_less'` | Formality level |
| `preserveFormatting` | `boolean` | Preserve formatting |
| `tagHandling` | `'xml' \| 'html'` | Tag handling mode |
| `splitSentences` | `'0' \| '1' \| 'nonewlines'` | Sentence splitting |

## Usage

### Manual Translation

1. Open any document in the admin interface
2. Look for the "Translator" sidebar component
3. Select target languages and click "Translate"

### API Endpoints

#### Translate Single Document
```http
POST /api/collections/:collectionSlug/translate
Content-Type: application/json

{
  "id": "document-id",
  "locale": "en",
  "codes": ["de", "fr"],
  "settings": {
    "formality": "more"
  }
}
```

#### Generate Text
```http
POST /api/generate-text
Content-Type: application/json

{
  "text": "Hello world",
  "targetLanguage": "de",
  "sourceLanguage": "en",
  "settings": {
    "formality": "less"
  }
}
```

## Fallback Locales Configuration

The plugin supports fallback locales configuration through the plugin options:

### Plugin Configuration
```typescript
deeplTranslatorPlugin({
  fallbackLocales: ['lt', 'sk', 'de', 'fr'],
  // ... other options
})
```

### Default Values
If no fallback locales are configured, the plugin will use:
```typescript
['lt', 'sk'] // Lithuanian and Slovak
```

## Architecture

The plugin follows a clean, modular architecture:

- **`plugin.ts`**: Main plugin configuration and setup
- **`types.ts`**: TypeScript type definitions
- **`deeplService.ts`**: DeepL API integration
- **`aiTranslate.ts`**: Core translation logic
- **`translateTextAndObjects.ts`**: Object translation utilities
- **`handlers.ts`**: API endpoint handlers
- **`access.ts`**: Access control functions
- **`generateText.ts`**: Text generation utilities

## Development

### Code Quality

- **TypeScript**: Full type safety
- **Clean Code**: Follows SOLID principles
- **Error Handling**: Comprehensive error handling
- **Logging**: Appropriate logging for debugging

### Testing

```bash
npm run test
# or
yarn test
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please open an issue on GitHub.
