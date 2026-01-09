# Craft Lottie Plugin - User Guide

A comprehensive guide for content authors and editors using the Craft Lottie plugin.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Uploading Animations](#uploading-animations)
3. [Editing Animations](#editing-animations)
4. [Using the Editor](#using-the-editor)
5. [Frontend Display](#frontend-display)
6. [Tips & Best Practices](#tips--best-practices)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### First-Time Setup

1. **Configure Plugin Settings**
   - Navigate to **Settings → Plugins → Craft Lottie**
   - Select a **Lottie Volume** where your animation files will be stored
   - (Optional) Add **Brand Colors** to your palette for quick access

2. **Create a Lottie Field**
   - Go to **Settings → Fields**
   - Click **New Field**
   - Choose **Lottie Animator** as the field type
   - Give it a name (e.g., "Hero Animation")
   - Configure field settings:
     - **Default Upload Location**: Where new files should be uploaded
     - **Enable Features**: Choose which editing features to enable
   - Save the field

3. **Add Field to Entry Type**
   - Go to **Settings → Entry Types**
   - Edit your entry type
   - Add the Lottie field to the layout
   - Save

## Uploading Animations

### Method 1: Through the Lottie Library

1. Go to **Lottie Animator** in the CP sidebar
2. Click **Upload Lottie File** (top right)
3. Select a `.json` or `.lottie` file from your computer
4. The file will be uploaded and appear in the library

### Method 2: Through Asset Manager

1. Go to **Assets** in the CP sidebar
2. Navigate to your Lottie volume
3. Click **Upload files**
4. Select your Lottie file(s)
5. Files will appear in both Assets and the Lottie library

### Supported File Formats

- **`.json`**: Standard Lottie JSON format
- **`.lottie`**: Compressed Lottie format (smaller file size)

**Note:** If you can't upload `.lottie` files, ask your developer to enable them in `config/general.php`.

## Editing Animations

### Opening the Editor

1. Go to **Lottie Animator** in the CP sidebar
2. Click on any animation in the library
3. The editor will open with a live preview

### Editor Interface

The editor is divided into two main sections:

- **Left Side**: Live preview of the animation
- **Right Side**: Editing controls

### Animation Settings

#### Playback Speed

- Use the **slider** or **input field** to adjust speed
- Range: 0.1x to 5.0x
- Changes are applied in real-time
- **Tip:** Use slower speeds (0.5x) for subtle animations, faster (2.0x) for energetic ones

#### Background Color

- Click the **color picker** to choose a background color
- Click **Clear** to remove the background
- Useful for previewing animations on different backgrounds
- **Note:** This only affects the preview, not the exported animation

### Color Editing

#### Using Brand Palette

1. Colors from your brand palette appear at the top
2. Click a brand color swatch
3. The closest matching color in the animation will be replaced
4. **Tip:** Brand palette colors are defined in plugin settings

#### Editing Individual Colors

1. Scroll to **Animation Colors** section
2. Find the color you want to change
3. Click the **color swatch**
4. Choose a new color from the picker
5. Changes apply instantly in the preview

**Tips:**
- Colors are extracted automatically from the animation
- Only editable colors are shown
- Some colors may appear multiple times if used in different layers

### Text Editing

1. Scroll to **Edit Text** section
2. Find the text layer you want to edit
3. Enter new text in the **Text Content** field
4. Changes apply in real-time

**Notes:**
- Not all animations have editable text layers
- Some text may be in keyframes (different text at different times)
- Text formatting (font, size, color) is preserved from the original

### Layer Management

1. Scroll to **Layer Management** section
2. See all layers in the animation
3. **Uncheck** a layer to hide it
4. **Check** a layer to show it
5. Changes apply instantly

**Tips:**
- Layer names come from After Effects
- Layer types are shown (Shape, Text, Precomp, etc.)
- Hidden layers can be re-enabled anytime
- Useful for A/B testing different versions

### Adding Interactions

Interactions make animations respond to user actions.

#### Scroll Trigger

1. Click **Add Interaction** → **Scroll Trigger**
2. Configure:
   - **Trigger**: When to trigger (on scroll)
   - **Offset**: Distance from viewport (0 = when visible)
   - **Direction**: Forward or reverse
3. Animation will play when scrolled into view

#### Click Action

1. Click **Add Interaction** → **Click Action**
2. Choose an **Action**:
   - **Play**: Start playing
   - **Pause**: Pause playback
   - **Restart**: Start from beginning
3. Click anywhere on the animation to trigger

#### Hover Effect

1. Click **Add Interaction** → **Hover Effect**
2. Configure:
   - **On Enter**: What happens when mouse enters (play/pause)
   - **On Leave**: What happens when mouse leaves (play/pause)
3. Hover over the animation to see the effect

#### URL Link

1. Click **Add Interaction** → **URL Link**
2. Enter:
   - **URL**: The link destination
   - **Target**: `_self` (same window) or `_blank` (new tab)
   - **Layer Name**: (Optional) Specific layer to make clickable
3. Clicking the animation (or specific layer) will navigate to the URL

### Saving Changes

#### Save Changes

- Click **Save Changes** or press `Ctrl+S` (Windows) / `Cmd+S` (Mac)
- Saves changes to the original file
- Button is disabled when there are no changes

#### Save as Copy

- Click **Save as Copy** or press `Ctrl+Shift+S` (Windows) / `Cmd+Shift+S` (Mac)
- Creates a new file with your changes
- Original file remains unchanged
- Useful for creating variations

### Undo/Redo

- **Undo**: Click undo button or press `Ctrl+Z` / `Cmd+Z`
- **Redo**: Click redo button or press `Ctrl+Shift+Z` / `Cmd+Shift+Z`
- Up to 50 actions can be undone
- History is cleared after saving

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save changes |
| `Ctrl+Shift+S` / `Cmd+Shift+S` | Save as copy |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Escape` | Cancel (with warning if unsaved changes) |

## Frontend Display

### Basic Usage

In your Twig templates, use the `craft.lottie.render()` function:

```twig
{{ craft.lottie.render(entry.myLottieField) }}
```

### Custom Options

```twig
{{ craft.lottie.render(entry.myLottieField, {
    loop: false,
    autoplay: false,
    speed: 1.5,
    width: '500px',
    height: '500px',
    class: 'my-custom-class'
}) }}
```

### Styling

Add custom CSS to style your animations:

```css
.my-custom-class {
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

## Tips & Best Practices

### File Preparation

1. **Optimize in After Effects**: Remove unused assets before exporting
2. **Use .lottie format**: Smaller file size, faster loading
3. **Keep file sizes reasonable**: Aim for under 500KB when possible
4. **Test in browser**: Preview animations before uploading

### Color Management

1. **Use brand palette**: Define colors in settings for consistency
2. **Test on different backgrounds**: Use background color picker to preview
3. **Consider accessibility**: Ensure sufficient color contrast

### Text Editing

1. **Keep text short**: Long text may not fit in the animation
2. **Test different lengths**: Preview how text looks at different lengths
3. **Preserve formatting**: Font, size, and style are preserved from original

### Performance

1. **Use compressed format**: `.lottie` files are 60-80% smaller
2. **Limit interactions**: Too many interactions can impact performance
3. **Lazy load**: Consider loading animations only when visible

### Workflow

1. **Save frequently**: Use `Ctrl+S` to save your work
2. **Use "Save as Copy"**: Create variations without losing originals
3. **Test on frontend**: Always preview on the actual website
4. **Keep backups**: Original files are preserved when using "Save as Copy"

## Troubleshooting

### Animation Won't Load

**Problem:** Animation doesn't appear in the editor

**Solutions:**
- Check that the file is a valid Lottie JSON or `.lottie` file
- Verify the file isn't corrupted
- Try uploading the file again
- Check browser console for errors

### Colors Not Changing

**Problem:** Color changes don't appear in preview

**Solutions:**
- Ensure you're editing a color that exists in the animation
- Check that the layer containing the color is visible
- Try refreshing the page (hard refresh: `Ctrl+F5`)
- Verify the color format is correct (hex: `#FF0000`)

### Text Not Editable

**Problem:** No text layers appear in the editor

**Solutions:**
- Not all Lottie files have editable text layers
- Text may be rasterized (converted to images) in After Effects
- Check the original After Effects file for text layers
- Some text layers may be in nested compositions

### Interactions Not Working

**Problem:** Interactions don't work on the frontend

**Solutions:**
- Ensure you're using `craft.lottie.render()` to display the animation
- Check browser console for JavaScript errors
- Verify interactions are enabled in the editor
- Test in a different browser

### Preview Looks Different from Frontend

**Problem:** Animation looks different on the website

**Solutions:**
- Check that you saved your changes
- Verify the correct field is being used in the template
- Clear browser cache
- Check for CSS conflicts on the frontend

### Save Button Disabled

**Problem:** Can't save changes

**Solutions:**
- Make sure you've made changes (button is disabled when no changes)
- Check that you have permission to edit assets
- Verify the asset volume is writable
- Try refreshing the page

## Getting Help

If you encounter issues not covered here:

1. Check the [README.md](README.md) for technical details
2. Review browser console for error messages
3. Contact your developer or site administrator
4. Check plugin settings for configuration issues

---

**Happy animating! 🎨**
