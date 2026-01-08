# Craft Lottie Plugin - Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for the Craft Lottie plugin, based on the existing codebase and the vision outlined in `DEV_PLAN.md`. The plugin aims to provide in-CMS editing capabilities for Lottie animations, allowing content authors to modify colors, text, and other properties without requiring motion designer intervention.

## Current State Assessment

### ✅ What's Already Implemented

1. **Core Plugin Structure**
   - Plugin registration and initialization (`src/Plugin.php`)
   - Custom field type (`src/fields/LottieAnimatorField.php`)
   - Service layer for rendering (`src/services/LottieService.php`)
   - Twig variable for frontend access (`src/variables/LottieVariable.php`)
   - CP section with navigation

2. **Field Functionality**
   - Asset selection using Craft's native element selector
   - Field settings (upload location, enable/disable features)
   - Data storage in JSON format
   - Value normalization and serialization

3. **Editor Features (Partially Complete)**
   - Live preview of Lottie animations
   - Color extraction and editing
   - Speed control slider
   - Background color support
   - Real-time preview updates

4. **Frontend Rendering**
   - Twig function `craft.lottie.render()`
   - Support for modified JSON data
   - Configurable playback options (loop, autoplay, speed)
   - Fallback to asset fetching if no modified data

5. **Control Panel Features**
   - CP section for managing Lottie files
   - Separate edit page with full editor
   - Asset JSON fetching endpoint
   - Save functionality for edited animations

6. **Infrastructure**
   - Database migration for metadata table
   - Asset bundle registration
   - JavaScript editor class (`LottieEditor`)
   - CSS styling

### ✅ Recently Completed

1. **Field Editor Integration** ✅
   - Removed speed and color controls from field (preview-only mode)
   - Field now shows only preview of selected Lottie animation
   - All editing happens in dedicated CP edit page
   - Clean, compact UI for field preview

2. **Data Flow** ✅
   - Field value structure validation implemented
   - Background color properly saved to metadata table
   - Speed value properly persisted to metadata table
   - Data normalization and validation in place
   - Frontend rendering loads speed/background from metadata

3. **Coding Standards** ✅
   - ECS (Easy Coding Standards) configuration added
   - PHPStan level 5 static analysis configured
   - Rector configuration for code modernization
   - All code follows Craft CMS coding guidelines

4. **UI/UX Improvements** ✅
   - Redesigned edit template with Craft CMS standard controls
   - Improved layout using grid system (preview + sidebar)
   - Better speed control with range slider + number input
   - Improved color picker layout (grid with cards)
   - Added loading states and spinners
   - Better error messages
   - Responsive design for mobile
   - Used Craft's form helpers and CSS variables

### ⚠️ What Needs Work

1. **Error Handling** ✅ COMPLETED
   - [x] Add loading states and feedback (spinner, loading messages)
   - [x] Show user-friendly error messages in edit template
   - [x] Add validation for uploaded files (must be valid Lottie JSON)
   - [x] Handle edge cases (empty files, corrupted JSON, etc.)
   - [x] Created LottieValidator service for comprehensive validation
   - [x] Added error codes for better error handling
   - [x] Improved error messages with translations
   - [x] Added file size validation (10MB max)
   - [x] Created testing documentation (TESTING.md)

4. **Phase 2 Features (In Progress)**
   - ✅ Dynamic text editing - COMPLETED
   - [ ] Layer management (show/hide layers)
   - [ ] .lottie compressed format support

5. **Phase 3 Features (Not Started)**
   - Brand palette (global plugin settings)
   - Advanced interactivity (URLs, scroll triggers)
   - Save as new asset functionality

## Implementation Roadmap

### Phase 1: Complete MVP (Priority: HIGH)

**Goal**: Make the basic field editor fully functional with all MVP features working seamlessly.

#### 1.2 Fix Data Persistence (Estimated: 2-3 hours)

**Tasks:**
- [ ] Ensure speed value is properly saved in field value
- [ ] Ensure background color is properly saved in field value
- [ ] Fix `normalizeValue()` to handle all data structure cases
- [ ] Add validation for Lottie JSON structure
- [ ] Test save/load cycle with modified data

**Files to Modify:**
- `src/fields/LottieAnimatorField.php`
- `src/assets/js/lottie-editor.js`

**Technical Notes:**
- Current `saveData()` method creates object with `assetId`, `data`, `speed`, `backgroundColor`
- Need to ensure this structure is properly handled in `normalizeValue()`
- Background color should be stored in field value, not just metadata table

#### 1.3 Improve Error Handling (Estimated: 2-3 hours)

**Tasks:**
- [x] Add loading states and feedback (spinner, loading messages)
- [x] Show user-friendly error messages in edit template
- [ ] Add validation for uploaded files (must be valid Lottie JSON) - Partially done
- [ ] Handle edge cases (empty files, corrupted JSON, etc.) - Partially done

**Files Modified:**
- `src/templates/edit.twig` - Added loading states and error handling
- `src/assets/js/lottie-editor.js` - Error handling improvements
- `src/controllers/DefaultController.php` - Basic validation

**Files to Further Modify:**
- `src/fields/LottieAnimatorField.php` - Add file validation on upload

#### 1.4 UI/UX Improvements ✅ COMPLETED

**Tasks:**
- [x] Redesigned edit template with Craft CMS standard controls
- [x] Improved layout using grid system (preview + sidebar)
- [x] Better speed control with range slider + number input
- [x] Improved color picker layout (grid with cards)
- [x] Added loading states and spinners
- [x] Better error messages
- [x] Responsive design for mobile
- [x] Used Craft's form helpers and CSS variables

**Files Modified:**
- `src/templates/edit.twig` - Complete redesign

**Deliverables:**
- ✅ Modern, professional UI following Craft CMS standards
- ✅ Better UX with proper controls and feedback
- ✅ Responsive layout

#### 1.5 Testing & Refinement (Estimated: 2-3 hours)

**Tasks:**
- [ ] Test complete workflow: upload → edit → save → render
- [ ] Test with various Lottie file structures
- [ ] Test color editing with different color formats
- [ ] Test speed control with various values
- [ ] Fix any remaining UI/UX issues
- [ ] Ensure frontend rendering works correctly

**Deliverables:**
- Fully functional MVP
- Working field preview
- Working CP edit page with all controls
- Proper data persistence
- Frontend rendering working

### Phase 2: Enhanced Editor & Workflow (Priority: MEDIUM)

**Goal**: Add advanced editing features and improve the authoring experience.

#### 2.1 Dynamic Text Editing ✅ COMPLETED

**Tasks:**
- [x] Identify text layers in Lottie JSON structure
- [x] Create UI for editing text content
- [x] Implement text replacement logic
- [x] Handle keyframed text animations
- [x] Add preview of text changes

**Technical Approach:**
- Lottie text layers have structure: `layers[].ty === 5` (text layer type)
- Text content in: `layers[].t.d.k[].s.t` (keyframed) or `layers[].t.d.k.s.t` (static)
- Traverse layers array, find text layers (ty === 5), extract text
- Provide input fields for each text layer with layer names
- Update JSON structure when text changes
- Re-render preview automatically

**Files Modified:**
- `src/templates/edit.twig` - Added text editor UI and logic
  - `extractTextLayers()` - Finds all text layers in Lottie JSON
  - `findTextLayers()` - Recursively searches for text layers
  - `createTextEditor()` - Creates UI for each text layer
  - `updateText()` - Updates text in JSON and re-renders
  - `getLayerByPath()` - Helper to navigate JSON structure
- Added CSS styling for text editor components

**Features:**
- ✅ Detects text layers (type 5) in Lottie files
- ✅ Handles both static and keyframed text
- ✅ Shows layer names for easy identification
- ✅ Real-time preview updates
- ✅ Supports multiple text instances per layer
- ✅ Clean UI matching Craft CMS design patterns

#### 2.2 Layer Management ✅ COMPLETED

**Tasks:**
- [x] Extract layer information from Lottie JSON
- [x] Create UI to list all layers
- [x] Add toggle controls to show/hide layers
- [x] Implement layer visibility logic
- [x] Update preview when layers are toggled

**Technical Approach:**
- Lottie layers are in `layers[]` array
- Each layer has `ip` (in point), `op` (out point), `st` (start time)
- To hide a layer, set `op` to 0 (preserves structure for re-enabling)
- Store original `op` value in `_originalOp` property for restoration
- Layers displayed in reverse order (top layer first in UI)

**Files Modified:**
- `src/templates/edit.twig` - Added layer management UI and logic
  - `extractLayers()` - Extracts all layers from Lottie JSON
  - `createLayerControl()` - Creates UI checkbox for each layer
  - `toggleLayerVisibility()` - Shows/hides layers by setting `op` to 0 or restoring original
  - `getLayerTypeName()` - Maps layer type numbers to readable names
- Added CSS styling for layer controls

**Features:**
- ✅ Lists all layers with names and types
- ✅ Checkbox toggles for show/hide
- ✅ Visual feedback (strikethrough, opacity) for hidden layers
- ✅ Real-time preview updates
- ✅ Preserves layer structure (can re-enable hidden layers)
- ✅ Shows layer types (Shape, Text, Precomp, etc.)

#### 2.3 Asset Volume Integration (Estimated: 2-3 hours)

**Tasks:**
- [ ] Verify asset selector is working correctly
- [ ] Ensure proper filtering for JSON files only
- [ ] Add validation that selected asset is valid Lottie file
- [ ] Improve asset selection UX

**Status**: Mostly complete, may need refinement

#### 2.4 .lottie Format Support (Estimated: 10-12 hours)

**Tasks:**
- [ ] Research .lottie format specification
- [ ] Add library for .lottie decompression (if needed)
- [ ] Implement .lottie file detection
- [ ] Add decompression logic
- [ ] Handle both .json and .lottie formats
- [ ] Consider compression on save (optional)

**Technical Notes:**
- .lottie is a compressed binary format
- May need additional library: `@lottiefiles/lottie-js` might support it
- Check if `lottie-web` can handle .lottie files directly
- If not, need decompression library

**Files to Create/Modify:**
- `src/services/LottieService.php` (add format detection)
- `src/controllers/DefaultController.php` (handle .lottie files)
- `src/assets/js/lottie-editor.js` (handle .lottie loading)
- `package.json` (add .lottie library if needed)

### Phase 3: Power User & Brand Governance (Priority: LOW)

**Goal**: Add enterprise features for brand consistency and advanced workflows.

#### 3.1 Brand Palette (Estimated: 6-8 hours)

**Tasks:**
- [ ] Create plugin settings page
- [ ] Add brand color palette configuration
- [ ] Store palette in plugin settings
- [ ] Integrate palette into field color picker
- [ ] Show palette colors alongside custom colors
- [ ] Add validation to restrict to palette (optional)

**Technical Approach:**
- Use Craft's plugin settings system
- Store colors as array in settings
- Pass palette to field editor via options
- Display palette as swatches in color picker UI
- Allow selection from palette or custom color

**Files to Create/Modify:**
- `src/Plugin.php` (add settings)
- `src/templates/settings.twig` (settings page)
- `src/assets/js/lottie-editor.js` (use palette)
- `src/templates/_field-input.twig` (show palette)

#### 3.2 Advanced Interactivity (Estimated: 10-12 hours)

**Tasks:**
- [ ] Add URL linking to animation elements
- [ ] Implement scroll-based playback triggers
- [ ] Add click/hover interaction options
- [ ] Create UI for configuring interactions
- [ ] Generate interaction code for frontend

**Technical Approach:**
- Store interaction metadata in field value
- Use lottie-web's event system
- Add JavaScript for scroll detection
- Generate frontend code in `LottieService::render()`

**Files to Create/Modify:**
- `src/assets/js/lottie-editor.js` (interaction UI)
- `src/services/LottieService.php` (render interactions)
- `src/templates/_field-input.twig` (interaction controls)

#### 3.3 Save as New Asset (Estimated: 6-8 hours)

**Tasks:**
- [ ] Add "Save as Copy" button to editor
- [ ] Create new asset from modified JSON
- [ ] Generate unique filename
- [ ] Update field to reference new asset
- [ ] Handle asset permissions

**Technical Approach:**
- Use Craft's asset creation API
- Create new asset in same volume or specified location
- Generate filename: `original-name-edited-{timestamp}.json`
- Update field value to new asset ID
- Preserve all modifications

**Files to Create/Modify:**
- `src/controllers/DefaultController.php` (save-as action)
- `src/assets/js/lottie-editor.js` (save-as UI)
- `src/templates/_field-input.twig` (save-as button)

## Technical Debt & Improvements

### Code Quality
- [ ] Add PHPStan level 8 compliance
- [ ] Add comprehensive PHPDoc comments
- [ ] Refactor JavaScript for better maintainability
- [ ] Add unit tests for critical functions
- [ ] Add integration tests for field workflow

### Performance
- [ ] Optimize color extraction algorithm
- [ ] Cache parsed Lottie JSON structure
- [ ] Lazy load lottie-web library
- [ ] Optimize preview rendering

### User Experience
- [ ] Add keyboard shortcuts
- [ ] Improve loading states
- [ ] Add undo/redo functionality
- [ ] Better error messages
- [ ] Add help text and tooltips
- [ ] Responsive design improvements

### Documentation
- [ ] Complete README with examples
- [ ] Add inline code documentation
- [ ] Create user guide
- [ ] Add developer documentation

## Recommended Implementation Order

### Immediate (Week 1-2)
1. **Phase 1.1**: Fix Field Input UI
2. **Phase 1.2**: Fix Data Persistence
3. **Phase 1.3**: Improve Error Handling
4. **Phase 1.4**: Testing & Refinement

### Short-term (Week 3-6)
5. **Phase 2.1**: Dynamic Text Editing
6. **Phase 2.2**: Layer Management
7. **Phase 2.3**: Asset Volume Integration (refinement)

### Medium-term (Week 7-10)
8. **Phase 2.4**: .lottie Format Support
9. **Phase 3.1**: Brand Palette

### Long-term (Week 11+)
10. **Phase 3.2**: Advanced Interactivity
11. **Phase 3.3**: Save as New Asset
12. Technical debt and improvements

## Key Technical Decisions Needed

1. **Color Editing Strategy**
   - Current: Replace all instances of a color
   - Alternative: Edit specific layer colors individually
   - **Recommendation**: Keep current approach for MVP, add layer-specific editing in Phase 2

2. **Data Storage Strategy**
   - Current: Store modified JSON in field value
   - Alternative: Store only modifications, merge on render
   - **Recommendation**: Current approach is simpler and works well

3. **Preview Rendering**
   - Current: Use lottie-web in CP
   - Alternative: Use @lottiefiles/lottie-js for manipulation, lottie-web for preview
   - **Recommendation**: Current approach works, but consider using lottie-js for better manipulation

4. **.lottie Format**
   - Need to research: Can lottie-web handle .lottie directly?
   - If not, which library to use for decompression?
   - **Action**: Research before implementing

## Dependencies Review

### Current Dependencies
- `@lottiefiles/lottie-js`: ^0.4.2 (installed but may not be used)
- `lottie-web`: ^5.13.0 (used for rendering)

### Potential Additional Dependencies
- Library for .lottie format (TBD)
- Color manipulation library (if needed)
- Text extraction/editing utilities (if needed)

## Testing Strategy

### Manual Testing Checklist
- [ ] Upload valid Lottie JSON file
- [ ] Select existing asset
- [ ] Edit colors and see preview update
- [ ] Change speed and see preview update
- [ ] Save entry and verify data persists
- [ ] Load entry and verify data loads correctly
- [ ] Render on frontend with Twig function
- [ ] Test with various Lottie file structures
- [ ] Test error cases (invalid JSON, missing file, etc.)

### Automated Testing (Future)
- Unit tests for field value normalization
- Unit tests for color extraction
- Integration tests for save/load cycle
- Frontend rendering tests

## Success Criteria

### Phase 1 MVP Complete When:
- ✅ Users can select/upload Lottie files in field
- ✅ Live preview works in field editor
- ✅ Color editing works and persists
- ✅ Speed control works and persists
- ✅ Frontend rendering works correctly
- ✅ No critical bugs or errors

### Phase 2 Complete When:
- ✅ Text editing works
- ✅ Layer management works
- ✅ .lottie format supported (if feasible)

### Phase 3 Complete When:
- ✅ Brand palette implemented
- ✅ Advanced interactivity works
- ✅ Save as new asset works

## Notes & Considerations

1. **Lottie JSON Structure**: Lottie files have complex nested structures. Color/text extraction needs to handle various formats and edge cases.

2. **Performance**: Large Lottie files may cause performance issues. Consider:
   - Limiting preview size
   - Debouncing preview updates
   - Optimizing color extraction

3. **Browser Compatibility**: Ensure lottie-web works in all target browsers. Consider polyfills if needed.

4. **Security**: Validate all user input, especially JSON data. Ensure no XSS vulnerabilities in rendered output.

5. **Backward Compatibility**: Consider how to handle existing field values if data structure changes.

6. **Asset Permissions**: Ensure users have proper permissions to access and modify assets.

## Getting Started

To begin implementation:

1. **Review Current Code**: Understand the existing implementation
2. **Set Up Development Environment**: Ensure plugin is linked to Craft project
3. **Start with Phase 1.1**: Fix the field input UI
4. **Test Incrementally**: Test each feature as you implement it
5. **Document Changes**: Update this plan as you progress

## Questions to Resolve

1. Should color editing replace ALL instances of a color, or allow selective replacement?
2. How should we handle Lottie files with embedded images/assets?
3. Should we support Lottie files with expressions?
4. What's the maximum file size we should support?
5. Should edited animations be saved back to the original asset or always stored separately?

---

**Last Updated**: 2026-01-08
**Status**: Ready for Implementation
**Next Steps**: Begin Phase 1.1 - Fix Field Input UI
