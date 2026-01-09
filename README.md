# Craft Lottie Plugin

A powerful Craft CMS plugin that provides in-CMS editing capabilities for Lottie animations. Edit colors, text, layers, and add interactivity without leaving the control panel.

## Features

- 🎨 **Visual Editor**: Full-featured editor with live preview
- 🎨 **Color Editing**: Modify colors in real-time with brand palette support
- ✏️ **Text Editing**: Edit text layers directly in the animation
- 👁️ **Layer Management**: Show/hide layers with real-time updates
- 🎯 **Interactions**: Add scroll triggers, click actions, hover effects, and URL links
- ⚡ **Performance**: Optimized rendering with caching and lazy loading
- 📱 **Responsive**: Mobile-friendly interface
- ⌨️ **Keyboard Shortcuts**: Power user features with undo/redo
- 💾 **Format Support**: Both `.json` and compressed `.lottie` formats

## Requirements

- Craft CMS 5.8.0 or later
- PHP 8.2 or later

## Installation

### From the Plugin Store

Go to the Plugin Store in your project's Control Panel and search for "craft-lottie". Then press "Install".

### With Composer

```bash
composer require vu/craft-craft-lottie
./craft plugin/install craft-lottie
```

## Configuration

### Enable .lottie File Uploads

Add `.lottie` to your allowed file extensions in `config/general.php`:

```php
return GeneralConfig::create()
    // ... other configuration ...
    ->extraAllowedFileExtensions(['json', 'lottie'])
;
```

### Plugin Settings

1. Go to **Settings → Plugins → Craft Lottie**
2. Configure:
   - **Lottie Volume**: Select the asset volume where Lottie files should be stored
   - **Brand Palette**: Define your brand colors (hex format, e.g., `#FF0000`)

## Quick Start

### 1. Create a Lottie Field

1. Go to **Settings → Fields**
2. Create a new field
3. Select **Lottie Animator** as the field type
4. Configure field settings and save

### 2. Upload Lottie Files

1. Go to **Lottie Animator** in the CP sidebar
2. Click **Upload Lottie File**
3. Select a `.json` or `.lottie` file
4. The file will be uploaded to your configured volume

### 3. Edit Animations

1. Click on any animation in the library
2. Use the editor to:
   - Adjust playback speed
   - Change background color
   - Edit colors (with brand palette support)
   - Modify text layers
   - Toggle layer visibility
   - Add interactions (scroll, click, hover, URL links)
3. Click **Save Changes** or use **Ctrl+S**

### 4. Render on Frontend

In your Twig templates:

```twig
{# Basic usage #}
{{ craft.lottie.render(entry.myLottieField) }}

{# With options #}
{{ craft.lottie.render(entry.myLottieField, {
    loop: true,
    autoplay: true,
    speed: 1.5,
    width: '500px',
    height: '500px',
    class: 'my-animation'
}) }}
```

## Usage Examples

### Basic Animation

```twig
{# Simple render #}
{{ craft.lottie.render(entry.heroAnimation) }}
```

### Custom Styling

```twig
{# With custom CSS class #}
<div class="animation-wrapper">
    {{ craft.lottie.render(entry.heroAnimation, {
        class: 'hero-animation',
        width: '100%',
        height: 'auto'
    }) }}
</div>
```

### Conditional Rendering

```twig
{# Only render if field has value #}
{% if entry.animation %}
    {{ craft.lottie.render(entry.animation) }}
{% endif %}
```

### Multiple Animations

```twig
{# Loop through entries with animations #}
{% for entry in craft.entries.section('animations').all() %}
    <div class="animation-item">
        {{ craft.lottie.render(entry.animation) }}
    </div>
{% endfor %}
```

## Editor Features

### Color Editing

- **Brand Palette**: Quick access to your brand colors
- **Animation Colors**: Automatically extracted from the animation
- **Real-time Preview**: See changes instantly
- **Color Matching**: Smart color replacement across the animation

### Text Editing

- **Text Layer Detection**: Automatically finds editable text layers
- **Keyframe Support**: Edit text at different keyframes
- **Real-time Updates**: Changes reflect immediately in preview

### Layer Management

- **Layer Visibility**: Toggle layers on/off
- **Layer Types**: See layer types (Shape, Text, Precomp, etc.)
- **Non-destructive**: Hidden layers can be re-enabled

### Interactions

- **Scroll Triggers**: Play animation on scroll
- **Click Actions**: Play, pause, or restart on click
- **Hover Effects**: Play/pause on hover
- **URL Links**: Make layers clickable with custom URLs

### Keyboard Shortcuts

- `Ctrl+S` / `Cmd+S`: Save changes
- `Ctrl+Shift+S` / `Cmd+Shift+S`: Save as copy
- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z`: Redo
- `Escape`: Cancel (with unsaved changes warning)

## API Reference

### Twig Function: `craft.lottie.render()`

Render a Lottie animation on the frontend.

**Parameters:**

- `fieldValue` (mixed): The Lottie field value (array, Asset, or asset ID)
- `options` (array): Optional rendering options

**Options:**

- `loop` (bool): Whether to loop the animation (default: `true`)
- `autoplay` (bool): Whether to autoplay (default: `true`)
- `renderer` (string): Renderer type - `'svg'` or `'canvas'` (default: `'svg'`)
- `speed` (float): Playback speed multiplier (default: `1.0`)
- `width` (string): Container width (default: `'100%'`)
- `height` (string): Container height (default: `'auto'`)
- `id` (string): Custom container ID (auto-generated if not provided)
- `class` (string): Additional CSS classes

**Returns:** `Twig\Markup` - HTML markup with animation container and script

**Example:**

```twig
{{ craft.lottie.render(entry.animation, {
    loop: false,
    autoplay: false,
    speed: 2.0,
    width: '800px',
    height: '600px',
    class: 'custom-animation'
}) }}
```

### PHP Service: `LottieService`

Access the service programmatically:

```php
use vu\craftlottie\Plugin;

$service = Plugin::getInstance()->getLottieService();
$html = $service->render($fieldValue, $options);
```

## File Formats

### JSON Format (`.json`)

Standard Lottie JSON format. Human-readable and easy to debug.

### Compressed Format (`.lottie`)

Compressed binary format (gzipped JSON). Smaller file size, better performance.

**Note:** The plugin automatically:
- Detects the format on upload
- Decompresses `.lottie` files for editing
- Preserves the original format when saving
- Compresses to `.lottie` if the original was `.lottie`

## Troubleshooting

### Animation Not Loading

1. **Check file format**: Ensure the file is a valid Lottie JSON or `.lottie` file
2. **Check browser console**: Look for JavaScript errors
3. **Verify asset volume**: Ensure the asset volume is accessible
4. **Check file size**: Very large files may take time to load

### Colors Not Changing

1. **Check color format**: Ensure colors are in the animation's color properties
2. **Verify layer visibility**: Hidden layers won't show color changes
3. **Check browser cache**: Hard refresh (Ctrl+F5) to clear cache

### Text Not Editable

1. **Verify text layers**: Not all Lottie files have editable text layers
2. **Check layer structure**: Some text layers may be in nested compositions
3. **File compatibility**: Ensure the Lottie file uses a supported text format

### Interactions Not Working

1. **Check JavaScript console**: Look for errors in the browser console
2. **Verify interaction settings**: Ensure interactions are enabled
3. **Check frontend rendering**: Interactions require the animation to be rendered via `craft.lottie.render()`

## Performance Tips

1. **Use .lottie format**: Compressed format reduces file size by 60-80%
2. **Optimize animations**: Remove unused assets and layers in After Effects
3. **Cache assets**: Use Craft's asset caching for better performance
4. **Lazy load**: Consider lazy loading animations below the fold

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.

## License

This plugin is licensed under the Craft License. See [LICENSE.md](LICENSE.md) for details.

## Support

For support, please:
1. Check the [documentation](#)
2. Search [existing issues](#)
3. Create a [new issue](#) if needed

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes.

## Credits

Developed by [10vu10](https://10vu10.ch)

---

**Made with ❤️ for the Craft CMS community**
