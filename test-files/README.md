# Test Files for Lottie Validation

These test files are designed to test various validation scenarios for the Craft Lottie plugin.

## Test Files

### test-empty.json
- **Purpose**: Test empty file handling
- **Expected Behavior**: Craft CMS will reject this file during upload with an error "Unable to copy stream to [path]"
- **Note**: Empty files are rejected by Craft CMS at the asset upload level, before our validation code runs. This is expected and prevents empty files from being stored. Our validation would catch this if a file somehow became empty after upload, but Craft's upload validation handles it first.

### test-invalid-json.json
- **Purpose**: Test invalid JSON syntax
- **Expected Error**: "Invalid JSON format: [error details]"
- **Error Code**: `INVALID_JSON`

### test-not-lottie.json
- **Purpose**: Test valid JSON that is not a Lottie file
- **Expected Error**: "Missing required Lottie properties: v, fr, w, h. This does not appear to be a valid Lottie animation file."
- **Error Code**: `INVALID_LOTTIE`

### test-missing-properties.json
- **Purpose**: Test Lottie file missing required properties (missing 'h')
- **Expected Error**: "Missing required Lottie properties: h. This does not appear to be a valid Lottie animation file."
- **Error Code**: `INVALID_LOTTIE`

### test-invalid-types.json
- **Purpose**: Test Lottie file with invalid property types (negative frame rate, zero width)
- **Expected Error**: "Invalid frame rate. Frame rate must be a positive number." or "Invalid width. Width must be a positive number."
- **Error Code**: `INVALID_LOTTIE`

### test-no-layers.json
- **Purpose**: Test Lottie file with no layers or assets
- **Expected Error**: "Lottie file must contain at least layers or assets. This file appears to be empty."
- **Error Code**: `INVALID_LOTTIE`

## Usage

1. Upload these files to your Craft CMS assets
2. Try to select them in a Lottie Animator field
3. Verify that appropriate error messages are displayed
4. Check that error codes match expectations

### example-with-text.json
- **Purpose**: Example Lottie file with text layers and multiple shape layers
- **Contains**: 
  - 1 Text layer ("Hello World")
  - 2 Shape layers (Background Shape, Circle Shape)
- **Use Case**: Test text editing and layer management features
- **Note**: This is a valid Lottie file for testing editing features

### example-multiple-text.json
- **Purpose**: Example Lottie file with multiple text layers for comprehensive testing
- **Contains**: 
  - 3 Text layers:
    - "Title Text" - "Welcome" (large, bold, blue)
    - "Subtitle Text" - "Edit this text" (medium, gray)
    - "Body Text" - "This is editable text content" (small, dark gray)
  - 2 Shape layers:
    - Background (light gray rectangle)
    - Decorative Shape (orange circle)
- **Use Case**: Test multiple text editing, layer management, and color editing
- **Note**: Perfect for testing text editing with different text layers and styles

## Notes

- These files are intentionally broken for testing purposes (except example-with-text.json)
- Do not use these files in production
- For valid Lottie files, download from [LottieFiles](https://lottiefiles.com)
