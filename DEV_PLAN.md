# Lottie Animator for Craft CMS

## 1. Project Vision

This project is a premium, feature-rich Craft CMS plugin that provides a seamless motion design workflow fully integrated into the Craft authoring experience.

The core value proposition is to move beyond simple Lottie file selection and playback. This plugin will empower content authors to perform essential edits—such as changing brand colors or updating dynamic text—directly within a custom Craft field. This eliminates the high-friction workflow of sending minor animation edits back to a motion designer, dramatically increasing efficiency for agencies and in-house marketing teams.

## 2. Core Features & Development Roadmap

Development will follow a phased approach, starting with an MVP to validate the core functionality and progressively adding more advanced features.

### Phase 1: Minimum Viable Product (MVP)

The goal of the MVP is to deliver the core in-CMS editing functionality.

- **Custom Field Type**: A new "Lottie Animator" field that accepts .json Lottie file uploads.
- **Live Preview**: A robust, real-time preview of the Lottie animation directly within the field's UI.
- **Basic Editing Controls**:
  - An integrated color picker to find and modify key colors within the animation's JSON structure.
  - A slider to control and save the default animation playback speed.
- **Frontend Rendering**: A simple Twig function (`craft.lottie.render(entry.myField)`) to render the animation on the frontend, including support for basic playback options like loop and autoplay.

### Phase 2: Enhanced Editor & Workflow

This phase will expand the editing toolset and improve the authoring experience.

- **Dynamic Text Editing**: The ability to identify and edit text layers within the Lottie JSON.
- **Layer Management**: Simple controls to hide or show specific layers within the animation.
- **Asset Volume Integration**: Allow users to select and reuse Lottie files from Craft's native Asset Volumes.
- **Optimized Format Support**: Add support for the compressed .lottie file format to improve frontend performance.

### Phase 3: Power User & Brand Governance Features

This phase will solidify the plugin as an indispensable tool for professional design teams.

- **Brand Palette**: A global plugin setting where administrators can define a set of approved brand colors. These colors will be presented in the field's color picker to ensure brand consistency.
- **Advanced Interactivity**: Controls to link parts of an animation to URLs or trigger playback based on scroll position.
- **Save as New Asset**: The ability to save an edited Lottie animation as a new, distinct asset in the Craft asset library.

## 3. Technical Architecture

The plugin will be built following modern Craft CMS development best practices.

### 3.1 Plugin Scaffolding

The plugin will be scaffolded using Craft's official generator tools to ensure PSR-4 compliance and a standard project structure. The main plugin class (`src/Plugin.php`) will handle the registration of the custom field type.

### 3.2 Custom Field (`src/fields/LottieAnimatorField.php`)

The functional core of the plugin is a custom field class extending `craft\base\Field`. It will be responsible for the settings, authoring UI, and data handling.

- **`getSettingsHtml()`**: Renders a Twig template for field-specific settings (e.g., default upload location, enabling/disabling editor features).
- **`inputHtml()`**: Renders the main authoring interface. This template will contain the HTML structure for the file uploader, the live preview canvas, and the custom editing controls. It will also load the necessary JavaScript assets for the editor.
- **`contentColumnType()`**: Returns JSON to define the database column type for storing the complete, modified Lottie JSON data.
- **`normalizeValue()`**: This server-side method is critical. It receives the submitted data from the inputHtml form (which will be a single, modified JSON string from our editor) and ensures it is correctly formatted before being saved to the database.

### 3.3 Integrated Editor (JavaScript)

The editor is a bespoke component built with JavaScript, following Strategy A. It will be self-contained and will not rely on any external APIs or services.

- **Core Library**: The editor's logic will be powered by the `@lottiefiles/lottie-js` library. This library provides a complete object model for the Lottie JSON structure, enabling programmatic manipulation.

**Client-Side Workflow**:

1. When a user uploads or selects a Lottie .json file, its content is loaded into the browser.
2. The JSON string is parsed into a manipulable object using `Animation.fromJSON()`.
3. The UI controls (e.g., a color picker) trigger JavaScript functions that traverse the Lottie object model to update properties (e.g., a specific shape layer's fill color).
4. The live preview is updated instantly to reflect the changes.
5. After modification, the entire Lottie object is serialized back into a JSON string.
6. This final JSON string is placed into a hidden `<textarea>` field that is part of the main Craft entry form.
7. When the author saves the entry, this hidden field is submitted and handled by the `normalizeValue()` method in our PHP Field class.

### 3.4 Frontend Rendering

- **Rendering Library**: The plugin will bundle the industry-standard `lottie-web` JavaScript library for frontend playback. This library is governed by the MIT License, allowing for free inclusion in a commercial product.
- **Twig Function**: A Twig function (e.g., `craft.lottie.render()`) will be provided. This function will:
  - Accept the Lottie field object as an argument.
  - Accept an optional second argument for playback options (`{ loop: true, speed: 0.5 }`).
  - Output the necessary `<div id="...">` container and the `lottie.loadAnimation({...})` JavaScript initialization code, passing the full JSON data and playback options.

## 4. Development Setup

**Clone Repository:**

```bash
git clone <repository-url>
```

**Install Dependencies:**

Navigate to the plugin directory and install PHP dependencies.

```bash
cd <plugin-directory>
composer install
```

**Link to Craft Project:**

To develop the plugin, link it to a local Craft CMS project using a path repository in the project's `composer.json` file.

```json
// In your Craft project's composer.json
"repositories": [
    {
        "type": "path",
        "url": "../path/to/your/lottie-plugin"
    }
],
"minimum-stability": "dev"
```

**Install in Craft:**

From your Craft project's root, require the plugin.

```bash
composer require your-vendor-name/craft-lottie-animator
```

**Install JavaScript Assets:**

Navigate to the plugin's asset source directory and install the required Node.js packages.

```bash
# (Assuming a standard JS setup in the plugin)
cd <plugin-directory>/src/assets
npm install
```

**Build Assets:**

Run the build script to compile JavaScript and CSS for the Control Panel.

```bash
npm run dev
```

**Install Plugin in Craft CMS:**

Navigate to Settings > Plugins in the Craft control panel and install "Lottie Animator".

## 5. Key Dependencies

- **PHP**: `craftcms/cms`
- **JavaScript (Editor Logic)**: `@lottiefiles/lottie-js`
- **JavaScript (Frontend Player)**: `lottie-web`

## 6. Database Schema

The plugin will not create any custom tables. All data will be stored in a single JSON column within Craft's native content table, managed entirely by the custom field type.
