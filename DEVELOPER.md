# Craft Lottie Plugin - Developer Documentation

Technical documentation for developers extending or customizing the Craft Lottie plugin.

## Table of Contents

1. [Architecture](#architecture)
2. [Code Structure](#code-structure)
3. [Services](#services)
4. [Extending the Plugin](#extending-the-plugin)
5. [Hooks & Events](#hooks--events)
6. [API Reference](#api-reference)
7. [JavaScript Modules](#javascript-modules)
8. [Database Schema](#database-schema)
9. [Testing](#testing)

## Architecture

### Plugin Structure

```
craft-lottie/
├── src/
│   ├── assets/          # Frontend assets (JS, CSS)
│   ├── controllers/     # CP controllers
│   ├── fields/          # Field type
│   ├── migrations/      # Database migrations
│   ├── models/          # Data models
│   ├── services/        # Business logic
│   ├── templates/       # Twig templates
│   ├── variables/       # Twig variables
│   └── Plugin.php       # Main plugin class
├── config/              # Plugin configuration
└── storage/             # Runtime storage
```

### Component Overview

- **Plugin**: Main plugin class, handles initialization
- **LottieService**: Renders animations on frontend
- **LottieValidator**: Validates and processes Lottie files
- **LottieAnimatorField**: Custom field type
- **DefaultController**: CP routes (library, editor)
- **SettingsController**: Plugin settings management

## Code Structure

### Namespace

All plugin code uses the `vu\craftlottie` namespace.

### Key Classes

#### Plugin Class

```php
use vu\craftlottie\Plugin;

// Get plugin instance
$plugin = Plugin::getInstance();

// Access services
$service = $plugin->getLottieService();
$validator = $plugin->getLottieValidator();

// Get settings
$settings = $plugin->getSettings();
```

#### Field Type

```php
use vu\craftlottie\fields\LottieAnimatorField;

// Field value structure
[
    'assetId' => int,
    'data' => array|null,      // Modified Lottie JSON
    'speed' => float,          // Playback speed
    'backgroundColor' => string|null,  // Background color (hex)
    'interactions' => array    // Interaction configurations
]
```

## Services

### LottieService

Handles frontend rendering of Lottie animations.

```php
use vu\craftlottie\Plugin;

$service = Plugin::getInstance()->getLottieService();

// Render animation
$html = $service->render($fieldValue, [
    'loop' => true,
    'autoplay' => true,
    'speed' => 1.0,
    'renderer' => 'svg',
    'width' => '100%',
    'height' => 'auto',
    'id' => 'custom-id',
    'class' => 'custom-class'
]);
```

**Method:** `render($fieldValue, array $options = []): Markup`

**Parameters:**
- `$fieldValue`: Field value (array, Asset, or asset ID)
- `$options`: Rendering options (see API reference)

**Returns:** `Twig\Markup` - HTML with animation container and script

### LottieValidator

Validates and processes Lottie files.

```php
use vu\craftlottie\Plugin;

$validator = Plugin::getInstance()->getLottieValidator();

// Validate Lottie file
$result = $validator->validateLottieFile($jsonData, $filename);
if ($result['valid']) {
    $data = $result['data'];
} else {
    $error = $result['error'];
}

// Detect format
$format = $validator->detectFormat($content, $filename); // 'json' or 'lottie'

// Decompress .lottie file
$jsonString = $validator->decompressLottie($compressedContent);

// Compress to .lottie format
$compressed = $validator->compressLottie($jsonString);
```

**Methods:**
- `validateLottieFile($data, ?string $filename = null): array`
- `detectFormat(string $content, ?string $filename = null): string`
- `decompressLottie(string $content): string`
- `compressLottie(string $jsonString): string`
- `validateFileSize(int $sizeInBytes, int $maxSizeInMB = 10): array`

## Extending the Plugin

### Custom Twig Functions

Add custom Twig functions via the plugin's Twig extension:

```php
// In your module/plugin
use craft\web\twig\variables\CraftVariable;
use yii\base\Event;

Event::on(
    CraftVariable::class,
    CraftVariable::EVENT_INIT,
    function(Event $event) {
        $variable = $event->sender;
        // Add custom methods
    }
);
```

### Custom Field Settings

Extend the field type to add custom settings:

```php
// Create custom field type extending LottieAnimatorField
class MyCustomLottieField extends LottieAnimatorField
{
    public function getSettingsHtml(): ?string
    {
        // Add custom settings UI
        return Craft::$app->view->renderTemplate('my-plugin/custom-settings', [
            'field' => $this,
        ]);
    }
}
```

### Custom Editor Modules

Extend the JavaScript editor by adding custom modules:

```javascript
// In your custom module
class MyCustomEditor {
    constructor(editor) {
        this.editor = editor;
    }
    
    init() {
        // Initialize custom functionality
    }
}

// Register in lottie-editor-main.js
this.customEditor = new MyCustomEditor(this);
```

### Custom Validation Rules

Add custom validation by extending `LottieValidator`:

```php
class MyCustomValidator extends LottieValidator
{
    public function validateLottieFile($data, ?string $filename = null): array
    {
        // Call parent validation
        $result = parent::validateLottieFile($data, $filename);
        
        if (!$result['valid']) {
            return $result;
        }
        
        // Add custom validation
        if (!$this->validateCustomRule($result['data'])) {
            return [
                'valid' => false,
                'error' => 'Custom validation failed',
                'data' => null
            ];
        }
        
        return $result;
    }
    
    private function validateCustomRule($data): bool
    {
        // Custom validation logic
        return true;
    }
}
```

## Hooks & Events

### Available Events

The plugin doesn't currently expose custom events, but you can hook into Craft's native events:

```php
// Hook into asset save
use craft\events\ModelEvent;
use craft\services\Elements;

Event::on(
    Elements::class,
    Elements::EVENT_BEFORE_SAVE_ELEMENT,
    function(ModelEvent $event) {
        $element = $event->element;
        if ($element instanceof Asset) {
            // Custom logic
        }
    }
);
```

### Custom Hooks (Future)

Planned events for future versions:

- `beforeLottieRender`: Modify rendering options
- `afterLottieSave`: Post-save processing
- `beforeLottieEdit`: Pre-edit validation

## API Reference

### Twig Variable: `craft.lottie`

Access the Lottie service in Twig:

```twig
{# Render animation #}
{{ craft.lottie.render(entry.field) }}

{# With options #}
{{ craft.lottie.render(entry.field, {
    loop: false,
    speed: 2.0
}) }}
```

### PHP API

#### Get Plugin Instance

```php
use vu\craftlottie\Plugin;

$plugin = Plugin::getInstance();
```

#### Get Services

```php
$service = $plugin->getLottieService();
$validator = $plugin->getLottieValidator();
```

#### Get Settings

```php
$settings = $plugin->getSettings();
$volumeId = $settings->lottieVolumeId;
$brandPalette = $settings->brandPalette;
```

#### Query Metadata

```php
use craft\db\Query;

$metadata = (new Query())
    ->select(['speed', 'backgroundColor', 'interactions'])
    ->from('{{%lottie_metadata}}')
    ->where(['assetId' => $assetId])
    ->one();
```

## JavaScript Modules

### Module Structure

The editor is built with modular JavaScript classes:

- `LottieEditorMain`: Main orchestrator
- `AnimationRenderer`: Handles animation rendering
- `ColorEditor`: Color extraction and editing
- `TextEditor`: Text layer editing
- `LayerManager`: Layer visibility management
- `InteractionManager`: Interaction configuration
- `DataManager`: Data loading and saving
- `HistoryManager`: Undo/redo functionality
- `KeyboardShortcuts`: Keyboard shortcut handling
- `LottieDataUtils`: Utility functions

### Extending JavaScript

Add custom modules by:

1. Creating a new module file in `src/assets/js/modules/`
2. Registering it in `LottieFieldAsset.php`
3. Initializing it in `LottieEditorMain`

Example:

```javascript
// src/assets/js/modules/MyCustomModule.js
class MyCustomModule {
    constructor(editor) {
        this.editor = editor;
    }
    
    init() {
        // Custom initialization
    }
}

if (typeof window !== 'undefined') {
    window.MyCustomModule = MyCustomModule;
}
```

## Database Schema

### `lottie_metadata` Table

Stores metadata for Lottie assets:

```sql
CREATE TABLE `lottie_metadata` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `assetId` INT(11) NOT NULL,
    `backgroundColor` VARCHAR(7) NULL,
    `speed` DECIMAL(3,1) DEFAULT 1.0,
    `interactions` TEXT NULL,
    `dateCreated` DATETIME NOT NULL,
    `dateUpdated` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `assetId` (`assetId`)
);
```

**Fields:**
- `id`: Primary key
- `assetId`: Foreign key to `assets` table
- `backgroundColor`: Hex color code (e.g., `#FF0000`)
- `speed`: Playback speed (0.1 to 5.0)
- `interactions`: JSON-encoded array of interactions
- `dateCreated`: Creation timestamp
- `dateUpdated`: Last update timestamp

### Migrations

Migrations are located in `src/migrations/`:

- `m260109_000000_add_interactions_to_lottie_metadata.php`: Adds interactions column

## Testing

### Running Tests

```bash
# Run PHPStan (static analysis)
./vendor/bin/phpstan analyse src/

# Run ECS (code style)
./vendor/bin/ecs check src/
```

### Test Files

Test Lottie files are in `test-files/`:

- `example-simple.json`: Basic animation
- `example-with-text.json`: Animation with text layers
- `example-simple.lottie`: Compressed format example
- `test-invalid-json.json`: Invalid JSON for testing
- `test-no-layers.json`: File without layers (should fail validation)

### Writing Tests

Example test structure:

```php
use craft\test\TestCase;
use vu\craftlottie\services\LottieValidator;

class LottieValidatorTest extends TestCase
{
    public function testValidateLottieFile()
    {
        $validator = new LottieValidator();
        $result = $validator->validateLottieFile($validJson);
        
        $this->assertTrue($result['valid']);
        $this->assertNotNull($result['data']);
    }
}
```

## Performance Considerations

### Caching

- Animation data is cached in the editor
- Color locations are cached to avoid re-traversal
- Cleaned/fixed JSON is cached to avoid re-processing

### Optimization Tips

1. **Use .lottie format**: 60-80% smaller file size
2. **Limit history size**: Default is 50 states
3. **Debounce operations**: History saves are debounced (500ms)
4. **Lazy load library**: lottie-web loads only when needed

## Security

### File Upload Validation

- Files are validated as valid Lottie JSON
- File size limits can be configured
- Only `.json` and `.lottie` extensions are accepted

### XSS Prevention

- All user input is escaped in Twig templates
- JavaScript uses `escapeHtml()` utility
- JSON is validated before rendering

### CSRF Protection

- All POST requests require CSRF tokens
- Tokens are automatically included in forms

## Contributing

### Code Style

- Follow PSR-12 coding standards
- Use PHPStan level 8
- Add PHPDoc comments to all public methods
- Follow Craft CMS coding conventions

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit pull request

## Support

For developer support:

1. Check this documentation
2. Review the code comments
3. Check [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for implementation details
4. Open an issue on GitHub

---

**Happy coding! 🚀**
