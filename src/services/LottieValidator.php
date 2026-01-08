<?php

namespace vu\craftlottie\services;

use craft\base\Component;
use craft\helpers\Json;

/**
 * Service for validating Lottie animation files
 */
class LottieValidator extends Component
{
    /**
     * Validates that a JSON string is a valid Lottie animation
     *
     * @param string|array $data JSON string or decoded array
     * @return array{valid: bool, error: string|null, data: array|null}
     */
    public function validateLottieFile($data): array
    {
        // Handle empty data
        if (empty($data)) {
            return [
                'valid' => false,
                'error' => 'The file is empty.',
                'data' => null,
            ];
        }

        // Decode JSON if it's a string
        if (is_string($data)) {
            // Check if string is empty after trimming
            $trimmed = trim($data);
            if ($trimmed === '') {
                return [
                    'valid' => false,
                    'error' => 'The file is empty.',
                    'data' => null,
                ];
            }

            try {
                $decoded = Json::decode($trimmed, true);
            } catch (\Exception $e) {
                return [
                    'valid' => false,
                    'error' => 'Invalid JSON format: ' . $e->getMessage(),
                    'data' => null,
                ];
            }

            // Check for JSON parsing errors
            if (json_last_error() !== JSON_ERROR_NONE) {
                return [
                    'valid' => false,
                    'error' => 'Invalid JSON: ' . json_last_error_msg(),
                    'data' => null,
                ];
            }

            $data = $decoded;
        }

        // Must be an array/object
        if (!is_array($data)) {
            return [
                'valid' => false,
                'error' => 'Lottie file must be a JSON object.',
                'data' => null,
            ];
        }

        // Check for required Lottie properties (v, fr, w, h are essential)
        // ip and op are usually present but some files might not have them
        $requiredProperties = ['v', 'fr', 'w', 'h'];
        $missingProperties = [];

        foreach ($requiredProperties as $prop) {
            if (!isset($data[$prop])) {
                $missingProperties[] = $prop;
            }
        }

        if (!empty($missingProperties)) {
            return [
                'valid' => false,
                'error' => 'Missing required Lottie properties: ' . implode(', ', $missingProperties) . '. This does not appear to be a valid Lottie animation file.',
                'data' => null,
            ];
        }

        // Validate property types
        if (isset($data['v']) && !is_string($data['v']) && !is_numeric($data['v'])) {
            return [
                'valid' => false,
                'error' => 'Invalid Lottie version format.',
                'data' => null,
            ];
        }

        if (isset($data['fr']) && (!is_numeric($data['fr']) || $data['fr'] <= 0)) {
            return [
                'valid' => false,
                'error' => 'Invalid frame rate. Frame rate must be a positive number.',
                'data' => null,
            ];
        }

        if (isset($data['w']) && (!is_numeric($data['w']) || $data['w'] <= 0)) {
            return [
                'valid' => false,
                'error' => 'Invalid width. Width must be a positive number.',
                'data' => null,
            ];
        }

        if (isset($data['h']) && (!is_numeric($data['h']) || $data['h'] <= 0)) {
            return [
                'valid' => false,
                'error' => 'Invalid height. Height must be a positive number.',
                'data' => null,
            ];
        }

        // Check for layers or assets
        // Note: Some valid Lottie files might have empty layers/assets arrays (templates, placeholders)
        // We'll be lenient and only validate structure, not content
        if (isset($data['layers']) && !is_array($data['layers'])) {
            return [
                'valid' => false,
                'error' => 'Layers must be an array.',
                'data' => null,
            ];
        }

        if (isset($data['assets']) && !is_array($data['assets'])) {
            return [
                'valid' => false,
                'error' => 'Assets must be an array.',
                'data' => null,
            ];
        }
        
        // We don't require layers or assets to exist or be non-empty
        // Empty arrays are valid - the file structure is what matters

        // Layers and assets validation already handled above

        // All validations passed
        return [
            'valid' => true,
            'error' => null,
            'data' => $data,
        ];
    }

    /**
     * Validates file size (optional check)
     *
     * @param int $sizeInBytes File size in bytes
     * @param int $maxSizeInMB Maximum size in MB (default: 10MB)
     * @return array{valid: bool, error: string|null}
     */
    public function validateFileSize(int $sizeInBytes, int $maxSizeInMB = 10): array
    {
        $maxSizeInBytes = $maxSizeInMB * 1024 * 1024;

        if ($sizeInBytes > $maxSizeInBytes) {
            return [
                'valid' => false,
                'error' => "File size exceeds the maximum allowed size of {$maxSizeInMB}MB.",
            ];
        }

        if ($sizeInBytes === 0) {
            return [
                'valid' => false,
                'error' => 'File is empty.',
            ];
        }

        return [
            'valid' => true,
            'error' => null,
        ];
    }
}
