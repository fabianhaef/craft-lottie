# Testing Guide for Craft Lottie Plugin

## File Validation Tests

### Test Case 1: Empty File
**Scenario**: User tries to upload an empty JSON file
- **Expected**: Craft CMS will reject the file during upload with an error about copying the stream
- **Note**: Empty files are rejected by Craft CMS at the asset upload level, before our validation runs. This is expected behavior and prevents empty files from being stored in the system.
- **Test File**: Create an empty `test-empty.json` file
- **Expected Craft Error**: "Unable to copy stream to [path]" - This is correct and expected

### Test Case 2: Invalid JSON
**Scenario**: User selects a file with invalid JSON syntax
- **Expected**: Error message "Invalid JSON format: [error details]"
- **Error Code**: `INVALID_JSON`
- **Test File**: Create `test-invalid.json` with content: `{ invalid json }`

### Test Case 3: Valid JSON but Not Lottie
**Scenario**: User selects a valid JSON file that is not a Lottie animation
- **Expected**: Error message "Missing required Lottie properties: [list]. This does not appear to be a valid Lottie animation file."
- **Error Code**: `INVALID_LOTTIE`
- **Test File**: Create `test-not-lottie.json` with: `{"name": "test", "value": 123}`

### Test Case 4: Missing Required Properties
**Scenario**: Lottie file missing required properties (v, fr, ip, op, w, h)
- **Expected**: Error message listing missing properties
- **Error Code**: `INVALID_LOTTIE`
- **Test File**: Create minimal JSON with only some properties

### Test Case 5: Invalid Property Types
**Scenario**: Lottie file has invalid property types (e.g., negative frame rate)
- **Expected**: Specific error about the invalid property
- **Error Code**: `INVALID_LOTTIE`
- **Test Cases**:
  - Negative frame rate: `{"v": "5.5", "fr": -1, ...}`
  - Zero width: `{"v": "5.5", "w": 0, ...}`
  - Invalid version format

### Test Case 6: Empty Layers and Assets
**Scenario**: Lottie file has no layers or assets
- **Expected**: Error message "Lottie file must contain at least layers or assets. This file appears to be empty."
- **Error Code**: `INVALID_LOTTIE`
- **Test File**: Create Lottie structure without layers or assets arrays

### Test Case 7: File Too Large
**Scenario**: User selects a file larger than 10MB
- **Expected**: Error message "File size exceeds the maximum allowed size of 10MB."
- **Error Code**: `FILE_TOO_LARGE`
- **Test File**: Create or use a file larger than 10MB

### Test Case 8: Valid Lottie File
**Scenario**: User selects a valid Lottie animation file
- **Expected**: File loads successfully, animation displays
- **Error Code**: None
- **Test File**: Use a valid Lottie JSON file from LottieFiles

## Edge Cases

### Edge Case 1: Corrupted File During Upload
**Scenario**: File becomes corrupted during upload process
- **Expected**: Error message with details about the corruption
- **Handling**: JSON parsing will fail, caught by validation

### Edge Case 2: Network Error
**Scenario**: Network error while fetching asset
- **Expected**: User-friendly error message about network issues
- **Error Code**: `NETWORK_ERROR`

### Edge Case 3: Asset Not Found
**Scenario**: Asset ID exists but file is missing
- **Expected**: Error message "Asset not found"
- **Error Code**: `ASSET_NOT_FOUND`

### Edge Case 4: Permission Error
**Scenario**: User doesn't have permission to access asset
- **Expected**: Appropriate permission error message
- **Error Code**: `PERMISSION_DENIED`

## User Messaging Tests

### Test Case 1: Error Display in Field
**Scenario**: Error occurs in field preview
- **Expected**: Error displayed in preview container with clear message
- **UI**: Red error box with icon and message

### Test Case 2: Error Display in Edit Page
**Scenario**: Error occurs in CP edit page
- **Expected**: Error displayed in preview area with formatted message
- **UI**: Styled error box with error code

### Test Case 3: Success Messages
**Scenario**: File loads successfully
- **Expected**: Animation displays, no error messages
- **UI**: Smooth loading transition

## Integration Tests

### Test Case 1: Complete Workflow
1. Upload valid Lottie file
2. Select in field
3. Preview displays
4. Edit in CP page
5. Save changes
6. Frontend renders correctly

### Test Case 2: Error Recovery
1. Select invalid file
2. See error message
3. Select valid file
4. Preview updates correctly

## Manual Testing Checklist

- [ ] Empty file handling
- [ ] Invalid JSON handling
- [ ] Valid JSON but not Lottie
- [ ] Missing required properties
- [ ] Invalid property types
- [ ] File size validation
- [ ] Network error handling
- [ ] Error messages are user-friendly
- [ ] Error messages are translatable
- [ ] Errors display correctly in field
- [ ] Errors display correctly in edit page
- [ ] Valid files load correctly
- [ ] Animation previews work
- [ ] Color extraction works
- [ ] Speed control works
- [ ] Save functionality works

## Automated Testing (Future)

Consider adding PHPUnit tests for:
- `LottieValidator::validateLottieFile()`
- `LottieValidator::validateFileSize()`
- Edge case handling
- Error message generation
